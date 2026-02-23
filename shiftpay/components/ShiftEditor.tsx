import { View, Text, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CsvRowResult } from "../lib/csv";
import type { Shift, ShiftType } from "../lib/calculations";
import { useTranslation } from "../lib/i18n";
import { formatCurrency } from "../lib/format";
import { PressableScale } from "./PressableScale";
import { useThemeColors } from "../lib/theme-context";

export type ImportSource = "ocr" | "manual" | "gallery" | "csv";

const SHIFT_TYPES: ShiftType[] = ["tidlig", "mellom", "kveld", "natt"];

interface ShiftEditorProps {
  rows: CsvRowResult[];
  source: ImportSource;
  expectedPay: number | null;
  saving: boolean;
  calculating: boolean;
  onUpdateRow: (index: number, field: keyof Shift, value: string) => void;
  onRemoveRow: (index: number) => void;
  onAddRow: () => void;
  onCalculate: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function ShiftEditor({
  rows,
  source,
  expectedPay,
  saving,
  calculating,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  onCalculate,
  onSave,
  onReset,
}: ShiftEditorProps) {
  const { t, currency } = useTranslation();
  const colors = useThemeColors();
  const sourceKey = `components.shiftEditor.sources.${source}` as const;
  const sourceTag = t(sourceKey);

  return (
    <>
      <Text className="mb-2 font-inter-medium text-slate-900 dark:text-slate-100">
        {t("components.shiftEditor.header", { source: sourceTag })}
      </Text>
      {rows.map((row, index) => {
        const isError = !row.ok;
        const date = row.ok ? row.shift.date : row.date;
        const start_time = row.ok ? row.shift.start_time : row.start_time;
        const end_time = row.ok ? row.shift.end_time : row.end_time;
        const displayType = row.ok ? row.shift.shift_type : row.shift_type || "tidlig";
        const rowLabel = t("components.shiftEditor.shiftRow") + " " + (index + 1);
        return (
          <View
            key={`row-${index}`}
            className={`mb-3 rounded-xl border bg-app-surface dark:bg-dark-surface p-3 ${
              isError ? "border-l-4 border-l-amber-500 border-app-border dark:border-dark-border" : "border-app-border dark:border-dark-border"
            }`}
          >
            {isError && (
              <Text className="mb-2 text-sm text-amber-700 dark:text-amber-300">
                {t("components.shiftEditor.errors.check", { reason: row.reason })}
              </Text>
            )}
            {/* Row 1: Date, times, delete */}
            <View className="flex-row items-center gap-2">
              <TextInput
                value={date}
                onChangeText={(s) => onUpdateRow(index, "date", s)}
                placeholder="DD.MM.YYYY"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t("confirm.editFields.date") + ", " + rowLabel}
                className="min-w-[100px] flex-1 rounded-lg border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-2 py-1 text-slate-900 dark:text-slate-100"
                style={{ minHeight: 44 }}
              />
              <TextInput
                value={start_time}
                onChangeText={(s) => onUpdateRow(index, "start_time", s)}
                placeholder="HH:MM"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t("confirm.editFields.start") + ", " + rowLabel}
                className="w-[72px] rounded-lg border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-2 py-1 text-slate-900 dark:text-slate-100"
                style={{ minHeight: 44 }}
              />
              <Text className="text-slate-600 dark:text-slate-400">{"\u2013"}</Text>
              <TextInput
                value={end_time}
                onChangeText={(s) => onUpdateRow(index, "end_time", s)}
                placeholder="HH:MM"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t("confirm.editFields.end") + ", " + rowLabel}
                className="w-[72px] rounded-lg border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-2 py-1 text-slate-900 dark:text-slate-100"
                style={{ minHeight: 44 }}
              />
              <PressableScale
                onPress={() => onRemoveRow(index)}
                className="ml-auto rounded-lg p-2"
                accessibilityLabel={t("components.shiftCard.deleteA11y", { date })}
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </PressableScale>
            </View>
            {/* Row 2: Shift type pills */}
            <View
              className="mt-2 flex-row gap-1"
              accessibilityRole="radiogroup"
              accessibilityLabel={t("shiftTypes.label")}
            >
              {SHIFT_TYPES.map((type) => (
                <PressableScale
                  key={type}
                  onPress={() => onUpdateRow(index, "shift_type", type)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: displayType === type }}
                  accessibilityLabel={t(`shiftTypes.${type}`)}
                  className={`flex-1 items-center rounded-full px-2 py-1 ${
                    displayType === type ? "bg-accent-dark dark:bg-accent" : "bg-app-elevated dark:bg-dark-elevated"
                  }`}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text className={displayType === type ? "font-inter-medium text-white dark:text-slate-900" : "text-slate-700 dark:text-slate-300"}>
                    {t(`shiftTypes.${type}`)}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>
        );
      })}

      {source === "manual" && (
        <PressableScale
          onPress={onAddRow}
          className="mb-3 rounded-xl border border-dashed border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface py-3"
        >
          <Text className="text-center text-slate-600 dark:text-slate-400">{t("components.shiftEditor.addShift")}</Text>
        </PressableScale>
      )}

      {/* Primary CTA: Save & calculate */}
      <PressableScale
        onPress={onSave}
        disabled={saving}
        accessibilityLabel={t("components.shiftEditor.saveAndCalculate")}
        style={saving ? { opacity: 0.6 } : undefined}
        className="mt-2 rounded-xl bg-accent-dark dark:bg-accent py-4"
      >
        {saving ? (
          <ActivityIndicator color={colors.bg} accessibilityLabel={t("common.loading")} />
        ) : (
          <Text className="text-center font-inter-semibold text-white dark:text-slate-900">{t("components.shiftEditor.saveAndCalculate")}</Text>
        )}
      </PressableScale>

      {/* Secondary: Calculate preview */}
      <PressableScale
        onPress={onCalculate}
        disabled={calculating}
        accessibilityLabel={t("components.shiftEditor.calculate")}
        style={calculating ? { opacity: 0.6 } : undefined}
        className="mt-3 rounded-xl border border-app-border dark:border-dark-border py-4"
      >
        {calculating ? (
          <ActivityIndicator color={colors.textPrimary} accessibilityLabel={t("common.loading")} />
        ) : (
          <Text className="text-center font-inter-medium text-slate-700 dark:text-slate-300">{t("components.shiftEditor.calculate")}</Text>
        )}
      </PressableScale>

      {/* Result panel (no Save button inside) */}
      {expectedPay !== null && (
        <View className="mt-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
          <Text className="text-lg font-display text-amber-600 dark:text-warm">
            {t("components.shiftEditor.result", { amount: formatCurrency(expectedPay, currency) })}
          </Text>
          <View className="mt-2 rounded-lg bg-app-elevated dark:bg-dark-elevated p-2">
            <Text className="text-xs text-slate-600 dark:text-slate-400">
              {t("components.shiftEditor.disclaimer")}
            </Text>
          </View>
        </View>
      )}

      {/* Tertiary: Start over */}
      <PressableScale
        onPress={onReset}
        accessibilityLabel={t("components.shiftEditor.reset")}
        className="mt-4 rounded-xl border border-app-border dark:border-dark-border py-2"
      >
        <Text className="text-center font-inter-medium text-slate-700 dark:text-slate-300">{t("components.shiftEditor.reset")}</Text>
      </PressableScale>
    </>
  );
}
