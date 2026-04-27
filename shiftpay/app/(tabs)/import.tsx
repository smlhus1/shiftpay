import { useReducer, useRef, useEffect, useCallback, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useCameraPermissions } from "expo-camera";
import { Icon } from "@/components/Icon";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { MotiView } from "moti";
import { postOcr } from "@/lib/api";
import type { OcrShift } from "@/lib/api";
import {
  parseCSVFile,
  type CsvRowResult,
  isValidDate,
  isValidTime,
  normalizeShiftType,
} from "@/lib/csv";
import { getTariffRates, insertScheduleWithShifts, getExistingShiftKeys } from "@/lib/db";
import { dateToComparable } from "@/lib/dates";
import {
  scheduleShiftReminder,
  storeScheduledNotificationId,
  requestNotificationPermission,
} from "@/lib/notifications";
import { calculateExpectedPay, type Shift, type ShiftType } from "@/lib/calculations";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { CameraCapture, type CameraViewRef } from "@/components/CameraCapture";
import { ShiftEditor } from "@/components/ShiftEditor";
import { PressableScale } from "@/components/PressableScale";
import { AnimatedCard } from "@/components/AnimatedCard";
import { useTranslation } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { useAnnounceWhen } from "@/lib/ui/announce";
import {
  importReducer,
  initialImportState,
  type ImportSource,
  type SavedResult,
} from "@/lib/import-state";

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.7 }}
      transition={{ loop: true, type: "timing", duration: 1000, delay }}
      className="mb-3 rounded-xl border border-app-border bg-app-surface p-3 dark:border-dark-border dark:bg-dark-surface"
    >
      <View className="flex-row items-center gap-2">
        <View className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-700" />
        <View className="h-4 w-14 rounded bg-stone-200 dark:bg-stone-700" />
        <View className="h-4 w-14 rounded bg-stone-200 dark:bg-stone-700" />
      </View>
      <View className="mt-2 flex-row gap-1">
        <View className="h-8 flex-1 rounded-full bg-stone-200 dark:bg-stone-700" />
        <View className="h-8 flex-1 rounded-full bg-stone-200 dark:bg-stone-700" />
        <View className="h-8 flex-1 rounded-full bg-stone-200 dark:bg-stone-700" />
        <View className="h-8 flex-1 rounded-full bg-stone-200 dark:bg-stone-700" />
      </View>
    </MotiView>
  );
}

function OcrLoadingState({ progress }: { progress: string | null }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation]);

  // Announce progress to screen readers each time it changes (e.g.
  // "2 of 5"). Imperative replacement for accessibilityLiveRegion since
  // Fabric doesn't fire the declarative version reliably.
  useAnnounceWhen(progress ?? t("import.loading"));

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  return (
    <View className="py-8">
      <View className="mb-6 items-center">
        <Animated.View style={spinStyle}>
          <Icon name="scan-outline" size={48} color={colors.accent} />
        </Animated.View>
        <Text className="mt-3 font-inter-semibold text-lg text-stone-900 dark:text-stone-100">
          {t("import.loading")}
        </Text>
        {progress && (
          <Text className="mt-1 text-sm text-stone-600 dark:text-stone-400">{progress}</Text>
        )}
      </View>
      <SkeletonCard delay={0} />
      <SkeletonCard delay={200} />
      <SkeletonCard delay={400} />
    </View>
  );
}

function SavedSuccessView({
  savedResult,
  onViewSchedule,
  onImportMore,
}: {
  savedResult: SavedResult;
  onViewSchedule: () => void;
  onImportMore: () => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="items-center py-12">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15">
        <Icon name="checkmark-circle" size={40} color={colors.success} />
      </View>
      <Text className="font-inter-semibold text-xl text-stone-900 dark:text-stone-100">
        {t("import.saved.title")}
      </Text>
      <Text className="mt-2 text-center text-stone-600 dark:text-stone-400">
        {t("import.saved.description", {
          count: savedResult.shiftCount,
          start: savedResult.periodStart,
          end: savedResult.periodEnd,
        })}
      </Text>
      <PressableScale
        onPress={onViewSchedule}
        accessibilityLabel={t("import.saved.viewSchedule")}
        className="mt-6 w-full rounded-xl bg-accent-dark py-4 dark:bg-accent"
      >
        <Text className="text-center font-inter-semibold text-white dark:text-stone-900">
          {t("import.saved.viewSchedule")}
        </Text>
      </PressableScale>
      <PressableScale
        onPress={onImportMore}
        accessibilityLabel={t("import.saved.importMore")}
        className="mt-3 w-full rounded-xl border border-app-border py-3 dark:border-dark-border"
      >
        <Text className="text-center font-inter-medium text-stone-700 dark:text-stone-300">
          {t("import.saved.importMore")}
        </Text>
      </PressableScale>
    </View>
  );
}

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
  const [state, dispatch] = useReducer(importReducer, initialImportState);
  // Pure UI state that's orthogonal to the import lifecycle stays as
  // useState — no need to muddy the reducer with overlay toggles.
  const [showCamera, setShowCamera] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [baseRateZero, setBaseRateZero] = useState(false);
  const cameraRef = useRef<CameraViewRef | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // Aborts any in-flight OCR uploads when the screen unmounts (or when a
  // new batch starts and previous calls are still pending). Spinning up a
  // fresh controller per batch keeps the abort surface tight.
  const ocrAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      ocrAbortRef.current?.abort();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      getTariffRates()
        .then((r) => setBaseRateZero(r.base_rate === 0))
        .catch(() => setBaseRateZero(false));
    }, [])
  );

  /** Run OCR on multiple images and merge all shifts into rows. */
  const processMultipleImages = async (uris: string[], source: ImportSource) => {
    ocrAbortRef.current?.abort();
    ocrAbortRef.current = new AbortController();
    const signal = ocrAbortRef.current.signal;

    dispatch({
      type: "load_start",
      source,
      progress: t("import.progress", { current: 1, total: uris.length }),
    });

    const allRows: CsvRowResult[] = [];
    const errors: string[] = [];
    for (let i = 0; i < uris.length; i++) {
      if (signal.aborted) break;
      const uri = uris[i];
      if (!uri) continue;
      dispatch({
        type: "load_progress",
        progress: t("import.progress", { current: i + 1, total: uris.length }),
      });
      try {
        const ocrResult = await postOcr(uri, signal);
        for (const s of ocrResult.shifts) {
          allRows.push({ ok: true as const, shift: ocrShiftToShift(s) });
        }
      } catch (e) {
        if (signal.aborted) return;
        errors.push(
          `Image ${i + 1}: ${e instanceof Error ? e.message : t("import.alerts.ocrFailed")}`
        );
      }
    }
    if (signal.aborted) return;

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

    dispatch({
      type: "load_success",
      source,
      rows: dedupedRows,
      warning: errors.length > 0 ? errors.join("\n") : null,
    });
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 20,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.length) return;
      const uris = result.assets.map((a) => a.uri);
      await processMultipleImages(uris, "gallery");
    } catch (e) {
      dispatch({
        type: "load_error",
        error: e instanceof Error ? e.message : t("import.alerts.saveError"),
      });
    }
  };

  /** Pick images via file browser – access to DCIM, Download, and other folders. */
  const pickImageFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/jpg"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const uris = result.assets.map((a) => a.uri);
      await processMultipleImages(uris, "gallery");
    } catch (e) {
      dispatch({
        type: "load_error",
        error: e instanceof Error ? e.message : t("import.alerts.saveError"),
      });
    }
  };

  const pickCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const firstAsset = result.assets[0];
      if (!firstAsset) return;
      dispatch({ type: "load_start", source: "csv" });
      const { rows: parsedRows, errors: parseErrors } = await parseCSVFile(firstAsset.uri);
      if (parsedRows.length === 0) {
        dispatch({ type: "load_error", error: parseErrors[0] ?? t("import.alerts.csvEmpty") });
        return;
      }
      dispatch({
        type: "load_success",
        source: "csv",
        rows: parsedRows,
        warning: parseErrors[0] ?? null,
      });
    } catch (e) {
      dispatch({
        type: "load_error",
        error: e instanceof Error ? e.message : t("import.alerts.saveError"),
      });
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        dispatch({ type: "load_error", error: t("import.cameraPermissionError") });
        return;
      }
    }
    setShowCamera(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    ocrAbortRef.current?.abort();
    ocrAbortRef.current = new AbortController();
    const signal = ocrAbortRef.current.signal;
    try {
      const photo = await cameraRef.current.takePictureAsync({});
      if (signal.aborted) return;
      setShowCamera(false);
      dispatch({ type: "load_start", source: "ocr" });
      const result = await postOcr(photo.uri, signal);
      if (signal.aborted) return;
      dispatch({
        type: "load_success",
        source: "ocr",
        rows: result.shifts.map((s) => ({ ok: true as const, shift: ocrShiftToShift(s) })),
      });
    } catch (e) {
      if (signal.aborted) return;
      dispatch({
        type: "load_error",
        error: e instanceof Error ? e.message : t("import.alerts.ocrFailed"),
      });
    }
  };

  const calculate = async () => {
    if (state.phase.phase !== "review") return;
    const validShifts = getValidShifts(state.phase.rows);
    if (state.phase.rows.length === 0) return;
    if (validShifts.length === 0) {
      Alert.alert(t("import.alerts.missingData"), t("import.alerts.missingDataCalculate"));
      return;
    }
    dispatch({ type: "calculate_start" });
    try {
      const rates = await getTariffRates();
      const total = calculateExpectedPay(validShifts, rates, rates.stacking_policy);
      dispatch({
        type: "calculate_done",
        expectedPay: total,
        warning: validShifts.length < state.phase.rows.length ? t("import.alerts.csvError") : null,
      });
    } catch (e) {
      dispatch({
        type: "calculate_done",
        expectedPay: 0,
        warning: e instanceof Error ? e.message : t("import.alerts.saveError"),
      });
    }
  };

  const addShiftManually = () => {
    dispatch({ type: "manual_start" });
    dispatch({
      type: "rows_update",
      rows: [{ ok: true as const, shift: emptyShift() }],
    });
  };

  const saveTimesheet = async () => {
    if (state.phase.phase !== "review") return;
    const { rows, source } = state.phase;
    const validShifts = getValidShifts(rows);
    if (validShifts.length === 0) {
      Alert.alert(t("import.alerts.missingData"), t("import.alerts.missingDataSave"));
      return;
    }
    const dates = validShifts.map((s) => s.date);
    const periodStart = dates.reduce((a, b) =>
      dateToComparable(a) <= dateToComparable(b) ? a : b
    );
    const periodEnd = dates.reduce((a, b) => (dateToComparable(a) >= dateToComparable(b) ? a : b));
    dispatch({ type: "save_start" });
    try {
      await requestNotificationPermission();
      if (__DEV__) {
        console.log(
          "[ShiftPay] saveTimesheet: period",
          periodStart,
          "–",
          periodEnd,
          "shifts:",
          validShifts.length
        );
      }
      const { scheduleId, shifts: inserted } = await insertScheduleWithShifts(
        periodStart,
        periodEnd,
        source,
        validShifts.map((s) => ({
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          shift_type: s.shift_type,
        }))
      );
      if (__DEV__) {
        console.log(
          "[ShiftPay] saveTimesheet: saved schedule",
          scheduleId,
          "with",
          inserted.length,
          "shifts"
        );
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
      dispatch({
        type: "save_success",
        result: {
          scheduleId,
          shiftCount: inserted.length,
          periodStart,
          periodEnd,
        },
      });
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("import.alerts.saveError"));
      dispatch({
        type: "save_error",
        error: e instanceof Error ? e.message : t("import.alerts.saveError"),
      });
    }
  };

  const updateRow = (index: number, field: keyof Shift, value: string | ShiftType) => {
    if (state.phase.phase !== "review") return;
    const next = state.phase.rows.map((r, i) => {
      if (i !== index) return r;
      if (r.ok) {
        return { ok: true as const, shift: { ...r.shift, [field]: value } };
      }
      return { ...r, [field]: value };
    });
    dispatch({ type: "rows_update", rows: next });
  };

  const removeRow = (index: number) => {
    if (state.phase.phase !== "review") return;
    dispatch({
      type: "rows_update",
      rows: state.phase.rows.filter((_, i) => i !== index),
    });
  };

  const addRow = () => {
    if (state.phase.phase !== "review") return;
    dispatch({
      type: "rows_update",
      rows: [...state.phase.rows, { ok: true as const, shift: emptyShift() }],
    });
  };

  // Announce error banner contents imperatively — Fabric doesn't fire
  // accessibilityLiveRegion="assertive" reliably. Must be called before
  // any conditional return to satisfy rules-of-hooks.
  useAnnounceWhen(state.error);

  if (showCamera) {
    return (
      <CameraCapture
        cameraRef={cameraRef}
        onCancel={() => setShowCamera(false)}
        onCapture={takePhoto}
      />
    );
  }

  const { phase, error } = state;
  const isLoading = phase.phase === "loading";
  const ocrProgress = phase.phase === "loading" ? phase.progress : null;
  const reviewRows = phase.phase === "review" || phase.phase === "saving" ? phase.rows : [];
  const reviewSource =
    phase.phase === "review" || phase.phase === "saving" ? phase.source : "manual";
  const expectedPay =
    phase.phase === "review" || phase.phase === "saving" ? phase.expectedPay : null;
  const calculating = phase.phase === "review" ? phase.calculating : false;
  const saving = phase.phase === "saving";
  const savedResult = phase.phase === "saved" ? phase.result : null;
  const showInitialOptions = phase.phase === "initial";
  const showReview = reviewRows.length > 0 || phase.phase === "saving";

  return (
    <ScrollView
      className="flex-1 bg-app-bg dark:bg-dark-bg"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {error && (
        <View
          className="mb-4 rounded-xl bg-red-50 p-3 dark:bg-red-500/10"
          accessibilityRole="alert"
        >
          <Text className="text-red-600 dark:text-red-400">{error}</Text>
        </View>
      )}

      {showInitialOptions && (
        <>
          {baseRateZero && (
            <PressableScale
              onPress={() => router.push("/(tabs)/settings")}
              accessibilityRole="link"
              accessibilityLabel={t("import.rateZero") + ". " + t("import.rateZeroCta")}
              className="mb-4 flex-row items-center gap-2 rounded-xl border border-amber-600/20 bg-amber-600/10 p-3 dark:border-amber-500/20 dark:bg-amber-500/10"
            >
              <Text className="flex-1 text-sm text-amber-700 dark:text-amber-300">
                {t("import.rateZero")}
              </Text>
              <Text className="font-inter-semibold text-amber-700 dark:text-amber-400">
                {t("import.rateZeroCta")}
              </Text>
            </PressableScale>
          )}
          <AnimatedCard
            index={0}
            className="mb-4 rounded-xl bg-app-surface p-3 dark:bg-dark-surface"
          >
            <Text className="text-sm text-stone-600 dark:text-stone-400">
              {t("import.disclaimer")}
            </Text>
          </AnimatedCard>
          {/* Primary: camera */}
          <AnimatedCard index={1}>
            <PressableScale
              onPress={openCamera}
              accessibilityLabel={t("import.cameraBtn")}
              className="rounded-xl bg-accent-dark py-4 dark:bg-accent"
            >
              <Text className="text-center font-inter-semibold text-base text-white dark:text-stone-900">
                {t("import.cameraBtn")}
              </Text>
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
              accessibilityLabel={t("import.fileBtn")}
              className="mt-3 rounded-xl border-2 border-app-border bg-app-surface py-4 dark:border-dark-border dark:bg-dark-surface"
            >
              <Text className="text-center font-inter-medium text-base text-stone-700 dark:text-stone-300">
                {t("import.fileBtn")}
              </Text>
            </PressableScale>
          </AnimatedCard>
          {/* Tertiary: more options toggle */}
          <PressableScale
            onPress={() => setShowMore((v) => !v)}
            accessibilityLabel={t("import.moreOptions")}
            className="mt-3 py-2"
            haptic="none"
          >
            <Text className="text-center text-sm text-stone-500">
              {t("import.moreOptions")} {showMore ? "▲" : "▼"}
            </Text>
          </PressableScale>
          {showMore && (
            <>
              <PressableScale
                onPress={pickCSV}
                accessibilityLabel={t("import.csvBtn")}
                className="mt-1 py-2"
              >
                <Text className="text-center font-inter-medium text-sm text-accent-dark dark:text-accent">
                  {t("import.csvBtn")}
                </Text>
              </PressableScale>
              <PressableScale
                onPress={addShiftManually}
                accessibilityLabel={t("import.manualBtn")}
                className="mt-2 py-2"
              >
                <Text className="text-center font-inter-medium text-sm text-accent-dark dark:text-accent">
                  {t("import.manualBtn")}
                </Text>
              </PressableScale>
            </>
          )}
        </>
      )}

      {isLoading && <OcrLoadingState progress={ocrProgress} />}

      {savedResult && (
        <SavedSuccessView
          savedResult={savedResult}
          onViewSchedule={() => {
            const id = savedResult.scheduleId;
            dispatch({ type: "reset_to_initial" });
            router.push({ pathname: "/period/[id]", params: { id } });
          }}
          onImportMore={() => dispatch({ type: "reset_to_initial" })}
        />
      )}

      {showReview && !savedResult && !isLoading && (
        <ShiftEditor
          rows={reviewRows}
          source={reviewSource}
          expectedPay={expectedPay}
          saving={saving}
          calculating={calculating}
          onUpdateRow={updateRow}
          onRemoveRow={removeRow}
          onAddRow={addRow}
          onCalculate={calculate}
          onSave={saveTimesheet}
          onReset={() => dispatch({ type: "reset_to_initial" })}
        />
      )}
    </ScrollView>
  );
}
