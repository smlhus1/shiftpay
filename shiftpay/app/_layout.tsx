import "../global.css";
import { useCallback, useEffect, useState } from "react";
import { Platform, Modal, View, Text, TouchableOpacity } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initDb, getTariffRates } from "../lib/db";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { LocaleProvider, useTranslation } from "../lib/i18n";

const ONBOARDING_DONE_KEY = "shiftpay_onboarding_done";

// Keep splash visible until we're ready (native only)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

function RootLayoutInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const runInit = useCallback(async () => {
    if (Platform.OS === "web") return;
    setInitError(null);
    try {
      await initDb();
      const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      if (done !== "1") {
        const rates = await getTariffRates();
        if (rates.base_rate <= 0) {
          setShowOnboarding(true);
        } else {
          await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
        }
      }
    } catch (e) {
      console.warn("[ShiftPay] DB init failed:", e);
      setInitError(e instanceof Error ? e.message : t("initError.title"));
    } finally {
      await SplashScreen.hideAsync();
    }
  }, [t]);

  useEffect(() => {
    runInit();
  }, [runInit]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const shiftId = response.notification.request.content.data?.shiftId as string | undefined;
      if (shiftId) router.push(`/confirm/${shiftId}` as Href);
    });
    return () => sub.remove();
  }, [router]);

  const dismissOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
    setShowOnboarding(false);
    router.replace("/(tabs)/settings");
  };

  return (
    <>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="period/[id]"
            options={{ headerShown: true, headerTitle: t("screens.periodDetail") }}
          />
          <Stack.Screen
            name="confirm/[shiftId]"
            options={{ headerShown: true, headerTitle: t("screens.confirmShift") }}
          />
          <Stack.Screen
            name="summary/[yearMonth]"
            options={{ headerShown: true, headerTitle: t("screens.monthlySummary") }}
          />
        </Stack>
      </ErrorBoundary>
      {Platform.OS !== "web" && initError && (
        <Modal visible transparent animationType="fade">
          <View className="flex-1 justify-center bg-black/50 px-6">
            <View className="rounded-xl bg-white p-6">
              <Text className="text-lg font-medium text-slate-900">{t("initError.title")}</Text>
              <Text className="mt-2 text-slate-500">{initError}</Text>
              <TouchableOpacity
                onPress={() => runInit()}
                className="mt-6 rounded-xl bg-teal-700 py-3"
              >
                <Text className="text-center font-medium text-white">{t("initError.retry")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS !== "web" && showOnboarding && !initError && (
        <Modal visible transparent animationType="fade">
          <View className="flex-1 justify-center bg-black/50 px-6">
            <View className="rounded-xl bg-white p-6">
              <Text className="text-lg font-medium text-slate-900">
                {t("onboarding.title")}
              </Text>
              <Text className="mt-2 text-slate-500">
                {t("onboarding.description")}
              </Text>
              <TouchableOpacity
                onPress={dismissOnboarding}
                className="mt-6 rounded-xl bg-teal-700 py-3"
              >
                <Text className="text-center font-medium text-white">{t("onboarding.cta")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <LocaleProvider>
      <RootLayoutInner />
    </LocaleProvider>
  );
}
