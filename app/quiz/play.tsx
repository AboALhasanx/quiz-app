import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../utils/ThemeContext";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { saveBookmark, removeBookmark, isBookmarked, saveSession, getSession, clearSession } from "../../utils/storage";
import { Ionicons } from "@expo/vector-icons";

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getQuestionText(question: any, lang = "ar"): string {
  return lang === "en" ? (question.text_en ?? question.text ?? "") : (question.text ?? question.text_en ?? "");
}

function getQuestionOptions(question: any, lang = "ar"): string[] {
  return lang === "en" ? (question.options_en ?? question.options ?? []) : (question.options ?? question.options_en ?? []);
}

function getQuestionExplanation(question: any, lang = "ar"): string {
  return lang === "en" ? (question.explanation_en ?? question.explanation ?? "") : (question.explanation ?? question.explanation_en ?? "");
}

function shuffleOptions(question: any, lang: string) {
  const correctText = getQuestionOptions(question, lang)[question.answer];
  const options = [...getQuestionOptions(question, lang)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...question, options, correctText };
}

function getSelectedQuestionCount(total: number, percentage: number) {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(1, Math.floor((total * percentage) / 100)));
}

export default function QuizPlayScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    scope?: string; subjectId: string; chapterId: string; topicId: string;
    mode: string; order: string; hardMode: string; percentage?: string;
  }>();
  const router = useRouter();

  const mode = params.mode ?? "paper";
  const hardMode = params.hardMode === "1";
  const order = params.order ?? "random";
  const parsedPercentage = Number(params.percentage ?? "100");
  const percentage = Number.isFinite(parsedPercentage) && parsedPercentage >= 10 && parsedPercentage <= 100 ? parsedPercentage : 100;

  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionsRef = useRef<any[]>([]);

  const loadFresh = () => {
    const subject = SUBJECTS[params.subjectId];
    if (!subject) return;
    let qs: any[] = [];
    const chapters = params.chapterId ? subject.chapters.filter((c: any) => c.id === params.chapterId) : subject.chapters;
    chapters.forEach((ch: any) => {
      const topics = params.topicId ? ch.topics.filter((t: any) => t.id === params.topicId) : ch.topics;
      topics.forEach((t: any) => qs.push(...t.questions));
    });
    const finalCount = getSelectedQuestionCount(qs.length, percentage);
    const selectedQuestions = order === "random" ? shuffle(qs).slice(0, finalCount) : qs.slice(0, finalCount);
    const final = selectedQuestions.map(q => shuffleOptions(q, lang));
    questionsRef.current = final;
    setQuestions(final);
    if (hardMode) setTimeLeft(final.length * 60);
    setSessionChecked(true);
  };

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
        (session.percentage ?? 100) === percentage
      ) {
        Alert.alert(
          "استئناف الكوز",
          `عندك كوز غير مكتمل — وصلت للسؤال ${session.current + 1}. تكمل؟`,
          [
            { text: "لا، ابدأ من جديد", style: "destructive", onPress: () => { clearSession(); loadFresh(); } },
            {
              text: "نعم، أكمل",
              onPress: () => {
                const subject = SUBJECTS[params.subjectId];
                let allQs: any[] = [];
                subject?.chapters.forEach((ch: any) => ch.topics.forEach((t: any) => allQs.push(...t.questions)));
                const qs = session.questionIds.map((id: string) => allQs.find(q => q.id === id)).filter(Boolean).map((q: any) => shuffleOptions(q, lang));
                questionsRef.current = qs;
                answersRef.current = session.answers;
                setQuestions(qs);
                setAnswers(session.answers);
                setCurrent(session.current);
                if (session.timeLeft !== null) setTimeLeft(session.timeLeft);
                setSessionChecked(true);
              },
            },
          ]
        );
      } else {
        loadFresh();
      }
    };
    initQuiz();
  }, []);

  useEffect(() => {
    if (!sessionChecked || questions.length === 0) return;
    saveSession({
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode, hardMode: params.hardMode ?? "0", order, percentage,
      questionIds: questionsRef.current.map(q => q.id),
      answers: answersRef.current,
      current, timeLeft,
      savedAt: new Date().toISOString(),
    });
  }, [current, answers, sessionChecked]);

  useEffect(() => {
    if (!questions[current]) return;
    isBookmarked(questions[current].id).then(setBookmarked);
  }, [current, questions]);

  const finishQuiz = useCallback(() => {
    clearInterval(timerRef.current!);
    clearSession();
    const p = new URLSearchParams({
      scope: params.scope ?? "",
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode, percentage: percentage.toString(),
      answers: JSON.stringify(answersRef.current),
      questionIds: JSON.stringify(questionsRef.current.map(q => q.id)),
      lang,
    });
    router.replace(`/quiz/result?${p.toString()}` as any);
  }, [lang]);

  useEffect(() => {
    if (!hardMode || timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t !== null && t <= 1) { clearInterval(timerRef.current!); finishQuiz(); return 0; }
        return t !== null ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [timeLeft === null ? null : "started"]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  const q = questions[current];

  const toggleBookmark = async () => {
    if (!q) return;
    if (bookmarked) { await removeBookmark(q.id); setBookmarked(false); }
    else { await saveBookmark(q.id, params.subjectId ?? ""); setBookmarked(true); }
  };

  const handleAnswer = (optionIndex: number) => {
    if (!q) return;
    if (mode === "recitation" && revealed) return;
    const newAnswers = { ...answersRef.current, [q.id]: q.options[optionIndex] };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
    if (mode === "recitation") setRevealed(true);
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) finishQuiz();
    else { setCurrent(i => i + 1); setRevealed(false); }
  };

  const getOptionStyle = (index: number) => {
    if (!q) return [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
    const chosenText = answers[q.id];
    const correctText = q.correctText;
    if (mode === "paper") {
      return chosenText === q.options[index]
        ? [s.option, { backgroundColor: theme.primary + "22", borderColor: theme.primary }]
        : [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
    }
    if (!revealed) {
      return chosenText === q.options[index]
        ? [s.option, { backgroundColor: theme.primary + "22", borderColor: theme.primary }]
        : [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
    }
    if (q.options[index] === correctText) return [s.option, { backgroundColor: theme.correct + "22", borderColor: theme.correct }];
    if (chosenText === q.options[index] && chosenText !== correctText) return [s.option, { backgroundColor: theme.wrong + "22", borderColor: theme.wrong }];
    return [s.option, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }];
  };

  const getOptionTextStyle = (index: number) => {
    if (!q) return [s.optionText, { color: theme.textPrimary }];
    const chosenText = answers[q.id];
    const correctText = q.correctText;
    if (mode === "recitation" && revealed) {
      if (q.options[index] === correctText) return [s.optionText, { color: theme.correct }];
      if (chosenText === q.options[index] && chosenText !== correctText) return [s.optionText, { color: theme.wrong }];
    }
    if (mode === "paper" && chosenText === q.options[index]) return [s.optionText, { color: theme.primary }];
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

  if (!q) return null;

  const progress = (current + 1) / questions.length;
  const chosenText = answers[q.id];

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>

      <View style={s.header}>
        <TouchableOpacity
          onPress={() => Alert.alert("خروج من الكوز", "لو خرجت الحين راح يتحفظ تقدمك وتقدر تكمل لاحقاً", [
            { text: "تراجع", style: "cancel" },
            { text: "خروج", style: "destructive", onPress: () => router.back() },
          ])}
          style={[s.exitBtn, { backgroundColor: theme.card }]}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>

        <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 15 }}>
          {current + 1} / {questions.length}
        </Text>

        {hardMode && timeLeft !== null ? (
          <Text style={{ color: timeLeft < 60 ? theme.wrong : theme.primary, fontWeight: "bold", fontSize: 15, width: 60, textAlign: "right" }}>
            ⏱️ {formatTime(timeLeft)}
          </Text>
        ) : (
          <TouchableOpacity
            style={[s.langToggle, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
            onPress={() => setLang(l => l === "ar" ? "en" : "ar")}
          >
            <Text style={{ color: theme.primary, fontWeight: "600", fontSize: 14 }}>{lang === "ar" ? "EN" : "AR"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.progressBg, { backgroundColor: theme.secondary + "44" }]}>
        <View style={[s.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        <TouchableOpacity style={s.bookmarkBtn} onPress={toggleBookmark}>
          <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={22} color={bookmarked ? theme.primary : theme.textSecondary} />
          <Text style={{ color: bookmarked ? theme.primary : theme.textSecondary, fontSize: 13 }}>
            {bookmarked ? "محفوظ" : "احفظ السؤال"}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: "600", textAlign: "right", lineHeight: 26, marginBottom: 20, marginTop: 8 }}>
          {getQuestionText(q, lang)}
        </Text>

        {q.options.map((_: string, i: number) => (
          <Pressable key={i} style={getOptionStyle(i)} onPress={() => handleAnswer(i)}>
            <Text style={{ color: theme.textSecondary, fontWeight: "bold", fontSize: 15, width: 24, textAlign: "center" }}>
              {["أ", "ب", "ج", "د"][i]}
            </Text>
            <Text style={getOptionTextStyle(i)}>
              {getQuestionOptions(q, lang)[i] ?? q.options[i]}
            </Text>
          </Pressable>
        ))}

        {mode === "recitation" && revealed && (
          <View style={s.feedbackBox}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: chosenText === q.correctText ? theme.correct : theme.wrong }}>
              {chosenText === q.correctText ? "✅ إجابة صحيحة!" : "❌ إجابة خاطئة"}
            </Text>

            {getQuestionExplanation(q, lang) !== "" && (
              <View style={[s.explanationBox, { backgroundColor: theme.card, borderRightColor: theme.primary }]}>
                <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 13, marginBottom: 6, textAlign: "right" }}>
                  💡 الشرح
                </Text>
                <Text style={{ color: theme.textPrimary, fontSize: 14, lineHeight: 22, textAlign: "right" }}>
                  {getQuestionExplanation(q, lang)}
                </Text>
              </View>
            )}

            <TouchableOpacity style={[s.nextBtn, { backgroundColor: theme.primary }]} onPress={nextQuestion}>
              <Text style={s.nextBtnText}>{current + 1 >= questions.length ? "🏁 إنهاء" : "التالي ←"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "paper" && chosenText !== undefined && (
          <TouchableOpacity style={[s.nextBtn, { backgroundColor: theme.primary }]} onPress={nextQuestion}>
            <Text style={s.nextBtnText}>{current + 1 >= questions.length ? "🏁 إنهاء وعرض النتيجة" : "التالي ←"}</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, justifyContent: "center", alignItems: "center" },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 50 },
  exitBtn:        { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  progressBg:     { height: 4, marginHorizontal: 16, borderRadius: 2 },
  progressFill:   { height: 4, borderRadius: 2 },
  scroll:         { flex: 1 },
  scrollContent:  { padding: 16, paddingBottom: 40 },
  bookmarkBtn:    { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 8, padding: 6 },
  option:         { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  optionText:     { fontSize: 14, flex: 1, textAlign: "right" },
  feedbackBox:    { marginTop: 10, alignItems: "center", gap: 12 },
  explanationBox: { width: "100%", borderRadius: 10, padding: 12, borderRightWidth: 4 },
  langToggle:     { width: 60, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  nextBtn:        { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16, width: "100%" },
  nextBtnText:    { color: "#fff", fontWeight: "bold", fontSize: 16 },
});