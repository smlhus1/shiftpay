import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { calculateExpectedPay, calculateOvertimePay, type Shift } from "../../lib/calculations";
import { shiftRowToShift } from "../../lib/format";
import { ShiftCard } from "../../components/ShiftCard";
import { useTranslation } from "../../lib/i18n";

const MONTH_KEYS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const;

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
  const { t } = useTranslation();
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
      let pay = calculateExpectedPay(shiftsForPay, {
        base_rate: rates.base_rate,
        evening_supplement: rates.evening_supplement,
        night_supplement: rates.night_supplement,
        weekend_supplement: rates.weekend_supplement,
        holiday_supplement: rates.holiday_supplement,
      });
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
      router.push(`/confirm/${shiftId}` as any);
    },
    [router]
  );

  const onPressSummary = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    router.push(`/summary/${y}-${m}` as any);
  }, [router]);

  if (loading && monthsList.length === 0 && !nextShift && dueConfirmation.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 p-6">
        <Text className="text-center text-slate-500">{loadError}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoadError(null);
            setLoading(true);
            load();
          }}
          className="mt-6 rounded-xl bg-teal-700 px-6 py-4"
        >
          <Text className="font-medium text-white">{t("dashboard.error.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const empty = monthsList.length === 0 && !nextShift && dueConfirmation.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0f766e"]} />
      }
    >
      {empty && (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-lg font-medium text-slate-900">{t("dashboard.empty.title")}</Text>
          <Text className="mt-2 text-center text-slate-500">
            {t("dashboard.empty.description")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/import")}
            className="mt-6 rounded-xl bg-teal-700 px-6 py-4"
          >
            <Text className="font-medium text-white">{t("dashboard.empty.cta")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {nextShift && (
        <View className="mb-4 rounded-xl bg-teal-700 p-5">
          <Text className="text-sm font-medium text-teal-100">{t("dashboard.nextShift.title")}</Text>
          <Text className="mt-1 text-xl font-semibold text-white">
            {nextShift.date} · {nextShift.start_time}–{nextShift.end_time}
          </Text>
          <Text className="mt-1 text-sm text-teal-200">{countdownToShift(nextShift, t)}</Text>
          {isShiftEndPassed(nextShift) && (
            <TouchableOpacity
              onPress={() => onPressConfirm(nextShift.id)}
              className="mt-3 self-start rounded-xl bg-white px-4 py-2"
            >
              <Text className="text-sm font-semibold text-teal-700">{t("dashboard.nextShift.confirm")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {dueConfirmation.length > 0 && (
        <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Text className="font-medium text-amber-900">
            {t("dashboard.pending.title")} ({dueConfirmation.length})
          </Text>
          {dueConfirmation.slice(0, 3).map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => onPressConfirm(s.id)}
              className="mt-2 flex-row items-center justify-between rounded-xl border border-amber-200 bg-white p-3"
            >
              <Text className="text-slate-900">
                {s.date} {s.start_time}–{s.end_time}
              </Text>
              <Text className="text-sm font-medium text-teal-700">{t("dashboard.pending.confirmBtn")}</Text>
            </TouchableOpacity>
          ))}
          {dueConfirmation.length > 3 && (
            <Text className="mt-2 text-sm text-amber-800">
              {t("dashboard.pending.more", { count: dueConfirmation.length - 3 })}
            </Text>
          )}
        </View>
      )}

      {monthSummary && (monthSummary.plannedHours > 0 || monthSummary.actualHours > 0) ? (
        <TouchableOpacity
          onPress={onPressSummary}
          className="mb-4 rounded-xl border border-stone-200 bg-white p-4"
        >
          <Text className="font-medium text-slate-900">{t("dashboard.month.title")}</Text>
          <View className="mt-2 flex-row gap-4">
            <Text className="text-sm text-slate-500">
              {t("dashboard.month.planned", { hours: monthSummary.plannedHours.toFixed(1) })}
            </Text>
            <Text className="text-sm text-slate-500">
              {t("dashboard.month.actual", { hours: monthSummary.actualHours.toFixed(1) })}
            </Text>
          </View>
          <Text className="mt-2 text-lg font-bold text-slate-900">
            {t("dashboard.month.expectedPay", { amount: monthSummary.expectedPay.toFixed(0) })}
          </Text>
        </TouchableOpacity>
      ) : null}

      {weekShifts.length > 0 && (
        <View className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
          <Text className="font-medium text-slate-900">{t("dashboard.week.title")}</Text>
          {weekShifts.slice(0, 7).map((s) => (
            <ShiftCard
              key={s.id}
              shift={s}
              onConfirm={onPressConfirm}
              compact
            />
          ))}
        </View>
      )}

      {monthsList.length > 0 && (
        <>
          <Text className="mb-2 font-medium text-slate-900">{t("dashboard.history.title")}</Text>
          {monthsList.map(({ year, month }) => {
            const key = `${year}-${String(month).padStart(2, "0")}`;
            const monthKey = MONTH_KEYS[month - 1] ?? "jan";
            return (
              <TouchableOpacity
                key={key}
                onPress={() => router.push(`/summary/${key}` as any)}
                activeOpacity={0.7}
                className="mb-3 rounded-xl border border-stone-200 bg-white p-4"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium text-slate-900">
                    {t(`months.${monthKey}`)} {year}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
