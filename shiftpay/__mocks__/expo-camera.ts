/** Mock for expo-camera — native view, never rendered in Jest. */
import { View } from "react-native";

export const CameraView = View;
export const useCameraPermissions = () => [
  { granted: true, status: "granted", canAskAgain: false, expires: "never" },
  jest.fn(async () => ({ granted: true })),
] as const;
export const Camera = {
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, status: "granted" })),
};
