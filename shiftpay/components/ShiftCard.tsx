import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { statusLabel, statusColor } from "../lib/format";
import type { ShiftRow } from "../lib/db";
import { useTranslation } from "../lib/i18n";

interface ShiftCardProps {
  shift: ShiftRow;
  /** If provided, shows a "Confirm" button when shift.status === "planned". */
  onConfirm?: (id: string) => void;
  /** If provided, makes the whole card tappable for non-planned shifts. */
  onEdit?: (id: string) => void;
  /** Show "+X min overtime" label for overtime shifts. */
  showOvertimeLabel?: boolean;
  /** Compact layout used on Dashboard (no separate date/time, smaller text). */
  compact?: boolean;
  /** Show shift_type badge. */
  showShiftType?: boolean;
}

function shiftTypeBadgeColor(type: string): string {
  if (type === "tidlig") return "bg-amber-100 text-amber-800";
  if (type === "mellom") return "bg-blue-100 text-blue-800";
  if (type === "kveld") return "bg-indigo-100 text-indigo-800";
  return "bg-slate-200 text-slate-700"; // natt
}

export function ShiftCard({
  shift,
  onConfirm,
  onEdit,
  showOvertimeLabel,
  compact,
  showShiftType,
}: ShiftCardProps) {
  const { t } = useTranslation();
  const tappable = !!onEdit;

  const compactClass = "mt-2 flex-row flex-wrap items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 p-2";
  const normalClass = "mb-2 rounded-xl border bg-white p-3";
  const tappableClass = "mb-2 rounded-xl border border-stone-300 bg-white p-3";

  if (compact) {
    return (
      <View className={compactClass}>
        <Text className="text-slate-900">
          {shift.date} {shift.start_time}–{shift.end_time}
        </Text>
        <View className={`rounded-full px-2 py-0.5 ${statusColor(shift.status)}`}>
          <Text className="text-xs font-medium">{statusLabel(shift.status, t)}</Text>
        </View>
        {onConfirm && shift.status === "planned" && (
          <TouchableOpacity
            onPress={() => onConfirm(shift.id)}
            accessibilityRole="button"
            accessibilityLabel={t("components.shiftCard.confirmA11y", { date: shift.date })}
            className="rounded-xl bg-teal-700 px-3 py-2"
          >
            <Text className="text-xs font-medium text-white">{t("components.shiftCard.confirm")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const badges = (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {showShiftType && (
        <View className={`rounded-full px-2 py-0.5 ${shiftTypeBadgeColor(shift.shift_type)}`}>
          <Text className="text-sm">{shift.shift_type}</Text>
        </View>
      )}
      <View className={`rounded-full px-2 py-0.5 ${statusColor(shift.status)}`}>
        <Text className="text-sm">{statusLabel(shift.status, t)}</Text>
      </View>
      {showOvertimeLabel && shift.status === "overtime" && (shift.overtime_minutes ?? 0) > 0 && (
        <Text className="text-sm text-teal-700">
          {t("components.shiftCard.overtime", { minutes: shift.overtime_minutes })}
        </Text>
      )}
    </View>
  );

  if (tappable) {
    return (
      <TouchableOpacity
        onPress={() => onEdit!(shift.id)}
        activeOpacity={0.75}
        accessibilityRole="button"
        className={tappableClass}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-medium text-slate-900">{shift.date}</Text>
              <Text className="text-slate-500">{shift.start_time} – {shift.end_time}</Text>
            </View>
            {badges}
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View className={normalClass + " border-stone-200"}>
      <View className="flex-row items-center gap-2">
        <Text className="font-medium text-slate-900">{shift.date}</Text>
        <Text className="text-slate-500">{shift.start_time} – {shift.end_time}</Text>
      </View>
      {badges}
      {onConfirm && shift.status === "planned" && (
        <TouchableOpacity
          onPress={() => onConfirm(shift.id)}
          accessibilityRole="button"
          accessibilityLabel={t("components.shiftCard.confirmA11y", { date: shift.date })}
          className="mt-2 self-start rounded-xl bg-teal-700 px-3 py-2"
        >
          <Text className="text-sm font-medium text-white">{t("components.shiftCard.confirm")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
