import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.secondary + "44" },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.textPrimary,
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "إحصائياتي",
          tabBarLabel: "إحصائياتي",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "bar-chart" : "bar-chart-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "المحفوظات",
          tabBarLabel: "المحفوظات",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "bookmark" : "bookmark-outline"} 
              color={color} 
              size={size} 
            />
          ),
        }}
      />
    </Tabs>
  );
}