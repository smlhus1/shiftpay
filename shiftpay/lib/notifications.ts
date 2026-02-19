import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

function parseShiftEndDate(dateStr: string, endTimeStr: string): Date {
  const [d, m, y] = dateStr.split(".").map(Number);
  const [h, min] = endTimeStr.split(":").map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0);
  date.setMinutes(date.getMinutes() + 15);
  return date;
}

const CHANNEL_ID = "shift-reminders";

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Vaktpåminnelser",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {}
}

export async function scheduleShiftReminder(shift: ShiftForReminder): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const fireDate = parseShiftEndDate(shift.date, shift.end_time);
  if (fireDate.getTime() <= Date.now()) return null;
  try {
    await ensureChannel();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Vakt fullført?",
        body: `Fullførte du vakten kl ${shift.end_time}?`,
        data: { shiftId: shift.id },
      },
      trigger: { date: fireDate, channelId: CHANNEL_ID },
    });
    return id;
  } catch {
    return null;
  }
}

async function getStoredNotifs(): Promise<Record<string, string[]>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
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
    } catch {}
  }
  delete record[scheduleId];
  await setStoredNotifs(record);
}
