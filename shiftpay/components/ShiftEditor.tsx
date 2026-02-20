import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CsvRowResult } from "../lib/csv";
import type { Shift, ShiftType } from "../lib/calculations";
import { useTranslation } from "../lib/i18n";
import { formatCurrency } from "../lib/format";

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
  const sourceKey = `components.shiftEditor.sources.${source}` as const;
  const sourceTag = t(sourceKey);

  return (
    <>
      <Text className="mb-2 font-medium text-slate-900">
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
            className={`mb-3 rounded-xl border bg-white p-3 ${
              isError ? "border-l-4 border-l-amber-500 border-stone-200" : "border-stone-200"
            }`}
          >
            {isError && (
              <Text className="mb-2 text-sm text-amber-800">
                {t("components.shiftEditor.errors.check", { reason: row.reason })}
              </Text>
            )}
            <View className="flex-row flex-wrap items-center gap-2">
              <TextInput
                value={date}
                onChangeText={(s) => onUpdateRow(index, "date", s)}
                placeholder="DD.MM.YYYY"
                accessibilityLabel="Date"
                className="min-w-[100px] rounded-lg border border-stone-200 px-2 py-1 text-slate-900"
              />
              <TextInput
                value={start_time}
                onChangeText={(s) => onUpdateRow(index, "start_time", s)}
                placeholder="HH:MM"
                accessibilityLabel="Start time"
                className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-slate-900"
              />
              <Text className="self-center text-slate-400">–</Text>
              <TextInput
                value={end_time}
                onChangeText={(s) => onUpdateRow(index, "end_time", s)}
                placeholder="HH:MM"
                accessibilityLabel="End time"
                className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-slate-900"
              />
              <View className="flex-row gap-1">
                {SHIFT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => onUpdateRow(index, "shift_type", type)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: displayType === type }}
                    accessibilityLabel={t(`shiftTypes.${type}`)}
                    className={`rounded-full px-2 py-1 ${
                      displayType === type ? "bg-teal-700" : "bg-stone-200"
                    }`}
                    style={{ minHeight: 44, justifyContent: "center" }}
                  >
                    <Text className={displayType === type ? "text-white" : "text-slate-700"}>
                      {t(`shiftTypes.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => onRemoveRow(index)}
                className="ml-auto rounded-lg p-2"
                accessibilityLabel="Remove row"
              >
                <Ionicons name="trash-outline" size={22} color="#b91c1c" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {source === "manual" && (
        <TouchableOpacity
          onPress={onAddRow}
          className="mb-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 py-3"
        >
          <Text className="text-center text-slate-500">{t("components.shiftEditor.addShift")}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={onCalculate}
        disabled={calculating}
        style={calculating ? { opacity: 0.6 } : undefined}
        className="mt-2 rounded-xl bg-green-600 py-4"
      >
        {calculating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center font-medium text-white">{t("components.shiftEditor.calculate")}</Text>
        )}
      </TouchableOpacity>

      {expectedPay !== null && (
        <View className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <Text className="text-lg font-medium text-slate-900">
            {t("components.shiftEditor.result", { amount: formatCurrency(expectedPay, locale) })}
          </Text>
          <View className="mt-2 rounded-lg bg-stone-100 p-2">
            <Text className="text-xs text-slate-500">
              {t("components.shiftEditor.disclaimer")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            style={saving ? { opacity: 0.6 } : undefined}
            className="mt-3 rounded-xl bg-teal-700 py-3"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-white">{t("components.shiftEditor.save")}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {saved && (
        <Text
          className="mt-3 text-center text-green-600"
          accessibilityLiveRegion="polite"
        >
          {t("components.shiftEditor.saved")}
        </Text>
      )}

      <TouchableOpacity
        onPress={onReset}
        className="mt-4 rounded-xl border border-stone-300 py-2"
      >
        <Text className="text-center text-slate-700">{t("components.shiftEditor.reset")}</Text>
      </TouchableOpacity>
    </>
  );
}
