import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { getTopicCompletions, buildTopicCompletionKey } from "../../utils/storage";
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

export default function ChapterScreen() {
  const { id, subjectId } = useLocalSearchParams<{ id: string; subjectId: string }>();
  const router = useRouter();
  const subject = SUBJECTS[subjectId];
  const chapter = subject?.chapters.find((item: any) => item.id === id);

  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [completedTopicsCount, setCompletedTopicsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getTopicCompletions().then((topicCompletions) => {
        if (!chapter) return;

        const completedMap: Record<string, boolean> = {};
        let completedCount = 0;

        chapter.topics.forEach((topic: any) => {
          const key = buildTopicCompletionKey(subjectId ?? "", id ?? "", topic.id);
          const isCompleted = !!topicCompletions[key]?.completed;
          completedMap[topic.id] = isCompleted;
          if (isCompleted) completedCount += 1;
        });

        setCompletedTopics(completedMap);
        setCompletedTopicsCount(completedCount);
      });
    }, [chapter, id, subjectId])
  );

  if (!chapter) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>الفصل غير موجود</Text>
      </View>
    );
  }

  const totalQuestions = chapter.topics.reduce(
    (sum: number, topic: any) => sum + topic.questions.length,
    0
  );

  return (
    <View style={s.container}>
      <View style={s.chapterCard}>
        <Text style={s.chapterTitle}>{chapter.title}</Text>
        <View style={s.chapterMeta}>
          <View style={s.metaItem}>
            <Ionicons name="layers-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{chapter.topics.length} موضوع</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{totalQuestions} سؤال</Text>
          </View>
        </View>

        <Text style={s.completionText}>
          تم إنهاء {completedTopicsCount} من {chapter.topics.length} مواضيع
        </Text>

        <TouchableOpacity
          style={s.fullChapterBtn}
          onPress={() =>
            router.push(`/quiz/setup?scope=chapter&subjectId=${subjectId}&chapterId=${id}` as any)
          }
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={s.fullChapterBtnText}>كوز الفصل كامل</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>المواضيع</Text>

      <FlatList
        data={chapter.topics}
        keyExtractor={(topic) => topic.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: topic }) => (
          <View style={s.topicCard}>
            <View style={s.topicBody}>
              <View style={s.topicInfo}>
                <View style={s.topicTitleRow}>
                  {completedTopics[topic.id] && <Text style={s.completedBadge}>✓</Text>}
                  <Text style={s.topicTitle}>{topic.title}</Text>
                </View>

                <View style={s.topicMeta}>
                  <Text style={s.topicMetaText}>❓ {topic.questions.length} سؤال</Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.startBtn}
                onPress={() =>
                  router.push({
                    pathname: "../quiz/setup",
                    params: { scope: "topic", subjectId, chapterId: id, topicId: topic.id },
                  })
                }
              >
                <Ionicons name="play-outline" size={16} color="#fff" />
                <Text style={s.startBtnText}>ابدأ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { color: Colors.wrong, textAlign: "center", fontSize: 16 },
  chapterCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chapterTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 10,
  },
  chapterMeta: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: Colors.textMuted, fontSize: 13 },
  completionText: { color: Colors.textMuted, fontSize: 13, textAlign: "right", marginBottom: 14 },
  fullChapterBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  fullChapterBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 12,
  },
  topicCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topicBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  topicInfo: { flex: 1 },
  topicTitleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  topicTitle: { color: Colors.text, fontSize: 14, fontWeight: "600", textAlign: "right" },
  completedBadge: { color: Colors.correct, fontSize: 15, fontWeight: "bold" },
  topicMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  topicMetaText: { color: Colors.textMuted, fontSize: 12 },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  startBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
