import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useCameraPermissions } from "expo-camera";
import { postOcr } from "../../lib/api";
import type { OcrShift } from "../../lib/api";
import {
  parseCSVFile,
  type CsvRowResult,
  isValidDate,
  isValidTime,
  normalizeShiftType,
} from "../../lib/csv";
import { getTariffRates, insertScheduleWithShifts, getExistingShiftKeys } from "../../lib/db";
import { dateToComparable } from "../../lib/dates";
import {
  scheduleShiftReminder,
  storeScheduledNotificationId,
  requestNotificationPermission,
} from "../../lib/notifications";
import { calculateExpectedPay, type Shift, type ShiftType } from "../../lib/calculations";
import { useRouter } from "expo-router";
import { CameraCapture } from "../../components/CameraCapture";
import { ShiftEditor } from "../../components/ShiftEditor";
import { PressableScale } from "../../components/PressableScale";
import { AnimatedCard } from "../../components/AnimatedCard";
import { useTranslation } from "../../lib/i18n";
import { useThemeColors } from "../../lib/theme-context";

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
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
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
  const [showMore, setShowMore] = useState(false);
  const [baseRateZero, setBaseRateZero] = useState(false);
  const cameraRef = useRef<{ takePictureAsync: (opts?: object) => Promise<{ uri: string }> } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    getTariffRates()
      .then((r) => setBaseRateZero(r.base_rate === 0))
      .catch(() => setBaseRateZero(false));
  }, []);

  /** Run OCR on multiple images and merge all shifts into rows. */
  const processMultipleImages = async (uris: string[]) => {
    setLoading(true);
    setOcrProgress(t("import.progress", { current: 1, total: uris.length }));
    const allRows: CsvRowResult[] = [];
    const errors: string[] = [];
    for (let i = 0; i < uris.length; i++) {
      setOcrProgress(t("import.progress", { current: i + 1, total: uris.length }));
      try {
        const ocrResult = await postOcr(uris[i]);
        for (const s of ocrResult.shifts) {
          allRows.push({ ok: true as const, shift: ocrShiftToShift(s) });
        }
      } catch (e) {
        errors.push(`Image ${i + 1}: ${e instanceof Error ? e.message : "OCR failed"}`);
      }
    }
    // Deduplicate: same date + start_time + end_time = same shift
    // Checks both within the batch and against already-saved shifts in the DB
    const existingKeys = await getExistingShiftKeys();
    const seen = new Set<string>(existingKeys);
    const dedupedRows = allRows.filter((row) => {
      const s = row.ok ? row.shift : row;
      const key = `${s.date}|${s.start_time}|${s.end_time}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setRows(dedupedRows);
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
      setError(e instanceof Error ? e.message : t("import.alerts.saveError"));
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
      setError(e instanceof Error ? e.message : t("import.alerts.saveError"));
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
        setError(t("import.alerts.csvEmpty"));
      } else {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("import.alerts.saveError"));
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
      const photo = await cameraRef.current.takePictureAsync({});
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
      Alert.alert(t("import.alerts.missingData"), t("import.alerts.missingDataCalculate"));
      return;
    }
    setCalculating(true);
    setError(null);
    try {
      const rates = await getTariffRates();
      const total = calculateExpectedPay(validShifts, rates);
      setExpectedPay(total);
      if (validShifts.length < rows.length) {
        setError(t("import.alerts.csvError"));
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

  const saveTimesheet = async () => {
    if (validShifts.length === 0) {
      Alert.alert(t("import.alerts.missingData"), t("import.alerts.missingDataSave"));
      return;
    }
    const dates = validShifts.map((s) => s.date);
    const periodStart = dates.reduce((a, b) => (dateToComparable(a) <= dateToComparable(b) ? a : b));
    const periodEnd = dates.reduce((a, b) => (dateToComparable(a) >= dateToComparable(b) ? a : b));
    const sourceStr = source === "gallery" ? "gallery" : source === "csv" ? "csv" : source === "ocr" ? "ocr" : "manual";
    setSaving(true);
    try {
      await requestNotificationPermission();
      if (__DEV__) {
        console.log("[ShiftPay] saveTimesheet: period", periodStart, "–", periodEnd, "shifts:", validShifts.length);
      }
      const { scheduleId, shifts: inserted } = await insertScheduleWithShifts(
        periodStart,
        periodEnd,
        sourceStr,
        validShifts.map((s) => ({
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          shift_type: s.shift_type,
        }))
      );
      if (__DEV__) {
        console.log("[ShiftPay] saveTimesheet: saved schedule", scheduleId, "with", inserted.length, "shifts");
      }
      try {
        for (const shift of inserted) {
          const notifId = await scheduleShiftReminder({
            id: shift.id,
            date: shift.date,
            end_time: shift.end_time,
          });
          if (notifId) await storeScheduledNotificationId(scheduleId, notifId);
        }
      } catch (notifErr) {
        if (__DEV__) {
          console.warn("[ShiftPay] saveTimesheet: notification scheduling failed", notifErr);
        }
        // Shift data is already saved; do not fail the whole save
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSaved(true);
      setRows([]);
      setExpectedPay(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("import.alerts.saveError"));
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
      <CameraCapture
        cameraRef={cameraRef}
        onCancel={() => setShowCamera(false)}
        onCapture={takePhoto}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-app-bg dark:bg-dark-bg" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {error && (
        <View className="mb-4 rounded-xl bg-red-50 dark:bg-red-500/10 p-3">
          <Text className="text-red-600 dark:text-red-400">{error}</Text>
        </View>
      )}

      {rows.length === 0 && !loading && (
        <>
          {baseRateZero && (
            <PressableScale
              onPress={() => router.push("/(tabs)/settings")}
              className="mb-4 flex-row items-center gap-2 rounded-xl border border-amber-600/20 bg-amber-600/10 dark:border-amber-500/20 dark:bg-amber-500/10 p-3"
            >
              <Text className="flex-1 text-sm text-amber-700 dark:text-amber-300">
                {t("import.rateZero")}
              </Text>
              <Text className="font-inter-semibold text-amber-700 dark:text-amber-400">{t("import.rateZeroCta")}</Text>
            </PressableScale>
          )}
          <AnimatedCard index={0} className="mb-4 rounded-xl bg-app-surface dark:bg-dark-surface p-3">
            <Text className="text-sm text-slate-600 dark:text-slate-400">
              {t("import.disclaimer")}
            </Text>
          </AnimatedCard>
          {/* Primary: camera */}
          <AnimatedCard index={1}>
            <PressableScale onPress={openCamera} className="rounded-xl bg-accent-dark dark:bg-accent py-4">
              <Text className="text-center text-base font-inter-semibold text-white dark:text-slate-900">{t("import.cameraBtn")}</Text>
            </PressableScale>
          </AnimatedCard>
          {/* Secondary: gallery/files */}
          <AnimatedCard index={2}>
            <PressableScale
              onPress={() =>
                Alert.alert(t("import.fileAlert.title"), "", [
                  { text: t("import.fileAlert.gallery"), onPress: openGallery },
                  { text: t("import.fileAlert.files"), onPress: pickImageFromFiles },
                  { text: t("import.fileAlert.cancel"), style: "cancel" },
                ])
              }
              className="mt-3 rounded-xl border-2 border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface py-4"
            >
              <Text className="text-center text-base font-inter-medium text-slate-700 dark:text-slate-300">{t("import.fileBtn")}</Text>
            </PressableScale>
          </AnimatedCard>
          {/* Tertiary: more options toggle */}
          <PressableScale
            onPress={() => setShowMore((v) => !v)}
            className="mt-3 py-2"
            haptic={false}
          >
            <Text className="text-center text-sm text-slate-500">
              {t("import.moreOptions")} {showMore ? "▲" : "▼"}
            </Text>
          </PressableScale>
          {showMore && (
            <>
              <PressableScale
                onPress={pickCSV}
                className="mt-1 py-2"
              >
                <Text className="text-center text-sm font-inter-medium text-accent-dark dark:text-accent">{t("import.csvBtn")}</Text>
              </PressableScale>
              <PressableScale
                onPress={addShiftManually}
                className="mt-2 py-2"
              >
                <Text className="text-center text-sm font-inter-medium text-accent-dark dark:text-accent">{t("import.manualBtn")}</Text>
              </PressableScale>
            </>
          )}
        </>
      )}

      {loading && (
        <View className="py-8">
          <ActivityIndicator size="large" color={colors.accent} />
          <Text className="mt-2 text-center text-slate-600 dark:text-slate-400">
            {ocrProgress ?? t("import.loading")}
          </Text>
        </View>
      )}

      {rows.length > 0 && !loading && (
        <ShiftEditor
          rows={rows}
          source={source}
          expectedPay={expectedPay}
          saving={saving}
          calculating={calculating}
          saved={saved}
          onUpdateRow={updateRow}
          onRemoveRow={removeRow}
          onAddRow={() => setRows((prev) => [...prev, { ok: true as const, shift: emptyShift() }])}
          onCalculate={calculate}
          onSave={saveTimesheet}
          onReset={() => {
            setRows([]);
            setExpectedPay(null);
            setError(null);
          }}
        />
      )}
    </ScrollView>
  );
}
