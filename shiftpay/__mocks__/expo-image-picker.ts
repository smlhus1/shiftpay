/** Mock for expo-image-picker — native intent, tests inject fixtures via launchImageLibraryAsync. */
export const MediaTypeOptions = {
  All: "All" as const,
  Videos: "Videos" as const,
  Images: "Images" as const,
};
export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: true,
  assets: null,
}));
export const launchCameraAsync = jest.fn(async () => ({
  canceled: true,
  assets: null,
}));
export const requestMediaLibraryPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: "granted",
  canAskAgain: false,
  expires: "never",
}));
export const requestCameraPermissionsAsync = jest.fn(async () => ({
  granted: true,
  status: "granted",
  canAskAgain: false,
  expires: "never",
}));
