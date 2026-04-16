import "../global.css";
import { useCallback, useEffect, useState } from "react";
import { Platform, Modal, View, Text, Pressable } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter } from "expo-router";
import type { Href } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from "@expo-google-fonts/inter-tight";
import {
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from "@expo-google-fonts/jetbrains-mono";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initDb, getTariffRates } from "@/lib/db";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ShiftTintStripe } from "@/components/ShiftTintStripe";
import { LocaleProvider, useTranslation } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme-context";

const ONBOARDING_DONE_KEY = "shiftpay_onboarding_done";

// Keep splash visible until we're ready (native only)
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

function RootLayoutInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    // Inter (body) — kept during migration, still referenced by existing components
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Inter Tight — body-sans going forward
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    // Fraunces — display/editorial serif for headings + italic margin-notes
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    // JetBrains Mono — all numbers (amounts, times, rates)
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

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
      if (__DEV__) console.warn("[ShiftPay] DB init failed:", e);
      setInitError(e instanceof Error ? e.message : t("initError.title"));
    } finally {
      await SplashScreen.hideAsync();
    }
  }, [t]);

  useEffect(() => {
    if (fontsLoaded) runInit();
  }, [fontsLoaded, runInit]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const shiftId = response.notification.request.content.data?.shiftId as string | undefined;
      if (shiftId && UUID_RE.test(shiftId)) router.push(`/confirm/${shiftId}` as Href);
    });
    return () => sub.remove();
  }, [router]);

  const dismissOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
    setShowOnboarding(false);
    router.replace("/(tabs)/settings");
  };

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: { color: colors.textPrimary, fontFamily: "Inter_600SemiBold" },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
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
          <Stack.Screen
            name="add-shift"
            options={{ headerShown: true, headerTitle: t("screens.addShift") }}
          />
        </Stack>
      </ErrorBoundary>
      <ShiftTintStripe />
      {Platform.OS !== "web" && initError && (
        <Modal visible transparent animationType="fade" accessibilityViewIsModal={true}>
          <View className="flex-1 justify-center bg-black/50 px-6" accessibilityRole="alert">
            <View className="rounded-xl bg-app-surface p-6 dark:bg-dark-surface">
              <Text
                className="font-inter-semibold text-lg text-stone-900 dark:text-stone-100"
                accessibilityRole="header"
              >
                {t("initError.title")}
              </Text>
              <Text className="mt-2 text-stone-600 dark:text-stone-400">{initError}</Text>
              <Pressable
                onPress={() => runInit()}
                accessibilityRole="button"
                accessibilityLabel={t("initError.retry")}
                className="mt-6 rounded-xl bg-accent-dark py-3 dark:bg-accent"
              >
                <Text className="text-center font-inter-semibold text-white dark:text-stone-900">
                  {t("initError.retry")}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS !== "web" && showOnboarding && !initError && (
        <Modal visible transparent animationType="fade" accessibilityViewIsModal={true}>
          <View className="flex-1 justify-center bg-black/50 px-6">
            <View className="rounded-xl bg-app-surface p-6 dark:bg-dark-surface">
              <Text
                className="font-inter-semibold text-lg text-stone-900 dark:text-stone-100"
                accessibilityRole="header"
              >
                {t("onboarding.title")}
              </Text>
              <Text className="mt-2 text-stone-600 dark:text-stone-400">
                {t("onboarding.description")}
              </Text>
              <Pressable
                onPress={dismissOnboarding}
                accessibilityRole="button"
                accessibilityLabel={t("onboarding.cta")}
                className="mt-6 rounded-xl bg-accent-dark py-3 dark:bg-accent"
              >
                <Text className="text-center font-inter-semibold text-white dark:text-stone-900">
                  {t("onboarding.cta")}
                </Text>
              </Pressable>
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
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </LocaleProvider>
  );
}
