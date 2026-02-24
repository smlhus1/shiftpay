import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getShiftById, confirmShift, updateShift } from "../../lib/db";
import type { ShiftRow } from "../../lib/db";
import { useTranslation } from "../../lib/i18n";
import { PressableScale } from "../../components/PressableScale";
import { AnimatedCard } from "../../components/AnimatedCard";
import { useThemeColors } from "../../lib/theme-context";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatShiftLabel(shift: ShiftRow): string {
  return `${shift.date} ${shift.start_time}–${shift.end_time} (${shift.shift_type})`;
}

export default function ConfirmShiftScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showOvertime, setShowOvertime] = useState(false);
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeMins, setOvertimeMins] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEditFields, setShowEditFields] = useState(false);

  const load = useCallback(async () => {
    if (!shiftId || !UUID_RE.test(shiftId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const row = await getShiftById(shiftId);
      if (!row) {
        setNotFound(true);
      } else {
        setShift(row);
        setEditDate(row.date);
        setEditStart(row.start_time);
        setEditEnd(row.end_time);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirm = useCallback(
    async (status: "completed" | "missed" | "overtime") => {
      if (!shiftId) return;
      if (status === "overtime") {
        const h = parseInt(overtimeHours, 10) || 0;
        const m = parseInt(overtimeMins, 10) || 0;
        const mins = h * 60 + m;
        if (mins <= 0) {
          Alert.alert(t("confirm.overtimeError.title"), t("confirm.overtimeError.message"));
          return;
        }
        setSubmitting(true);
        try {
          await confirmShift(shiftId, "overtime", mins);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setConfirmed(true);
          setTimeout(() => router.back(), 3000);
        } catch (e) {
          Alert.alert(t("common.error"), e instanceof Error ? e.message : t("confirm.errors.saveError"));
        } finally {
          setSubmitting(false);
        }
        return;
      }
      setSubmitting(true);
      try {
        await confirmShift(shiftId, status);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setConfirmed(true);
        setTimeout(() => router.back(), 3000);
      } catch (e) {
        Alert.alert(t("common.error"), e instanceof Error ? e.message : t("confirm.errors.saveError"));
      } finally {
        setSubmitting(false);
      }
    },
    [shiftId, overtimeHours, overtimeMins, router, t]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!shiftId || !editDirty) return;
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(editDate)) {
      Alert.alert(t("common.error"), t("csvErrors.invalidDate"));
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(editStart)) {
      Alert.alert(t("common.error"), t("csvErrors.invalidStart"));
      return;
    }
    if (!/^\d{1,2}:\d{2}$/.test(editEnd)) {
      Alert.alert(t("common.error"), t("csvErrors.invalidEnd"));
      return;
    }
    setSavingEdit(true);
    try {
      await updateShift(shiftId, {
        date: editDate,
        start_time: editStart,
        end_time: editEnd,
      });
      setShift((prev) => prev ? { ...prev, date: editDate, start_time: editStart, end_time: editEnd } : prev);
      setEditDirty(false);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("confirm.errors.saveError"));
    } finally {
      setSavingEdit(false);
    }
  }, [shiftId, editDate, editStart, editEnd, editDirty, t]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg">
        <ActivityIndicator size="large" color={colors.accent} accessibilityLabel={t("common.loading")} />
      </View>
    );
  }

  if (notFound || !shiftId) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg p-6">
        <Text className="text-center text-stone-600 dark:text-stone-400">{t("confirm.errors.notFound")}</Text>
        <PressableScale
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-accent-dark dark:bg-accent px-6 py-2"
        >
          <Text className="font-inter-semibold text-white dark:text-stone-900">{t("confirm.backBtnLabel")}</Text>
        </PressableScale>
      </View>
    );
  }

  if (!shift) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg p-6">
        <Text className="text-center text-stone-600 dark:text-stone-400">{t("confirm.errors.loadError")}</Text>
        <PressableScale
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-accent-dark dark:bg-accent px-6 py-2"
        >
          <Text className="font-inter-semibold text-white dark:text-stone-900">{t("confirm.backBtnLabel")}</Text>
        </PressableScale>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg p-8" accessibilityLiveRegion="polite" accessibilityRole="alert">
        <AnimatedCard index={0}>
          <View className="items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15" importantForAccessibility="no">
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
            </View>
            <Text className="text-xl font-inter-semibold text-stone-900 dark:text-stone-100">{t("confirm.success")}</Text>
            <Text className="mt-2 text-center text-stone-600 dark:text-stone-400">{formatShiftLabel(shift)}</Text>
            <PressableScale
              onPress={() => router.back()}
              accessibilityLabel={t("confirm.backBtnLabel")}
              className="mt-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface px-6 py-3"
            >
              <Text className="text-center font-inter-medium text-stone-700 dark:text-stone-300">{t("confirm.backBtnLabel")}</Text>
            </PressableScale>
          </View>
        </AnimatedCard>
      </View>
    );
  }

  const isEdit = shift.status !== "planned";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-app-bg dark:bg-dark-bg"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedCard index={0} className="mb-6 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
          <Text className="text-lg font-inter-semibold text-stone-900 dark:text-stone-100">
            {isEdit ? t("confirm.editQuestion") : t("confirm.question")}
          </Text>
          <Text className="mt-2 text-stone-600 dark:text-stone-400">{formatShiftLabel(shift)}</Text>
        </AnimatedCard>

        {/* Editable date/time fields — collapsed by default */}
        <AnimatedCard index={1} className="mb-4">
          <PressableScale
            onPress={() => setShowEditFields((v) => !v)}
            accessibilityLabel={t("confirm.editFields.title")}
            accessibilityState={{ expanded: showEditFields }}
            className="flex-row items-center justify-between rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4"
          >
            <Text className="text-sm font-inter-medium text-stone-700 dark:text-stone-300">{t("confirm.editFields.title")}</Text>
            <Ionicons name={showEditFields ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
          </PressableScale>
          {showEditFields && (
            <View className="mt-2 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
              <View className="mb-2">
                <Text className="mb-1 text-xs text-stone-500">{t("confirm.editFields.date")}</Text>
                <TextInput
                  value={editDate}
                  onChangeText={(v) => { setEditDate(v); setEditDirty(true); }}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel={t("confirm.editFields.date")}
                  className="rounded-xl border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-4 py-3 text-stone-900 dark:text-stone-100"
                />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-stone-500">{t("confirm.editFields.start")}</Text>
                  <TextInput
                    value={editStart}
                    onChangeText={(v) => { setEditStart(v); setEditDirty(true); }}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={t("confirm.editFields.start")}
                    className="rounded-xl border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-4 py-3 text-stone-900 dark:text-stone-100"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1 text-xs text-stone-500">{t("confirm.editFields.end")}</Text>
                  <TextInput
                    value={editEnd}
                    onChangeText={(v) => { setEditEnd(v); setEditDirty(true); }}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel={t("confirm.editFields.end")}
                    className="rounded-xl border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-4 py-3 text-stone-900 dark:text-stone-100"
                  />
                </View>
              </View>
              {editDirty && (
                <PressableScale
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                  className="mt-3 rounded-xl bg-accent-dark dark:bg-accent py-3"
                  style={savingEdit ? { opacity: 0.6 } : undefined}
                >
                  {savingEdit ? (
                    <ActivityIndicator color={colors.bg} accessibilityLabel={t("common.loading")} />
                  ) : (
                    <Text className="text-center text-sm font-inter-semibold text-white dark:text-stone-900">{t("confirm.editFields.save")}</Text>
                  )}
                </PressableScale>
              )}
            </View>
          )}
        </AnimatedCard>

        {!showOvertime ? (
          <AnimatedCard index={2}>
            <PressableScale
              onPress={() => handleConfirm("completed")}
              disabled={submitting}
              accessibilityLabel={t("confirm.completed")}
              accessibilityState={{ disabled: submitting }}
              className="mb-3 rounded-xl bg-emerald-500 py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-inter-semibold text-white">{t("confirm.completed")}</Text>
            </PressableScale>
            <PressableScale
              onPress={() => handleConfirm("missed")}
              disabled={submitting}
              accessibilityLabel={t("confirm.missed")}
              accessibilityState={{ disabled: submitting }}
              className="mb-3 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-inter-medium text-stone-700 dark:text-stone-300">{t("confirm.missed")}</Text>
            </PressableScale>
            <PressableScale
              onPress={() => setShowOvertime(true)}
              disabled={submitting}
              accessibilityLabel={t("confirm.overtime")}
              accessibilityState={{ disabled: submitting }}
              className="mb-3 rounded-xl border border-blue-600/20 bg-blue-600/10 dark:border-blue-400/20 dark:bg-blue-400/10 py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-inter-medium text-accent-dark dark:text-accent">{t("confirm.overtime")}</Text>
            </PressableScale>
          </AnimatedCard>
        ) : (
          <>
            <Text className="mb-2 font-inter-medium text-stone-900 dark:text-stone-100">{t("confirm.overtimeLabel")}</Text>
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-xs text-stone-500">{t("confirm.overtimeHoursLabel")}</Text>
                <TextInput
                  value={overtimeHours}
                  onChangeText={setOvertimeHours}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  accessibilityLabel={t("confirm.overtimeHoursLabel")}
                  className="rounded-xl border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-4 py-3 text-stone-900 dark:text-stone-100"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs text-stone-500">{t("confirm.overtimeMinsLabel")}</Text>
                <TextInput
                  value={overtimeMins}
                  onChangeText={setOvertimeMins}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  accessibilityLabel={t("confirm.overtimeMinsLabel")}
                  className="rounded-xl border border-app-border dark:border-dark-border bg-app-elevated dark:bg-dark-elevated px-4 py-3 text-stone-900 dark:text-stone-100"
                />
              </View>
            </View>
            <PressableScale
              onPress={() => handleConfirm("overtime")}
              disabled={submitting}
              accessibilityLabel={t("confirm.saveOvertime")}
              accessibilityState={{ disabled: submitting }}
              className="mb-3 rounded-xl bg-accent-dark dark:bg-accent py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              {submitting ? (
                <ActivityIndicator color={colors.bg} accessibilityLabel={t("common.loading")} />
              ) : (
                <Text className="text-center font-inter-semibold text-white dark:text-stone-900">{t("confirm.saveOvertime")}</Text>
              )}
            </PressableScale>
            <PressableScale
              onPress={() => setShowOvertime(false)}
              accessibilityLabel={t("confirm.backBtn")}
              className="rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface py-3"
            >
              <Text className="text-center font-inter-medium text-stone-600 dark:text-stone-400">{t("confirm.backBtn")}</Text>
            </PressableScale>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
