import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { buildChapterCompletionKey, getChapterCompletions } from "../../utils/storage";
import { loadSubjectDataById } from "../../utils/subjects";

export default function SubjectDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const subject = loadSubjectDataById(id ?? "");

  const [completedChaptersCount, setCompletedChaptersCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getChapterCompletions().then((chapterCompletions) => {
        if (!subject) return;

        const completedCount = subject.chapters.filter((chapter) => {
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
    (sum, chapter) =>
      sum + chapter.topics.reduce((topicSum, topic) => topicSum + topic.questions.length, 0),
    0
  );

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.subjectCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.subjectCode, { color: theme.primary }]}>{(id ?? "").toUpperCase()}</Text>
        <Text style={[s.subjectTitle, { color: theme.textPrimary }]}>{subject.title}</Text>
        <View style={s.subjectMeta}>
          <View style={s.metaItem}>
            <Ionicons name="book-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.metaText, { color: theme.textSecondary }]}>{subject.chapters.length} فصول</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.metaText, { color: theme.textSecondary }]}>{totalQuestions} سؤال</Text>
          </View>
        </View>

        <Text style={[s.completionText, { color: theme.textSecondary }]}>
          تم إنهاء {completedChaptersCount} من {subject.chapters.length} فصول
        </Text>


                {/* حساب النسبة المئوية */}
        {subject.chapters.length > 0 && (
          <View style={s.progressContainer}>
            
            {/* شريط التقدم نفسه */}
            <View style={[s.progressTrack, { backgroundColor: theme.secondary + "22" }]}>
              <View
                style={[
                  s.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${(completedChaptersCount / subject.chapters.length) * 100}%`,
                  },
                ]}
              />
            </View>
        
            {/* النص أسفل الشريط */}
            <Text style={[s.completionText, { color: theme.textSecondary }]}>
              تم إنهاء {completedChaptersCount} من {subject.chapters.length} مواضيع
            </Text>
            
          </View>
        )}

        <TouchableOpacity
          style={[s.fullQuizBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/quiz/setup?scope=subject&subjectId=${id}&chapterId=&topicId=` as any)}
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={s.fullQuizText}>كوز شامل للمادة</Text>
        </TouchableOpacity>
      </View>

      <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>الفصول</Text>

      <FlatList
        data={subject.chapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const totalChapterQuestions = item.topics.reduce(
            (sum, topic) => sum + topic.questions.length,
            0
          );

          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
              onPress={() => router.push(`/chapter/${item.id}?subjectId=${id}` as any)}
              activeOpacity={0.75}
            >
              <View style={s.cardContent}>
                <View style={s.cardText}>
                  <Text style={[s.chapterTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                  <View style={s.cardMeta}>
                    <Text style={[s.metaSmall, { color: theme.textSecondary }]}>❓ {totalChapterQuestions} سؤال</Text>
                    <Text style={[s.metaSmall, { color: theme.textSecondary }]}>📝 {item.topics.length} موضوع</Text>
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
  container: { flex: 1, padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  subjectCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  subjectCode: { fontWeight: "bold", fontSize: 13, textAlign: "right", marginBottom: 4 },
  subjectTitle: { fontSize: 20, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  subjectMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
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
  progressFill: {height: "100%", borderRadius: 4},
  completionText: { fontSize: 13, textAlign: "right", marginBottom: 20 },
  fullChapterBtn: {
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    
  },
  fullQuizBtn: {
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  fullQuizText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  card: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardText: { flex: 1 },
  chapterTitle: { fontSize: 15, fontWeight: "600", textAlign: "right", marginBottom: 6 },
  cardMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  metaSmall: { fontSize: 12 },
  cardRight: { alignItems: "center", justifyContent: "center" },
});
