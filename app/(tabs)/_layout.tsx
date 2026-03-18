import { Tabs } from "expo-router";
import { Colors } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "إحصائياتي",
          tabBarLabel: "إحصائياتي",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "المحفوظات",
          tabBarLabel: "المحفوظات",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
