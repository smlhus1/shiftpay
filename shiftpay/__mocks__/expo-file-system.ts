/**
 * Hand-rolled mock for expo-file-system (SDK 54).
 * jest-expo's bundled mock still points at the legacy API only — see
 * issue expo/expo#39922. ShiftPay's lib/csv.ts uses readAsStringAsync,
 * cacheDirectory, writeAsStringAsync, and EncodingType from the legacy surface.
 */

export const EncodingType = {
  UTF8: "utf8" as const,
  Base64: "base64" as const,
} as const;

export const cacheDirectory = "/mock-cache/";
export const documentDirectory = "/mock-documents/";

const store = new Map<string, string>();

export const readAsStringAsync = jest.fn(async (uri: string): Promise<string> => {
  const v = store.get(uri);
  if (v === undefined) throw new Error(`ENOENT: no such file ${uri}`);
  return v;
});

export const writeAsStringAsync = jest.fn(
  async (uri: string, content: string): Promise<void> => {
    store.set(uri, content);
  }
);

export const getInfoAsync = jest.fn(async (uri: string) => ({
  exists: store.has(uri),
  uri,
  size: store.get(uri)?.length ?? 0,
  isDirectory: false,
  modificationTime: 0,
}));

export const deleteAsync = jest.fn(async (uri: string) => {
  store.delete(uri);
});

// Test helpers — used in lib/csv tests to seed fixtures.
export const __setMockFile = (uri: string, content: string) => {
  store.set(uri, content);
};
export const __clearMockFiles = () => {
  store.clear();
};
