import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getShiftById, confirmShift } from "../../lib/db";
import type { ShiftRow } from "../../lib/db";
import { useTranslation } from "../../lib/i18n";

function formatShiftLabel(shift: ShiftRow): string {
  return `${shift.date} ${shift.start_time}–${shift.end_time} (${shift.shift_type})`;
}

export default function ConfirmShiftScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showOvertime, setShowOvertime] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    if (!shiftId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const row = await getShiftById(shiftId);
      if (!row) setNotFound(true);
      else setShift(row);
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
        const mins = parseInt(overtimeMinutes, 10);
        if (Number.isNaN(mins) || mins <= 0) {
          Alert.alert(t("confirm.overtimeError.title"), t("confirm.overtimeError.message"));
          return;
        }
        setSubmitting(true);
        try {
          await confirmShift(shiftId, "overtime", mins);
          setConfirmed(true);
          setTimeout(() => router.back(), 1500);
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
        setConfirmed(true);
        setTimeout(() => router.back(), 1500);
      } catch (e) {
        Alert.alert(t("common.error"), e instanceof Error ? e.message : t("confirm.errors.saveError"));
      } finally {
        setSubmitting(false);
      }
    },
    [shiftId, overtimeMinutes, router, t]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  if (notFound || !shiftId) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 p-6">
        <Text className="text-center text-slate-500">{t("confirm.errors.notFound")}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-teal-700 px-6 py-2"
        >
          <Text className="text-white">{t("confirm.backBtnLabel")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!shift) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 p-6">
        <Text className="text-center text-slate-500">{t("confirm.errors.loadError")}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-teal-700 px-6 py-2"
        >
          <Text className="text-white">{t("confirm.backBtnLabel")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View className="flex-1 items-center justify-center bg-green-50 p-8">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
        </View>
        <Text className="text-xl font-semibold text-green-900">{t("confirm.success")}</Text>
        <Text className="mt-2 text-center text-slate-500">{formatShiftLabel(shift)}</Text>
      </View>
    );
  }

  const isEdit = shift.status !== "planned";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-stone-50"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6 rounded-xl border border-stone-200 bg-white p-4">
          <Text className="text-lg font-medium text-slate-900">
            {isEdit ? t("confirm.editQuestion") : t("confirm.question")}
          </Text>
          <Text className="mt-2 text-slate-500">{formatShiftLabel(shift)}</Text>
        </View>

        {!showOvertime ? (
          <>
            <TouchableOpacity
              onPress={() => handleConfirm("completed")}
              disabled={submitting}
              className="mb-3 rounded-xl bg-green-600 py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-medium text-white">{t("confirm.completed")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleConfirm("missed")}
              disabled={submitting}
              className="mb-3 rounded-xl border border-stone-300 bg-white py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-medium text-slate-700">{t("confirm.missed")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOvertime(true)}
              disabled={submitting}
              className="mb-3 rounded-xl border border-teal-200 bg-teal-50 py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-medium text-teal-700">{t("confirm.overtime")}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="mb-2 font-medium text-slate-900">{t("confirm.overtimeLabel")}</Text>
            <TextInput
              value={overtimeMinutes}
              onChangeText={setOvertimeMinutes}
              placeholder={t("confirm.overtimePlaceholder")}
              keyboardType="number-pad"
              className="mb-4 rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900"
            />
            <TouchableOpacity
              onPress={() => handleConfirm("overtime")}
              disabled={submitting}
              className="mb-3 rounded-xl bg-teal-700 py-4"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center font-medium text-white">{t("confirm.saveOvertime")}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOvertime(false)}
              disabled={submitting}
              className="rounded-xl border border-stone-300 bg-white py-3"
            >
              <Text className="text-center font-medium text-slate-500">{t("confirm.backBtn")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
