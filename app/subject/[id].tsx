import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import ds501 from "../../data/subjects/ds501.json";
import { Ionicons } from "@expo/vector-icons";
import { fetchSubjectProgress } from "../../utils/firebase";

const SUBJECTS: Record<string, typeof ds501> = { ds501 };

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const subject = SUBJECTS[id];

  const [chaptersDone,  setChaptersDone]  = useState<Record<string, boolean>>({});
  const [totalProgress, setTotalProgress] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!subject) return;
    fetchSubjectProgress(id, subject).then(({ chaptersDone, totalProgress }) => {
      setChaptersDone(chaptersDone);
      setTotalProgress(totalProgress);
    });
  }, [id]));

  if (!subject) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>المادة غير موجودة</Text>
      </View>
    );
  }

  const totalQuestions = subject.chapters.reduce(
    (sum, ch) => sum + ch.topics.reduce((s, t) => s + t.questions.length, 0), 0
  );

  const completedChapters = Object.values(chaptersDone).filter(Boolean).length;

  return (
    <View style={s.container}>

      {/* بطاقة المادة */}
      <View style={s.subjectCard}>
        <Text style={s.subjectCode}>{id.toUpperCase()}</Text>
        <Text style={s.subjectTitle}>{subject.title}</Text>

        <View style={s.subjectMeta}>
          <View style={s.metaItem}>
            <Ionicons name="book-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{subject.chapters.length} جباتر</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{totalQuestions} سؤال</Text>
          </View>
          <View style={[s.progressBadge, totalProgress === 100 && s.progressBadgeDone]}>
            <Text style={[s.progressBadgeText, totalProgress === 100 && { color: Colors.correct }]}>
              {totalProgress === 100 ? "✅ مكتملة" : `${completedChapters}/${subject.chapters.length} فصل`}
            </Text>
          </View>
        </View>

        {/* Progress Bar المادة */}
        <View style={s.progressBg}>
          <View style={[
            s.progressFill,
            { width: `${totalProgress}%`, backgroundColor: totalProgress === 100 ? Colors.correct : Colors.primary }
          ]} />
        </View>
        <Text style={s.progressText}>{totalProgress}% مكتمل</Text>

        {/* زر كوز كامل للمادة */}
        <TouchableOpacity
          style={[s.fullQuizBtn, { marginTop: 14 }]}
          onPress={() => router.push(`/quiz/setup?subjectId=${id}&chapterId=&topicId=&scope=subject` as any)}
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={s.fullQuizText}>كوز شامل للمادة</Text>
        </TouchableOpacity>
      </View>

      {/* قائمة الفصول */}
      <Text style={s.sectionTitle}>الجباتر</Text>

      <FlatList
        data={subject.chapters}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const totalQ = item.topics.reduce((sum, t) => sum + t.questions.length, 0);
          const done   = chaptersDone[item.id] ?? false;

          return (
            <TouchableOpacity
              style={[s.card, done && s.cardDone]}
              onPress={() => router.push(`/chapter/${item.id}?subjectId=${id}` as any)}
              activeOpacity={0.75}
            >
              <View style={s.cardContent}>
                <View style={s.cardText}>
                  <Text style={s.chapterTitle}>{item.title}</Text>
                  <View style={s.cardMeta}>
                    <Text style={s.metaSmall}>❓ {totalQ} سؤال</Text>
                    <Text style={s.metaSmall}>📝 {item.topics.length} موضوع</Text>
                  </View>
                </View>

                <View style={s.cardRight}>
                  {done ? (
                    <View style={s.doneBadge}>
                      <Text style={s.doneText}>✅</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-back-outline" size={20} color={Colors.textMuted} />
                  )}
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
  container:          { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  center:             { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  errorText:          { color: Colors.wrong, textAlign: "center", fontSize: 16 },
  subjectCard:        { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  subjectCode:        { color: Colors.primary, fontWeight: "bold", fontSize: 13, textAlign: "right", marginBottom: 4 },
  subjectTitle:       { color: Colors.text, fontSize: 20, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  subjectMeta:        { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "center" },
  metaItem:           { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:           { color: Colors.textMuted, fontSize: 13 },
  progressBadge:      { backgroundColor: Colors.primary + "22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  progressBadgeDone:  { backgroundColor: Colors.correct + "22" },
  progressBadgeText:  { color: Colors.primary, fontWeight: "bold", fontSize: 12 },
  progressBg:         { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 4 },
  progressFill:       { height: 4, borderRadius: 2 },
  progressText:       { color: Colors.textMuted, fontSize: 12, textAlign: "right" },
  fullQuizBtn:        { backgroundColor: Colors.primary, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  fullQuizText:       { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionTitle:       { color: Colors.text, fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  card:               { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardDone:           { borderColor: Colors.correct + "66", backgroundColor: Colors.correct + "0a" },
  cardContent:        { flexDirection: "row", alignItems: "center", gap: 12 },
  cardText:           { flex: 1 },
  chapterTitle:       { color: Colors.text, fontSize: 15, fontWeight: "600", textAlign: "right", marginBottom: 6 },
  cardMeta:           { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  metaSmall:          { color: Colors.textMuted, fontSize: 12 },
  cardRight:          { alignItems: "center", justifyContent: "center" },
  doneBadge:          { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.correct + "22", justifyContent: "center", alignItems: "center" },
  doneText:           { fontSize: 16 },
});
