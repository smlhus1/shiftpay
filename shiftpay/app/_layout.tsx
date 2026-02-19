import "../global.css";
import { useEffect, useState } from "react";
import { Platform, Modal, View, Text, TouchableOpacity } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initDb, getTariffRates } from "../lib/db";
import { ErrorBoundary } from "../components/ErrorBoundary";

const ONBOARDING_DONE_KEY = "shiftpay_onboarding_done";

// Keep splash visible until we're ready (native only)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    (async () => {
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
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const shiftId = response.notification.request.content.data?.shiftId as string | undefined;
      if (shiftId) router.push(`/confirm/${shiftId}` as any);
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
            options={{ headerShown: true, headerTitle: "Periodedetaljer" }}
          />
          <Stack.Screen
            name="confirm/[shiftId]"
            options={{ headerShown: true, headerTitle: "Bekreft vakt" }}
          />
          <Stack.Screen
            name="summary/[yearMonth]"
            options={{ headerShown: true, headerTitle: "Månedsoppsummering" }}
          />
        </Stack>
      </ErrorBoundary>
      {Platform.OS !== "web" && (
        <Modal visible={showOnboarding} transparent animationType="fade">
          <View className="flex-1 justify-center bg-black/50 px-6">
            <View className="rounded-xl bg-white p-6">
              <Text className="text-lg font-medium text-gray-900">
                Sett opp lønnssatsene dine
              </Text>
              <Text className="mt-2 text-gray-600">
                For at ShiftPay skal kunne beregne forventet lønn, må du legge inn grunnlønn og tillegg under Innstillinger.
              </Text>
              <TouchableOpacity
                onPress={dismissOnboarding}
                className="mt-6 rounded-lg bg-blue-600 py-3"
              >
                <Text className="text-center font-medium text-white">Gå til Innstillinger</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
