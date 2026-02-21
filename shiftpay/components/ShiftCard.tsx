import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { statusLabel, statusColor, shiftTypeLabel } from "../lib/format";
import type { ShiftRow } from "../lib/db";
import { useTranslation } from "../lib/i18n";
import { PressableScale } from "./PressableScale";
import { useThemeColors } from "../lib/theme-context";

interface ShiftCardProps {
  shift: ShiftRow;
  onConfirm?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showOvertimeLabel?: boolean;
  compact?: boolean;
  showShiftType?: boolean;
}

function shiftTypeBadgeColor(type: string): string {
  if (type === "tidlig") return "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300";
  if (type === "mellom") return "bg-sky-100 dark:bg-sky-400/15 text-sky-700 dark:text-sky-300";
  if (type === "kveld") return "bg-indigo-100 dark:bg-indigo-400/15 text-indigo-700 dark:text-indigo-300";
  return "bg-slate-100 dark:bg-slate-400/15 text-slate-600 dark:text-slate-400"; // natt
}

export function ShiftCard({
  shift,
  onConfirm,
  onEdit,
  onDelete,
  showOvertimeLabel,
  compact,
  showShiftType,
}: ShiftCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tappable = !!onEdit;

  if (compact) {
    return (
      <View className="mt-2 flex-row flex-wrap items-center gap-2 rounded-xl border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated p-2">
        <Text className="text-slate-900 dark:text-slate-100">
          {shift.date} {shift.start_time}–{shift.end_time}
        </Text>
        <View className={`rounded-full px-2 py-0.5 ${statusColor(shift.status)}`}>
          <Text className="text-xs font-inter-medium">{statusLabel(shift.status, t)}</Text>
        </View>
        {onConfirm && shift.status === "planned" && (
          <PressableScale
            onPress={() => onConfirm(shift.id)}
            accessibilityLabel={t("components.shiftCard.confirmA11y", { date: shift.date })}
            className="rounded-xl bg-accent-dark dark:bg-accent px-3 py-2"
          >
            <Text className="text-xs font-inter-semibold text-white dark:text-slate-900">{t("components.shiftCard.confirm")}</Text>
          </PressableScale>
        )}
      </View>
    );
  }

  const badges = (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {showShiftType && (
        <View className={`rounded-full px-2 py-0.5 ${shiftTypeBadgeColor(shift.shift_type)}`}>
          <Text className="text-sm font-inter">{shiftTypeLabel(shift.shift_type, t)}</Text>
        </View>
      )}
      <View className={`rounded-full px-2 py-0.5 ${statusColor(shift.status)}`}>
        <Text className="text-sm font-inter">{statusLabel(shift.status, t)}</Text>
      </View>
      {showOvertimeLabel && shift.status === "overtime" && (shift.overtime_minutes ?? 0) > 0 && (
        <Text className="text-sm text-accent-dark dark:text-accent">
          {t("components.shiftCard.overtime", { minutes: shift.overtime_minutes })}
        </Text>
      )}
    </View>
  );

  if (tappable) {
    return (
      <PressableScale
        onPress={() => onEdit!(shift.id)}
        accessibilityLabel={`${shift.date} ${shift.start_time}–${shift.end_time}`}
        className="mb-2 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-3"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-inter-medium text-slate-900 dark:text-slate-100">{shift.date}</Text>
              <Text className="text-slate-600 dark:text-slate-400">{shift.start_time} – {shift.end_time}</Text>
            </View>
            {badges}
          </View>
          <View className="flex-row items-center gap-1">
            {onDelete && (
              <PressableScale
                onPress={() => onDelete(shift.id)}
                accessibilityLabel={t("components.shiftCard.deleteA11y", { date: shift.date })}
                hitSlop={8}
                className="p-2"
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </PressableScale>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 4 }} importantForAccessibility="no" />
          </View>
        </View>
      </PressableScale>
    );
  }

  return (
    <View className="mb-2 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="font-inter-medium text-slate-900 dark:text-slate-100">{shift.date}</Text>
          <Text className="text-slate-600 dark:text-slate-400">{shift.start_time} – {shift.end_time}</Text>
        </View>
        {onDelete && (
          <PressableScale
            onPress={() => onDelete(shift.id)}
            accessibilityLabel={t("components.shiftCard.deleteA11y", { date: shift.date })}
            hitSlop={8}
            className="p-2"
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </PressableScale>
        )}
      </View>
      {badges}
      {onConfirm && shift.status === "planned" && (
        <PressableScale
          onPress={() => onConfirm(shift.id)}
          accessibilityLabel={t("components.shiftCard.confirmA11y", { date: shift.date })}
          className="mt-2 self-start rounded-xl bg-accent-dark dark:bg-accent px-3 py-2"
        >
          <Text className="text-sm font-inter-semibold text-white dark:text-slate-900">{t("components.shiftCard.confirm")}</Text>
        </PressableScale>
      )}
    </View>
  );
}
