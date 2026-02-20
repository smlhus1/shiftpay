import { View, Text, TouchableOpacity } from "react-native";
import { CameraView } from "expo-camera";
import type { RefObject } from "react";

interface CameraCaptureProps {
  cameraRef: RefObject<{ takePicture: (opts?: object) => Promise<{ uri: string }> } | null>;
  onCancel: () => void;
  onCapture: () => void;
}

export function CameraCapture({ cameraRef, onCancel, onCapture }: CameraCaptureProps) {
  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef as any} style={{ flex: 1 }} facing="back" />
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View className="h-[60%] w-[90%] rounded-xl border-2 border-white/60" />
        <Text className="mt-3 text-center text-sm text-white/80">
          Hold timelisten innenfor rammen
        </Text>
      </View>
      <View className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-4">
        <TouchableOpacity onPress={onCancel} className="rounded-lg bg-gray-600 px-6 py-3">
          <Text className="text-white">Avbryt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCapture} className="rounded-lg bg-blue-600 px-6 py-3">
          <Text className="text-white">Ta bilde</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
