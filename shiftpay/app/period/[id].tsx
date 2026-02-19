import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getScheduleById,
  getShiftsBySchedule,
  deleteSchedule,
  type ScheduleRow,
  type ShiftRow,
  type ShiftStatus,
} from "../../lib/db";
import { cancelScheduleReminders } from "../../lib/notifications";

function sourceLabel(source: string): string {
  if (source === "ocr") return "OCR";
  if (source === "gallery") return "Galleri";
  if (source === "csv") return "CSV";
  return "Manuell";
}

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

function statusLabel(s: ShiftStatus): string {
  if (s === "planned") return "Planlagt";
  if (s === "completed") return "Fullført";
  if (s === "missed") return "Ikke møtt";
  return "Overtid";
}

function statusColor(s: ShiftStatus): string {
  if (s === "planned") return "bg-amber-100 text-amber-800";
  if (s === "completed") return "bg-green-100 text-green-800";
  if (s === "missed") return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-800";
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
      "Slett vaktplan",
      "Er du sikker på at du vil slette denne vaktplanen? Dette kan ikke angres.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await cancelScheduleReminders(id);
              await deleteSchedule(id);
              router.back();
            } catch (e) {
              Alert.alert("Feil", e instanceof Error ? e.message : "Kunne ikke slette");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [id, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (notFound || !id) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-center text-gray-600">Vaktplanen ble ikke funnet.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2"
        >
          <Text className="text-white">Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!schedule) return null;

  const yearMonth = periodToYearMonth(schedule.period_start);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <Text className="text-lg font-medium text-gray-900">
          {schedule.period_start} – {schedule.period_end}
        </Text>
        <Text className="mt-1 text-sm text-gray-600">
          Kilde: {sourceLabel(schedule.source)} · Lagt til {formatCreated(schedule.created_at)}
        </Text>
        {yearMonth && (
          <TouchableOpacity
            onPress={() => router.push(`/summary/${yearMonth}` as any)}
            className="mt-3 rounded-lg border border-blue-200 bg-blue-50 py-2"
          >
            <Text className="text-center text-sm font-medium text-blue-700">
              Se månedsoppsummering
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text className="mb-2 font-medium text-gray-900">Vakter</Text>
      {shifts.map((shift) => (
        <View
          key={shift.id}
          className="mb-2 flex-row flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
        >
          <Text className="font-medium text-gray-900">{shift.date}</Text>
          <Text className="text-gray-600">
            {shift.start_time} – {shift.end_time}
          </Text>
          <View className="rounded bg-gray-200 px-2 py-0.5">
            <Text className="text-sm text-gray-700">{shift.shift_type}</Text>
          </View>
          <View className={`rounded px-2 py-0.5 ${statusColor(shift.status)}`}>
            <Text className="text-sm">{statusLabel(shift.status)}</Text>
          </View>
          {shift.status === "planned" && (
            <TouchableOpacity
              onPress={() => router.push(`/confirm/${shift.id}` as any)}
              className="rounded bg-blue-600 px-3 py-1"
            >
              <Text className="text-sm font-medium text-white">Bekreft</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity
        onPress={handleDelete}
        disabled={deleting}
        style={deleting ? { opacity: 0.6 } : undefined}
        className="mt-6 rounded-lg border border-red-300 bg-red-50 py-3"
      >
        {deleting ? (
          <ActivityIndicator color="#b91c1c" />
        ) : (
          <Text className="text-center font-medium text-red-700">Slett vaktplan</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
