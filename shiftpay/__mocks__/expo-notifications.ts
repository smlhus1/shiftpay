/** Mock for expo-notifications — native scheduler, unit tests mock the API. */
export const setNotificationHandler = jest.fn();
export const requestPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: "granted",
  canAskAgain: false,
  expires: "never",
}));
export const getPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: "granted",
  canAskAgain: false,
  expires: "never",
}));
export const scheduleNotificationAsync = jest.fn(async () => "mock-notification-id");
export const cancelScheduledNotificationAsync = jest.fn(async () => {});
export const cancelAllScheduledNotificationsAsync = jest.fn(async () => {});
export const getAllScheduledNotificationsAsync = jest.fn(async () => [] as unknown[]);
export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const SchedulableTriggerInputTypes = {
  DATE: "date" as const,
  TIME_INTERVAL: "timeInterval" as const,
  CALENDAR: "calendar" as const,
  DAILY: "daily" as const,
  WEEKLY: "weekly" as const,
  MONTHLY: "monthly" as const,
  YEARLY: "yearly" as const,
};
export const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};
export const setNotificationChannelAsync = jest.fn(async () => null);
