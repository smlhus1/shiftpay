import { useState, useCallback } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { ThemedTextInput } from "@/components/ThemedTextInput";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  insertScheduleWithShifts,
  getExistingShiftKeys,
  updateShiftPayType,
  type PayType,
} from "@/lib/db";
import { scheduleShiftReminder } from "@/lib/notifications";
import { useTranslation } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { PressableScale } from "@/components/PressableScale";
import { useAnnounceWhen } from "@/lib/ui/announce";

const SHIFT_TYPES = ["tidlig", "mellom", "kveld", "natt"] as const;

function classifyShiftType(time: string): string | null {
  const match = time.match(/^(\d{1,2}):\d{2}$/);
  if (!match) return null;
  const hour = parseInt(match[1]!, 10);
  if (hour >= 6 && hour < 12) return "tidlig";
  if (hour >= 12 && hour < 16) return "mellom";
  if (hour >= 16 && hour < 22) return "kveld";
  return "natt";
}

export default function AddShiftScreen() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Pre-fill date from month param (YYYY-MM -> DD.MM.YYYY with day 01)
  const initialDate = month
    ? (() => {
        const [y, m] = month.split("-");
        return `01.${m}.${y}`;
      })()
    : "";

  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [shiftType, setShiftType] = useState<string>("tidlig");
  const [payType, setPayType] = useState<PayType>("regular");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      Alert.alert(t("common.error"), t("csvErrors.invalidDate"));
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(startTime)) {
      Alert.alert(t("common.error"), t("csvErrors.invalidStart"));
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(endTime)) {
      Alert.alert(t("common.error"), t("csvErrors.invalidEnd"));
      return;
    }

    // Dedup check
    const existingKeys = await getExistingShiftKeys();
    const key = `${date}|${startTime}|${endTime}`;
    if (existingKeys.has(key)) {
      Alert.alert(t("common.error"), t("addShift.duplicate"));
      return;
    }

    setSaving(true);
    try {
      const autoType = classifyShiftType(startTime) ?? shiftType;
      const result = await insertScheduleWithShifts(date, date, "manual", [
        { date, start_time: startTime, end_time: endTime, shift_type: autoType },
      ]);
      const firstShift = result.shifts[0];
      // Set pay_type if extra
      if (payType === "extra" && firstShift) {
        await updateShiftPayType(firstShift.id, "extra");
      }
      // Schedule notification for future shifts
      if (firstShift) {
        await scheduleShiftReminder(firstShift).catch(() => {});
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => router.back(), 1500);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("import.alerts.saveError"));
    } finally {
      setSaving(false);
    }
  }, [date, startTime, endTime, shiftType, payType, router, t]);

  useAnnounceWhen(saved ? t("addShift.saved") : null);

  if (saved) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg p-8 dark:bg-dark-bg">
        <Text className="font-inter-semibold text-xl text-emerald-600 dark:text-emerald-400">
          {t("addShift.saved")}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-app-bg dark:bg-dark-bg"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Date */}
        <View className="mb-4">
          <Text className="mb-1.5 font-inter-medium text-sm text-stone-700 dark:text-stone-300">
            {t("addShift.date")}
          </Text>
          <ThemedTextInput
            value={date}
            onChangeText={setDate}
            placeholder="DD.MM.YYYY"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel={t("addShift.date")}
            className="min-h-[48px] rounded-xl border border-app-border bg-app-surface px-4 py-3 text-stone-900 dark:border-dark-border dark:bg-dark-surface dark:text-stone-100"
          />
        </View>

        {/* Start / End */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1.5 font-inter-medium text-sm text-stone-700 dark:text-stone-300">
              {t("addShift.startTime")}
            </Text>
            <ThemedTextInput
              value={startTime}
              onChangeText={(v) => {
                setStartTime(v);
                const auto = classifyShiftType(v);
                if (auto) setShiftType(auto);
              }}
              placeholder="07:00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t("addShift.startTime")}
              className="min-h-[48px] rounded-xl border border-app-border bg-app-surface px-4 py-3 text-stone-900 dark:border-dark-border dark:bg-dark-surface dark:text-stone-100"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1.5 font-inter-medium text-sm text-stone-700 dark:text-stone-300">
              {t("addShift.endTime")}
            </Text>
            <ThemedTextInput
              value={endTime}
              onChangeText={setEndTime}
              placeholder="15:00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel={t("addShift.endTime")}
              className="min-h-[48px] rounded-xl border border-app-border bg-app-surface px-4 py-3 text-stone-900 dark:border-dark-border dark:bg-dark-surface dark:text-stone-100"
            />
          </View>
        </View>

        {/* Shift type pills */}
        <View className="mb-4">
          <Text className="mb-1.5 font-inter-medium text-sm text-stone-700 dark:text-stone-300">
            {t("addShift.shiftType")}
          </Text>
          <View
            className="flex-row gap-2"
            accessibilityRole="radiogroup"
            accessibilityLabel={t("addShift.shiftType")}
          >
            {SHIFT_TYPES.map((type) => (
              <PressableScale
                key={type}
                onPress={() => setShiftType(type)}
                accessibilityRole="radio"
                accessibilityState={{ checked: shiftType === type }}
                className={`flex-1 items-center rounded-xl py-2.5 ${shiftType === type ? "bg-accent-dark dark:bg-accent" : "border border-app-border bg-app-surface dark:border-dark-border dark:bg-dark-surface"}`}
              >
                <Text
                  className={`font-inter-medium text-sm ${shiftType === type ? "text-white dark:text-stone-900" : "text-stone-700 dark:text-stone-300"}`}
                >
                  {t(`shiftTypes.${type}`)}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Pay type toggle */}
        <View className="mb-6">
          <Text className="mb-1.5 font-inter-medium text-sm text-stone-700 dark:text-stone-300">
            {t("addShift.payType")}
          </Text>
          <View
            className="flex-row gap-2"
            accessibilityRole="radiogroup"
            accessibilityLabel={t("addShift.payType")}
          >
            {(["regular", "extra"] as const).map((type) => (
              <PressableScale
                key={type}
                onPress={() => setPayType(type)}
                accessibilityRole="radio"
                accessibilityState={{ checked: payType === type }}
                className={`flex-1 items-center rounded-xl py-3 ${payType === type ? "bg-accent-dark dark:bg-accent" : "border border-app-border bg-app-surface dark:border-dark-border dark:bg-dark-surface"}`}
              >
                <Text
                  className={`font-inter-medium ${payType === type ? "text-white dark:text-stone-900" : "text-stone-700 dark:text-stone-300"}`}
                >
                  {t(`addShift.${type}`)}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Save button */}
        <PressableScale
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={t("addShift.save")}
          accessibilityState={{ disabled: saving }}
          style={saving ? { opacity: 0.6 } : undefined}
          className="rounded-xl bg-accent-dark py-4 dark:bg-accent"
        >
          <Text className="text-center font-inter-semibold text-white dark:text-stone-900">
            {t("addShift.save")}
          </Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
