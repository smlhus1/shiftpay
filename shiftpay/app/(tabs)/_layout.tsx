import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../lib/i18n";
import { useThemeColors } from "../../lib/theme-context";

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
        headerShadowVisible: false,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        headerTitle: "ShiftPay",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.overview"),
          tabBarLabel: t("tabs.overview"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: t("tabs.import"),
          tabBarLabel: t("tabs.import"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarLabel: t("tabs.settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
