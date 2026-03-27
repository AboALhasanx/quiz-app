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
import { getResults } from "../../utils/storage";
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
  const router  = useRouter();
  const subject = SUBJECTS[subjectId];
  const chapter = subject?.chapters.find((c: any) => c.id === id);

  const [topicStats, setTopicStats] = useState<Record<string, number>>({});
  const [chapterScore, setChapterScore] = useState<number | undefined>();

  useFocusEffect(useCallback(() => {
    getResults().then(results => {
      // آخر نتيجة لكل topic
      const map: Record<string, number> = {};
      results
        .filter(r => r.subjectId === subjectId && r.chapterId === id && r.topicId)
        .forEach(r => { if (map[r.topicId] === undefined) map[r.topicId] = r.percentage; });
      setTopicStats(map);

      // آخر نتيجة للفصل كامل
      const chapterResult = results.find(r => r.subjectId === subjectId && r.chapterId === id && !r.topicId);
      setChapterScore(chapterResult?.percentage);
    });
  }, [id, subjectId]));

  if (!chapter) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>الفصل غير موجود</Text>
      </View>
    );
  }

  const totalQ = chapter.topics.reduce((sum: number, t: any) => sum + t.questions.length, 0);

  const getScoreColor = (p: number) =>
    p >= 70 ? Colors.correct : p >= 50 ? Colors.primary : Colors.wrong;

  return (
    <View style={s.container}>

      {/* بطاقة الفصل */}
      <View style={s.chapterCard}>
        <Text style={s.chapterTitle}>{chapter.title}</Text>
        <View style={s.chapterMeta}>
          <View style={s.metaItem}>
            <Ionicons name="layers-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{chapter.topics.length} موضوع</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{totalQ} سؤال</Text>
          </View>
          {chapterScore !== undefined && (
            <View style={[s.scoreBadge, { backgroundColor: getScoreColor(chapterScore) + "22" }]}>
              <Text style={[s.scoreText, { color: getScoreColor(chapterScore) }]}>
                آخر نتيجة: {chapterScore}%
              </Text>
            </View>
          )}
        </View>

        {/* زر كوز الفصل كامل */}
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

      {/* المواضيع */}
      <Text style={s.sectionTitle}>المواضيع</Text>

      <FlatList
        data={chapter.topics}
        keyExtractor={t => t.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: topic }) => {
          const score = topicStats[topic.id];
          return (
            <View style={s.topicCard}>
              <View style={s.topicBody}>
                {/* المعلومات */}
                <View style={s.topicInfo}>
                  <Text style={s.topicTitle}>{topic.title}</Text>
                  <View style={s.topicMeta}>
                    <Text style={s.topicMetaText}>❓ {topic.questions.length} سؤال</Text>
                    {score !== undefined && (
                      <Text style={[s.topicMetaText, { color: getScoreColor(score) }]}>
                        · {score}%
                      </Text>
                    )}
                  </View>
                  {score !== undefined && (
                    <View style={s.progressBg}>
                      <View style={[
                        s.progressFill,
                        { width: `${score}%`, backgroundColor: getScoreColor(score) }
                      ]} />
                    </View>
                  )}
                </View>

                {/* زر الابدأ */}
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
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  center:             { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  errorText:          { color: Colors.wrong, textAlign: "center", fontSize: 16 },
  chapterCard:        { backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  chapterTitle:       { color: Colors.text, fontSize: 18, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  chapterMeta:        { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  metaItem:           { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:           { color: Colors.textMuted, fontSize: 13 },
  scoreBadge:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText:          { fontWeight: "bold", fontSize: 12 },
  fullChapterBtn:     { backgroundColor: Colors.primary, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  fullChapterBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionTitle:       { color: Colors.text, fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  topicCard:          { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  topicBody:          { flexDirection: "row", alignItems: "center", gap: 12 },
  topicInfo:          { flex: 1 },
  topicTitle:         { color: Colors.text, fontSize: 14, fontWeight: "600", textAlign: "right", marginBottom: 4 },
  topicMeta:          { flexDirection: "row", justifyContent: "flex-end", gap: 6, marginBottom: 4 },
  topicMetaText:      { color: Colors.textMuted, fontSize: 12 },
  progressBg:         { height: 3, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill:       { height: 3, borderRadius: 2 },
  startBtn:           { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  startBtnText:       { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
