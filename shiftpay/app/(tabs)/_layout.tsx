import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        headerTitle: "ShiftPay",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "History",
          tabBarLabel: "History",
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: "Import",
          tabBarLabel: "Import",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
        }}
      />
    </Tabs>
  );
}
