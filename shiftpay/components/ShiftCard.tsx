import { View, Text, TouchableOpacity } from "react-native";
import { statusLabel, statusColor } from "../lib/format";
import type { ShiftRow } from "../lib/db";

interface ShiftCardProps {
  shift: ShiftRow;
  /** If provided, shows a "Bekreft" button when shift.status === "planned". */
  onConfirm?: (id: string) => void;
  /** Show "+X min overtid" label for overtime shifts. */
  showOvertimeLabel?: boolean;
  /** Compact layout used on Dashboard (no separate date/time, smaller text). */
  compact?: boolean;
  /** Show shift_type badge. */
  showShiftType?: boolean;
}

export function ShiftCard({
  shift,
  onConfirm,
  showOvertimeLabel,
  compact,
  showShiftType,
}: ShiftCardProps) {
  const containerClass = compact
    ? "mt-2 flex-row flex-wrap items-center gap-2 rounded border border-gray-100 bg-gray-50 p-2"
    : "mb-2 flex-row flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3";

  return (
    <View className={containerClass}>
      {compact ? (
        <Text className="text-gray-900">
          {shift.date} {shift.start_time}–{shift.end_time}
        </Text>
      ) : (
        <>
          <Text className="font-medium text-gray-900">{shift.date}</Text>
          <Text className="text-gray-600">
            {shift.start_time} – {shift.end_time}
          </Text>
        </>
      )}
      {showShiftType && (
        <View className="rounded bg-gray-200 px-2 py-0.5">
          <Text className="text-sm text-gray-700">{shift.shift_type}</Text>
        </View>
      )}
      <View className={`rounded px-2 py-0.5 ${statusColor(shift.status)}`}>
        <Text className={compact ? "text-xs font-medium" : "text-sm"}>
          {statusLabel(shift.status)}
        </Text>
      </View>
      {onConfirm && shift.status === "planned" && (
        <TouchableOpacity
          onPress={() => onConfirm(shift.id)}
          className={compact ? "rounded bg-blue-600 px-2 py-1" : "rounded bg-blue-600 px-3 py-1"}
        >
          <Text className={compact ? "text-xs font-medium text-white" : "text-sm font-medium text-white"}>
            Bekreft
          </Text>
        </TouchableOpacity>
      )}
      {showOvertimeLabel && shift.status === "overtime" && (shift.overtime_minutes ?? 0) > 0 && (
        <Text className="text-sm text-blue-700">
          +{shift.overtime_minutes} min overtid
        </Text>
      )}
    </View>
  );
}
