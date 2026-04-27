import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import * as v from "valibot";
import { type Clock, realClock } from "./clock";
import { parseDateTimeSafe } from "./dates";
import { getTranslation } from "./i18n";
import { getJSON, migrateAsyncStorageKey, setJSON } from "./storage";

const STORAGE_KEY = "shiftpay_schedule_notifs";

const NotifMapSchema = v.record(v.string(), v.array(v.string()));
type NotifMap = v.InferOutput<typeof NotifMapSchema>;

let migratedOnce = false;
async function migrateOnce(): Promise<void> {
  if (migratedOnce) return;
  migratedOnce = true;
  await migrateAsyncStorageKey<NotifMap>(STORAGE_KEY, (raw) => {
    try {
      const parsed = v.safeParse(NotifMapSchema, JSON.parse(raw));
      return parsed.success ? parsed.output : null;
    } catch {
      return null;
    }
  });
}

export interface ShiftForReminder {
  id: string;
  date: string;
  end_time: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // SDK 54 split `shouldShowAlert` into `shouldShowBanner` + `shouldShowList`;
    // keep the legacy flag set for backward compat with older runtimes.
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function parseShiftEndDate(dateStr: string, endTimeStr: string): Date | null {
  const date = parseDateTimeSafe(dateStr, endTimeStr);
  if (!date) return null;
  date.setMinutes(date.getMinutes() + 15);
  return date;
}

const CHANNEL_ID = "shift-reminders";

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: getTranslation("notifications.channel"),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    if (__DEV__) console.warn("[ShiftPay] ensureChannel failed:", e);
  }
}

export async function scheduleShiftReminder(
  shift: ShiftForReminder,
  clock: Clock = realClock
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const fireDate = parseShiftEndDate(shift.date, shift.end_time);
  if (!fireDate || fireDate.getTime() <= clock().getTime()) return null;
  try {
    await ensureChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: getTranslation("notifications.title"),
        body: getTranslation("notifications.body", { time: shift.end_time }),
        data: { shiftId: shift.id },
      },
      trigger: { date: fireDate, channelId: CHANNEL_ID },
    });
    return id;
  } catch (e) {
    if (__DEV__) console.warn("[ShiftPay] scheduleShiftReminder failed:", e);
    return null;
  }
}

function getStoredNotifs(): NotifMap {
  return getJSON(STORAGE_KEY, NotifMapSchema, {});
}

function setStoredNotifs(record: NotifMap): void {
  setJSON(STORAGE_KEY, record);
}

export async function storeScheduledNotificationId(
  scheduleId: string,
  notificationId: string
): Promise<void> {
  await migrateOnce();
  const record = getStoredNotifs();
  if (!record[scheduleId]) record[scheduleId] = [];
  record[scheduleId].push(notificationId);
  setStoredNotifs(record);
}

export async function cancelScheduleReminders(scheduleId: string): Promise<void> {
  await migrateOnce();
  const record = getStoredNotifs();
  const ids = record[scheduleId];
  if (!ids) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      if (__DEV__) console.warn("[ShiftPay] cancelNotification failed:", e);
    }
  }
  delete record[scheduleId];
  setStoredNotifs(record);
}
