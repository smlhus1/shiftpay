import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getDistinctMonthsWithShifts,
  getUpcomingShifts,
  getShiftsDueForConfirmation,
  getMonthSummary,
  getShiftsInDateRange,
  getTariffRates,
  type ShiftRow,
} from "../../lib/db";
import type { Href } from "expo-router";
import { calculateExpectedPay, calculateOvertimePay, type Shift } from "../../lib/calculations";
import { shiftRowToShift, MONTH_KEYS, toYearMonthKey, formatCurrency } from "../../lib/format";
import { ShiftCard } from "../../components/ShiftCard";
import { PressableScale } from "../../components/PressableScale";
import { AnimatedCard } from "../../components/AnimatedCard";
import { useTranslation } from "../../lib/i18n";
import { useThemeColors } from "../../lib/theme-context";

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  return { from: fmt(monday), to: fmt(sunday) };
}

function isShiftEndPassed(shift: ShiftRow): boolean {
  const [d, m, y] = shift.date.split(".").map(Number);
  const [h, min] = shift.end_time.split(":").map(Number);
  const end = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
  return new Date() >= end;
}

function countdownToShift(shift: ShiftRow, t: (key: string, opts?: object) => string): string {
  const [d, m, y] = shift.date.split(".").map(Number);
  const [h, min] = shift.start_time.split(":").map(Number);
  const start = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return t("dashboard.countdown.now");
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return t("dashboard.countdown.days", { count: days });
  if (hours > 0) return t("dashboard.countdown.hours", { count: hours });
  const mins = Math.floor(diffMs / (1000 * 60));
  return t("dashboard.countdown.minutes", { count: mins });
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const colors = useThemeColors();
  const [monthsList, setMonthsList] = useState<Array<{ year: number; month: number }>>([]);
  const [nextShift, setNextShift] = useState<ShiftRow | null>(null);
  const [weekShifts, setWeekShifts] = useState<ShiftRow[]>([]);
  const [dueConfirmation, setDueConfirmation] = useState<ShiftRow[]>([]);
  const [monthSummary, setMonthSummary] = useState<{
    plannedHours: number;
    actualHours: number;
    expectedPay: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [months, upcoming, due, weekRange] = await Promise.all([
        getDistinctMonthsWithShifts(),
        getUpcomingShifts(1),
        getShiftsDueForConfirmation(),
        Promise.resolve(getWeekRange()),
      ]);
      setMonthsList(months);
      setNextShift(upcoming.length > 0 ? upcoming[0] : null);
      setDueConfirmation(due);

      const week = await getShiftsInDateRange(weekRange.from, weekRange.to);
      setWeekShifts(week);

      const now = new Date();
      const sum = await getMonthSummary(now.getFullYear(), now.getMonth() + 1);
      const rates = await getTariffRates();
      const completedForPay = sum.shifts.filter(
        (s) => s.status === "completed" || s.status === "overtime"
      );
      const shiftsForPay: Shift[] = completedForPay.map(shiftRowToShift);
      let pay = calculateExpectedPay(shiftsForPay, rates);
      pay += calculateOvertimePay(completedForPay, rates);
      setMonthSummary({
        plannedHours: sum.plannedHours,
        actualHours: sum.actualHours,
        expectedPay: Math.round(pay * 100) / 100,
      });
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : t("dashboard.error.message"));
      setMonthsList([]);
      setNextShift(null);
      setWeekShifts([]);
      setDueConfirmation([]);
      setMonthSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const onPressConfirm = useCallback(
    (shiftId: string) => {
      router.push(`/confirm/${shiftId}` as Href);
    },
    [router]
  );

  const onPressSummary = useCallback(() => {
    const now = new Date();
    router.push(`/summary/${toYearMonthKey(now.getFullYear(), now.getMonth() + 1)}` as Href);
  }, [router]);

  if (loading && monthsList.length === 0 && !nextShift && dueConfirmation.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg p-6">
        <Text className="text-center text-slate-600 dark:text-slate-400">{loadError}</Text>
        <PressableScale
          onPress={() => {
            setLoadError(null);
            setLoading(true);
            load();
          }}
          accessibilityLabel={t("dashboard.error.retry")}
          className="mt-6 rounded-xl bg-accent-dark dark:bg-accent px-6 py-4"
        >
          <Text className="font-inter-semibold text-white dark:text-slate-900">{t("dashboard.error.retry")}</Text>
        </PressableScale>
      </View>
    );
  }

  const empty = monthsList.length === 0 && !nextShift && dueConfirmation.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-app-bg dark:bg-dark-bg"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.accent]}
          tintColor={colors.accent}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      {empty && (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-lg font-inter-semibold text-slate-900 dark:text-slate-100">{t("dashboard.empty.title")}</Text>
          <Text className="mt-2 text-center text-slate-600 dark:text-slate-400">
            {t("dashboard.empty.description")}
          </Text>
          <PressableScale
            onPress={() => router.push("/(tabs)/import")}
            accessibilityLabel={t("dashboard.empty.cta")}
            className="mt-6 rounded-xl bg-accent-dark dark:bg-accent px-6 py-4"
          >
            <Text className="font-inter-semibold text-white dark:text-slate-900">{t("dashboard.empty.cta")}</Text>
          </PressableScale>
        </View>
      )}

      {/* Next shift — full width */}
      {nextShift && (
        <AnimatedCard index={0} className="mb-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-5">
          <Text className="text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("dashboard.nextShift.title")}</Text>
          <Text className="mt-1 text-xl font-inter-semibold text-slate-900 dark:text-slate-100">
            {nextShift.date} · {nextShift.start_time}–{nextShift.end_time}
          </Text>
          <Text className="mt-1 text-sm text-accent-dark dark:text-accent">{countdownToShift(nextShift, t)}</Text>
          {isShiftEndPassed(nextShift) && (
            <PressableScale
              onPress={() => onPressConfirm(nextShift.id)}
              className="mt-3 self-start rounded-xl bg-accent-dark dark:bg-accent px-4 py-2"
            >
              <Text className="text-sm font-inter-semibold text-white dark:text-slate-900">{t("dashboard.nextShift.confirm")}</Text>
            </PressableScale>
          )}
        </AnimatedCard>
      )}

      {/* Expected pay — full width */}
      {monthSummary && (monthSummary.plannedHours > 0 || monthSummary.actualHours > 0) && (
        <AnimatedCard index={1} className="mb-4">
          <PressableScale
            onPress={onPressSummary}
            accessibilityLabel={t("dashboard.month.title")}
            className="flex-row items-center justify-between rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-5"
          >
            <View>
              <Text className="text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("dashboard.month.title")}</Text>
              <Text className="mt-1 text-xs text-slate-500">
                {t("dashboard.month.actual", { hours: monthSummary.actualHours.toFixed(1) })}
              </Text>
            </View>
            <Text className="font-display text-3xl text-amber-600 dark:text-warm">
              {formatCurrency(monthSummary.expectedPay, locale)}
            </Text>
          </PressableScale>
        </AnimatedCard>
      )}

      {/* Unconfirmed tile — full width */}
      {dueConfirmation.length > 0 && (
        <AnimatedCard index={2} className="mb-4">
          <PressableScale
            onPress={() => onPressConfirm(dueConfirmation[0].id)}
            className="rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-5"
          >
            <Text className="text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("dashboard.pending.title")}</Text>
            <Text className="mt-1 font-display text-2xl text-red-600 dark:text-red-400">
              {dueConfirmation.length}
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              {t("dashboard.pending.confirmBtn")}
            </Text>
          </PressableScale>
        </AnimatedCard>
      )}

      {/* Pending confirmation list (if more than visible in tile) */}
      {dueConfirmation.length > 1 && (
        <AnimatedCard index={3} className="mb-4 rounded-xl border border-amber-600/20 bg-amber-600/10 dark:border-amber-500/20 dark:bg-amber-500/10 p-4">
          <Text className="text-xs font-inter-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {t("dashboard.pending.title")} ({dueConfirmation.length})
          </Text>
          {dueConfirmation.slice(0, 3).map((s) => (
            <PressableScale
              key={s.id}
              onPress={() => onPressConfirm(s.id)}
              className="mt-2 flex-row items-center justify-between rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-3"
            >
              <Text className="text-slate-900 dark:text-slate-100">
                {s.date} {s.start_time}–{s.end_time}
              </Text>
              <Text className="text-sm font-inter-medium text-accent-dark dark:text-accent">{t("dashboard.pending.confirmBtn")}</Text>
            </PressableScale>
          ))}
          {dueConfirmation.length > 3 && (
            <Text className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              {t("dashboard.pending.more", { count: dueConfirmation.length - 3 })}
            </Text>
          )}
        </AnimatedCard>
      )}

      {/* This week */}
      {weekShifts.length > 0 && (
        <AnimatedCard index={4} className="mb-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
          <Text className="text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("dashboard.week.title")}</Text>
          {weekShifts.slice(0, 7).map((s) => (
            <ShiftCard
              key={s.id}
              shift={s}
              onConfirm={onPressConfirm}
              compact
            />
          ))}
        </AnimatedCard>
      )}

      {/* History */}
      {monthsList.length > 0 && (
        <>
          <Text className="mb-2 text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400" accessibilityRole="header">{t("dashboard.history.title")}</Text>
          {monthsList.map(({ year, month }) => {
            const key = toYearMonthKey(year, month);
            const monthKey = MONTH_KEYS[month - 1] ?? "jan";
            return (
              <PressableScale
                key={key}
                onPress={() => router.push(`/summary/${key}` as Href)}
                accessibilityLabel={`${t(`months.${monthKey}`)} ${year}`}
                className="mb-3 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-inter-medium text-slate-900 dark:text-slate-100">
                    {t(`months.${monthKey}`)} {year}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} importantForAccessibility="no" />
                </View>
              </PressableScale>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
