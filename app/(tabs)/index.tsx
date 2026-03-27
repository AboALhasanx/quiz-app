import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { getResults, QuizResult } from "../../utils/storage";

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
    p >= 70 ? Colors.correct : p >= 50 ? Colors.primary : Colors.wrong;

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <Text style={s.header}>ðŸ“š Ù…ÙˆØ§Ø¯ÙŠ</Text>
        <Text style={s.subtitle}>{index.subjects.length} Ù…Ø§Ø¯Ø©</Text>
      </View>

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
              style={s.card}
              onPress={() => router.push(`/subject/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={s.cardTop}>
                <View style={s.codeBadge}>
                  <Text style={s.codeText}>{code}</Text>
                </View>
                {last && (
                  <View style={[s.scoreBadge, { backgroundColor: getScoreColor(last.percentage) + "22" }]}>
                    <Text style={[s.scoreText, { color: getScoreColor(last.percentage) }]}>
                      Ø¢Ø®Ø± Ù†ØªÙŠØ¬Ø©: {last.percentage}%
                    </Text>
                  </View>
                )}
              </View>

              <Text style={s.title}>{item.title}</Text>

              <View style={s.cardBottom}>
                <Text style={s.meta}>ðŸ“– {chaptersCount} ÙØµÙˆÙ„</Text>
                <Text style={s.dot}>Â·</Text>
                <Text style={s.meta}>â“ {questionsCount} Ø³Ø¤Ø§Ù„</Text>
                {last && (
                  <>
                    <Text style={s.dot}>Â·</Text>
                    <Text style={s.meta}>ðŸŽ¯ {last.total} Ù…Ø¬Ø§Ø¨</Text>
                  </>
                )}
              </View>

              {last && (
                <View style={s.progressBg}>
                  <View
                    style={[
                      s.progressFill,
                      { width: `${last.percentage}%`, backgroundColor: getScoreColor(last.percentage) },
                    ]}
                  />
                </View>
              )}

              <Text style={s.arrow}>â†</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  header: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  subtitle: { color: Colors.textMuted, fontSize: 13 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  codeBadge: { backgroundColor: Colors.primary + "22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeText: { color: Colors.primary, fontWeight: "bold", fontSize: 13 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontWeight: "bold", fontSize: 12 },
  title: { color: Colors.text, fontSize: 17, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  cardBottom: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 10 },
  meta: { color: Colors.textMuted, fontSize: 12 },
  dot: { color: Colors.border, fontSize: 12 },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, borderRadius: 2 },
  arrow: { position: "absolute", left: 16, top: "50%", color: Colors.textMuted, fontSize: 18 },
});
