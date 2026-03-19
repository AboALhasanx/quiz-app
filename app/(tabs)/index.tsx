import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import index from "../../data/subjects/index.json";
import { getResults, QuizResult } from "../../utils/storage";

export default function HomeScreen() {
  const router = useRouter();
  const [lastResults, setLastResults] = useState<Record<string, QuizResult>>({});

  // آخر نتيجة لكل مادة
  useFocusEffect(useCallback(() => {
    getResults().then(results => {
      const map: Record<string, QuizResult> = {};
      results.forEach(r => {
        if (!map[r.subjectId]) map[r.subjectId] = r;
      });
      setLastResults(map);
    });
  }, []));

  const getScoreColor = (p: number) =>
    p >= 70 ? Colors.correct : p >= 50 ? Colors.primary : Colors.wrong;

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.topRow}>
        <Text style={s.header}>📚 موادي</Text>
        <Text style={s.subtitle}>{index.subjects.length} مادة</Text>
      </View>

      <FlatList
        data={index.subjects}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const last = lastResults[item.id];
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/subject/${item.id}` as any)}
              activeOpacity={0.75}
            >
              {/* الصف العلوي */}
              <View style={s.cardTop}>
                <View style={s.codeBadge}>
                  <Text style={s.codeText}>{item.code}</Text>
                </View>
                {last && (
                  <View style={[s.scoreBadge, { backgroundColor: getScoreColor(last.percentage) + "22" }]}>
                    <Text style={[s.scoreText, { color: getScoreColor(last.percentage) }]}>
                      آخر نتيجة: {last.percentage}%
                    </Text>
                  </View>
                )}
              </View>

              {/* اسم المادة */}
              <Text style={s.title}>{item.title}</Text>

              {/* الإحصائيات */}
              <View style={s.cardBottom}>
                <Text style={s.meta}>📖 {item.chaptersCount} فصول</Text>
                <Text style={s.dot}>·</Text>
                <Text style={s.meta}>❓ {item.questionsCount} سؤال</Text>
                {last && (
                  <>
                    <Text style={s.dot}>·</Text>
                    <Text style={s.meta}>🎯 {last.total} مجاب</Text>
                  </>
                )}
              </View>

              {/* Progress Bar لو في نتيجة */}
              {last && (
                <View style={s.progressBg}>
                  <View style={[
                    s.progressFill,
                    { width: `${last.percentage}%`, backgroundColor: getScoreColor(last.percentage) }
                  ]} />
                </View>
              )}

              {/* سهم الدخول */}
              <Text style={s.arrow}>←</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  topRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  header:      { fontSize: 24, fontWeight: "bold", color: Colors.text },
  subtitle:    { color: Colors.textMuted, fontSize: 13 },
  card:        { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  cardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  codeBadge:   { backgroundColor: Colors.primary + "22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeText:    { color: Colors.primary, fontWeight: "bold", fontSize: 13 },
  scoreBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText:   { fontWeight: "bold", fontSize: 12 },
  title:       { color: Colors.text, fontSize: 17, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  cardBottom:  { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 10 },
  meta:        { color: Colors.textMuted, fontSize: 12 },
  dot:         { color: Colors.border, fontSize: 12 },
  progressBg:  { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 8 },
  progressFill:{ height: 4, borderRadius: 2 },
  arrow:       { position: "absolute", left: 16, top: "50%", color: Colors.textMuted, fontSize: 18 },
});
