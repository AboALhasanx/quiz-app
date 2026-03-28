import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../utils/ThemeContext";
import {
  AnswerMap,
  Language,
  markChapterCompletion,
  markSubjectCompletion,
  markTopicCompletion,
  saveResult,
} from "../../utils/storage";
import {
  getQuestionExplanation,
  getQuestionOptions,
  getQuestionText,
  getScopedQuestions,
  loadSubjectDataById,
} from "../../utils/subjects";

function parseLang(value?: string): Language {
  return value === "en" ? "en" : "ar";
}

export default function ResultScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    subjectId: string;
    chapterId: string;
    topicId: string;
    mode: string;
    answers: string;
    questionIds: string;
    scope?: string;
    percentage?: string;
    lang?: string;
  }>();
  const router = useRouter();

  const [lang, setLang] = useState<Language>(parseLang(params.lang));
  const [showReview, setShowReview] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  const answers = JSON.parse(params.answers ?? "{}") as AnswerMap;
  const questionIds = JSON.parse(params.questionIds ?? "[]") as string[];

  const subject = loadSubjectDataById(params.subjectId ?? "");
  const allQuestions = getScopedQuestions(subject, params.chapterId, params.topicId);
  const questions = questionIds
    .map((questionId) => allQuestions.find((question) => question.id === questionId))
    .filter((question): question is NonNullable<typeof question> => Boolean(question));

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  questions.forEach((question) => {
    const selectedOriginalIndex = answers[question.id];

    if (
      selectedOriginalIndex === undefined ||
      selectedOriginalIndex === null ||
      Number.isNaN(selectedOriginalIndex)
    ) {
      skippedCount += 1;
      return;
    }

    if (selectedOriginalIndex === question.answer) {
      correctCount += 1;
      return;
    }

    wrongCount += 1;
  });

  const total = questions.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const selectedPercentage = Number(params.percentage ?? "100");
  const scope =
    params.scope ?? (params.topicId ? "topic" : params.chapterId ? "chapter" : "subject");

  const emoji = percentage >= 90 ? "🏆" : percentage >= 70 ? "✅" : percentage >= 50 ? "📚" : "💪";
  const message =
    percentage >= 90
      ? "ممتاز! أداء رائع"
      : percentage >= 70
        ? "جيد جدًا! استمر"
        : percentage >= 50
          ? "مقبول، راجع الأخطاء"
          : "راجع المادة وحاول مجددًا";

  const textAlign = lang === "en" ? "left" : "right";
  const writingDirection = lang === "en" ? "ltr" : "rtl";
  const rowJustify = lang === "en" ? "flex-start" : "flex-end";

  useEffect(() => {
    const persistResult = async () => {
      await saveResult({
        subjectId: params.subjectId ?? "",
        chapterId: params.chapterId ?? "",
        topicId: params.topicId ?? "",
        mode: params.mode ?? "paper",
        correct: correctCount,
        wrong: wrongCount,
        skipped: skippedCount,
        total,
        percentage,
      });

      const isCompletion = selectedPercentage === 100 && total > 0 && correctCount === total;
      if (!isCompletion) return;

      if (scope === "topic") {
        await markTopicCompletion(
          params.subjectId ?? "",
          params.chapterId ?? "",
          params.topicId ?? ""
        );
        return;
      }

      if (scope === "chapter") {
        await markChapterCompletion(params.subjectId ?? "", params.chapterId ?? "");
        return;
      }

      if (scope === "subject") {
        await markSubjectCompletion(params.subjectId ?? "");
      }
    };

    void persistResult();
  }, [correctCount, params.subjectId, params.chapterId, params.topicId, params.mode, percentage, scope, selectedPercentage, skippedCount, total, wrongCount]);

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations((previous) => ({
      ...previous,
      [questionId]: !previous[questionId],
    }));
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content}>
      <View style={[s.scoreCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={s.emoji}>{emoji}</Text>
        <Text style={{ fontSize: 52, fontWeight: "bold", color: theme.primary }}>{percentage}%</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 15, marginTop: 4, marginBottom: 20 }}>
          {message}
        </Text>

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

      <View style={s.reviewRow}>
        <TouchableOpacity
          style={[s.langToggle, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
          onPress={() => setLang((value) => (value === "ar" ? "en" : "ar"))}
        >
          <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 14 }}>
            {lang === "ar" ? "EN" : "AR"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.reviewBtn, { backgroundColor: theme.background, borderColor: theme.secondary + "44" }]}
          onPress={() => setShowReview((value) => !value)}
        >
          <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 15 }}>
            {showReview ? "▲ إخفاء المراجعة" : "📋 مراجعة الإجابات"}
          </Text>
        </TouchableOpacity>
      </View>

      {showReview && (
        <View style={s.reviewList}>
          {questions.map((question, indexValue) => {
            const selectedOriginalIndex = answers[question.id];
            const correctDisplayText = getQuestionOptions(question, lang)[question.answer];
            const chosenDisplayText =
              selectedOriginalIndex !== undefined && selectedOriginalIndex !== null
                ? getQuestionOptions(question, lang)[selectedOriginalIndex] ?? ""
                : "";
            const isSkipped =
              selectedOriginalIndex === undefined ||
              selectedOriginalIndex === null ||
              Number.isNaN(selectedOriginalIndex);
            const isCorrect = !isSkipped && selectedOriginalIndex === question.answer;

            return (
              <View
                key={question.id}
                style={[
                  s.reviewCard,
                  { backgroundColor: theme.card },
                  isCorrect
                    ? { borderColor: theme.correct, borderLeftColor: theme.correct }
                    : isSkipped
                      ? { borderColor: theme.secondary + "44", borderLeftColor: theme.textSecondary }
                      : { borderColor: theme.wrong, borderLeftColor: theme.wrong },
                ]}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                  س{indexValue + 1}
                </Text>

                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 14,
                    marginBottom: 8,
                    lineHeight: 22,
                    textAlign,
                    writingDirection,
                  }}
                >
                  {getQuestionText(question, lang)}
                </Text>

                <View style={[s.reviewAnswer, { justifyContent: rowJustify }]}>
                  <Text style={{ color: theme.correct, fontSize: 13, fontWeight: "bold" }}>
                    ✅ الصحيحة:
                  </Text>
                  <Text
                    style={{
                      color: theme.textPrimary,
                      fontSize: 13,
                      flex: 1,
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {correctDisplayText}
                  </Text>
                </View>

                {!isCorrect && !isSkipped && (
                  <View style={[s.reviewAnswer, { justifyContent: rowJustify }]}>
                    <Text style={{ color: theme.wrong, fontSize: 13, fontWeight: "bold" }}>
                      ❌ إجابتك:
                    </Text>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontSize: 13,
                        flex: 1,
                        textAlign,
                        writingDirection,
                      }}
                    >
                      {chosenDisplayText}
                    </Text>
                  </View>
                )}

                {isSkipped && (
                  <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "right", marginTop: 4 }}>
                    ⚪ لم تجب على هذا السؤال
                  </Text>
                )}

                {getQuestionExplanation(question, lang) !== "" && (
                  <>
                    <TouchableOpacity onPress={() => toggleExplanation(question.id)} style={s.expToggle}>
                      <Text style={{ color: theme.explain, fontSize: 13, fontWeight: "600" }}>
                        {expandedExplanations[question.id] ? "▲ إخفاء الشرح" : "💡 إظهار الشرح"}
                      </Text>
                    </TouchableOpacity>
                    {expandedExplanations[question.id] && (
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontSize: 13,
                          marginTop: 6,
                          lineHeight: 22,
                          textAlign,
                          writingDirection,
                        }}
                      >
                        {getQuestionExplanation(question, lang)}
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
        <Text style={s.buttonText}>🔄 إعادة المحاولة</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.homeBtn, { backgroundColor: theme.background, borderColor: theme.secondary + "44" }]}
        onPress={() => router.push("/" as any)}
      >
        <Text style={{ color: theme.textSecondary, fontWeight: "bold", fontSize: 16 }}>🏠 الرئيسية</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  scoreCard: { borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, marginBottom: 16 },
  emoji: { fontSize: 52, marginBottom: 8 },
  statsRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  stat: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 40 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  reviewBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  langToggle: { width: 52, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  reviewList: { gap: 10, marginBottom: 16 },
  reviewCard: { borderRadius: 12, padding: 14, borderWidth: 1, borderLeftWidth: 4 },
  reviewAnswer: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  expToggle: { marginTop: 10, alignSelf: "flex-end" },
  retryBtn: { borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 10 },
  homeBtn: { borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
