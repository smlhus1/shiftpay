import { View, Text, TouchableOpacity } from "react-native";
import { statusLabel, statusColor } from "../lib/format";
import type { ShiftRow } from "../lib/db";
import { useTranslation } from "../lib/i18n";

interface ShiftCardProps {
  shift: ShiftRow;
  /** If provided, shows a "Confirm" button when shift.status === "planned". */
  onConfirm?: (id: string) => void;
  /** If provided, shows an "Edit" button for all non-planned statuses. */
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
  const containerClass = compact
    ? "mt-2 flex-row flex-wrap items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 p-2"
    : "mb-2 flex-row flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-3";

  return (
    <View className={containerClass}>
      {compact ? (
        <Text className="text-slate-900">
          {shift.date} {shift.start_time}–{shift.end_time}
        </Text>
      ) : (
        <>
          <Text className="font-medium text-slate-900">{shift.date}</Text>
          <Text className="text-slate-500">
            {shift.start_time} – {shift.end_time}
          </Text>
        </>
      )}
      {showShiftType && (
        <View className={`rounded-full px-2 py-0.5 ${shiftTypeBadgeColor(shift.shift_type)}`}>
          <Text className="text-sm">{shift.shift_type}</Text>
        </View>
      )}
      <View className={`rounded-full px-2 py-0.5 ${statusColor(shift.status)}`}>
        <Text className={compact ? "text-xs font-medium" : "text-sm"}>
          {statusLabel(shift.status, t)}
        </Text>
      </View>
      {onConfirm && shift.status === "planned" && (
        <TouchableOpacity
          onPress={() => onConfirm(shift.id)}
          accessibilityRole="button"
          accessibilityLabel={t("components.shiftCard.confirmA11y", { date: shift.date })}
          className="rounded-xl bg-teal-700 px-3 py-2"
        >
          <Text className={compact ? "text-xs font-medium text-white" : "text-sm font-medium text-white"}>
            {t("components.shiftCard.confirm")}
          </Text>
        </TouchableOpacity>
      )}
      {onEdit && shift.status !== "planned" && (
        <TouchableOpacity
          onPress={() => onEdit(shift.id)}
          accessibilityRole="button"
          className="rounded-xl border border-stone-300 bg-white px-3 py-2"
        >
          <Text className={compact ? "text-xs font-medium text-slate-600" : "text-sm font-medium text-slate-600"}>
            {t("components.shiftCard.edit")}
          </Text>
        </TouchableOpacity>
      )}
      {showOvertimeLabel && shift.status === "overtime" && (shift.overtime_minutes ?? 0) > 0 && (
        <Text className="text-sm text-teal-700">
          {t("components.shiftCard.overtime", { minutes: shift.overtime_minutes })}
        </Text>
      )}
    </View>
  );
}
