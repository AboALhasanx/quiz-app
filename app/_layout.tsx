import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0f0f13" },
          headerTintColor: "#f1f5f9",
          contentStyle: { backgroundColor: "#0f0f13" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="subject/[id]" options={{ title: "المادة" }} />
        <Stack.Screen name="chapter/[id]" options={{ title: "الفصل" }} />
        <Stack.Screen name="quiz/setup" options={{ title: "إعداد الكوز" }} />
        <Stack.Screen name="quiz/play" options={{ headerShown: false }} />
        <Stack.Screen name="quiz/result" options={{ title: "النتيجة" }} />
      </Stack>
    </>
  );
}
