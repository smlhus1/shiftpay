import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { postOcr } from "../../lib/api";
import type { OcrShift } from "../../lib/api";
import { getTariffRates, insertTimesheet } from "../../lib/db";
import {
  calculateExpectedPay,
  type Shift,
  type ShiftType,
} from "../../lib/calculations";

const SHIFT_TYPES: ShiftType[] = ["tidlig", "mellom", "kveld", "natt"];

function ocrShiftToShift(s: OcrShift): Shift {
  return {
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    shift_type: (s.shift_type as ShiftType) || "tidlig",
    confidence: s.confidence,
  };
}

export default function ImportScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [expectedPay, setExpectedPay] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const cameraRef = useRef<{ takePicture: (opts?: object) => Promise<{ uri: string }> } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const openCamera = async () => {
    setError(null);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setError("Camera permission required to take a photo.");
        return;
      }
    }
    setShowCamera(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePicture({});
      setShowCamera(false);
      setLoading(true);
      setError(null);
      const result = await postOcr(photo.uri);
      setShifts(result.shifts.map(ocrShiftToShift));
      setExpectedPay(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setLoading(false);
    }
  };

  const calculate = async () => {
    if (shifts.length === 0) return;
    setLoading(true);
    try {
      const rates = await getTariffRates();
      const total = calculateExpectedPay(shifts, {
        base_rate: rates.base_rate,
        evening_supplement: rates.evening_supplement,
        night_supplement: rates.night_supplement,
        weekend_supplement: rates.weekend_supplement,
        holiday_supplement: rates.holiday_supplement,
      });
      setExpectedPay(total);
    } finally {
      setLoading(false);
    }
  };

  const saveTimesheet = async () => {
    if (shifts.length === 0 || expectedPay === null) return;
    const dates = shifts.map((s) => s.date);
    const periodStart = dates.reduce((a, b) => (a < b ? a : b));
    const periodEnd = dates.reduce((a, b) => (a > b ? a : b));
    try {
      await insertTimesheet(
        periodStart,
        periodEnd,
        JSON.stringify(shifts),
        expectedPay,
        "ocr"
      );
      setSaved(true);
      setShifts([]);
      setExpectedPay(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save");
    }
  };

  const updateShift = (index: number, field: keyof Shift, value: string | ShiftType) => {
    setShifts((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    );
    setExpectedPay(null);
  };

  if (showCamera) {
    return (
      <View className="flex-1 bg-black">
        <CameraView
          ref={cameraRef as any}
          style={{ flex: 1 }}
          facing="back"
        />
        <View className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-4">
          <TouchableOpacity
            onPress={() => setShowCamera(false)}
            className="rounded-lg bg-gray-600 px-6 py-3"
          >
            <Text className="text-white">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={takePhoto}
            className="rounded-lg bg-blue-600 px-6 py-3"
          >
            <Text className="text-white">Take photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {error && (
        <View className="mb-4 rounded-lg bg-red-100 p-3">
          <Text className="text-red-800">{error}</Text>
        </View>
      )}

      {shifts.length === 0 && !loading && (
        <TouchableOpacity
          onPress={openCamera}
          className="rounded-lg bg-blue-600 py-3"
        >
          <Text className="text-center font-medium text-white">Take photo of timesheet</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View className="py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-2 text-center text-gray-600">Processing…</Text>
        </View>
      )}

      {shifts.length > 0 && !loading && (
        <>
          <Text className="mb-2 font-medium text-gray-900">Shifts (edit if needed)</Text>
          {shifts.map((shift, index) => (
            <View
              key={`${shift.date}-${shift.start_time}-${index}`}
              className="mb-3 rounded-lg border border-gray-200 bg-white p-3"
            >
              <View className="flex-row flex-wrap gap-2">
                <TextInput
                  value={shift.date}
                  onChangeText={(s) => updateShift(index, "date", s)}
                  placeholder="DD.MM.YYYY"
                  className="min-w-[100px] rounded border border-gray-200 px-2 py-1 text-gray-900"
                />
                <TextInput
                  value={shift.start_time}
                  onChangeText={(s) => updateShift(index, "start_time", s)}
                  placeholder="HH:MM"
                  className="w-16 rounded border border-gray-200 px-2 py-1 text-gray-900"
                />
                <Text className="self-center text-gray-500">–</Text>
                <TextInput
                  value={shift.end_time}
                  onChangeText={(s) => updateShift(index, "end_time", s)}
                  placeholder="HH:MM"
                  className="w-16 rounded border border-gray-200 px-2 py-1 text-gray-900"
                />
                <View className="flex-row gap-1">
                  {SHIFT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => updateShift(index, "shift_type", type)}
                      className={`rounded px-2 py-1 ${
                        shift.shift_type === type ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={
                          shift.shift_type === type ? "text-white" : "text-gray-700"
                        }
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={calculate}
            className="mt-2 rounded-lg bg-green-600 py-3"
          >
            <Text className="text-center font-medium text-white">Calculate pay</Text>
          </TouchableOpacity>

          {expectedPay !== null && (
            <View className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <Text className="text-lg font-medium text-gray-900">
                You should have received: {expectedPay.toFixed(2)} kr
              </Text>
              <TouchableOpacity
                onPress={saveTimesheet}
                className="mt-3 rounded-lg bg-blue-600 py-2"
              >
                <Text className="text-center text-white">Save timesheet</Text>
              </TouchableOpacity>
            </View>
          )}

          {saved && (
            <Text className="mt-3 text-center text-green-600">Saved. You can import another.</Text>
          )}

          <TouchableOpacity
            onPress={() => {
              setShifts([]);
              setExpectedPay(null);
              setError(null);
            }}
            className="mt-4 rounded-lg border border-gray-300 py-2"
          >
            <Text className="text-center text-gray-700">Start over</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
