import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
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
  const { theme, isDark, toggle } = useTheme();
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
  const [fabOpen, setFabOpen] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // 1. استخراج بيانات المادة بشكل مستقل ليكون متاحاً في كل الصفحة
  const subject = useMemo(() => loadSubjectDataById(params.subjectId ?? ""), [params.subjectId]);
  
  // 2. استخراج اسم المادة للـ Header
  const subjectName = subject?.title || "";

  // 3. استخراج اسم النطاق (الموضوع > الفصل > المادة)
  const scopeName = useMemo(() => {
    if (params.topicId) {
      for (const ch of subject?.chapters || []) {
        const topic = ch.topics?.find(t => t.id === params.topicId);
        if (topic) return topic.title || topic.title || "";
      }
    }
    if (params.chapterId) {
      const ch = subject?.chapters?.find(c => c.id === params.chapterId);
      if (ch) return ch.title || ch.title || "";
    }
    return subjectName;
  }, [subject, params.topicId, params.chapterId, subjectName]);

  const questions = useMemo(() => {
    const bank = getScopedQuestions(subject, params.chapterId, params.topicId);
    const finalCount = getSelectedQuestionCount(bank.length, percentage);
    return order === "random" ? shuffle(bank).slice(0, finalCount) : bank.slice(0, finalCount);
  }, [subject, params.chapterId, params.topicId, percentage, order]);

  const question = questions[current];
  const textAlign = lang === "en" ? "left" : "right";
  const writingDirection = lang === "en" ? "ltr" : "rtl";

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: revealed ? 180 : 0,
      friction: 8,
      tension: 55,
      useNativeDriver: true,
    }).start();
  }, [flipAnim, revealed]);

  useEffect(() => {
    if (!question) return;
    isBookmarked(question.id).then(setBookmarked);
  }, [question]);

  const labels = lang === "en"
    ? {
        counter: `Card ${Math.min(current + 1, questions.length)} of ${questions.length}`,
        explanation: "Explanation",
        previous: "Previous",
        next: "Next",
        done: "Finish Review",
        bookmark: "Save Card",
        saved: "Saved",
        empty: "Loading cards...",
        tapHint: "Tap the card to flip it",
        correctAnswer: "Correct Answer",
        settings: "Settings",
        language: "Language",
        theme: "Theme",
      }
    : {
        counter: `البطاقة ${Math.min(current + 1, questions.length)} من ${questions.length}`,
        explanation: "الشرح",
        previous: "السابق",
        next: "التالي",
        done: "إنهاء المراجعة",
        bookmark: "احفظ البطاقة",
        saved: "محفوظة",
        empty: "جاري تحميل البطاقات...",
        tapHint: "اضغط على البطاقة لقلبها",
        correctAnswer: "الإجابة الصحيحة",
        settings: "الإعدادات",
        language: "اللغة",
        theme: "الثيم",
      };

  const goToCard = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    setCurrent(nextIndex);
    setRevealed(false);
    setFabOpen(false);
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

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const correctAnswerText = getQuestionOptions(question, lang)[question.answer] ?? "";
  const explanationText = getQuestionExplanation(question, lang);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        <View style={s.header}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>

          {/* 4. تغيير التايتل بار ليكون اسم المادة */}
          <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 18 }} numberOfLines={1}>
            {subjectName}
          </Text>

          <View style={{ width: 44 }} />
        </View>

        {/* 5. إضافة اسم الموضوع/الفصل كعنوان فرعي */}
        {scopeName !== "" && (
          <Text style={{ color: theme.textPrimary, fontSize: 15, fontWeight: "600", textAlign: "center", marginBottom: 4 }}>
            {scopeName}
          </Text>
        )}

        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", marginBottom: 12 }}>
          {labels.counter}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: "center", marginBottom: 16 }}>
          {labels.tapHint}
        </Text>

        <Pressable onPress={() => setRevealed((value) => !value)}>
          <View style={s.cardWrap}>
            <Animated.View
              style={[
                s.cardFace,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.secondary + "44",
                  transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
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
            </Animated.View>

            <Animated.View
              style={[
                s.cardFace,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.secondary + "44",
                  transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                },
              ]}
            >
              {/* إضافة ScrollView للوجه الخلفي لحل مشكلة النصوص الطويلة */}
              <ScrollView showsVerticalScrollIndicator={false}>
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
              </ScrollView>
            </Animated.View>
          </View>
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

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[
              s.secondaryBtn,
              {
                backgroundColor: current === 0 ? theme.secondary + "22" : theme.card,
                borderColor: theme.secondary + "44",
              },
            ]}
            onPress={() => goToCard(current - 1)}
            disabled={current === 0}
          >
            <Text style={{ color: current === 0 ? theme.textSecondary : theme.textPrimary, fontWeight: "700" }}>
              {labels.previous}
            </Text>
          </TouchableOpacity>

          {current + 1 >= questions.length ? (
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={handleDone}
            >
              <Text style={s.primaryBtnText}>{labels.done}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={() => goToCard(current + 1)}
            >
              <Text style={s.primaryBtnText}>{labels.next}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={s.fabArea} pointerEvents="box-none">
        {fabOpen && (
          <View style={[s.fabMenu, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
            <TouchableOpacity style={s.fabMenuItem} onPress={() => setLang((value) => (value === "ar" ? "en" : "ar"))}>
              <Ionicons name="language-outline" size={18} color={theme.primary} />
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                {labels.language}: {lang === "ar" ? "AR" : "EN"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fabMenuItem} onPress={toggle}>
              <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={theme.primary} />
              <Text style={{ color: theme.textPrimary, fontSize: 13 }}>
                {labels.theme}: {isDark ? "Dark" : "Light"}
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
  content: { padding: 16, paddingTop: 50, paddingBottom: 140 },
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
  cardWrap: {
    height: 360, // تم التغيير ليكون ثابت
    position: 'relative',
  },
  cardFace: {
    position: 'absolute', // تم الإضافة لحل مشكلة المساحة
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    backfaceVisibility: "hidden",
    justifyContent: "center",
  },
  answerBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
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