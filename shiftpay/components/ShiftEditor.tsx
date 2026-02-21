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
  saved: boolean;
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
  saved,
  onUpdateRow,
  onRemoveRow,
  onAddRow,
  onCalculate,
  onSave,
  onReset,
}: ShiftEditorProps) {
  const { t, locale } = useTranslation();
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
            <View className="flex-row flex-wrap items-center gap-2">
              <TextInput
                value={date}
                onChangeText={(s) => onUpdateRow(index, "date", s)}
                placeholder="DD.MM.YYYY"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Date"
                className="min-w-[100px] rounded-lg border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-2 py-1 text-slate-900 dark:text-slate-100"
              />
              <TextInput
                value={start_time}
                onChangeText={(s) => onUpdateRow(index, "start_time", s)}
                placeholder="HH:MM"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Start time"
                className="w-16 rounded-lg border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-2 py-1 text-slate-900 dark:text-slate-100"
              />
              <Text className="self-center text-slate-600 dark:text-slate-400">–</Text>
              <TextInput
                value={end_time}
                onChangeText={(s) => onUpdateRow(index, "end_time", s)}
                placeholder="HH:MM"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="End time"
                className="w-16 rounded-lg border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-2 py-1 text-slate-900 dark:text-slate-100"
              />
              <View className="flex-row gap-1">
                {SHIFT_TYPES.map((type) => (
                  <PressableScale
                    key={type}
                    onPress={() => onUpdateRow(index, "shift_type", type)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: displayType === type }}
                    accessibilityLabel={t(`shiftTypes.${type}`)}
                    className={`rounded-full px-2 py-1 ${
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
              <PressableScale
                onPress={() => onRemoveRow(index)}
                className="ml-auto rounded-lg p-2"
                accessibilityLabel="Remove row"
              >
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </PressableScale>
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

      <PressableScale
        onPress={onCalculate}
        disabled={calculating}
        style={calculating ? { opacity: 0.6 } : undefined}
        className="mt-2 rounded-xl bg-emerald-500 py-4"
      >
        {calculating ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text className="text-center font-inter-semibold text-white">{t("components.shiftEditor.calculate")}</Text>
        )}
      </PressableScale>

      {expectedPay !== null && (
        <View className="mt-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
          <Text className="text-lg font-display text-amber-600 dark:text-warm">
            {t("components.shiftEditor.result", { amount: formatCurrency(expectedPay, locale) })}
          </Text>
          <View className="mt-2 rounded-lg bg-app-elevated dark:bg-dark-elevated p-2">
            <Text className="text-xs text-slate-600 dark:text-slate-400">
              {t("components.shiftEditor.disclaimer")}
            </Text>
          </View>
          <PressableScale
            onPress={onSave}
            disabled={saving}
            style={saving ? { opacity: 0.6 } : undefined}
            className="mt-3 rounded-xl bg-accent-dark dark:bg-accent py-3"
          >
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text className="text-center font-inter-semibold text-white dark:text-slate-900">{t("components.shiftEditor.save")}</Text>
            )}
          </PressableScale>
        </View>
      )}

      {saved && (
        <Text
          className="mt-3 text-center text-emerald-600 dark:text-emerald-400"
          accessibilityLiveRegion="polite"
        >
          {t("components.shiftEditor.saved")}
        </Text>
      )}

      <PressableScale
        onPress={onReset}
        className="mt-4 rounded-xl border border-app-border dark:border-dark-border py-2"
      >
        <Text className="text-center font-inter-medium text-slate-700 dark:text-slate-300">{t("components.shiftEditor.reset")}</Text>
      </PressableScale>
    </>
  );
}
