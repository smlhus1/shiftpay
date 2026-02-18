import { View, Text } from "react-native";

export default function HistoryScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-4">
      <Text className="text-lg font-medium text-gray-900">History</Text>
      <Text className="mt-2 text-center text-gray-600">
        No timesheets yet. Import one from the Import tab.
      </Text>
    </View>
  );
}
