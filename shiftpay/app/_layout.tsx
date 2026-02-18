import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { initDb } from "../lib/db";

export default function RootLayout() {
  useEffect(() => {
    initDb();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
