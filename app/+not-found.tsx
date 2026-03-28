import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../utils/ThemeContext";

export default function NotFoundScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>الصفحة غير موجودة</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        هذا المسار غير متوفر داخل التطبيق.
      </Text>
      <Link href="/(tabs)" style={[styles.link, { color: theme.primary }]}>
        العودة إلى الرئيسية
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 18,
    textAlign: "center",
  },
  link: {
    fontSize: 15,
    fontWeight: "700",
  },
});
