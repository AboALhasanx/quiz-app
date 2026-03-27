import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../constants/colors";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { saveResult } from "../../utils/storage";


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

function getQuestionText(question: any) {
  return question.text ?? question.text_en ?? "";
}

function getQuestionOptions(question: any): string[] {
  return question.options ?? question.options_en ?? [];
}

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    subjectId: string; chapterId: string; topicId: string;
    mode: string; answers: string; questionIds: string;
  }>();
  const router = useRouter();

  const answers:     Record<string, string> = JSON.parse(params.answers     ?? "{}");
  const questionIds: string[]               = JSON.parse(params.questionIds ?? "[]");

  const subject = SUBJECTS[params.subjectId];
  let allQuestions: any[] = [];
  if (subject) {
    const chapters = params.chapterId
      ? subject.chapters.filter((c: any) => c.id === params.chapterId)
      : subject.chapters;
    chapters.forEach((ch: any) => {
      const topics = params.topicId
        ? ch.topics.filter((t: any) => t.id === params.topicId)
        : ch.topics;
      topics.forEach((t: any) => allQuestions.push(...t.questions));
    });
  }

  const questions = questionIds
    .map(id => allQuestions.find(q => q.id === id))
    .filter(Boolean);

  let correctCount = 0, wrongCount = 0, skippedCount = 0;
  questions.forEach(q => {
    const ans         = answers[q.id];
    const correctText = getQuestionOptions(q)[q.answer];
    if (ans === undefined || ans === null || ans === "") skippedCount++;
    else if (ans === correctText) correctCount++;
    else wrongCount++;
  });

  const total      = questions.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const emoji =
    percentage >= 90 ? "🏆" :
    percentage >= 70 ? "✅" :
    percentage >= 50 ? "📚" : "💪";

  const message =
    percentage >= 90 ? "ممتاز! أداء رائع"       :
    percentage >= 70 ? "جيد جداً! استمر"         :
    percentage >= 50 ? "مقبول، راجع الأخطاء"     : "راجع المادة وحاول مجدداً";

  const [showReview, setShowReview] = useState(false);

useEffect(() => {
  const id   = Date.now().toString();
  const date = new Date().toISOString();

  const result = {
    id,
    date,
    subjectId:  params.subjectId ?? "",
    chapterId:  params.chapterId ?? "",
    topicId:    params.topicId   ?? "",
    mode:       params.mode      ?? "paper",
    correct:    correctCount,
    wrong:      wrongCount,
    skipped:    skippedCount,
    total,
    percentage,
  };

  saveResult(result);
}, []);



  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Score Card */}
      <View style={s.scoreCard}>
        <Text style={s.emoji}>{emoji}</Text>
        <Text style={s.percentage}>{percentage}%</Text>
        <Text style={s.message}>{message}</Text>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={[s.statNum, { color: Colors.correct }]}>{correctCount}</Text>
            <Text style={s.statLabel}>صحيح</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: Colors.wrong }]}>{wrongCount}</Text>
            <Text style={s.statLabel}>خاطئ</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: Colors.textMuted }]}>{skippedCount}</Text>
            <Text style={s.statLabel}>متروك</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: Colors.text }]}>{total}</Text>
            <Text style={s.statLabel}>المجموع</Text>
          </View>
        </View>
      </View>

      {/* زر المراجعة */}
      <TouchableOpacity style={s.reviewBtn} onPress={() => setShowReview(v => !v)}>
        <Text style={s.reviewBtnText}>
          {showReview ? "▲ إخفاء المراجعة" : "📋 مراجعة الإجابات"}
        </Text>
      </TouchableOpacity>

      {/* قائمة المراجعة */}
      {showReview && (
        <View style={s.reviewList}>
          {questions.map((q, i) => {
            const chosenText  = answers[q.id];
            const correctText = getQuestionOptions(q)[q.answer];
            const isSkipped   = chosenText === undefined || chosenText === null || chosenText === "";
            const isCorrect   = !isSkipped && chosenText === correctText;

            return (
              <View
                key={q.id}
                style={[
                  s.reviewCard,
                  isCorrect ? s.reviewCorrect : isSkipped ? s.reviewSkipped : s.reviewWrong,
                ]}
              >
                <Text style={s.reviewNum}>س{i + 1}</Text>
                <Text style={s.reviewQuestion}>{getQuestionText(q)}</Text>

                <View style={s.reviewAnswer}>
                  <Text style={s.reviewAnswerLabel}>✅ الصحيحة: </Text>
                  <Text style={s.reviewAnswerText}>{correctText}</Text>
                </View>

                {!isCorrect && !isSkipped && (
                  <View style={s.reviewAnswer}>
                    <Text style={s.reviewWrongLabel}>❌ إجابتك: </Text>
                    <Text style={s.reviewAnswerText}>{chosenText}</Text>
                  </View>
                )}

                {isSkipped && (
                  <Text style={s.skippedLabel}>⚪ لم تجب على هذا السؤال</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={s.retryBtn} onPress={() => router.back()}>
        <Text style={s.retryBtnText}>🔄 إعادة المحاولة</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.homeBtn} onPress={() => router.push("/" as any)}>
        <Text style={s.homeBtnText}>🏠 الرئيسية</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  content:           { padding: 16, paddingBottom: 60 },
  scoreCard:         { backgroundColor: Colors.card, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  emoji:             { fontSize: 52, marginBottom: 8 },
  percentage:        { fontSize: 52, fontWeight: "bold", color: Colors.primary },
  message:           { color: Colors.textMuted, fontSize: 15, marginTop: 4, marginBottom: 20 },
  statsRow:          { flexDirection: "row", alignItems: "center", width: "100%" },
  stat:              { flex: 1, alignItems: "center" },
  statNum:           { fontSize: 24, fontWeight: "bold" },
  statLabel:         { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  statDivider:       { width: 1, height: 40, backgroundColor: Colors.border },
  reviewBtn:         { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  reviewBtnText:     { color: Colors.text, fontWeight: "bold", fontSize: 15 },
  reviewList:        { gap: 10, marginBottom: 16 },
  reviewCard:        { backgroundColor: Colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderLeftWidth: 4 },
  reviewCorrect:     { borderColor: Colors.correct,   borderLeftColor: Colors.correct },
  reviewWrong:       { borderColor: Colors.wrong,     borderLeftColor: Colors.wrong },
  reviewSkipped:     { borderColor: Colors.border,    borderLeftColor: Colors.textMuted },
  reviewNum:         { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  reviewQuestion:    { color: Colors.text, fontSize: 14, textAlign: "right", marginBottom: 8, lineHeight: 20 },
  reviewAnswer:      { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 },
  reviewAnswerLabel: { color: Colors.correct, fontSize: 13, fontWeight: "bold" },
  reviewWrongLabel:  { color: Colors.wrong,   fontSize: 13, fontWeight: "bold" },
  reviewAnswerText:  { color: Colors.text,    fontSize: 13, flex: 1, textAlign: "right" },
  skippedLabel:      { color: Colors.textMuted, fontSize: 13, textAlign: "right", marginTop: 4 },
  retryBtn:          { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 10 },
  retryBtnText:      { color: "#fff", fontWeight: "bold", fontSize: 16 },
  homeBtn:           { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  homeBtnText:       { color: Colors.textMuted, fontWeight: "bold", fontSize: 16 },
});
