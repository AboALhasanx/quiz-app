import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { View, ActivityIndicator } from "react-native";

export default function RootLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
      setChecking(false);
    });

    return unsub;
  }, []);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f0f13",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

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
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="subject/[id]" options={{ title: "المادة" }} />
        <Stack.Screen name="chapter/[id]" options={{ title: "الفصل" }} />
        <Stack.Screen name="bookmarks/[questionId]" options={{ title: "تفاصيل المحفوظ" }} />
        <Stack.Screen name="quiz/setup" options={{ title: "إعداد الكوز" }} />
        <Stack.Screen name="quiz/play" options={{ headerShown: false }} />
        <Stack.Screen name="quiz/result" options={{ title: "النتيجة" }} />
      </Stack>
    </>
  );
}
