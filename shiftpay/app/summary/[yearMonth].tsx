import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getMonthSummary, getTariffRates } from "../../lib/db";
import type { ShiftRow, ShiftStatus } from "../../lib/db";
import { calculateExpectedPay, shiftDurationHours, type Shift } from "../../lib/calculations";

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

function monthName(month: number): string {
  const names = [
    "Januar", "Februar", "Mars", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Desember",
  ];
  return names[month - 1] ?? "";
}

export default function SummaryScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getMonthSummary>> | null>(null);
  const [expectedPay, setExpectedPay] = useState(0);
  const [invalid, setInvalid] = useState(false);

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
      let pay = calculateExpectedPay(shiftsForPay, rates);
      const overtimePay = paidShifts.reduce(
        (sum, sh) => sum + ((sh.overtime_minutes ?? 0) / 60) * rates.base_rate,
        0
      );
      setExpectedPay(pay + overtimePay);
    } catch {
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (invalid || !summary) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-gray-600">Ugyldig måned eller ingen data.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2"
        >
          <Text className="text-white">Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [y, m] = yearMonth!.split("-").map(Number);
  const month = m ?? 0;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text className="mb-4 text-xl font-semibold text-gray-900">
        {monthName(month)} {y}
      </Text>

      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <Text className="font-medium text-gray-900">Vakter</Text>
        <View className="mt-2 flex-row flex-wrap gap-3">
          <Text className="text-gray-600">
            Planlagt: {summary.plannedShifts} vakter, {summary.plannedHours.toFixed(1)} t
          </Text>
          <Text className="text-gray-600">
            Fullført: {summary.completedShifts} · Overtid: {summary.overtimeShifts} · Ikke møtt: {summary.missedShifts}
          </Text>
        </View>
        <View className="mt-2 flex-row flex-wrap gap-3">
          <Text className="text-gray-600">
            Faktisk tid: {summary.actualHours.toFixed(1)} t
          </Text>
          {summary.overtimeHours > 0 && (
            <Text className="text-blue-700">Overtid: {summary.overtimeHours.toFixed(1)} t</Text>
          )}
        </View>
      </View>

      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <Text className="font-medium text-gray-900">Forventet lønn</Text>
        <Text className="mt-1 text-lg font-semibold text-gray-900">
          {expectedPay.toFixed(2)} kr
        </Text>
        <Text className="mt-1 text-sm text-gray-500">
          Basert på fullførte vakter og overtid
        </Text>
      </View>

      <Text className="mb-2 font-medium text-gray-900">Vakter denne måneden</Text>
      {summary.shifts.length === 0 ? (
        <Text className="rounded-lg border border-gray-200 bg-white p-4 text-gray-500">
          Ingen vakter registrert.
        </Text>
      ) : (
        summary.shifts.map((shift) => (
          <View
            key={shift.id}
            className="mb-2 flex-row flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
          >
            <Text className="font-medium text-gray-900">{shift.date}</Text>
            <Text className="text-gray-600">
              {shift.start_time}–{shift.end_time}
            </Text>
            <View className="rounded bg-gray-200 px-2 py-0.5">
              <Text className="text-sm text-gray-700">{shift.shift_type}</Text>
            </View>
            <View className={`rounded px-2 py-0.5 ${statusColor(shift.status)}`}>
              <Text className="text-sm">{statusLabel(shift.status)}</Text>
            </View>
            {shift.status === "overtime" && (shift.overtime_minutes ?? 0) > 0 && (
              <Text className="text-sm text-blue-700">
                +{shift.overtime_minutes} min overtid
              </Text>
            )}
          </View>
        ))
      )}

      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-6 rounded-lg border border-gray-300 bg-white py-3"
      >
        <Text className="text-center font-medium text-gray-700">Tilbake</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
