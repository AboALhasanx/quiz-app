import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../utils/ThemeContext";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { saveResult, markTopicCompletion, markChapterCompletion, markSubjectCompletion } from "../../utils/storage";

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

function getQuestionText(question: any, lang = "ar"): string {
  return lang === "en" ? (question.text_en ?? question.text ?? "") : (question.text ?? question.text_en ?? "");
}

function getQuestionOptions(question: any, lang = "ar"): string[] {
  return lang === "en" ? (question.options_en ?? question.options ?? []) : (question.options ?? question.options_en ?? []);
}

function getQuestionExplanation(question: any, lang = "ar"): string {
  return lang === "en" ? (question.explanation_en ?? question.explanation ?? "") : (question.explanation ?? question.explanation_en ?? "");
}

export default function ResultScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    subjectId: string; chapterId: string; topicId: string;
    mode: string; answers: string; questionIds: string;
    scope?: string; percentage?: string; lang?: string;
  }>();
  const router = useRouter();

  const [lang, setLang] = useState<"ar" | "en">((params.lang ?? "ar") as "ar" | "en");

  const answers:     Record<string, string> = JSON.parse(params.answers     ?? "{}");
  const questionIds: string[]               = JSON.parse(params.questionIds ?? "[]");

  const subject = SUBJECTS[params.subjectId];
  let allQuestions: any[] = [];
  if (subject) {
    const chapters = params.chapterId ? subject.chapters.filter((c: any) => c.id === params.chapterId) : subject.chapters;
    chapters.forEach((ch: any) => {
      const topics = params.topicId ? ch.topics.filter((t: any) => t.id === params.topicId) : ch.topics;
      topics.forEach((t: any) => allQuestions.push(...t.questions));
    });
  }

  const questions = questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);

  let correctCount = 0, wrongCount = 0, skippedCount = 0;
  questions.forEach(q => {
    const ans         = answers[q.id];
    const correctText = getQuestionOptions(q, "ar")[q.answer];
    if (ans === undefined || ans === null || ans === "") skippedCount++;
    else if (ans === correctText) correctCount++;
    else wrongCount++;
  });

  const total              = questions.length;
  const percentage         = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const selectedPercentage = Number(params.percentage ?? "100");
  const scope = params.scope ?? (params.topicId ? "topic" : params.chapterId ? "chapter" : "subject");

  const emoji   = percentage >= 90 ? "🏆" : percentage >= 70 ? "✅" : percentage >= 50 ? "📚" : "💪";
  const message = percentage >= 90 ? "ممتاز! أداء رائع" : percentage >= 70 ? "جيد جداً! استمر" : percentage >= 50 ? "مقبول، راجع الأخطاء" : "راجع المادة وحاول مجدداً";

  const [showReview, setShowReview] = useState(false);
  const [expandedExp, setExpandedExp] = useState<Record<string, boolean>>({});
  const toggleExp = (id: string) => setExpandedExp(prev => ({ ...prev, [id]: !prev[id] }));

  const textAlign  = lang === "en" ? "left"      : "right";
  const writingDir = lang === "en" ? "ltr"        : "rtl";
  const rowJustify = lang === "en" ? "flex-start" : "flex-end";

  useEffect(() => {
    const persistResult = async () => {
      await saveResult({
        subjectId: params.subjectId ?? "",
        chapterId: params.chapterId ?? "",
        topicId:   params.topicId   ?? "",
        mode:      params.mode      ?? "paper",
        correct: correctCount, wrong: wrongCount, skipped: skippedCount, total, percentage,
      });
      const isCompletion = selectedPercentage === 100 && total > 0 && correctCount === total;
      if (!isCompletion) return;
      if (scope === "topic")    { await markTopicCompletion(params.subjectId ?? "", params.chapterId ?? "", params.topicId ?? ""); return; }
      if (scope === "chapter")  { await markChapterCompletion(params.subjectId ?? "", params.chapterId ?? ""); return; }
      if (scope === "subject")  { await markSubjectCompletion(params.subjectId ?? ""); }
    };
    persistResult();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content}>

      {/* Score Card */}
      <View style={[s.scoreCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={s.emoji}>{emoji}</Text>
        <Text style={{ fontSize: 52, fontWeight: "bold", color: theme.primary }}>{percentage}%</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 15, marginTop: 4, marginBottom: 20 }}>{message}</Text>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.correct }}>{correctCount}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>صحيح</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.secondary + "44" }]} />
          <View style={s.stat}>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.wrong }}>{wrongCount}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>خاطئ</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.secondary + "44" }]} />
          <View style={s.stat}>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.textSecondary }}>{skippedCount}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>متروك</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.secondary + "44" }]} />
          <View style={s.stat}>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.textPrimary }}>{total}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>المجموع</Text>
          </View>
        </View>
      </View>

      {/* زر المراجعة + اللغة */}
      <View style={s.reviewRow}>
        <TouchableOpacity
          style={[s.langToggle, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
          onPress={() => setLang(l => l === "ar" ? "en" : "ar")}
        >
          <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 14 }}>{lang === "ar" ? "EN" : "AR"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.reviewBtn, { backgroundColor: theme.background, borderColor: theme.secondary + "44" }]}
          onPress={() => setShowReview(v => !v)}
        >
          <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 15 }}>
            {showReview ? "▲ إخفاء المراجعة" : "📋 مراجعة الإجابات"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* قائمة المراجعة */}
      {showReview && (
        <View style={s.reviewList}>
          {questions.map((q, i) => {
            const chosenText         = answers[q.id];
            const correctText        = getQuestionOptions(q, "ar")[q.answer];
            const correctDisplayText = getQuestionOptions(q, lang)[q.answer];
            const chosenIndex        = getQuestionOptions(q, "ar").indexOf(chosenText);
            const chosenDisplayText  = chosenIndex !== -1 ? getQuestionOptions(q, lang)[chosenIndex] : chosenText;
            const isSkipped          = chosenText === undefined || chosenText === null || chosenText === "";
            const isCorrect          = !isSkipped && chosenText === correctText;

            return (
              <View
                key={q.id}
                style={[
                  s.reviewCard,
                  { backgroundColor: theme.card },
                  isCorrect  ? { borderColor: theme.correct,          borderLeftColor: theme.correct }          :
                  isSkipped  ? { borderColor: theme.secondary + "44", borderLeftColor: theme.textSecondary }    :
                               { borderColor: theme.wrong,            borderLeftColor: theme.wrong },
                ]}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>س{i + 1}</Text>

                <Text style={{ color: theme.textPrimary, fontSize: 14, marginBottom: 8, lineHeight: 22, textAlign, writingDirection: writingDir }}>
                  {getQuestionText(q, lang)}
                </Text>

                <View style={[s.reviewAnswer, { justifyContent: rowJustify }]}>
                  <Text style={{ color: theme.correct, fontSize: 13, fontWeight: "bold" }}>✅ الصحيحة: </Text>
                  <Text style={{ color: theme.textPrimary, fontSize: 13, flex: 1, textAlign, writingDirection: writingDir }}>
                    {correctDisplayText}
                  </Text>
                </View>

                {!isCorrect && !isSkipped && (
                  <View style={[s.reviewAnswer, { justifyContent: rowJustify }]}>
                    <Text style={{ color: theme.wrong, fontSize: 13, fontWeight: "bold" }}>❌ إجابتك: </Text>
                    <Text style={{ color: theme.textPrimary, fontSize: 13, flex: 1, textAlign, writingDirection: writingDir }}>
                      {chosenDisplayText}
                    </Text>
                  </View>
                )}

                {isSkipped && (
                  <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "right", marginTop: 4 }}>
                    ⚪ لم تجب على هذا السؤال
                  </Text>
                )}

                {getQuestionExplanation(q, lang) !== "" && (
                  <>
                    <TouchableOpacity onPress={() => toggleExp(q.id)} style={s.expToggle}>
                      <Text style={{ color: theme.explain, fontSize: 13, fontWeight: "600" }}>
                        {expandedExp[q.id] ? "▲ إخفاء الشرح" : "💡 إظهار الشرح"}
                      </Text>
                    </TouchableOpacity>
                    {expandedExp[q.id] && (
                      <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 22, textAlign, writingDirection: writingDir }}>
                        {getQuestionExplanation(q, lang)}
                      </Text>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={[s.retryBtn, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
        <Text style={s.btnText}>🔄 إعادة المحاولة</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[s.homeBtn, { backgroundColor: theme.background, borderColor: theme.secondary + "44" }]} onPress={() => router.push("/" as any)}>
        <Text style={{ color: theme.textSecondary, fontWeight: "bold", fontSize: 16 }}>🏠 الرئيسية</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  content:      { padding: 16, paddingBottom: 60 },
  scoreCard:    { borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, marginBottom: 16 },
  emoji:        { fontSize: 52, marginBottom: 8 },
  statsRow:     { flexDirection: "row", alignItems: "center", width: "100%" },
  stat:         { flex: 1, alignItems: "center" },
  statDivider:  { width: 1, height: 40 },
  reviewRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  reviewBtn:    { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  langToggle:   { width: 52, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  reviewList:   { gap: 10, marginBottom: 16 },
  reviewCard:   { borderRadius: 12, padding: 14, borderWidth: 1, borderLeftWidth: 4 },
  reviewAnswer: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  expToggle:    { marginTop: 10, alignSelf: "flex-end" },
  retryBtn:     { borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 10 },
  homeBtn:      { borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1 },
  btnText:      { color: "#fff", fontWeight: "bold", fontSize: 16 },
});