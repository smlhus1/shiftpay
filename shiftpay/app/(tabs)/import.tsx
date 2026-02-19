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
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { postOcr } from "../../lib/api";
import type { OcrShift } from "../../lib/api";
import {
  parseCSVFile,
  type CsvRowResult,
  isValidDate,
  isValidTime,
  normalizeShiftType,
} from "../../lib/csv";
import { getTariffRates, insertSchedule, insertShift, getShiftsBySchedule } from "../../lib/db";
import {
  scheduleShiftReminder,
  storeScheduledNotificationId,
  requestNotificationPermission,
} from "../../lib/notifications";
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

const emptyShift = (): Shift => ({
  date: "",
  start_time: "",
  end_time: "",
  shift_type: "tidlig",
});

/** Collect all valid shifts from rows (parsed + corrected error rows). */
function getValidShifts(rows: CsvRowResult[]): Shift[] {
  const out: Shift[] = [];
  for (const row of rows) {
    if (row.ok) {
      out.push(row.shift);
      continue;
    }
    const { date, start_time, end_time, shift_type } = row;
    if (
      date.trim() &&
      start_time.trim() &&
      end_time.trim() &&
      isValidDate(date) &&
      isValidTime(start_time) &&
      isValidTime(end_time)
    ) {
      out.push({
        date: date.trim(),
        start_time: start_time.trim(),
        end_time: end_time.trim(),
        shift_type: normalizeShiftType(shift_type),
      });
    }
  }
  return out;
}

export default function ImportScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRowResult[]>([]);
  const [expectedPay, setExpectedPay] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [source, setSource] = useState<"ocr" | "manual" | "gallery" | "csv">("ocr");
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const cameraRef = useRef<{ takePicture: (opts?: object) => Promise<{ uri: string }> } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  /** Run OCR on multiple images and merge all shifts into rows. */
  const processMultipleImages = async (uris: string[]) => {
    setLoading(true);
    setOcrProgress(`Behandler 1 av ${uris.length} bilder...`);
    const allRows: CsvRowResult[] = [];
    const errors: string[] = [];
    for (let i = 0; i < uris.length; i++) {
      setOcrProgress(`Behandler ${i + 1} av ${uris.length} bilder...`);
      try {
        const ocrResult = await postOcr(uris[i]);
        for (const s of ocrResult.shifts) {
          allRows.push({ ok: true as const, shift: ocrShiftToShift(s) });
        }
      } catch (e) {
        errors.push(`Bilde ${i + 1}: ${e instanceof Error ? e.message : "OCR feilet"}`);
      }
    }
    setRows(allRows);
    setExpectedPay(null);
    setOcrProgress(null);
    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
    setLoading(false);
  };

  const openGallery = async () => {
    setSource("gallery");
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      const uris = result.assets.map((a) => a.uri);
      await processMultipleImages(uris);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke åpne galleri");
      setLoading(false);
    }
  };

  /** Pick images via file browser – access to DCIM, Download, and other folders. */
  const pickImageFromFiles = async () => {
    setSource("gallery");
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/jpg"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const uris = result.assets.map((a) => a.uri);
      await processMultipleImages(uris);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke åpne filvelger");
      setLoading(false);
    }
  };

  const pickCSV = async () => {
    setSource("csv");
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setLoading(true);
      const { rows: parsedRows, errors: parseErrors } = await parseCSVFile(result.assets[0].uri);
      setRows(parsedRows);
      setExpectedPay(null);
      if (parseErrors.length > 0) {
        setError(parseErrors[0]);
      } else if (parsedRows.length === 0) {
        setError("Ingen datarader i CSV. Bruk kolonner: date, start_time, end_time, shift_type.");
      } else {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke lese CSV");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    setSource("ocr");
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
      setRows(result.shifts.map((s) => ({ ok: true as const, shift: ocrShiftToShift(s) })));
      setExpectedPay(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
    } finally {
      setLoading(false);
    }
  };

  const validShifts = getValidShifts(rows);

  const calculate = async () => {
    if (rows.length === 0) return;
    if (validShifts.length === 0) {
      Alert.alert(
        "Manglende data",
        "Fyll inn dato, starttid og sluttid for minst ett skift. Rader merket «må rettes» inkluderes ikke før de er gyldige."
      );
      return;
    }
    setCalculating(true);
    setError(null);
    try {
      const rates = await getTariffRates();
      const total = calculateExpectedPay(validShifts, {
        base_rate: rates.base_rate,
        evening_supplement: rates.evening_supplement,
        night_supplement: rates.night_supplement,
        weekend_supplement: rates.weekend_supplement,
        holiday_supplement: rates.holiday_supplement,
      });
      setExpectedPay(total);
      if (validShifts.length < rows.length) {
        setError(
          "Noen rader ble ikke med (manglende eller ugyldig dato/tid). Retting eller fjern rader som må rettes."
        );
      }
    } finally {
      setCalculating(false);
    }
  };

  const addShiftManually = () => {
    setError(null);
    setSource("manual");
    setRows([{ ok: true as const, shift: emptyShift() }]);
    setExpectedPay(null);
  };

  const addAnotherShift = () => {
    setRows((prev) => [...prev, { ok: true as const, shift: emptyShift() }]);
    setExpectedPay(null);
  };

  const saveTimesheet = async () => {
    if (validShifts.length === 0) {
      Alert.alert(
        "Manglende data",
        "Fyll inn dato, starttid og sluttid for minst ett skift for å lagre."
      );
      return;
    }
    const dates = validShifts.map((s) => s.date);
    const periodStart = dates.reduce((a, b) => (a < b ? a : b));
    const periodEnd = dates.reduce((a, b) => (a > b ? a : b));
    const sourceStr = source === "gallery" ? "gallery" : source === "csv" ? "csv" : source === "ocr" ? "ocr" : "manual";
    setSaving(true);
    try {
      await requestNotificationPermission();
      const scheduleId = await insertSchedule(periodStart, periodEnd, sourceStr);
      for (const s of validShifts) {
        await insertShift(scheduleId, {
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          shift_type: s.shift_type,
        });
      }
      const inserted = await getShiftsBySchedule(scheduleId);
      for (const shift of inserted) {
        const notifId = await scheduleShiftReminder({
          id: shift.id,
          date: shift.date,
          end_time: shift.end_time,
        });
        if (notifId) await storeScheduledNotificationId(scheduleId, notifId);
      }
      setSaved(true);
      setRows([]);
      setExpectedPay(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert("Feil", e instanceof Error ? e.message : "Kunne ikke lagre");
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (index: number, field: keyof Shift, value: string | ShiftType) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (r.ok) {
          return { ok: true as const, shift: { ...r.shift, [field]: value } };
        }
        return { ...r, [field]: value };
      })
    );
    setExpectedPay(null);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
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

      {rows.length === 0 && !loading && (
        <>
          <View className="mb-4 rounded-lg bg-gray-200 p-3">
            <Text className="text-sm text-gray-700">
              Beregningen er veiledende og basert på dine egne satser. OCR kan inneholde feil — kontroller alltid mot original timeliste.
            </Text>
          </View>
          <TouchableOpacity
            onPress={openCamera}
            className="rounded-lg bg-blue-600 py-3"
          >
            <Text className="text-center font-medium text-white">Ta bilde av timeliste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openGallery}
            className="mt-3 rounded-lg border border-gray-300 bg-white py-3"
          >
            <Text className="text-center font-medium text-gray-700">Velg bilder fra galleri</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickImageFromFiles}
            className="mt-3 rounded-lg border border-gray-300 bg-white py-3"
          >
            <Text className="text-center font-medium text-gray-700">
              Velg bilder fra filer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickCSV}
            className="mt-3 rounded-lg border border-gray-300 bg-white py-3"
          >
            <Text className="text-center font-medium text-gray-700">Importer CSV-fil</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={addShiftManually}
            className="mt-3 rounded-lg border border-gray-300 bg-white py-3"
          >
            <Text className="text-center font-medium text-gray-700">Legg til skift manuelt</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && (
        <View className="py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-2 text-center text-gray-600">
            {ocrProgress ?? "Behandler..."}
          </Text>
        </View>
      )}

      {rows.length > 0 && !loading && (
        <>
          <Text className="mb-2 font-medium text-gray-900">
            Skift (rediger om nødvendig)
            {source === "manual"
              ? " · Manuell"
              : source === "csv"
                ? " · CSV"
                : source === "gallery"
                  ? " · Galleri"
                  : " · OCR"}
          </Text>
          {rows.map((row, index) => {
            const isError = !row.ok;
            const date = row.ok ? row.shift.date : row.date;
            const start_time = row.ok ? row.shift.start_time : row.start_time;
            const end_time = row.ok ? row.shift.end_time : row.end_time;
            const displayType = row.ok ? row.shift.shift_type : (row.shift_type || "tidlig");
            return (
              <View
                key={`row-${index}`}
                className={`mb-3 rounded-lg border bg-white p-3 ${
                  isError ? "border-l-4 border-l-amber-500 border-gray-200" : "border-gray-200"
                }`}
              >
                {isError && (
                  <Text className="mb-2 text-sm text-amber-800">Sjekk dato og tid: {row.reason}</Text>
                )}
                <View className="flex-row flex-wrap items-center gap-2">
                  <TextInput
                    value={date}
                    onChangeText={(s) => updateRow(index, "date", s)}
                    placeholder="DD.MM.YYYY"
                    className="min-w-[100px] rounded border border-gray-200 px-2 py-1 text-gray-900"
                  />
                  <TextInput
                    value={start_time}
                    onChangeText={(s) => updateRow(index, "start_time", s)}
                    placeholder="HH:MM"
                    className="w-16 rounded border border-gray-200 px-2 py-1 text-gray-900"
                  />
                  <Text className="self-center text-gray-500">–</Text>
                  <TextInput
                    value={end_time}
                    onChangeText={(s) => updateRow(index, "end_time", s)}
                    placeholder="HH:MM"
                    className="w-16 rounded border border-gray-200 px-2 py-1 text-gray-900"
                  />
                  <View className="flex-row gap-1">
                    {SHIFT_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        onPress={() => updateRow(index, "shift_type", type)}
                        className={`rounded px-2 py-1 ${
                          displayType === type ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <Text
                          className={displayType === type ? "text-white" : "text-gray-700"}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => removeRow(index)}
                    className="ml-auto rounded p-2"
                    accessibilityLabel="Fjern rad"
                  >
                    <Ionicons name="trash-outline" size={22} color="#b91c1c" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {source === "manual" && (
            <TouchableOpacity
              onPress={addAnotherShift}
              className="mb-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 py-3"
            >
              <Text className="text-center text-gray-600">+ Add another shift</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={calculate}
            disabled={calculating}
            style={calculating ? { opacity: 0.6 } : undefined}
            className="mt-2 rounded-lg bg-green-600 py-3"
          >
            {calculating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center font-medium text-white">Beregn lønn</Text>
            )}
          </TouchableOpacity>

          {expectedPay !== null && (
            <View className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <Text className="text-lg font-medium text-gray-900">
                Du bør ha fått: {expectedPay.toFixed(2)} kr
              </Text>
              <View className="mt-2 rounded bg-gray-100 p-2">
                <Text className="text-xs text-gray-600">
                  Beregningen er veiledende og basert på dine egne satser. Kontroller mot original timeliste.
                </Text>
              </View>
              <TouchableOpacity
                onPress={saveTimesheet}
                disabled={saving}
                style={saving ? { opacity: 0.6 } : undefined}
                className="mt-3 rounded-lg bg-blue-600 py-2"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center text-white">Lagre timeliste</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {saved && (
            <Text className="mt-3 text-center text-green-600">Saved. You can import another.</Text>
          )}

          <TouchableOpacity
            onPress={() => {
              setRows([]);
              setExpectedPay(null);
              setError(null);
            }}
            className="mt-4 rounded-lg border border-gray-300 py-2"
          >
            <Text className="text-center text-gray-700">Start på nytt</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
