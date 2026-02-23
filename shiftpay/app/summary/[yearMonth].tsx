import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getMonthSummary, getTariffRates, getDistinctMonthsWithShifts, deleteShift } from "../../lib/db";
import type { ShiftRow } from "../../lib/db";
import { calculateExpectedPay, calculateOvertimePay, type Shift } from "../../lib/calculations";
import { shiftRowToShift, MONTH_KEYS, toYearMonthKey, formatCurrency } from "../../lib/format";
import { exportShiftsAsCSV } from "../../lib/csv";
import { ShiftCard } from "../../components/ShiftCard";
import { PressableScale } from "../../components/PressableScale";
import { AnimatedCard } from "../../components/AnimatedCard";
import { useTranslation } from "../../lib/i18n";
import { useThemeColors } from "../../lib/theme-context";

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-3">
      <Text className="font-display text-2xl text-slate-900 dark:text-slate-100">{value}</Text>
      <Text className="mt-0.5 text-center text-xs text-slate-600 dark:text-slate-400">{label}</Text>
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
      const pay = calculateExpectedPay(shiftsForPay, rates);
      setExpectedPay(pay + calculateOvertimePay(paidShifts, rates));

      const allMonths = await getDistinctMonthsWithShifts();
      const currentKey = toYearMonthKey(year, month);
      const idx = allMonths.findIndex(
        (mo) => toYearMonthKey(mo.year, mo.month) === currentKey
      );
      setAdjacentMonths({
        prev: idx < allMonths.length - 1 ? allMonths[idx + 1] ?? null : null,
        next: idx > 0 ? allMonths[idx - 1] ?? null : null,
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

  const handleDeleteShift = useCallback((shiftId: string) => {
    Alert.alert(
      t("summary.deleteShift.title"),
      t("summary.deleteShift.message"),
      [
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
      ]
    );
  }, [t, load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg">
        <ActivityIndicator size="large" color={colors.accent} accessibilityLabel={t("common.loading")} />
      </View>
    );
  }

  if (invalid || !summary) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg p-6">
        <Text className="text-center text-slate-600 dark:text-slate-400">{t("summary.invalid")}</Text>
        <PressableScale
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-accent-dark dark:bg-accent px-6 py-3"
        >
          <Text className="font-inter-semibold text-white dark:text-slate-900">{t("summary.back")}</Text>
        </PressableScale>
      </View>
    );
  }

  const [y, m] = yearMonth!.split("-").map(Number);
  const month = m ?? 0;
  const monthKey = MONTH_KEYS[(month - 1)] ?? "jan";
  const monthName = t(`months.${monthKey}`);

  return (
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
            accessibilityLabel={t(`months.${MONTH_KEYS[(adjacentMonths.prev.month - 1)] ?? "jan"}`)}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="chevron-back" size={18} color={colors.accent} />
            <Text className="text-sm font-inter-medium text-accent-dark dark:text-accent">
              {t(`months.${MONTH_KEYS[(adjacentMonths.prev.month - 1)] ?? "jan"}`)}
            </Text>
          </PressableScale>
        ) : <View />}

        {adjacentMonths.next ? (
          <PressableScale
            onPress={() => {
              const n = adjacentMonths.next!;
              router.replace(`/summary/${toYearMonthKey(n.year, n.month)}` as Href);
            }}
            accessibilityLabel={t(`months.${MONTH_KEYS[(adjacentMonths.next.month - 1)] ?? "jan"}`)}
            className="flex-row items-center gap-1"
          >
            <Text className="text-sm font-inter-medium text-accent-dark dark:text-accent">
              {t(`months.${MONTH_KEYS[(adjacentMonths.next.month - 1)] ?? "jan"}`)}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </PressableScale>
        ) : <View />}
      </View>

      <Text className="mb-4 text-xl font-inter-semibold text-slate-900 dark:text-slate-100" accessibilityRole="header">
        {monthName} {y}
      </Text>

      {/* Dominant pay card */}
      <AnimatedCard index={0} className="mb-4 rounded-xl bg-app-surface dark:bg-dark-surface p-5">
        <Text className="text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("summary.expectedPay.title")}</Text>
        <Text className="mt-1 font-display text-4xl text-amber-600 dark:text-warm">
          {formatCurrency(expectedPay, currency)}
        </Text>
        <Text className="mt-1 text-xs text-slate-500">{t("summary.expectedPay.subtitle")}</Text>
      </AnimatedCard>

      {/* Stat boxes */}
      <AnimatedCard index={1} className="mb-4 flex-row gap-3">
        <StatBox
          value={String(summary.plannedShifts)}
          label={t("summary.shifts.planned", { count: summary.plannedShifts, hours: summary.plannedHours.toFixed(1) })}
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
      <AnimatedCard index={2} className="mb-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
        <Text className="font-inter-medium text-slate-900 dark:text-slate-100">{t("summary.shifts.title")}</Text>
        <View className="mt-2 flex-row flex-wrap gap-3">
          <Text className="text-slate-600 dark:text-slate-400">
            {t("summary.shifts.actual", { hours: summary.actualHours.toFixed(1) })}
          </Text>
          <Text className="text-slate-600 dark:text-slate-400">
            {t("summary.shifts.missed", { count: summary.missedShifts })}
          </Text>
          {summary.overtimeHours > 0 && (
            <Text className="text-accent-dark dark:text-accent">{t("summary.shifts.overtimeHours", { hours: summary.overtimeHours.toFixed(1) })}</Text>
          )}
        </View>
      </AnimatedCard>

      <Text className="mb-2 text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("summary.list.title")}</Text>
      {summary.shifts.length === 0 ? (
        <Text className="rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4 text-slate-500">
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
              Alert.alert(t("common.error"), e instanceof Error ? e.message : t("summary.export"));
            }
          }}
          accessibilityLabel={t("summary.export")}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-sky-600/20 bg-sky-600/10 dark:border-sky-400/20 dark:bg-sky-400/10 py-3"
        >
          <Ionicons name="download-outline" size={18} color={colors.accent} />
          <Text className="font-inter-semibold text-accent-dark dark:text-accent">{t("summary.export")}</Text>
        </PressableScale>
      )}

      <PressableScale
        onPress={() => router.back()}
        accessibilityLabel={t("summary.back")}
        className="mt-3 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface py-3"
      >
        <Text className="text-center font-inter-medium text-slate-700 dark:text-slate-300">{t("summary.back")}</Text>
      </PressableScale>
    </ScrollView>
  );
}
