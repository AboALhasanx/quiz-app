import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
} from "react-native";
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

export default function FlashcardsScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    subjectId: string;
    chapterId: string;
    topicId: string;
    percentage?: string;
    order?: string;
  }>();
  const router = useRouter();

  const order = params.order ?? "random";
  const parsedPercentage = Number(params.percentage ?? "100");
  const percentage =
    Number.isFinite(parsedPercentage) && parsedPercentage >= 10 && parsedPercentage <= 100
      ? parsedPercentage
      : 100;

  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lang, setLang] = useState<Language>("ar");
  const [bookmarked, setBookmarked] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  const questions = useMemo(() => {
    const subject = loadSubjectDataById(params.subjectId ?? "");
    const bank = getScopedQuestions(subject, params.chapterId, params.topicId);
    const finalCount = getSelectedQuestionCount(bank.length, percentage);
    return order === "random" ? shuffle(bank).slice(0, finalCount) : bank.slice(0, finalCount);
  }, [params.subjectId, params.chapterId, params.topicId, percentage, order]);

  const question = questions[current];
  const textAlign = lang === "en" ? "left" : "right";
  const writingDirection = lang === "en" ? "ltr" : "rtl";

  const goToNextCard = () => {
    if (current + 1 >= questions.length) return;
    setCurrent((value) => value + 1);
    setRevealed(false);
  };

  const goToPreviousCard = () => {
    if (current === 0) return;
    setCurrent((value) => value - 1);
    setRevealed(false);
  };

  const resetPan = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx <= -70) {
          goToNextCard();
        } else if (gestureState.dx >= 70) {
          goToPreviousCard();
        }

        resetPan();
      },
      onPanResponderTerminate: resetPan,
    })
  ).current;

  useEffect(() => {
    if (!question) return;
    isBookmarked(question.id).then(setBookmarked);
  }, [question]);

  const labels = lang === "en"
    ? {
        title: "Flashcards",
        counter: `Card ${Math.min(current + 1, questions.length)} of ${questions.length}`,
        explanation: "Explanation",
        done: "Done",
        bookmark: "Save Card",
        saved: "Saved",
        empty: "Loading cards...",
        swipeHint: "Swipe left or right to move between cards",
        tapHint: "Tap the card to reveal the answer",
        correctAnswer: "Correct Answer",
      }
    : {
        title: "فلاش كارد",
        counter: `البطاقة ${Math.min(current + 1, questions.length)} من ${questions.length}`,
        explanation: "الشرح",
        done: "إنهاء",
        bookmark: "احفظ البطاقة",
        saved: "محفوظة",
        empty: "جاري تحميل البطاقات...",
        swipeHint: "اسحب يمينًا أو يسارًا للانتقال بين البطاقات",
        tapHint: "اضغط على البطاقة لإظهار الجواب",
        correctAnswer: "الإجابة الصحيحة",
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

  const correctAnswerText = getQuestionOptions(question, lang)[question.answer] ?? "";
  const explanationText = getQuestionExplanation(question, lang);

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

        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
          onPress={() => setLang((value) => (value === "ar" ? "en" : "ar"))}
        >
          <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 14 }}>
            {lang === "ar" ? "EN" : "AR"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 12 }}>
        {labels.counter}
      </Text>
      <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center", marginBottom: 12 }}>
        {revealed ? labels.swipeHint : labels.tapHint}
      </Text>

      <Pressable onPress={() => setRevealed((value) => !value)}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            s.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.secondary + "44",
              transform: [{ translateX: pan.x }],
            },
          ]}
        >
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

          {revealed && (
            <>
              <View style={[s.answerBox, { backgroundColor: theme.background, borderColor: theme.correct + "44" }]}>
                <Text style={{ color: theme.correct, fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
                  {labels.correctAnswer}
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

              {explanationText !== "" && (
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
                    {explanationText}
                  </Text>
                </View>
              )}
            </>
          )}
        </Animated.View>
      </Pressable>

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

      {current + 1 >= questions.length && (
        <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleDone}>
          <Text style={s.primaryBtnText}>{labels.done}</Text>
        </TouchableOpacity>
      )}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    minHeight: 260,
  },
  answerBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
});
