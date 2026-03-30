import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Switch, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getResults, QuizResult } from "../../utils/storage";
import { useTheme } from "../../utils/ThemeContext";
import { SUBJECT_MANIFEST, getSubjectMetaByFile } from "../../utils/subjects";
import { logoutUser } from "../../utils/firebase";

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark, toggle } = useTheme();
  const [lastResults, setLastResults] = useState<Record<string, QuizResult>>({});

  useFocusEffect(
    useCallback(() => {
      getResults().then((results) => {
        const latestResults: Record<string, QuizResult> = {};
        results.forEach((result) => {
          if (!latestResults[result.subjectId]) {
            latestResults[result.subjectId] = result;
          }
        });
        setLastResults(latestResults);
      });
    }, [])
  );

  const getScoreColor = (percentage: number) =>
    percentage >= 70 ? theme.correct : percentage >= 50 ? theme.primary : theme.wrong;

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={s.topRow}>
        <View style={s.switchRow}>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginRight: 6 }}>
            {isDark ? "🌙" : "☀️"}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ false: theme.secondary, true: theme.primary }}
            thumbColor={theme.textPrimary}
          />
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.header, { color: theme.textPrimary }]}>موادي</Text>
          <Text style={[s.subtitle, { color: theme.textSecondary }]}>
            {SUBJECT_MANIFEST.length} مادة
          </Text>
        </View>
      </View>

      <FlatList
        data={SUBJECT_MANIFEST}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity
            style={[s.logoutBtn, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
            onPress={handleLogout}
          >
            <Text style={{ color: theme.wrong, fontWeight: "bold", fontSize: 14 }}>تسجيل الخروج</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const last = lastResults[item.id];
          const { chaptersCount, questionsCount } = getSubjectMetaByFile(item.file);
          const code = item.id.replace(/_data$/i, "").toUpperCase();

          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
              onPress={() => router.push(`/subject/${item.id}` as any)}
              activeOpacity={0.75}
            >
              

              <Text style={[s.title, { color: theme.textPrimary }]}>{item.title}</Text>

              <View style={s.cardBottom}>
                <Text style={[s.meta, { color: theme.textSecondary }]}>الفصول: {chaptersCount}</Text>
                <Text style={[s.dot, { color: theme.secondary }]}>·</Text>
                <Text style={[s.meta, { color: theme.textSecondary }]}>الأسئلة: {questionsCount}</Text>
                {last && (
                  <>
                    <Text style={[s.dot, { color: theme.secondary }]}>·</Text>
                    <Text style={[s.meta, { color: theme.textSecondary }]}>المجاب: {last.total}</Text>
                  </>
                )}
              </View>

              

              <Text style={[s.arrow, { color: theme.textSecondary }]}>←</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  switchRow: { flexDirection: "row", alignItems: "center" },
  header: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  codeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeText: { fontWeight: "bold", fontSize: 13 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontWeight: "bold", fontSize: 12 },
  title: { fontSize: 17, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  meta: { fontSize: 12 },
  dot: { fontSize: 12 },
  arrow: { position: "absolute", left: 16, top: "50%", fontSize: 18 },
  logoutBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
});
