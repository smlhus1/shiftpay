import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import {
  getMonthSummary,
  getTariffRates,
  getDistinctMonthsWithShifts,
  deleteShift,
  getMonthlyActualPay,
  setMonthlyActualPay,
} from "@/lib/db";
import { calculateExpectedPay, calculateOvertimePay, type Shift } from "@/lib/calculations";
import { shiftRowToShift, MONTH_KEYS, toYearMonthKey, formatCurrency } from "@/lib/format";
import { exportShiftsAsCSV } from "@/lib/csv";
import { ShiftCard } from "@/components/ShiftCard";
import { PressableScale } from "@/components/PressableScale";
import { AnimatedCard } from "@/components/AnimatedCard";
import { RolledNumber } from "@/components/RolledNumber";
import { hapticHeavy } from "@/lib/haptics";
import { useTranslation } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View
      className="flex-1 items-center rounded-xl border border-app-border bg-app-surface p-3 dark:border-dark-border dark:bg-dark-surface"
      accessible={true}
      accessibilityLabel={`${value}: ${label}`}
    >
      <Text
        className="font-display text-2xl text-stone-900 dark:text-stone-100"
        importantForAccessibility="no"
      >
        {value}
      </Text>
      <Text
        className="mt-0.5 text-center text-xs text-stone-600 dark:text-stone-400"
        importantForAccessibility="no"
      >
        {label}
      </Text>
    </View>
  );
}

export default function SummaryScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const router = useRouter();
  const { t, currency } = useTranslation();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getMonthSummary>> | null>(null);
  const [expectedPay, setExpectedPay] = useState(0);
  const [regularPay, setRegularPay] = useState(0);
  const [extraPay, setExtraPay] = useState(0);
  const [hasExtraShifts, setHasExtraShifts] = useState(false);
  const [actualPay, setActualPay] = useState("");
  const [actualPaySaved, setActualPaySaved] = useState<number | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [adjacentMonths, setAdjacentMonths] = useState<{
    prev: { year: number; month: number } | null;
    next: { year: number; month: number } | null;
  }>({ prev: null, next: null });

  const load = useCallback(async () => {
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    const [y, m] = yearMonth.split("-").map(Number);
    const year = y ?? 0;
    const month = m ?? 0;
    if (month < 1 || month > 12) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    try {
      const s = await getMonthSummary(year, month);
      setSummary(s);
      const rates = await getTariffRates();
      const paidShifts = s.shifts.filter(
        (sh) => sh.status === "completed" || sh.status === "overtime"
      );
      const shiftsForPay: Shift[] = paidShifts.map(shiftRowToShift);
      const pay = calculateExpectedPay(shiftsForPay, rates, rates.stacking_policy);
      const totalPay = pay + calculateOvertimePay(paidShifts, rates);
      setExpectedPay(totalPay);

      // Split by pay type
      const extraExists = s.shifts.some((sh) => sh.pay_type === "extra");
      setHasExtraShifts(extraExists);
      if (extraExists) {
        const regularShifts = paidShifts.filter((sh) => sh.pay_type !== "extra");
        const extraShifts = paidShifts.filter((sh) => sh.pay_type === "extra");
        const regPay =
          calculateExpectedPay(regularShifts.map(shiftRowToShift), rates, rates.stacking_policy) +
          calculateOvertimePay(regularShifts, rates);
        const extPay =
          calculateExpectedPay(extraShifts.map(shiftRowToShift), rates, rates.stacking_policy) +
          calculateOvertimePay(extraShifts, rates);
        setRegularPay(regPay);
        setExtraPay(extPay);
      }

      const savedActual = await getMonthlyActualPay(year, month);
      if (savedActual !== null) {
        setActualPaySaved(savedActual);
        setActualPay(String(savedActual));
      }

      const allMonths = await getDistinctMonthsWithShifts();
      const currentKey = toYearMonthKey(year, month);
      const idx = allMonths.findIndex((mo) => toYearMonthKey(mo.year, mo.month) === currentKey);
      setAdjacentMonths({
        prev: idx < allMonths.length - 1 ? (allMonths[idx + 1] ?? null) : null,
        next: idx > 0 ? (allMonths[idx - 1] ?? null) : null,
      });
    } catch {
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveActualPay = useCallback(async () => {
    const parsed = parseFloat(actualPay.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert(t("common.error"), t("summary.actualPay.invalidAmount"));
      return;
    }
    const [yStr, mStr] = (yearMonth ?? "").split("-").map(Number);
    try {
      await setMonthlyActualPay(yStr ?? 0, mStr ?? 0, parsed);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActualPaySaved(parsed);
    } catch {
      Alert.alert(t("common.error"), t("summary.actualPay.saveError"));
    }
  }, [actualPay, yearMonth, t]);

  const handleDeleteShift = useCallback(
    (shiftId: string) => {
      Alert.alert(t("summary.deleteShift.title"), t("summary.deleteShift.message"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("summary.deleteShift.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await deleteShift(shiftId);
              load();
            } catch {
              Alert.alert(t("common.error"), t("summary.deleteShift.error"));
            }
          },
        },
      ]);
    },
    [t, load]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg">
        <ActivityIndicator
          size="large"
          color={colors.accent}
          accessibilityLabel={t("common.loading")}
        />
      </View>
    );
  }

  if (invalid || !summary) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg p-6 dark:bg-dark-bg">
        <Text className="text-center text-stone-600 dark:text-stone-400">
          {t("summary.invalid")}
        </Text>
        <PressableScale
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-accent-dark px-6 py-3 dark:bg-accent"
        >
          <Text className="font-inter-semibold text-white dark:text-stone-900">
            {t("summary.back")}
          </Text>
        </PressableScale>
      </View>
    );
  }

  const [y, m] = yearMonth!.split("-").map(Number);
  const month = m ?? 0;
  const monthKey = MONTH_KEYS[month - 1] ?? "jan";
  const monthName = t(`months.${monthKey}`);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1 bg-app-bg dark:bg-dark-bg"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          {adjacentMonths.prev ? (
            <PressableScale
              onPress={() => {
                const p = adjacentMonths.prev!;
                router.replace(`/summary/${toYearMonthKey(p.year, p.month)}` as Href);
              }}
              accessibilityLabel={t(`months.${MONTH_KEYS[adjacentMonths.prev.month - 1] ?? "jan"}`)}
              className="flex-row items-center gap-1"
            >
              <Icon name="chevron-back" size={18} color={colors.accent} />
              <Text className="font-inter-medium text-sm text-accent-dark dark:text-accent">
                {t(`months.${MONTH_KEYS[adjacentMonths.prev.month - 1] ?? "jan"}`)}
              </Text>
            </PressableScale>
          ) : (
            <View />
          )}

          {adjacentMonths.next ? (
            <PressableScale
              onPress={() => {
                const n = adjacentMonths.next!;
                router.replace(`/summary/${toYearMonthKey(n.year, n.month)}` as Href);
              }}
              accessibilityLabel={t(`months.${MONTH_KEYS[adjacentMonths.next.month - 1] ?? "jan"}`)}
              className="flex-row items-center gap-1"
            >
              <Text className="font-inter-medium text-sm text-accent-dark dark:text-accent">
                {t(`months.${MONTH_KEYS[adjacentMonths.next.month - 1] ?? "jan"}`)}
              </Text>
              <Icon name="chevron-forward" size={18} color={colors.accent} />
            </PressableScale>
          ) : (
            <View />
          )}
        </View>

        <Text
          className="mb-4 font-inter-semibold text-xl text-stone-900 dark:text-stone-100"
          accessibilityRole="header"
        >
          {monthName} {y}
        </Text>

        {/* Dominant pay card */}
        <AnimatedCard index={0} className="mb-4 rounded-xl bg-app-surface p-5 dark:bg-dark-surface">
          <Text className="font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400">
            {t("summary.expectedPay.title")}
          </Text>
          <Text className="mt-1 font-display text-4xl text-amber-700 dark:text-warm">
            {formatCurrency(expectedPay, currency)}
          </Text>
          <Text className="mt-1 text-xs text-stone-500">{t("summary.expectedPay.subtitle")}</Text>
        </AnimatedCard>

        {/* Regular vs Extra split — only shown when extra shifts exist */}
        {hasExtraShifts && (
          <AnimatedCard index={1} className="mb-4 flex-row gap-3">
            <View className="flex-1 rounded-xl border border-app-border bg-app-surface p-3 dark:border-dark-border dark:bg-dark-surface">
              <Text className="font-inter-medium text-xs text-stone-600 dark:text-stone-400">
                {t("summary.regularPay")}
              </Text>
              <Text className="mt-1 font-display text-xl text-stone-900 dark:text-stone-100">
                {formatCurrency(regularPay, currency)}
              </Text>
            </View>
            <View className="flex-1 rounded-xl border border-violet-500/20 bg-violet-50 p-3 dark:border-violet-400/20 dark:bg-violet-500/10">
              <Text className="font-inter-medium text-xs text-violet-700 dark:text-violet-300">
                {t("summary.extraPay")}
              </Text>
              <Text className="mt-1 font-display text-xl text-violet-700 dark:text-violet-300">
                {formatCurrency(extraPay, currency)}
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* Actual pay comparison */}
        <AnimatedCard
          index={hasExtraShifts ? 2 : 1}
          className="mb-4 rounded-xl border border-app-border bg-app-surface p-4 dark:border-dark-border dark:bg-dark-surface"
        >
          <Text className="font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400">
            {t("summary.actualPay.title")}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <ThemedTextInput
              value={actualPay}
              onChangeText={setActualPay}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t("summary.actualPay.inputLabel")}
              className="flex-1 rounded-lg border border-app-border bg-app-bg px-3 py-2 font-inter-medium text-lg text-stone-900 dark:border-dark-border dark:bg-dark-bg dark:text-stone-100"
            />
            <PressableScale
              onPress={handleSaveActualPay}
              accessibilityLabel={t("summary.actualPay.save")}
              className="rounded-lg bg-accent-dark px-4 py-2 dark:bg-accent"
            >
              <Text className="font-inter-semibold text-white dark:text-stone-900">
                {t("summary.actualPay.save")}
              </Text>
            </PressableScale>
          </View>
          {actualPaySaved !== null &&
            expectedPay > 0 &&
            (() => {
              const diff = actualPaySaved - expectedPay;
              const absDiff = Math.abs(diff);
              if (absDiff < 1) return null;
              const isOver = diff > 0;
              const direction = isOver ? t("summary.actualPay.over") : t("summary.actualPay.under");
              const signedDiff = isOver ? absDiff : -absDiff;
              // Big mono diff-number (DESIGN.md §11.2) — haptic heavy when the reveal
              // completes, giving weight to the moment Kari sees the gap.
              return (
                <View className="mt-3">
                  <RolledNumber
                    value={signedDiff}
                    duration={1400}
                    from={0}
                    format={(n) => {
                      const prefix = n >= 0 ? "+\u00A0" : "−\u00A0";
                      return (
                        prefix +
                        Math.round(Math.abs(n))
                          .toLocaleString("nb-NO")
                          .replace(/\u202F/g, "\u00A0") +
                        "\u00A0kr"
                      );
                    }}
                    onComplete={hapticHeavy}
                    accessibilityLabel={t("summary.actualPay.difference", {
                      amount: formatCurrency(absDiff, currency),
                      direction,
                    })}
                    style={{
                      fontFamily: "JetBrainsMono_500Medium",
                      fontSize: 36,
                      lineHeight: 40,
                      letterSpacing: -1.2,
                      color: isOver ? colors.success : colors.error,
                    }}
                  />
                  <Text
                    className="mt-1 text-xs italic text-stone-500 dark:text-stone-400"
                    style={{ fontFamily: "Fraunces_400Regular_Italic" }}
                  >
                    {isOver ? t("summary.actualPay.over") : t("summary.actualPay.under")}
                  </Text>
                </View>
              );
            })()}
        </AnimatedCard>

        {/* Stat boxes */}
        <AnimatedCard index={hasExtraShifts ? 3 : 2} className="mb-4 flex-row gap-3">
          <StatBox
            value={String(summary.plannedShifts)}
            label={t("summary.shifts.planned", {
              count: summary.plannedShifts,
              hours: summary.plannedHours.toFixed(1),
            })}
          />
          <StatBox
            value={String(summary.completedShifts)}
            label={t("summary.shifts.completed", { count: summary.completedShifts })}
          />
          <StatBox
            value={String(summary.overtimeShifts)}
            label={t("summary.shifts.overtime", { count: summary.overtimeShifts })}
          />
        </AnimatedCard>

        {/* Hours detail */}
        <AnimatedCard
          index={hasExtraShifts ? 4 : 3}
          className="mb-4 rounded-xl border border-app-border bg-app-surface p-4 dark:border-dark-border dark:bg-dark-surface"
        >
          <Text className="font-inter-medium text-stone-900 dark:text-stone-100">
            {t("summary.shifts.title")}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-3">
            <Text className="text-stone-600 dark:text-stone-400">
              {t("summary.shifts.actual", { hours: summary.actualHours.toFixed(1) })}
            </Text>
            <Text className="text-stone-600 dark:text-stone-400">
              {t("summary.shifts.missed", { count: summary.missedShifts })}
            </Text>
            {summary.overtimeHours > 0 && (
              <Text className="text-accent-dark dark:text-accent">
                {t("summary.shifts.overtimeHours", { hours: summary.overtimeHours.toFixed(1) })}
              </Text>
            )}
          </View>
        </AnimatedCard>

        <Text
          className="mb-2 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
          accessibilityRole="header"
        >
          {t("summary.list.title")}
        </Text>
        {summary.shifts.length === 0 ? (
          <Text className="rounded-xl border border-app-border bg-app-surface p-4 text-stone-500 dark:border-dark-border dark:bg-dark-surface">
            {t("summary.list.empty")}
          </Text>
        ) : (
          summary.shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              showShiftType
              showOvertimeLabel
              onEdit={(id) => router.push(`/confirm/${id}` as Href)}
              onDelete={handleDeleteShift}
            />
          ))
        )}

        {summary.shifts.length > 0 && (
          <PressableScale
            onPress={async () => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await exportShiftsAsCSV(summary.shifts, yearMonth!);
              } catch (e) {
                Alert.alert(
                  t("common.error"),
                  e instanceof Error ? e.message : t("summary.export")
                );
              }
            }}
            accessibilityLabel={t("summary.export")}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-blue-600/20 bg-blue-600/10 py-3 dark:border-blue-400/20 dark:bg-blue-400/10"
          >
            <Icon name="download-outline" size={18} color={colors.accent} />
            <Text className="font-inter-semibold text-accent-dark dark:text-accent">
              {t("summary.export")}
            </Text>
          </PressableScale>
        )}

        <PressableScale
          onPress={() => router.push(`/add-shift?month=${yearMonth}` as Href)}
          accessibilityLabel={t("summary.addShift")}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-app-border py-3 dark:border-dark-border"
        >
          <Icon name="add-circle-outline" size={18} color={colors.textMuted} />
          <Text className="font-inter-medium text-stone-600 dark:text-stone-400">
            {t("summary.addShift")}
          </Text>
        </PressableScale>

        <PressableScale
          onPress={() => router.back()}
          accessibilityLabel={t("summary.back")}
          className="mt-3 rounded-xl border border-app-border bg-app-surface py-3 dark:border-dark-border dark:bg-dark-surface"
        >
          <Text className="text-center font-inter-medium text-stone-700 dark:text-stone-300">
            {t("summary.back")}
          </Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
