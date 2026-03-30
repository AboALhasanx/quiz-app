import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av"; // <-- 1. إضافة استدعاء الصوت
import { useTheme } from "../../utils/ThemeContext";
import {
  AnswerMap,
  Language,
  clearSession,
  getSession,
  isBookmarked,
  removeBookmark,
  saveBookmark,
  saveSession,
} from "../../utils/storage";
import {
  SubjectQuestion,
  getQuestionExplanation,
  getQuestionText,
  getScopedQuestions,
  loadSubjectDataById,
} from "../../utils/subjects";

type ShuffledQuestion = SubjectQuestion & {
  shuffledOptions: {
    text: string;
    text_en?: string;
    originalIndex: number;
  }[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let indexValue = copy.length - 1; indexValue > 0; indexValue -= 1) {
    const swapIndex = Math.floor(Math.random() * (indexValue + 1));
    [copy[indexValue], copy[swapIndex]] = [copy[swapIndex], copy[indexValue]];
  }
  return copy;
}

function shuffleQuestion(question: SubjectQuestion): ShuffledQuestion {
  const arabicOptions = question.options ?? question.options_en ?? [];
  const englishOptions = question.options_en ?? question.options ?? [];
  const shuffledOptions = arabicOptions.map((optionText, optionIndex) => ({
    text: optionText,
    text_en: englishOptions[optionIndex],
    originalIndex: optionIndex,
  }));

  for (let indexValue = shuffledOptions.length - 1; indexValue > 0; indexValue -= 1) {
    const swapIndex = Math.floor(Math.random() * (indexValue + 1));
    [shuffledOptions[indexValue], shuffledOptions[swapIndex]] = [
      shuffledOptions[swapIndex],
      shuffledOptions[indexValue],
    ];
  }

  return {
    ...question,
    shuffledOptions,
  };
}

function getSelectedQuestionCount(total: number, percentage: number) {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(1, Math.floor((total * percentage) / 100)));
}

function parseLang(value?: string): Language {
  return value === "en" ? "en" : "ar";
}

export default function QuizPlayScreen() {
  const { theme, isDark, toggle } = useTheme();
  const params = useLocalSearchParams<{
    scope?: string;
    subjectId: string;
    chapterId: string;
    topicId: string;
    mode: string;
    order: string;
    hardMode: string;
    percentage?: string;
    lang?: string;
  }>();
  const router = useRouter();

  const mode = params.mode ?? "paper";
  const hardMode = params.hardMode === "1";
  const order = params.order ?? "random";
  const initialLang = parseLang(params.lang);
  const parsedPercentage = Number(params.percentage ?? "100");
  const percentage =
    Number.isFinite(parsedPercentage) && parsedPercentage >= 10 && parsedPercentage <= 100
      ? parsedPercentage
      : 100;

  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const answersRef = useRef<AnswerMap>({});
  const [revealed, setRevealed] = useState(false);
  const [lang, setLang] = useState<Language>(initialLang);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionsRef = useRef<ShuffledQuestion[]>([]);

  // <-- 2. تعريف مراجع الصوت
  const correctSoundRef = useRef<Audio.Sound | null>(null);
  const wrongSoundRef = useRef<Audio.Sound | null>(null);

  // <-- 3. تحميل الصوتات مرة واحدة عند فتح الصفحة
  useEffect(() => {
    let isMounted = true;
    
    const loadSounds = async () => {
      try {
        const { sound: cSound } = await Audio.Sound.createAsync(require("../../assets/sounds/correct.mp3"));
        const { sound: wSound } = await Audio.Sound.createAsync(require("../../assets/sounds/wrong.mp3"));
        
        if (isMounted) {
          correctSoundRef.current = cSound;
          wrongSoundRef.current = wSound;
        } else {
          cSound.unloadAsync();
          wSound.unloadAsync();
        }
      } catch (error) {
        console.log("Error loading sounds:", error);
      }
    };

    loadSounds();

    return () => {
      isMounted = false;
      correctSoundRef.current?.unloadAsync();
      wrongSoundRef.current?.unloadAsync();
    };
  }, []);

  const loadQuestionBank = useCallback((): SubjectQuestion[] => {
    const subject = loadSubjectDataById(params.subjectId ?? "");
    return getScopedQuestions(subject, params.chapterId, params.topicId);
  }, [params.subjectId, params.chapterId, params.topicId]);

  const loadFresh = useCallback(() => {
    const bank = loadQuestionBank();
    const finalCount = getSelectedQuestionCount(bank.length, percentage);
    const selectedQuestions =
      order === "random" ? shuffle(bank).slice(0, finalCount) : bank.slice(0, finalCount);
    const final = selectedQuestions.map((question) => shuffleQuestion(question));

    questionsRef.current = final;
    answersRef.current = {};
    setAnswers({});
    setQuestions(final);
    setCurrent(0);
    setRevealed(false);
    setLang(initialLang);
    setTimeLeft(hardMode ? final.length * 60 : null);
    setSessionChecked(true);
  }, [loadQuestionBank, percentage, order, hardMode, initialLang]);

  useEffect(() => {
    const initQuiz = async () => {
      const session = await getSession();

      if (
        session &&
        session.subjectId === (params.subjectId ?? "") &&
        session.chapterId === (params.chapterId ?? "") &&
        session.topicId === (params.topicId ?? "") &&
        session.mode === mode &&
        session.order === order &&
        session.hardMode === (params.hardMode ?? "0") &&
        session.percentage === percentage
      ) {
        const bank = loadQuestionBank();
        const missingQuestion = session.questionIds.some(
          (questionId) => !bank.some((question) => question.id === questionId)
        );

        if (missingQuestion) {
          await clearSession();
          Alert.alert("Previous session is no longer valid. Starting fresh.");
          loadFresh();
          return;
        }

        Alert.alert(
          "استئناف الكوز",
          `عندك كوز غير مكتمل — وصلت للسؤال ${session.current + 1}. تكمل؟`,
          [
            {
              text: "لا، ابدأ من جديد",
              style: "destructive",
              onPress: async () => {
                await clearSession();
                loadFresh();
              },
            },
            {
              text: "نعم، أكمل",
              onPress: () => {
                const restoredQuestions = session.questionIds
                  .map((questionId) => bank.find((question) => question.id === questionId))
                  .filter((question): question is SubjectQuestion => Boolean(question))
                  .map((question) => shuffleQuestion(question));

                const restoredLang = session.lang ?? initialLang;

                questionsRef.current = restoredQuestions;
                answersRef.current = session.answers;
                setQuestions(restoredQuestions);
                setAnswers(session.answers);
                setCurrent(session.current);
                setLang(restoredLang);
                setRevealed(false);
                setTimeLeft(session.timeLeft);
                setSessionChecked(true);
              },
            },
          ]
        );
        return;
      }

      loadFresh();
    };

    initQuiz();
  }, [
    initialLang,
    loadFresh,
    loadQuestionBank,
    mode,
    order,
    params.subjectId,
    params.chapterId,
    params.topicId,
    params.hardMode,
    percentage,
  ]);

  useEffect(() => {
    if (!sessionChecked || questions.length === 0) return;

    saveSession({
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode,
      hardMode: params.hardMode ?? "0",
      order,
      percentage,
      lang,
      questionIds: questionsRef.current.map((question) => question.id),
      answers: answersRef.current,
      current,
      timeLeft,
      savedAt: new Date().toISOString(),
    });
  }, [current, lang, answers, percentage, sessionChecked, timeLeft, mode, order, params.subjectId, params.chapterId, params.topicId, params.hardMode, questions.length]);

  useEffect(() => {
    if (!questions[current]) return;
    isBookmarked(questions[current].id).then(setBookmarked);
  }, [current, questions]);

  const finishQuiz = useCallback(() => {
    clearInterval(timerRef.current ?? undefined);
    void clearSession();

    const searchParams = new URLSearchParams({
      scope: params.scope ?? "",
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode,
      percentage: percentage.toString(),
      answers: JSON.stringify(answersRef.current),
      questionIds: JSON.stringify(questionsRef.current.map((question) => question.id)),
      lang,
    });

    router.replace(`/quiz/result?${searchParams.toString()}` as any);
  }, [lang, mode, params.scope, params.subjectId, params.chapterId, params.topicId, percentage, router]);

  const shouldRunTimer = hardMode && timeLeft !== null && timeLeft > 0;

  useEffect(() => {
    if (!shouldRunTimer) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((value) => {
        if (value !== null && value <= 1) {
          clearInterval(timerRef.current ?? undefined);
          finishQuiz();
          return 0;
        }

        return value !== null ? value - 1 : null;
      });
    }, 1000);

    return () => clearInterval(timerRef.current ?? undefined);
  }, [finishQuiz, shouldRunTimer]);

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const question = questions[current];
  const textAlign = lang === "en" ? "left" : "right";
  const writingDirection = lang === "en" ? "ltr" : "rtl";

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

  // <-- 4. دالة تشغيل الصوت
  const playAnswerSound = async (isCorrect: boolean) => {
    const sound = isCorrect ? correctSoundRef.current : wrongSoundRef.current;
    if (sound) {
      // نستخدم replayAsync عوضاً عن playAsync لكي يعمل حتى لو تم تشغيله مرة سابقاً
      await sound.replayAsync();
    }
  };

  const handleAnswer = (displayIndex: number) => {
    if (!question) return;
    if (mode === "recitation" && revealed) return;

    const selectedOption = question.shuffledOptions[displayIndex];
    if (!selectedOption) return;

    const originalIndex = selectedOption.originalIndex;
    const updatedAnswers = { ...answersRef.current, [question.id]: originalIndex };

    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);

    if (mode === "recitation") {
      setRevealed(true);
      // <-- 5. تشغيل الصوت بناءً على الإجابة في وضع الاستذكار فقط
      playAnswerSound(originalIndex === question.answer);
    }
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      finishQuiz();
      return;
    }

    setCurrent((value) => value + 1);
    setRevealed(false);
  };

  const getOptionStyle = (displayIndex: number) => {
    if (!question) {
      return [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
    }

    const chosenAnswerIndex = answers[question.id];
    const optionIdentity = question.shuffledOptions[displayIndex]?.originalIndex;

    if (mode === "paper") {
      return chosenAnswerIndex === optionIdentity
        ? [s.option, { backgroundColor: theme.primary + "22", borderColor: theme.primary }]
        : [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
    }

    if (!revealed) {
      return chosenAnswerIndex === optionIdentity
        ? [s.option, { backgroundColor: theme.primary + "22", borderColor: theme.primary }]
        : [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
    }

    if (optionIdentity === question.answer) {
      return [s.option, { backgroundColor: theme.correct + "22", borderColor: theme.correct }];
    }

    if (chosenAnswerIndex === optionIdentity && chosenAnswerIndex !== question.answer) {
      return [s.option, { backgroundColor: theme.wrong + "22", borderColor: theme.wrong }];
    }

    return [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
  };

  const getOptionTextStyle = (displayIndex: number) => {
    if (!question) return [s.optionText, { color: theme.textPrimary }];

    const chosenAnswerIndex = answers[question.id];
    const optionIdentity = question.shuffledOptions[displayIndex]?.originalIndex;

    if (mode === "recitation" && revealed) {
      if (optionIdentity === question.answer) {
        return [s.optionText, { color: theme.correct }];
      }

      if (chosenAnswerIndex === optionIdentity && chosenAnswerIndex !== question.answer) {
        return [s.optionText, { color: theme.wrong }];
      }
    }

    if (mode === "paper" && chosenAnswerIndex === optionIdentity) {
      return [s.optionText, { color: theme.primary }];
    }

    return [s.optionText, { color: theme.textPrimary }];
  };

  if (questions.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 12 }} />
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>جاري تحميل الأسئلة...</Text>
      </View>
    );
  }

  if (!question) return null;

  const progress = (current + 1) / questions.length;
  const chosenAnswerIndex = answers[question.id];
  const isCorrectChoice = chosenAnswerIndex === question.answer;

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "خروج من الكوز",
              "لو خرجت الآن راح يتحفظ تقدمك وتكدر تكمل لاحقًا",
              [
                { text: "تراجع", style: "cancel" },
                { text: "خروج", style: "destructive", onPress: () => router.back() },
              ]
            )
          }
          style={[s.exitBtn, { backgroundColor: theme.card }]}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>

        <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 15 }}>
          {current + 1} / {questions.length}
        </Text>

        {hardMode && timeLeft !== null ? (
          <Text
            style={{
              color: timeLeft < 60 ? theme.wrong : theme.primary,
              fontWeight: "bold",
              fontSize: 15,
              width: 60,
              textAlign: "right",
            }}
          >
            ⏱️ {formatTime(timeLeft)}
          </Text>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <View style={[s.progressBg, { backgroundColor: theme.secondary + "44" }]}>
        <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.topToolsRow}>
          <TouchableOpacity style={s.bookmarkBtn} onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={bookmarked ? theme.primary : theme.textSecondary}
            />
            <Text style={{ color: bookmarked ? theme.primary : theme.textSecondary, fontSize: 13 }}>
              {bookmarked ? "محفوظ" : "احفظ السؤال"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            color: theme.textPrimary,
            fontSize: 17,
            fontWeight: "600",
            textAlign,
            writingDirection,
            lineHeight: 26,
            marginBottom: 20,
            marginTop: 8,
          }}
        >
          {getQuestionText(question, lang)}
        </Text>

        {question.shuffledOptions.map((option, displayIndex) => (
          <Pressable key={displayIndex} style={getOptionStyle(displayIndex)} onPress={() => handleAnswer(displayIndex)}>
            <Text style={{ color: theme.textSecondary, fontWeight: "bold", fontSize: 15, width: 24, textAlign: "center" }}>
              {["أ", "ب", "ج", "د"][displayIndex] ?? "-"}
            </Text>
            <Text
              style={[
                ...getOptionTextStyle(displayIndex),
                { textAlign, writingDirection },
              ]}
            >
              {lang === "en" ? option.text_en ?? option.text : option.text}
            </Text>
          </Pressable>
        ))}

        {mode === "recitation" && revealed && (
          <View style={s.feedbackBox}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                color: isCorrectChoice ? theme.correct : theme.wrong,
              }}
            >
              {isCorrectChoice ? "✅ إجابة صحيحة!" : "❌ إجابة خاطئة"}
            </Text>

            {getQuestionExplanation(question, lang) !== "" && (
              <View
                style={[
                  s.explanationBox,
                  {
                    backgroundColor: theme.card,
                    borderRightColor: theme.primary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: "700",
                    fontSize: 13,
                    marginBottom: 6,
                    textAlign,
                    writingDirection,
                  }}
                >
                  💡 الشرح
                </Text>
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign,
                    writingDirection,
                  }}
                >
                  {getQuestionExplanation(question, lang)}
                </Text>
              </View>
            )}

            <TouchableOpacity style={[s.nextBtn, { backgroundColor: theme.primary }]} onPress={nextQuestion}>
              <Text style={s.nextBtnText}>
                {current + 1 >= questions.length ? "🏁 إنهاء" : lang === "en" ? "Next →" : "التالي ←"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "paper" && chosenAnswerIndex !== undefined && (
          <TouchableOpacity style={[s.nextBtn, { backgroundColor: theme.primary }]} onPress={nextQuestion}>
            <Text style={s.nextBtnText}>
              {current + 1 >= questions.length
                ? "🏁 إنهاء وعرض النتيجة"
                : lang === "en"
                  ? "Next →"
                  : "التالي ←"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={s.fabArea} pointerEvents="box-none">
        {fabOpen && (
          <View style={[s.fabMenu, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
            <TouchableOpacity
              style={s.fabMenuItem}
              onPress={() => setLang((value) => (value === "ar" ? "en" : "ar"))}
            >
              <Ionicons name="language-outline" size={18} color={theme.primary} />
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                اللغة: {lang === "ar" ? "AR" : "EN"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fabMenuItem} onPress={toggle}>
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={theme.primary} />
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                الثيم: {isDark ? "Dark" : "Light"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[s.fabButton, { backgroundColor: theme.primary }]}
          onPress={() => setFabOpen((value) => !value)}
        >
          <Ionicons name={fabOpen ? "close" : "settings-outline"} size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBg: { height: 4, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  topToolsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
  },
  bookmarkBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 6 },
  option: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionText: { fontSize: 14, flex: 1 },
  feedbackBox: { marginTop: 10, alignItems: "center", gap: 12 },
  explanationBox: { width: "100%", borderRadius: 10, padding: 12, borderRightWidth: 4 },
  langToggle: {
    width: 60,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  nextBtn: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  nextBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  fabArea: {
    position: "absolute",
    right: 18,
    bottom: 24,
    alignItems: "flex-end",
  },
  fabMenu: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
    minWidth: 160,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});