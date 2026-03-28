import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTheme } from "../../utils/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { getScopedQuestions, loadSubjectDataById } from "../../utils/subjects";

type SessionType = "quiz" | "flashcards";

function getSelectedQuestionCount(total: number, percentage: number) {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(1, Math.floor((total * percentage) / 100)));
}

export default function QuizSetupScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    scope: string;
    subjectId: string;
    chapterId: string;
    topicId: string;
    percentage?: string;
  }>();
  const router = useRouter();

  const [sessionType, setSessionType] = useState<SessionType>("quiz");
  const [mode, setMode] = useState<"paper" | "recitation">("paper");
  const [hardMode, setHardMode] = useState(false);
  const [order, setOrder] = useState<"random" | "sequential">("random");
  const [percentage, setPercentage] = useState(() => {
    const value = Number(params.percentage ?? "100");
    return Number.isFinite(value) && value >= 10 && value <= 100 ? value : 100;
  });

  const subject = useMemo(() => loadSubjectDataById(params.subjectId ?? ""), [params.subjectId]);
  const questions = useMemo(
    () => getScopedQuestions(subject, params.chapterId, params.topicId),
    [subject, params.chapterId, params.topicId]
  );

  const selectedQuestionCount = getSelectedQuestionCount(questions.length, percentage);
  const percentageOptions = Array.from({ length: 10 }, (_, indexValue) => (indexValue + 1) * 10);
  const labels = {
    question: "سؤال",
    sessionType: "نوع الجلسة",
    quiz: "كوز",
    flashcards: "فلاش كارد",
    percentage: "نسبة الأسئلة",
    order: "ترتيب الأسئلة",
    hardModeTitle: "Hard Mode",
    hardModeDesc: "دقيقة لكل سؤال - انتهاء الوقت يعني نهاية الكوز",
    hardModeTime: "الوقت الكلي",
    startQuiz: "ابدأ الكوز",
    startFlashcards: "ابدأ المراجعة",
    random: "عشوائي",
    sequential: "تسلسلي",
  };

  const scopeLabel = params.topicId
    ? "كوز موضوع"
    : params.chapterId
      ? "كوز فصل"
      : "كوز المادة الكامل";

  const scopeIcon = params.topicId
    ? "document-text-outline"
    : params.chapterId
      ? "library-outline"
      : "school-outline";

  const startSession = () => {
    const searchParams = new URLSearchParams({
      scope: params.scope ?? "",
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      percentage: percentage.toString(),
      order,
    });

    if (sessionType === "quiz") {
      searchParams.set("mode", mode);
      searchParams.set("hardMode", hardMode ? "1" : "0");
      router.push(`/quiz/play?${searchParams.toString()}` as any);
      return;
    }

    router.push(`/quiz/flashcards?${searchParams.toString()}` as any);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content}>
      <View style={[s.headerBox, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <View style={[s.headerIcon, { backgroundColor: theme.primary + "22" }]}>
          <Ionicons name={scopeIcon as any} size={28} color={theme.primary} />
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 6 }}>{scopeLabel}</Text>
        <Text style={{ color: theme.primary, fontSize: 48, fontWeight: "bold", lineHeight: 54 }}>
          {selectedQuestionCount}
        </Text>
        <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 14 }}>{labels.question}</Text>

        <View style={s.headerStats}>
          <View style={s.headerStat}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              ~{Math.ceil(selectedQuestionCount * 1.5)} دقيقة
            </Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.secondary + "44" }]} />
          <View style={s.headerStat}>
            <Ionicons name="albums-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
              {sessionType === "quiz" ? "Quiz" : "Flashcards"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>{labels.sessionType}</Text>
      <View style={s.row}>
        {([
          { value: "quiz", label: labels.quiz },
          { value: "flashcards", label: labels.flashcards },
        ] as const).map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              s.selectionBtn,
              {
                backgroundColor: theme.card,
                borderColor: sessionType === item.value ? theme.primary : theme.secondary + "44",
              },
              sessionType === item.value && { backgroundColor: theme.primary + "15" },
            ]}
            onPress={() => setSessionType(item.value)}
          >
            <Text
              style={{
                color: sessionType === item.value ? theme.primary : theme.textSecondary,
                fontWeight: "bold",
                fontSize: 14,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sessionType === "quiz" && (
        <>
          <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>نوع الكوز</Text>
          <View style={s.row}>
            {(["paper", "recitation"] as const).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  s.modeBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: mode === item ? theme.primary : theme.secondary + "44",
                  },
                  mode === item && { backgroundColor: theme.primary + "15" },
                ]}
                onPress={() => setMode(item)}
              >
                {mode === item && <View style={[s.activeIndicator, { backgroundColor: theme.primary }]} />}
                <Text style={{ fontSize: 26, marginBottom: 6 }}>{item === "paper" ? "📄" : "⚡"}</Text>
                <Text
                  style={{
                    color: mode === item ? theme.primary : theme.textSecondary,
                    fontWeight: "bold",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  {item === "paper" ? "Paper" : "Recitation"}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
                  {item === "paper" ? "تجاوب الكل\nثم تشوف النتيجة" : "كشف فوري\nبعد كل سؤال"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>{labels.percentage}</Text>
      <View style={s.percentageGrid}>
        {percentageOptions.map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              s.percentageBtn,
              {
                backgroundColor: theme.card,
                borderColor: percentage === value ? theme.primary : theme.secondary + "44",
              },
              percentage === value && { backgroundColor: theme.primary + "15" },
            ]}
            onPress={() => setPercentage(value)}
          >
            <Text
              style={{
                color: percentage === value ? theme.primary : theme.textSecondary,
                fontSize: 12,
                fontWeight: percentage === value ? "bold" : "normal",
              }}
            >
              {value}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>{labels.order}</Text>
      <View style={s.row}>
        {([
          { value: "random", label: labels.random, icon: "shuffle-outline" },
          { value: "sequential", label: labels.sequential, icon: "list-outline" },
        ] as const).map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              s.orderBtn,
              {
                backgroundColor: theme.card,
                borderColor: order === item.value ? theme.primary : theme.secondary + "44",
              },
              order === item.value && { backgroundColor: theme.primary + "15" },
            ]}
            onPress={() => setOrder(item.value)}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={order === item.value ? theme.primary : theme.textSecondary}
            />
            <Text
              style={{
                color: order === item.value ? theme.primary : theme.textSecondary,
                fontSize: 12,
                fontWeight: order === item.value ? "bold" : "normal",
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sessionType === "quiz" && (
        <View
          style={[
            s.hardModeRow,
            {
              backgroundColor: hardMode ? theme.wrong + "11" : theme.card,
              borderColor: hardMode ? theme.wrong : theme.secondary + "44",
            },
          ]}
        >
          <View style={s.hardModeInfo}>
            <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 15 }}>
              ⏱️ {labels.hardModeTitle}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
              {labels.hardModeDesc}
            </Text>
            {hardMode && (
              <Text style={{ color: theme.wrong, fontSize: 11, marginTop: 4 }}>
                ⚠️ {labels.hardModeTime}: {selectedQuestionCount} دقيقة
              </Text>
            )}
          </View>

          <Switch
            value={hardMode}
            onValueChange={setHardMode}
            trackColor={{ true: theme.primary, false: theme.secondary + "44" }}
            thumbColor={hardMode ? "#fff" : theme.textSecondary}
          />
        </View>
      )}

      <TouchableOpacity
        style={[s.startBtn, { backgroundColor: theme.primary }]}
        onPress={startSession}
        activeOpacity={0.85}
      >
        <Ionicons
          name={sessionType === "quiz" ? "rocket-outline" : "albums-outline"}
          size={22}
          color="#fff"
        />
        <Text style={s.startBtnText}>
          {sessionType === "quiz" ? labels.startQuiz : labels.startFlashcards}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 50 },
  headerBox: { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, alignItems: "center" },
  headerIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  headerStats: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 14 },
  sectionTitle: { fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" },
  row: { flexDirection: "row", gap: 10 },
  selectionBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
  modeBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, overflow: "hidden" },
  activeIndicator: { position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  percentageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  percentageBtn: { width: "18%", minWidth: 60, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  orderBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, flexDirection: "row", justifyContent: "center", gap: 8 },
  hardModeRow: { borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hardModeInfo: { flex: 1, alignItems: "flex-end" },
  startBtn: { borderRadius: 14, padding: 18, alignItems: "center", marginTop: 28, flexDirection: "row", justifyContent: "center", gap: 10 },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
