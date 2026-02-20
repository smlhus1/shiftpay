import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMonthSummary, getTariffRates, getDistinctMonthsWithShifts } from "../../lib/db";
import type { ShiftRow } from "../../lib/db";
import { calculateExpectedPay, calculateOvertimePay, type Shift } from "../../lib/calculations";
import { shiftRowToShift } from "../../lib/format";
import { ShiftCard } from "../../components/ShiftCard";
import { useTranslation } from "../../lib/i18n";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center rounded-xl border border-stone-200 bg-white p-3">
      <Text className="text-2xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-0.5 text-center text-xs text-slate-500">{label}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const { yearMonth } = useLocalSearchParams<{ yearMonth: string }>();
  const router = useRouter();
  const { t } = useTranslation();
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
      const currentKey = `${year}-${String(month).padStart(2, "0")}`;
      const idx = allMonths.findIndex(
        (mo) => `${mo.year}-${String(mo.month).padStart(2, "0")}` === currentKey
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (invalid || !summary) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 p-6">
        <Text className="text-center text-slate-500">{t("summary.invalid")}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-teal-700 px-6 py-3"
        >
          <Text className="text-white">{t("summary.back")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [y, m] = yearMonth!.split("-").map(Number);
  const month = m ?? 0;
  const monthKey = MONTH_KEYS[(month - 1)] ?? "jan";
  const monthName = t(`months.${monthKey}`);

  return (
    <ScrollView
      className="flex-1 bg-stone-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View className="mb-4 flex-row items-center justify-between">
        {adjacentMonths.prev ? (
          <TouchableOpacity
            onPress={() => {
              const p = adjacentMonths.prev!;
              router.replace(`/summary/${p.year}-${String(p.month).padStart(2, "0")}` as any);
            }}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="chevron-back" size={18} color="#0f766e" />
            <Text className="text-sm font-medium text-teal-700">
              {t(`months.${MONTH_KEYS[(adjacentMonths.prev.month - 1)] ?? "jan"}`)}
            </Text>
          </TouchableOpacity>
        ) : <View />}

        {adjacentMonths.next ? (
          <TouchableOpacity
            onPress={() => {
              const n = adjacentMonths.next!;
              router.replace(`/summary/${n.year}-${String(n.month).padStart(2, "0")}` as any);
            }}
            className="flex-row items-center gap-1"
          >
            <Text className="text-sm font-medium text-teal-700">
              {t(`months.${MONTH_KEYS[(adjacentMonths.next.month - 1)] ?? "jan"}`)}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#0f766e" />
          </TouchableOpacity>
        ) : <View />}
      </View>

      <Text className="mb-4 text-xl font-semibold text-slate-900">
        {monthName} {y}
      </Text>

      {/* Dominant pay card */}
      <View className="mb-4 rounded-xl bg-teal-700 p-5">
        <Text className="text-sm font-medium text-teal-100">{t("summary.expectedPay.title")}</Text>
        <Text className="mt-1 text-3xl font-bold text-white">
          {Math.round(expectedPay).toLocaleString("nb-NO")} kr
        </Text>
        <Text className="mt-1 text-xs text-teal-200">{t("summary.expectedPay.subtitle")}</Text>
      </View>

      {/* Stat boxes */}
      <View className="mb-4 flex-row gap-3">
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
      </View>

      {/* Hours detail */}
      <View className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
        <Text className="font-medium text-slate-900">{t("summary.shifts.title")}</Text>
        <View className="mt-2 flex-row flex-wrap gap-3">
          <Text className="text-slate-500">
            {t("summary.shifts.actual", { hours: summary.actualHours.toFixed(1) })}
          </Text>
          <Text className="text-slate-500">
            {t("summary.shifts.missed", { count: summary.missedShifts })}
          </Text>
          {summary.overtimeHours > 0 && (
            <Text className="text-teal-700">{t("summary.shifts.overtimeHours", { hours: summary.overtimeHours.toFixed(1) })}</Text>
          )}
        </View>
      </View>

      <Text className="mb-2 font-medium text-slate-900">{t("summary.list.title")}</Text>
      {summary.shifts.length === 0 ? (
        <Text className="rounded-xl border border-stone-200 bg-white p-4 text-slate-400">
          {t("summary.list.empty")}
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
        className="mt-6 rounded-xl border border-stone-300 bg-white py-3"
      >
        <Text className="text-center font-medium text-slate-700">{t("summary.back")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
