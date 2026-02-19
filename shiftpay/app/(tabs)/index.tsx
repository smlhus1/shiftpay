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
  getAllSchedules,
  getUpcomingShifts,
  getShiftsDueForConfirmation,
  getMonthSummary,
  getShiftsInDateRange,
  getTariffRates,
  type ScheduleRow,
  type ShiftRow,
  type ShiftStatus,
} from "../../lib/db";
import { calculateExpectedPay, shiftDurationHours, type Shift } from "../../lib/calculations";

function formatPeriod(start: string, end: string): string {
  return `${start} – ${end}`;
}

function sourceLabel(source: string): string {
  if (source === "ocr") return "OCR";
  if (source === "gallery") return "Galleri";
  if (source === "csv") return "CSV";
  return "Manuell";
}

function statusLabel(s: ShiftStatus): string {
  if (s === "planned") return "Planlagt";
  if (s === "completed") return "Fullført";
  if (s === "missed") return "Ikke møtt";
  return "Overtid";
}

function statusColor(s: ShiftStatus): string {
  if (s === "planned") return "bg-amber-100 text-amber-800";
  if (s === "completed") return "bg-green-100 text-green-800";
  if (s === "missed") return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
}

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

function countdownToShift(shift: ShiftRow): string {
  const [d, m, y] = shift.date.split(".").map(Number);
  const [h, min] = shift.start_time.split(":").map(Number);
  const start = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  if (diffMs <= 0) return "Nå";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `Om ${days} dag${days === 1 ? "" : "er"}`;
  if (hours > 0) return `Om ${hours} time${hours === 1 ? "" : "r"}`;
  const mins = Math.floor(diffMs / (1000 * 60));
  return `Om ${mins} min`;
}

function shiftRowToShift(s: ShiftRow): Shift {
  const start = s.actual_start ?? s.start_time;
  const end = s.actual_end ?? s.end_time;
  return {
    date: s.date,
    start_time: start,
    end_time: end,
    shift_type: s.shift_type as Shift["shift_type"],
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
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
      const [scheds, upcoming, due, weekRange] = await Promise.all([
        getAllSchedules(),
        getUpcomingShifts(1),
        getShiftsDueForConfirmation(),
        Promise.resolve(getWeekRange()),
      ]);
      setSchedules(scheds);
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
      const overtimeHours = completedForPay.reduce((a, s) => a + (s.overtime_minutes ?? 0) / 60, 0);
      pay += overtimeHours * rates.base_rate;
      setMonthSummary({
        plannedHours: sum.plannedHours,
        actualHours: sum.actualHours,
        expectedPay: Math.round(pay * 100) / 100,
      });
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Kunne ikke laste data");
      setSchedules([]);
      setNextShift(null);
      setWeekShifts([]);
      setDueConfirmation([]);
      setMonthSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const onPressSchedule = useCallback(
    (id: string) => {
      router.push(`/period/${id}` as any);
    },
    [router]
  );

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

  if (loading && schedules.length === 0 && !nextShift && dueConfirmation.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-gray-600">{loadError}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoadError(null);
            setLoading(true);
            load();
          }}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3"
        >
          <Text className="font-medium text-white">Prøv igjen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const empty = schedules.length === 0 && !nextShift && dueConfirmation.length === 0;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563eb"]} />
      }
    >
      {empty && (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-lg font-medium text-gray-900">Ingen vaktplaner ennå</Text>
          <Text className="mt-2 text-center text-gray-600">
            Importer fra Import-fanen eller legg inn skift manuelt.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/import")}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3"
          >
            <Text className="font-medium text-white">Gå til Import</Text>
          </TouchableOpacity>
        </View>
      )}

      {nextShift && (
        <View className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Text className="text-sm font-medium text-blue-900">Neste vakt</Text>
          <Text className="mt-1 text-lg font-semibold text-gray-900">
            {nextShift.date} · {nextShift.start_time}–{nextShift.end_time}
          </Text>
          <Text className="mt-1 text-sm text-gray-600">{countdownToShift(nextShift)}</Text>
          <TouchableOpacity
            onPress={() => onPressConfirm(nextShift.id)}
            className="mt-3 self-start rounded-lg bg-blue-600 px-4 py-2"
          >
            <Text className="text-sm font-medium text-white">Bekreft vakt</Text>
          </TouchableOpacity>
        </View>
      )}

      {dueConfirmation.length > 0 && (
        <View className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Text className="font-medium text-amber-900">
            Venter på bekreftelse ({dueConfirmation.length})
          </Text>
          {dueConfirmation.slice(0, 3).map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => onPressConfirm(s.id)}
              className="mt-2 flex-row items-center justify-between rounded border border-amber-200 bg-white p-3"
            >
              <Text className="text-gray-900">
                {s.date} {s.start_time}–{s.end_time}
              </Text>
              <Text className="text-sm font-medium text-blue-600">Bekreft</Text>
            </TouchableOpacity>
          ))}
          {dueConfirmation.length > 3 && (
            <Text className="mt-2 text-sm text-amber-800">
              + {dueConfirmation.length - 3} til
            </Text>
          )}
        </View>
      )}

      {monthSummary && (monthSummary.plannedHours > 0 || monthSummary.actualHours > 0) ? (
        <TouchableOpacity
          onPress={onPressSummary}
          className="mb-4 rounded-lg border border-gray-200 bg-white p-4"
        >
          <Text className="font-medium text-gray-900">Denne måneden</Text>
          <View className="mt-2 flex-row gap-4">
            <Text className="text-sm text-gray-600">
              Planlagt: {monthSummary.plannedHours.toFixed(1)} t
            </Text>
            <Text className="text-sm text-gray-600">
              Faktisk: {monthSummary.actualHours.toFixed(1)} t
            </Text>
          </View>
          <Text className="mt-2 text-lg font-semibold text-gray-900">
            Forventet lønn: {monthSummary.expectedPay.toFixed(0)} kr
          </Text>
          <Text className="mt-1 text-sm text-blue-600">Se oppsummering</Text>
        </TouchableOpacity>
      ) : null}

      {weekShifts.length > 0 && (
        <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <Text className="font-medium text-gray-900">Ukens vakter</Text>
          {weekShifts.slice(0, 7).map((s) => (
            <View
              key={s.id}
              className="mt-2 flex-row flex-wrap items-center gap-2 rounded border border-gray-100 bg-gray-50 p-2"
            >
              <Text className="text-gray-900">
                {s.date} {s.start_time}–{s.end_time}
              </Text>
              <View className={`rounded px-2 py-0.5 ${statusColor(s.status)}`}>
                <Text className="text-xs font-medium">{statusLabel(s.status)}</Text>
              </View>
              {s.status === "planned" && (
                <TouchableOpacity
                  onPress={() => onPressConfirm(s.id)}
                  className="rounded bg-blue-600 px-2 py-1"
                >
                  <Text className="text-xs font-medium text-white">Bekreft</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {schedules.length > 0 && (
        <>
          <Text className="mb-2 font-medium text-gray-900">Dine vaktplaner</Text>
          {schedules.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onPressSchedule(item.id)}
              activeOpacity={0.7}
              className="mb-3 rounded-lg border border-gray-200 bg-white p-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-medium text-gray-900">
                    {formatPeriod(item.period_start, item.period_end)}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-600">
                    {sourceLabel(item.source)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}
