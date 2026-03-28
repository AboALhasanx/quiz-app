import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useTheme } from "../../utils/ThemeContext";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
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

function getSelectedQuestionCount(total: number, percentage: number) {
  if (total <= 0) return 0;
  return Math.min(total, Math.max(1, Math.floor((total * percentage) / 100)));
}

export default function QuizSetupScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    scope: string; subjectId: string; chapterId: string; topicId: string; percentage?: string;
  }>();
  const router = useRouter();

  const [mode, setMode] = useState<"paper" | "recitation">("paper");
  const [hardMode, setHardMode] = useState(false);
  const [order, setOrder] = useState<"random" | "sequential">("random");
  const [percentage, setPercentage] = useState(() => {
    const value = Number(params.percentage ?? "100");
    return Number.isFinite(value) && value >= 10 && value <= 100 ? value : 100;
  });

  const subject = SUBJECTS[params.subjectId];
  let questions: any[] = [];

  if (subject) {
    const chapters = params.chapterId ? subject.chapters.filter((c: any) => c.id === params.chapterId) : subject.chapters;
    chapters.forEach((chapter: any) => {
      const topics = params.topicId ? chapter.topics.filter((t: any) => t.id === params.topicId) : chapter.topics;
      topics.forEach((topic: any) => questions.push(...topic.questions));
    });
  }

  const percentageOptions = Array.from({ length: 10 }, (_, i) => (i + 1) * 10);
  const selectedQuestionCount = getSelectedQuestionCount(questions.length, percentage);
  const scopeLabel = params.topicId ? "كوز موضوع" : params.chapterId ? "كوز فصل" : "كوز المادة الكامل";
  const scopeIcon = params.topicId ? "document-text-outline" : params.chapterId ? "library-outline" : "school-outline";

  const startQuiz = () => {
    const searchParams = new URLSearchParams({
      scope: params.scope ?? "",
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode, order,
      hardMode: hardMode ? "1" : "0",
      percentage: percentage.toString(),
    });
    router.push(`/quiz/play?${searchParams.toString()}` as any);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content}>

      {/* Header */}
      <View style={[s.headerBox, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <View style={[s.headerIcon, { backgroundColor: theme.primary + "22" }]}>
          <Ionicons name={scopeIcon as any} size={28} color={theme.primary} />
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 6 }}>{scopeLabel}</Text>
        <Text style={{ color: theme.primary, fontSize: 48, fontWeight: "bold", lineHeight: 54 }}>{selectedQuestionCount}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 14 }}>سؤال</Text>
        <View style={s.headerStats}>
          <View style={s.headerStat}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>~{Math.ceil(selectedQuestionCount * 1.5)} دقيقة</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.secondary + "44" }]} />
          <View style={s.headerStat}>
            <Ionicons name="trophy-outline" size={14} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>70% للنجاح</Text>
          </View>
        </View>
      </View>

      {/* نوع الكوز */}
      <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" }}>نوع الكوز</Text>
      <View style={s.row}>
        {(["paper", "recitation"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[s.modeBtn, { backgroundColor: theme.card, borderColor: mode === m ? theme.primary : theme.secondary + "44" }, mode === m && { backgroundColor: theme.primary + "15" }]}
            onPress={() => setMode(m)}
          >
            {mode === m && <View style={[s.activeIndicator, { backgroundColor: theme.primary }]} />}
            <Text style={{ fontSize: 26, marginBottom: 6 }}>{m === "paper" ? "📄" : "⚡"}</Text>
            <Text style={{ color: mode === m ? theme.primary : theme.textSecondary, fontWeight: "bold", fontSize: 14, marginBottom: 4 }}>
              {m === "paper" ? "Paper" : "Recitation"}
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
              {m === "paper" ? "تجاوب الكل\nثم تشوف النتيجة" : "كشف فوري\nبعد كل سؤال"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* نسبة الأسئلة */}
      <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" }}>نسبة الأسئلة</Text>
      <View style={s.percentageGrid}>
        {percentageOptions.map((value) => (
          <TouchableOpacity
            key={value}
            style={[s.percentageBtn, { backgroundColor: theme.card, borderColor: percentage === value ? theme.primary : theme.secondary + "44" }, percentage === value && { backgroundColor: theme.primary + "15" }]}
            onPress={() => setPercentage(value)}
          >
            <Text style={{ color: percentage === value ? theme.primary : theme.textSecondary, fontSize: 12, fontWeight: percentage === value ? "bold" : "normal" }}>
              {value}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ترتيب الأسئلة */}
      <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" }}>ترتيب الأسئلة</Text>
      <View style={s.row}>
        {([
          { value: "random", label: "عشوائي", icon: "shuffle-outline" },
          { value: "sequential", label: "تسلسلي", icon: "list-outline" },
        ] as const).map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[s.orderBtn, { backgroundColor: theme.card, borderColor: order === option.value ? theme.primary : theme.secondary + "44" }, order === option.value && { backgroundColor: theme.primary + "15" }]}
            onPress={() => setOrder(option.value)}
          >
            <Ionicons name={option.icon} size={20} color={order === option.value ? theme.primary : theme.textSecondary} />
            <Text style={{ color: order === option.value ? theme.primary : theme.textSecondary, fontSize: 12, fontWeight: order === option.value ? "bold" : "normal" }}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hard Mode */}
      <View style={[s.hardModeRow, { backgroundColor: hardMode ? theme.wrong + "11" : theme.card, borderColor: hardMode ? theme.wrong : theme.secondary + "44" }]}>
        <View style={s.hardModeInfo}>
          <Text style={{ color: theme.textPrimary, fontWeight: "bold", fontSize: 15 }}>⏱️ Hard Mode</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>دقيقة لكل سؤال - انتهاء الوقت يعني نهاية الكوز</Text>
          {hardMode && (
            <Text style={{ color: theme.wrong, fontSize: 11, marginTop: 4 }}>⚠️ الوقت الكلي: {selectedQuestionCount} دقيقة</Text>
          )}
        </View>
        <Switch
          value={hardMode}
          onValueChange={setHardMode}
          trackColor={{ true: theme.primary, false: theme.secondary + "44" }}
          thumbColor={hardMode ? "#fff" : theme.textSecondary}
        />
      </View>

      {/* Start Button */}
      <TouchableOpacity style={[s.startBtn, { backgroundColor: theme.primary }]} onPress={startQuiz} activeOpacity={0.85}>
        <Ionicons name="rocket-outline" size={22} color="#fff" />
        <Text style={s.startBtnText}>ابدأ الكوز</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  content:        { padding: 16, paddingBottom: 50 },
  headerBox:      { borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, alignItems: "center" },
  headerIcon:     { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  headerStats:    { flexDirection: "row", alignItems: "center", gap: 16 },
  headerStat:     { flexDirection: "row", alignItems: "center", gap: 4 },
  statDivider:    { width: 1, height: 14 },
  row:            { flexDirection: "row", gap: 10 },
  modeBtn:        { flex: 1, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, overflow: "hidden" },
  activeIndicator: { position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  percentageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  percentageBtn:  { width: "18%", minWidth: 60, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  orderBtn:       { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, flexDirection: "row", justifyContent: "center", gap: 8 },
  hardModeRow:    { borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hardModeInfo:   { flex: 1, alignItems: "flex-end" },
  startBtn:       { borderRadius: 14, padding: 18, alignItems: "center", marginTop: 28, flexDirection: "row", justifyContent: "center", gap: 10 },
  startBtnText:   { color: "#fff", fontSize: 18, fontWeight: "bold" },
});