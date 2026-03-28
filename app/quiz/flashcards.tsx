import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { isBookmarked, removeBookmark, saveBookmark } from "../../utils/storage";
import {
  Language,
  getQuestionExplanation,
  getQuestionOptions,
  getQuestionText,
  getScopedQuestions,
  loadSubjectDataById,
} from "../../utils/subjects";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let indexValue = copy.length - 1; indexValue > 0; indexValue -= 1) {
    const swapIndex = Math.floor(Math.random() * (indexValue + 1));
    [copy[indexValue], copy[swapIndex]] = [copy[swapIndex], copy[indexValue]];
  }
  return copy;
}

function getSelectedQuestionCount(total: number, percentage: number) {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(1, Math.floor((total * percentage) / 100)));
}

function parseLang(value?: string): Language {
  return value === "en" ? "en" : "ar";
}

export default function FlashcardsScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    subjectId: string;
    chapterId: string;
    topicId: string;
    percentage?: string;
    order?: string;
    lang?: string;
  }>();
  const router = useRouter();

  const lang = parseLang(params.lang);
  const order = params.order ?? "random";
  const parsedPercentage = Number(params.percentage ?? "100");
  const percentage =
    Number.isFinite(parsedPercentage) && parsedPercentage >= 10 && parsedPercentage <= 100
      ? parsedPercentage
      : 100;

  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const questions = useMemo(() => {
    const subject = loadSubjectDataById(params.subjectId ?? "");
    const bank = getScopedQuestions(subject, params.chapterId, params.topicId);
    const finalCount = getSelectedQuestionCount(bank.length, percentage);
    return order === "random" ? shuffle(bank).slice(0, finalCount) : bank.slice(0, finalCount);
  }, [params.subjectId, params.chapterId, params.topicId, percentage, order]);

  const question = questions[current];
  const textAlign = lang === "en" ? "left" : "right";
  const writingDirection = lang === "en" ? "ltr" : "rtl";

  useEffect(() => {
    if (!question) return;
    isBookmarked(question.id).then(setBookmarked);
  }, [question]);

  const labels = lang === "en"
    ? {
        title: "Flashcards",
        counter: `Card ${Math.min(current + 1, questions.length)} of ${questions.length}`,
        reveal: "Reveal Answer",
        explanation: "Explanation",
        previous: "← Previous",
        next: "Next →",
        done: "Done",
        finished: "You've reviewed all cards! 🎉",
        bookmark: "Save Card",
        saved: "Saved",
        empty: "Loading cards...",
      }
    : {
        title: "فلاش كارد",
        counter: `البطاقة ${Math.min(current + 1, questions.length)} من ${questions.length}`,
        reveal: "إظهار الجواب",
        explanation: "الشرح",
        previous: "→ السابق",
        next: "التالي ←",
        done: "تم",
        finished: "أنهيت مراجعة كل البطاقات! 🎉",
        bookmark: "احفظ البطاقة",
        saved: "محفوظة",
        empty: "جاري تحميل البطاقات...",
      };

  const toggleBookmark = async () => {
    if (!question) return;

    if (bookmarked) {
      await removeBookmark(question.id);
      setBookmarked(false);
      return;
    }

    await saveBookmark(question.id, params.subjectId ?? "");
    setBookmarked(true);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
      return;
    }

    setCurrent((value) => value + 1);
    setRevealed(false);
  };

  const handleDone = () => {
    if (params.chapterId) {
      router.replace(`/chapter/${params.chapterId}?subjectId=${params.subjectId}` as any);
      return;
    }

    router.replace(`/subject/${params.subjectId}` as any);
  };

  if (questions.length === 0 || !question) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 12 }} />
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>{labels.empty}</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={[s.center, { backgroundColor: theme.background, padding: 24 }]}>
        <Text style={{ color: theme.textPrimary, fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>
          {labels.finished}
        </Text>
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleDone}>
          <Text style={s.primaryBtnText}>{labels.done}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const correctAnswerText = getQuestionOptions(question, lang)[question.answer] ?? "";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>

        <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 18 }}>
          {labels.title}
        </Text>

        <View style={{ width: 40, height: 40 }} />
      </View>

      <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 12 }}>
        {labels.counter}
      </Text>

      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text
          style={{
            color: theme.textPrimary,
            fontSize: 18,
            fontWeight: "600",
            lineHeight: 28,
            textAlign,
            writingDirection,
          }}
        >
          {getQuestionText(question, lang)}
        </Text>

        {!revealed ? (
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.primary }]} onPress={() => setRevealed(true)}>
            <Text style={s.primaryBtnText}>{labels.reveal}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[s.answerBox, { backgroundColor: theme.background, borderColor: theme.correct + "44" }]}>
              <Text style={{ color: theme.correct, fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
                {lang === "en" ? "Correct Answer" : "الإجابة الصحيحة"}
              </Text>
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 15,
                  lineHeight: 24,
                  textAlign,
                  writingDirection,
                }}
              >
                {correctAnswerText}
              </Text>
            </View>

            {getQuestionExplanation(question, lang) !== "" && (
              <View style={[s.answerBox, { backgroundColor: theme.background, borderColor: theme.explain + "44" }]}>
                <Text style={{ color: theme.explain, fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
                  {labels.explanation}
                </Text>
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 14,
                    lineHeight: 24,
                    textAlign,
                    writingDirection,
                  }}
                >
                  {getQuestionExplanation(question, lang)}
                </Text>
              </View>
            )}

            <View style={s.footerRow}>
              <TouchableOpacity
                style={[
                  s.secondaryBtn,
                  {
                    backgroundColor: current === 0 ? theme.secondary + "22" : theme.card,
                    borderColor: theme.secondary + "44",
                  },
                ]}
                onPress={() => {
                  if (current === 0) return;
                  setCurrent((value) => value - 1);
                  setRevealed(false);
                }}
                disabled={current === 0}
              >
                <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>{labels.previous}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleNext}>
                <Text style={s.primaryBtnText}>{labels.next}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.bookmarkRow} onPress={toggleBookmark}>
              <Ionicons
                name={bookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color={bookmarked ? theme.primary : theme.textSecondary}
              />
              <Text style={{ color: bookmarked ? theme.primary : theme.textSecondary, fontSize: 13 }}>
                {bookmarked ? labels.saved : labels.bookmark}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingTop: 50, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  answerBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
});
