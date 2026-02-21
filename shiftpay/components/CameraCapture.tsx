import { View, Text } from "react-native";
import { CameraView } from "expo-camera";
import type { RefObject } from "react";
import { useTranslation } from "../lib/i18n";
import { PressableScale } from "./PressableScale";

interface CameraCaptureProps {
  cameraRef: RefObject<{ takePictureAsync: (opts?: object) => Promise<{ uri: string }> } | null>;
  onCancel: () => void;
  onCapture: () => void;
}

export function CameraCapture({ cameraRef, onCancel, onCapture }: CameraCaptureProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef as any} style={{ flex: 1 }} facing="back" />
      <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
        <View className="h-[60%] w-[90%] rounded-xl border-2 border-white/60" />
        <Text className="mt-3 text-center text-sm text-white/80">
          {t("components.camera.instruction")}
        </Text>
      </View>
      <View className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-4">
        <PressableScale onPress={onCancel} className="rounded-xl bg-dark-elevated px-6 py-3">
          <Text className="font-inter-medium text-white">{t("components.camera.cancel")}</Text>
        </PressableScale>
        <PressableScale onPress={onCapture} className="rounded-xl bg-accent px-6 py-3">
          <Text className="font-inter-medium text-slate-900">{t("components.camera.capture")}</Text>
        </PressableScale>
      </View>
    </View>
  );
}
