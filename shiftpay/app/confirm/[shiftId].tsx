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
import { getShiftById, confirmShift } from "../../lib/db";
import type { ShiftRow } from "../../lib/db";

function formatShiftLabel(shift: ShiftRow): string {
  return `${shift.date} ${shift.start_time}–${shift.end_time} (${shift.shift_type})`;
}

export default function ConfirmShiftScreen() {
  const { shiftId } = useLocalSearchParams<{ shiftId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showOvertime, setShowOvertime] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState("");

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
          Alert.alert("Ugyldig verdi", "Skriv inn antall overtidsminutter (større enn 0).");
          return;
        }
        setSubmitting(true);
        try {
          await confirmShift(shiftId, "overtime", mins);
          router.back();
        } catch (e) {
          Alert.alert("Feil", e instanceof Error ? e.message : "Kunne ikke lagre");
        } finally {
          setSubmitting(false);
        }
        return;
      }
      setSubmitting(true);
      try {
        await confirmShift(shiftId, status);
        router.back();
      } catch (e) {
        Alert.alert("Feil", e instanceof Error ? e.message : "Kunne ikke lagre");
      } finally {
        setSubmitting(false);
      }
    },
    [shiftId, overtimeMinutes, router]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (notFound || !shiftId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-gray-600">Vakten ble ikke funnet.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2"
        >
          <Text className="text-white">Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!shift) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-gray-600">Kunne ikke laste vakten.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2"
        >
          <Text className="text-white">Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const alreadyConfirmed = shift.status !== "planned";
  if (alreadyConfirmed) {
    return (
      <View className="flex-1 bg-gray-50 p-6">
        <Text className="text-center text-gray-600">
          Denne vakten er allerede bekreftet som «{shift.status}».
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 rounded-lg bg-blue-600 py-3"
        >
          <Text className="text-center font-medium text-white">Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50"
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <Text className="text-lg font-medium text-gray-900">Fullførte du vakten?</Text>
          <Text className="mt-2 text-gray-600">{formatShiftLabel(shift)}</Text>
        </View>

        {!showOvertime ? (
          <>
            <TouchableOpacity
              onPress={() => handleConfirm("completed")}
              disabled={submitting}
              className="mb-3 rounded-lg bg-green-600 py-3"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-medium text-white">Ja, fullført</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleConfirm("missed")}
              disabled={submitting}
              className="mb-3 rounded-lg border border-gray-300 bg-white py-3"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-medium text-gray-700">Nei, ikke fullført</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOvertime(true)}
              disabled={submitting}
              className="mb-3 rounded-lg border border-blue-300 bg-blue-50 py-3"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              <Text className="text-center font-medium text-blue-700">Overtid</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="mb-2 font-medium text-gray-900">Ekstra overtidsminutter</Text>
            <TextInput
              value={overtimeMinutes}
              onChangeText={setOvertimeMinutes}
              placeholder="0"
              keyboardType="number-pad"
              className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900"
            />
            <TouchableOpacity
              onPress={() => handleConfirm("overtime")}
              disabled={submitting}
              className="mb-3 rounded-lg bg-blue-600 py-3"
              style={submitting ? { opacity: 0.6 } : undefined}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center font-medium text-white">Lagre overtid</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowOvertime(false)}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white py-3"
            >
              <Text className="text-center font-medium text-gray-600">Tilbake</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
