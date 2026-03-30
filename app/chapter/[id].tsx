import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { buildTopicCompletionKey, getTopicCompletions } from "../../utils/storage";
import { loadSubjectDataById } from "../../utils/subjects";

export default function ChapterScreen() {
  const { theme } = useTheme();
  const { id, subjectId } = useLocalSearchParams<{ id: string; subjectId: string }>();
  const router = useRouter();
  const subject = loadSubjectDataById(subjectId ?? "");
  const chapter = subject?.chapters.find((item) => item.id === id);

  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [completedTopicsCount, setCompletedTopicsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getTopicCompletions().then((topicCompletions) => {
        if (!chapter) return;

        const completedMap: Record<string, boolean> = {};
        let completedCount = 0;

        chapter.topics.forEach((topic) => {
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
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.wrong, textAlign: "center", fontSize: 16 }}>الفصل غير موجود</Text>
      </View>
    );
  }

  const totalQuestions = chapter.topics.reduce((sum, topic) => sum + topic.questions.length, 0);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.chapterCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.chapterTitle, { color: theme.textPrimary }]}>{chapter.title}</Text>
        <View style={s.chapterMeta}>
          <View style={s.metaItem}>
            <Ionicons name="layers-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.metaText, { color: theme.textSecondary }]}>{chapter.topics.length} موضوع</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.metaText, { color: theme.textSecondary }]}>{totalQuestions} سؤال</Text>
          </View>
        </View>

        {/* حساب النسبة المئوية */}
{chapter.topics.length > 0 && (
  <View style={s.progressContainer}>
    
    {/* شريط التقدم نفسه */}
    <View style={[s.progressTrack, { backgroundColor: theme.secondary + "22" }]}>
      <View
        style={[
          s.progressFill,
          {
            backgroundColor: theme.primary,
            width: `${(completedTopicsCount / chapter.topics.length) * 100}%`,
          },
        ]}
      />
    </View>

    {/* النص أسفل الشريط */}
    <Text style={[s.completionText, { color: theme.textSecondary }]}>
      تم إنهاء {completedTopicsCount} من {chapter.topics.length} مواضيع
    </Text>
    
  </View>
)}

        <TouchableOpacity
          style={[s.fullChapterBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/quiz/setup?scope=chapter&subjectId=${subjectId}&chapterId=${id}` as any)}
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={s.fullChapterBtnText}>كوز الفصل كامل</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>المواضيع</Text>

      <FlatList
        data={chapter.topics}
        keyExtractor={(topic) => topic.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: topic }) => (
          <View style={[s.topicCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
            <View style={s.topicBody}>
              <View style={s.topicInfo}>
                <View style={s.topicTitleRow}>
                  {completedTopics[topic.id] && <Text style={[s.completedBadge, { color: theme.correct }]}>✓</Text>}
                  <Text style={[s.topicTitle, { color: theme.textPrimary }]}>{topic.title}</Text>
                </View>

                <View style={s.topicMeta}>
                  <Text style={[s.topicMetaText, { color: theme.textSecondary }]}>❓ {topic.questions.length} سؤال</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.startBtn, { backgroundColor: theme.primary }]}
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
  container: { flex: 1, padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  chapterCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
  },
  chapterTitle: { fontSize: 18, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  chapterMeta: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
  fullChapterBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  topicCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  topicBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  topicInfo: { flex: 1 },
  topicTitleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  topicTitle: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  completedBadge: { fontSize: 15, fontWeight: "bold" },
  topicMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  topicMetaText: { fontSize: 12 },
  startBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
    progressContainer: {
    marginTop: 8, // يمكنك تعديل المسافة حسب تصميمك
    gap: 6,       // المسافة بين الشريط والنص
  },
  progressTrack: {
    direction: "ltr",        // لجعل الشريط يملأ من اليمين لليسار
    height: 8,               // سمك الشريط
    borderRadius: 4,         // لتدوير الأطراف
    overflow: "hidden",      // مهم جداً: لمنع الجزء الممتلئ من الخروج عن حدود الدائرة
  },
  progressFill: {
    height: "100%",          // يأخذ نفس ارتفاع الخلفية
    borderRadius: 4        // نفس تدوير الخلفية
    // إضافة حركة انتقالية سلسة عند تغير النسبة
  },
  completionText: { fontSize: 13, textAlign: "right", marginBottom: 20 },
  fullChapterBtn: {
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    
  },
  startBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});

