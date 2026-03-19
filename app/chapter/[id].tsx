import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import ds501 from "../../data/subjects/ds501.json";
import { Ionicons } from "@expo/vector-icons";
import { fetchSubjectProgress, resetChapterHistory } from "../../utils/firebase";

const SUBJECTS: Record<string, typeof ds501> = { ds501 };

export default function ChapterScreen() {
  const { id, subjectId } = useLocalSearchParams<{ id: string; subjectId: string }>();
  const router  = useRouter();
  const subject = SUBJECTS[subjectId];
  const chapter = subject?.chapters.find(c => c.id === id);

  const [topicsDone,  setTopicsDone]  = useState<Record<string, boolean>>({});
  const [chapterDone, setChapterDone] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!subject) return;
    fetchSubjectProgress(subjectId, subject).then(({ topicsDone, chaptersDone }) => {
      setTopicsDone(topicsDone);
      setChapterDone(chaptersDone[id] ?? false);
    });
  }, [id, subjectId]));

  if (!chapter) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>الفصل غير موجود</Text>
      </View>
    );
  }

  const totalQ         = chapter.topics.reduce((sum, t) => sum + t.questions.length, 0);
  const completedTopics = chapter.topics.filter(t => topicsDone[t.id]).length;
  const chapterProgress = Math.round((completedTopics / chapter.topics.length) * 100);

  const handleReset = () => {
    Alert.alert(
      "🔄 إعادة تعيين الفصل",
      "راح يتمسح كل تقدمك لهذا الفصل وتبدأ من جديد. متأكد؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إعادة تعيين", style: "destructive",
          onPress: async () => {
            await resetChapterHistory(subjectId, id, subject);
            setTopicsDone({});
            setChapterDone(false);
          }
        }
      ]
    );
  };

  return (
    <View style={s.container}>

      {/* بطاقة الفصل */}
      <View style={s.chapterCard}>
        <View style={s.chapterHeader}>
          <Text style={s.chapterTitle}>{chapter.title}</Text>
          {/* زر Reset — يظهر فقط لو الفصل مكتمل 100% */}
          {chapterDone && (
            <TouchableOpacity style={s.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={18} color={Colors.wrong} />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.chapterMeta}>
          <View style={s.metaItem}>
            <Ionicons name="layers-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{chapter.topics.length} موضوع</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={s.metaText}>{totalQ} سؤال</Text>
          </View>
          <View style={[s.progressBadge, chapterDone && s.progressBadgeDone]}>
            <Text style={[s.progressBadgeText, chapterDone && { color: Colors.correct }]}>
              {chapterDone ? "✅ مكتمل" : `${completedTopics}/${chapter.topics.length} موضوع`}
            </Text>
          </View>
        </View>

        {/* Progress Bar الفصل */}
        <View style={s.progressBg}>
          <View style={[
            s.progressFill,
            { width: `${chapterProgress}%`, backgroundColor: chapterDone ? Colors.correct : Colors.primary }
          ]} />
        </View>

        {/* زر كوز الفصل كامل */}
        <TouchableOpacity
          style={[s.fullChapterBtn, { marginTop: 14 }]}
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
          const done = topicsDone[topic.id] ?? false;
          return (
            <View style={[s.topicCard, done && s.topicCardDone]}>
              <View style={s.topicBody}>
                <View style={s.topicInfo}>
                  <Text style={s.topicTitle}>{topic.title}</Text>
                  <View style={s.topicMeta}>
                    <Text style={s.topicMetaText}>❓ {topic.questions.length} سؤال</Text>
                    {done && (
                      <Text style={[s.topicMetaText, { color: Colors.correct, fontWeight: "bold" }]}>
                        · ✅ مكتمل
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.startBtn, done && s.startBtnDone]}
                  onPress={() =>
                    router.push({
                      pathname: "../quiz/setup",
                      params: { scope: "topic", subjectId, chapterId: id, topicId: topic.id },
                    })
                  }
                >
                  <Ionicons name={done ? "refresh-outline" : "play-outline"} size={16} color="#fff" />
                  <Text style={s.startBtnText}>{done ? "إعادة" : "ابدأ"}</Text>
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
  container:           { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  center:              { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  errorText:           { color: Colors.wrong, textAlign: "center", fontSize: 16 },
  chapterCard:         { backgroundColor: Colors.card, borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  chapterHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  chapterTitle:        { color: Colors.text, fontSize: 18, fontWeight: "bold", textAlign: "right", flex: 1 },
  resetBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.wrong + "22", justifyContent: "center", alignItems: "center", marginLeft: 8 },
  chapterMeta:         { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" },
  metaItem:            { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:            { color: Colors.textMuted, fontSize: 13 },
  progressBadge:       { backgroundColor: Colors.primary + "22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  progressBadgeDone:   { backgroundColor: Colors.correct + "22" },
  progressBadgeText:   { color: Colors.primary, fontWeight: "bold", fontSize: 12 },
  progressBg:          { height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill:        { height: 4, borderRadius: 2 },
  fullChapterBtn:      { backgroundColor: Colors.primary, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  fullChapterBtnText:  { color: "#fff", fontWeight: "bold", fontSize: 14 },
  sectionTitle:        { color: Colors.text, fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  topicCard:           { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  topicCardDone:       { borderColor: Colors.correct + "66", backgroundColor: Colors.correct + "0a" },
  topicBody:           { flexDirection: "row", alignItems: "center", gap: 12 },
  topicInfo:           { flex: 1 },
  topicTitle:          { color: Colors.text, fontSize: 14, fontWeight: "600", textAlign: "right", marginBottom: 4 },
  topicMeta:           { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  topicMetaText:       { color: Colors.textMuted, fontSize: 12 },
  startBtn:            { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  startBtnDone:        { backgroundColor: Colors.correct },
  startBtnText:        { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
