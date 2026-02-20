import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseDateTimeSafe } from "./dates";
import { getTranslation } from "./i18n";

const STORAGE_KEY = "shiftpay_schedule_notifs";

export interface ShiftForReminder {
  id: string;
  date: string;
  end_time: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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

export async function scheduleShiftReminder(shift: ShiftForReminder): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const fireDate = parseShiftEndDate(shift.date, shift.end_time);
  if (!fireDate || fireDate.getTime() <= Date.now()) return null;
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

async function getStoredNotifs(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    if (__DEV__) console.warn("[ShiftPay] getStoredNotifs failed:", e);
  }
  return {};
}

async function setStoredNotifs(record: Record<string, string[]>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export async function storeScheduledNotificationId(scheduleId: string, notificationId: string): Promise<void> {
  const record = await getStoredNotifs();
  if (!record[scheduleId]) record[scheduleId] = [];
  record[scheduleId].push(notificationId);
  await setStoredNotifs(record);
}

export async function cancelScheduleReminders(scheduleId: string): Promise<void> {
  const record = await getStoredNotifs();
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
  await setStoredNotifs(record);
}
