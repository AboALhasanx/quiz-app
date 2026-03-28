import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "../../utils/ThemeContext";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { getChapterCompletions, buildChapterCompletionKey } from "../../utils/storage";
import { Ionicons } from "@expo/vector-icons";

type Subject = any;

const SUBJECT_DATA_BY_FILE: Record<string, Subject> = {
  "ai_data.json": aiData,
  "cn_data.json": cnData,
  "ds_data.json": dsData,
  "oop_data.json": oopData,
  "os_data.json": osData,
  "se_data.json": seData,
};

const SUBJECTS = index.subjects.reduce<Record<string, Subject>>((acc, subject) => {
  const data = SUBJECT_DATA_BY_FILE[subject.file];
  if (data) acc[subject.id] = data;
  return acc;
}, {});

export default function SubjectDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const subject = SUBJECTS[id];

  const [completedChaptersCount, setCompletedChaptersCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getChapterCompletions().then((chapterCompletions) => {
        if (!subject) return;
        const completedCount = subject.chapters.filter((chapter: any) => {
          const key = buildChapterCompletionKey(id ?? "", chapter.id);
          return !!chapterCompletions[key]?.completed;
        }).length;
        setCompletedChaptersCount(completedCount);
      });
    }, [id, subject])
  );

  if (!subject) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.wrong, textAlign: "center", fontSize: 16 }}>المادة غير موجودة</Text>
      </View>
    );
  }

  const totalQuestions = subject.chapters.reduce(
    (sum: number, chapter: any) =>
      sum + chapter.topics.reduce((topicSum: number, topic: any) => topicSum + topic.questions.length, 0),
    0
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      <View style={[s.subjectCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={{ color: theme.primary, fontWeight: "bold", fontSize: 13, textAlign: "right", marginBottom: 4 }}>
          {id.toUpperCase()}
        </Text>
        <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: "bold", textAlign: "right", marginBottom: 12 }}>
          {subject.title}
        </Text>

        <View style={s.subjectMeta}>
          <View style={s.metaItem}>
            <Ionicons name="book-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{subject.chapters.length} فصول</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{totalQuestions} سؤال</Text>
          </View>
        </View>

        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 14 }}>
          تم إنهاء {completedChaptersCount} من {subject.chapters.length} فصول
        </Text>

        <TouchableOpacity
          style={[s.fullQuizBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/quiz/setup?scope=subject&subjectId=${id}&chapterId=&topicId=` as any)}
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>كوز شامل للمادة</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 }}>
        الفصول
      </Text>

      <FlatList
        data={subject.chapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const totalChapterQuestions = item.topics.reduce(
            (sum: number, topic: any) => sum + topic.questions.length, 0
          );
          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
              onPress={() => router.push(`/chapter/${item.id}?subjectId=${id}` as any)}
              activeOpacity={0.75}
            >
              <View style={s.cardContent}>
                <View style={s.cardText}>
                  <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "600", textAlign: "right", marginBottom: 6 }}>
                    {item.title}
                  </Text>
                  <View style={s.cardMeta}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>❓ {totalChapterQuestions} سؤال</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>📝 {item.topics.length} موضوع</Text>
                  </View>
                </View>
                <View style={s.cardRight}>
                  <Ionicons name="chevron-back-outline" size={20} color={theme.textSecondary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, padding: 16, paddingTop: 60 },
  center:      { flex: 1, justifyContent: "center", alignItems: "center" },
  subjectCard: { borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1 },
  subjectMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginBottom: 10 },
  metaItem:    { flexDirection: "row", alignItems: "center", gap: 4 },
  fullQuizBtn: { borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  card:        { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardText:    { flex: 1 },
  cardMeta:    { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cardRight:   { alignItems: "center", justifyContent: "center" },
});