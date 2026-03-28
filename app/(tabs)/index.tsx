import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { getResults, QuizResult } from "../../utils/storage";
import { useTheme } from "../../utils/ThemeContext";

type Subject = any;

const SUBJECT_DATA_BY_FILE: Record<string, Subject> = {
  "ai_data.json": aiData,
  "cn_data.json": cnData,
  "ds_data.json": dsData,
  "oop_data.json": oopData,
  "os_data.json": osData,
  "se_data.json": seData,
};

function getSubjectMeta(file: string) {
  const subject = SUBJECT_DATA_BY_FILE[file];
  const chaptersCount = subject?.chapters?.length ?? 0;
  const questionsCount = subject?.chapters?.reduce(
    (chapterSum: number, chapter: any) =>
      chapterSum + (chapter.topics?.reduce(
        (topicSum: number, topic: any) => topicSum + (topic.questions?.length ?? 0),
        0
      ) ?? 0),
    0
  ) ?? 0;
  return { chaptersCount, questionsCount };
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark, toggle } = useTheme();
  const [lastResults, setLastResults] = useState<Record<string, QuizResult>>({});

  useFocusEffect(useCallback(() => {
    getResults().then((results) => {
      const map: Record<string, QuizResult> = {};
      results.forEach((r) => {
        if (!map[r.subjectId]) map[r.subjectId] = r;
      });
      setLastResults(map);
    });
  }, []));

  const getScoreColor = (p: number) =>
    p >= 70 ? theme.correct : p >= 50 ? theme.primary : theme.wrong;

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      {/* Header */}
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
            {index.subjects.length} مادة
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={index.subjects}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const last = lastResults[item.id];
          const { chaptersCount, questionsCount } = getSubjectMeta(item.file);
          const code = item.id.replace(/_data$/i, "").toUpperCase();

          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
              onPress={() => router.push(`/subject/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={s.cardTop}>
                <View style={[s.codeBadge, { backgroundColor: theme.primary + "22" }]}>
                  <Text style={[s.codeText, { color: theme.primary }]}>{code}</Text>
                </View>
                {last && (
                  <View style={[s.scoreBadge, { backgroundColor: getScoreColor(last.percentage) + "22" }]}>
                    <Text style={[s.scoreText, { color: getScoreColor(last.percentage) }]}>
                      آخر نتيجة: {last.percentage}%
                    </Text>
                  </View>
                )}
              </View>

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

              {last && (
                <View style={[s.progressBg, { backgroundColor: theme.secondary + "44" }]}>
                  <View
                    style={[s.progressFill, { width: `${last.percentage}%`, backgroundColor: getScoreColor(last.percentage) }]}
                  />
                </View>
              )}

              <Text style={[s.arrow, { color: theme.textSecondary }]}>←</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, padding: 16, paddingTop: 60 },
  topRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  switchRow:    { flexDirection: "row", alignItems: "center" },
  header:       { fontSize: 24, fontWeight: "bold" },
  subtitle:     { fontSize: 13, marginTop: 2 },
  card:         { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardTop:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  codeBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeText:     { fontWeight: "bold", fontSize: 13 },
  scoreBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText:    { fontWeight: "bold", fontSize: 12 },
  title:        { fontSize: 17, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  cardBottom:   { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 10 },
  meta:         { fontSize: 12 },
  dot:          { fontSize: 12 },
  progressBg:   { height: 4, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 2 },
  arrow:        { position: "absolute", left: 16, top: "50%", fontSize: 18 },
});