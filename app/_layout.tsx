import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged } from "firebase/auth";
import { auth, flushSyncQueue } from "../utils/firebase";
import { View, ActivityIndicator } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import * as SystemUI from "expo-system-ui";
import { AppThemeProvider, useTheme } from "../utils/ThemeContext";

function AppContent() {
  const { isDark, theme } = useTheme();
  const [checking, setChecking] = useState(() => !auth.currentUser);

  SystemUI.setBackgroundColorAsync(theme.background);

  const NavTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.card,
    },
  };

  useEffect(() => {
    if (auth.currentUser) {
      void flushSyncQueue();
      router.replace("/(tabs)");
      setChecking(false);
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        void flushSyncQueue();
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <NavThemeProvider value={NavTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle:     { backgroundColor: theme.card },
          headerTintColor: theme.textPrimary,
          contentStyle:    { backgroundColor: theme.background },
          animation:       "fade",
        }}
      >
        <Stack.Screen name="login"                  options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"                 options={{ headerShown: false }} />
        <Stack.Screen name="subject/[id]"           options={{ title: "المادة" }} />
        <Stack.Screen name="chapter/[id]"           options={{ title: "الفصل" }} />
        <Stack.Screen name="bookmarks/[questionId]" options={{ title: "تفاصيل المحفوظ" }} />
        <Stack.Screen name="quiz/setup"             options={{ title: "إعداد الكوز" }} />
        <Stack.Screen name="quiz/play"              options={{ headerShown: false }} />
        <Stack.Screen name="quiz/flashcards"        options={{ title: "Flashcards" }} />
        <Stack.Screen name="quiz/result"            options={{ title: "النتيجة" }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}
