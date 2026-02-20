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
import type { ShiftRow } from "../../lib/db";
import { calculateExpectedPay, calculateOvertimePay, type Shift } from "../../lib/calculations";
import { shiftRowToShift } from "../../lib/format";
import { ShiftCard } from "../../components/ShiftCard";

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
      const pay = calculateExpectedPay(shiftsForPay, rates);
      setExpectedPay(pay + calculateOvertimePay(paidShifts, rates.base_rate));
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
          <ShiftCard
            key={shift.id}
            shift={shift}
            showShiftType
            showOvertimeLabel
          />
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
