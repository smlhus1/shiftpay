import { View, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4">
      <Text className="text-lg font-medium text-gray-900">Settings</Text>
      <Text className="mt-2 text-center text-gray-600">
        Tariff rates (base + supplements) — coming in Phase 2.
      </Text>
    </View>
  );
}
