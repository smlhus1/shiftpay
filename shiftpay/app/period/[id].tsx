import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Href } from "expo-router";
import {
  getScheduleById,
  getShiftsBySchedule,
  deleteSchedule,
  type ScheduleRow,
  type ShiftRow,
} from "../../lib/db";
import { cancelScheduleReminders } from "../../lib/notifications";
import { sourceLabel } from "../../lib/format";
import { ShiftCard } from "../../components/ShiftCard";
import { PressableScale } from "../../components/PressableScale";
import { AnimatedCard } from "../../components/AnimatedCard";
import { useTranslation } from "../../lib/i18n";
import { useThemeColors } from "../../lib/theme-context";
import * as Haptics from "expo-haptics";

function formatCreated(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return createdAt;
  }
}

/** "DD.MM.YYYY" -> "YYYY-MM" */
function periodToYearMonth(periodStart: string): string {
  const parts = periodStart.split(".");
  if (parts.length !== 3) return "";
  const [, m, y] = parts;
  return `${y}-${m}`;
}

export default function PeriodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const sched = await getScheduleById(id);
      if (!sched) {
        setNotFound(true);
        setShifts([]);
      } else {
        setSchedule(sched);
        const list = await getShiftsBySchedule(id);
        setShifts(list);
      }
    } catch {
      setNotFound(true);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert(
      t("period.delete.title"),
      t("period.delete.message"),
      [
        { text: t("period.delete.cancel"), style: "cancel" },
        {
          text: t("period.delete.confirm"),
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await cancelScheduleReminders(id);
              await deleteSchedule(id);
              router.back();
            } catch (e) {
              Alert.alert(t("common.error"), e instanceof Error ? e.message : t("period.errors.deleteError"));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [id, router, t]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg">
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (notFound || !id) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg p-6">
        <Text className="text-center text-slate-600 dark:text-slate-400">{t("period.notFound")}</Text>
        <PressableScale
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-accent-dark dark:bg-accent px-6 py-2"
        >
          <Text className="font-inter-semibold text-white dark:text-slate-900">{t("common.back")}</Text>
        </PressableScale>
      </View>
    );
  }

  if (!schedule) return null;

  const yearMonth = periodToYearMonth(schedule.period_start);

  return (
    <ScrollView
      className="flex-1 bg-app-bg dark:bg-dark-bg"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <AnimatedCard index={0} className="mb-4 rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
        <Text className="text-lg font-inter-semibold text-slate-900 dark:text-slate-100">
          {schedule.period_start} – {schedule.period_end}
        </Text>
        <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t("period.source", { source: sourceLabel(schedule.source, t), date: formatCreated(schedule.created_at) })}
        </Text>
        {yearMonth && (
          <PressableScale
            onPress={() => router.push(`/summary/${yearMonth}` as Href)}
            className="mt-3 rounded-xl border border-sky-600/20 bg-sky-600/10 dark:border-sky-400/20 dark:bg-sky-400/10 py-2"
          >
            <Text className="text-center text-sm font-inter-semibold text-accent-dark dark:text-accent">
              {t("period.viewSummary")}
            </Text>
          </PressableScale>
        )}
      </AnimatedCard>

      <Text className="mb-2 text-xs font-inter-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">{t("period.shifts.title")}</Text>
      {shifts.length === 0 ? (
        <View className="rounded-xl border border-app-border dark:border-dark-border bg-app-surface dark:bg-dark-surface p-4">
          <Text className="text-center text-slate-600 dark:text-slate-400">{t("period.shifts.empty")}</Text>
        </View>
      ) : (
        shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            shift={shift}
            showShiftType
            onConfirm={(id) => router.push(`/confirm/${id}` as Href)}
          />
        ))
      )}

      <PressableScale
        onPress={handleDelete}
        disabled={deleting}
        style={deleting ? { opacity: 0.6 } : undefined}
        className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 py-3"
      >
        {deleting ? (
          <ActivityIndicator color={colors.error} />
        ) : (
          <Text className="text-center font-inter-semibold text-red-600 dark:text-red-400">{t("period.delete.btn")}</Text>
        )}
      </PressableScale>
    </ScrollView>
  );
}
