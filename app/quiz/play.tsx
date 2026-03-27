import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Colors } from "../../constants/colors";
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

function getQuestionText(question: any) {
  return question.text ?? question.text_en ?? "";
}

function getQuestionOptions(question: any): string[] {
  return question.options ?? question.options_en ?? [];
}

function shuffleOptions(question: any) {
  const correctText = getQuestionOptions(question)[question.answer];
  const options = [...getQuestionOptions(question)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...question, options, correctText };
}

export default function QuizPlayScreen() {
  const params = useLocalSearchParams<{
    subjectId: string; chapterId: string; topicId: string;
    mode: string; order: string; hardMode: string;
  }>();
  const router = useRouter();

  const mode = params.mode ?? "paper";
  const hardMode = params.hardMode === "1";
  const order = params.order ?? "random";

  const [questions, setQuestions] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionsRef = useRef<any[]>([]);

  // ── تحميل الأسئلة من جديد ──
  const loadFresh = () => {
    const subject = SUBJECTS[params.subjectId];
    if (!subject) return;
    let qs: any[] = [];
    const chapters = params.chapterId
      ? subject.chapters.filter((c: any) => c.id === params.chapterId)
      : subject.chapters;
    chapters.forEach((ch: any) => {
      const topics = params.topicId
        ? ch.topics.filter((t: any) => t.id === params.topicId)
        : ch.topics;
      topics.forEach((t: any) => qs.push(...t.questions));
    });
    qs = qs.map(q => shuffleOptions(q));
    const final = order === "random" ? shuffle(qs) : qs;
    questionsRef.current = final;
    setQuestions(final);
    if (hardMode) setTimeLeft(final.length * 60);
    setSessionChecked(true);
  };

  // ── تهيئة الكوز مع فحص الجلسة ──
  useEffect(() => {
    const initQuiz = async () => {
      const session = await getSession();
      if (
        session &&
        session.subjectId === (params.subjectId ?? "") &&
        session.chapterId === (params.chapterId ?? "") &&
        session.topicId === (params.topicId ?? "")
      ) {
        Alert.alert(
          "استئناف الكوز",
          `عندك كوز غير مكتمل — وصلت للسؤال ${session.current + 1}. تكمل؟`,
          [
            {
              text: "لا، ابدأ من جديد",
              style: "destructive",
              onPress: () => { clearSession(); loadFresh(); },
            },
            {
              text: "نعم، أكمل",
              onPress: () => {
                const subject = SUBJECTS[params.subjectId];
                let allQs: any[] = [];
                subject?.chapters.forEach((ch: any) =>
                  ch.topics.forEach((t: any) => allQs.push(...t.questions))
                );
                const qs = session.questionIds
                  .map((id: string) => allQs.find(q => q.id === id))
                  .filter(Boolean)
                  .map((q: any) => shuffleOptions(q));
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

  // ── حفظ الجلسة كل ما يتغير السؤال أو الإجابات ──
  useEffect(() => {
    if (!sessionChecked || questions.length === 0) return;
    saveSession({
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode,
      hardMode: params.hardMode ?? "0",
      order,
      questionIds: questionsRef.current.map(q => q.id),
      answers: answersRef.current,
      current,
      timeLeft,
      savedAt: new Date().toISOString(),
    });
  }, [current, answers, sessionChecked]);

  // ── تحقق bookmark كل ما يتغير السؤال ──
  useEffect(() => {
    if (!questions[current]) return;
    isBookmarked(questions[current].id).then(setBookmarked);
  }, [current, questions]);

  const finishQuiz = useCallback(() => {
    clearInterval(timerRef.current!);
    clearSession(); // ✅ امسح الجلسة
    const p = new URLSearchParams({
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode,
      answers: JSON.stringify(answersRef.current),
      questionIds: JSON.stringify(questionsRef.current.map(q => q.id)),
    });
    router.replace(`/quiz/result?${p.toString()}` as any);
  }, []);

  useEffect(() => {
    if (!hardMode || timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t !== null && t <= 1) {
          clearInterval(timerRef.current!);
          finishQuiz();
          return 0;
        }
        return t !== null ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [timeLeft === null ? null : "started"]);

  const formatTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  const q = questions[current];

  const toggleBookmark = async () => {
    if (!q) return;
    if (bookmarked) {
      await removeBookmark(q.id);
      setBookmarked(false);
    } else {
      await saveBookmark(q.id, params.subjectId ?? "");
      setBookmarked(true);
    }
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
    if (!q) return s.option;
    const chosenText = answers[q.id];
    const correctText = q.correctText;
    if (mode === "paper") {
      return chosenText === q.options[index] ? [s.option, s.optionSelected] : s.option;
    }
    if (!revealed) {
      return chosenText === q.options[index] ? [s.option, s.optionSelected] : s.option;
    }
    if (q.options[index] === correctText) return [s.option, s.optionCorrect];
    if (chosenText === q.options[index] && chosenText !== correctText) return [s.option, s.optionWrong];
    return s.option;
  };

  const getOptionTextStyle = (index: number) => {
    if (!q) return s.optionText;
    const chosenText = answers[q.id];
    const correctText = q.correctText;
    if (mode === "recitation" && revealed) {
      if (q.options[index] === correctText) return [s.optionText, { color: Colors.correct }];
      if (chosenText === q.options[index] && chosenText !== correctText) return [s.optionText, { color: Colors.wrong }];
    }
    if (mode === "paper" && chosenText === q.options[index]) return [s.optionText, { color: Colors.primary }];
    return s.optionText;
  };

  if (questions.length === 0) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginBottom: 12 }} />
        <Text style={s.emptyText}>جاري تحميل الأسئلة...</Text>
      </View>
    );
  }

  if (!q) return null;

  const progress = (current + 1) / questions.length;
  const chosenText = answers[q.id];

  return (
    <View style={s.container}>

      <View style={s.header}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "خروج من الكوز",
              "لو خرجت الحين راح يتحفظ تقدمك وتقدر تكمل لاحقاً",
              [
                { text: "تراجع", style: "cancel" },
                { text: "خروج", style: "destructive", onPress: () => router.back() },
              ]
            )
          }
          style={s.exitBtn}
        >
          <Text style={s.exitText}>✕</Text>
        </TouchableOpacity>

        <Text style={s.counter}>{current + 1} / {questions.length}</Text>
        {hardMode && timeLeft !== null ? (
          <Text style={[s.timer, timeLeft < 60 && s.timerWarning]}>
            ⏱️ {formatTime(timeLeft)}
          </Text>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        <TouchableOpacity style={s.bookmarkBtn} onPress={toggleBookmark}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={bookmarked ? Colors.primary : Colors.textMuted}
          />
          <Text style={[s.bookmarkText, bookmarked && { color: Colors.primary }]}>
            {bookmarked ? "محفوظ" : "احفظ السؤال"}
          </Text>
        </TouchableOpacity>

        <Text style={s.questionText}>{getQuestionText(q)}</Text>

        {q.options.map((opt: string, i: number) => (
          <Pressable key={i} style={getOptionStyle(i)} onPress={() => handleAnswer(i)}>
            <Text style={s.optionLetter}>{["أ", "ب", "ج", "د"][i]}</Text>
            <Text style={getOptionTextStyle(i)}>{opt}</Text>
          </Pressable>
        ))}

        {mode === "recitation" && revealed && (
          <View style={s.feedbackBox}>
            <Text style={[s.feedbackText, chosenText === q.correctText ? s.correct : s.wrong]}>
              {chosenText === q.correctText ? "✅ إجابة صحيحة!" : "❌ إجابة خاطئة"}
            </Text>
            <TouchableOpacity style={s.nextBtn} onPress={nextQuestion}>
              <Text style={s.nextBtnText}>
                {current + 1 >= questions.length ? "🏁 إنهاء" : "التالي ←"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === "paper" && chosenText !== undefined && (
          <TouchableOpacity style={s.nextBtn} onPress={nextQuestion}>
            <Text style={s.nextBtnText}>
              {current + 1 >= questions.length ? "🏁 إنهاء وعرض النتيجة" : "التالي ←"}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 50 },
  exitBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, justifyContent: "center", alignItems: "center" },
  exitText: { color: Colors.textMuted, fontSize: 16 },
  counter: { color: Colors.text, fontWeight: "bold", fontSize: 15 },
  timer: { color: Colors.primary, fontWeight: "bold", fontSize: 15, width: 60, textAlign: "right" },
  timerWarning: { color: Colors.wrong },
  progressBg: { height: 4, backgroundColor: Colors.border, marginHorizontal: 16, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  bookmarkBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 8, padding: 6 },
  bookmarkText: { color: Colors.textMuted, fontSize: 13 },
  questionText: { color: Colors.text, fontSize: 17, fontWeight: "600", textAlign: "right", lineHeight: 26, marginBottom: 20, marginTop: 8 },
  option: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + "22" },
  optionCorrect: { borderColor: Colors.correct, backgroundColor: Colors.correct + "22" },
  optionWrong: { borderColor: Colors.wrong, backgroundColor: Colors.wrong + "22" },
  optionLetter: { color: Colors.textMuted, fontWeight: "bold", fontSize: 15, width: 24, textAlign: "center" },
  optionText: { color: Colors.text, fontSize: 14, flex: 1, textAlign: "right" },
  feedbackBox: { marginTop: 10, alignItems: "center", gap: 12 },
  feedbackText: { fontSize: 16, fontWeight: "bold" },
  correct: { color: Colors.correct },
  wrong: { color: Colors.wrong },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 16 },
  nextBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
