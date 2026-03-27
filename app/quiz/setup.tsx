import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Colors } from "../../constants/colors";
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

export default function QuizSetupScreen() {
  const params = useLocalSearchParams<{
    scope: string; subjectId: string;
    chapterId: string; topicId: string;
  }>();
  const router = useRouter();

  const [mode, setMode] = useState<"paper" | "recitation">("paper");
  const [hardMode, setHardMode] = useState(false);
  const [order, setOrder] = useState<"random" | "sequential">("random");

  const subject = SUBJECTS[params.subjectId];
  let questions: any[] = [];
  if (subject) {
    const chapters = params.chapterId
      ? subject.chapters.filter((c: any) => c.id === params.chapterId)
      : subject.chapters;
    chapters.forEach((ch: any) => {
      const topics = params.topicId
        ? ch.topics.filter((t: any) => t.id === params.topicId)
        : ch.topics;
      topics.forEach((t: any) => questions.push(...t.questions));
    });
  }

  const scopeLabel =
    params.topicId ? "كوز موضوع" :
    params.chapterId ? "كوز فصل" : "كوز شامل";

  const scopeIcon =
    params.topicId ? "document-text-outline" :
    params.chapterId ? "library-outline" : "school-outline";

  const startQuiz = () => {
    const p = new URLSearchParams({
      scope: params.scope ?? "",
      subjectId: params.subjectId ?? "",
      chapterId: params.chapterId ?? "",
      topicId: params.topicId ?? "",
      mode,
      order,
      hardMode: hardMode ? "1" : "0",
    });
    router.push(`/quiz/play?${p.toString()}` as any);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerBox}>
        <View style={s.headerIcon}>
          <Ionicons name={scopeIcon as any} size={28} color={Colors.primary} />
        </View>
        <Text style={s.scopeLabel}>{scopeLabel}</Text>
        <Text style={s.questionCount}>{questions.length}</Text>
        <Text style={s.questionLabel}>سؤال</Text>

        <View style={s.headerStats}>
          <View style={s.headerStat}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={s.headerStatText}>~{Math.ceil(questions.length * 1.5)} دقيقة</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.headerStat}>
            <Ionicons name="trophy-outline" size={14} color={Colors.textMuted} />
            <Text style={s.headerStatText}>70% للنجاح</Text>
          </View>
        </View>
      </View>

      <Text style={s.sectionTitle}>نوع الكوز</Text>
      <View style={s.row}>
        <TouchableOpacity
          style={[s.modeBtn, mode === "paper" && s.modeBtnActive]}
          onPress={() => setMode("paper")}
        >
          {mode === "paper" && <View style={s.activeIndicator} />}
          <Text style={s.modeIcon}>📄</Text>
          <Text style={[s.modeBtnText, mode === "paper" && s.modeBtnTextActive]}>Paper</Text>
          <Text style={s.modeDesc}>تجاوب الكل{"\n"}ثم شوف النتيجة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, mode === "recitation" && s.modeBtnActive]}
          onPress={() => setMode("recitation")}
        >
          {mode === "recitation" && <View style={s.activeIndicator} />}
          <Text style={s.modeIcon}>⚡</Text>
          <Text style={[s.modeBtnText, mode === "recitation" && s.modeBtnTextActive]}>Recitation</Text>
          <Text style={s.modeDesc}>كشف فوري{"\n"}بعد كل سؤال</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>ترتيب الأسئلة</Text>
      <View style={s.row}>
        {([
          { value: "random", label: "عشوائي", icon: "shuffle-outline" },
          { value: "sequential", label: "تسلسلي", icon: "list-outline" },
        ] as const).map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[s.orderBtn, order === o.value && s.optionBtnActive]}
            onPress={() => setOrder(o.value)}
          >
            <Ionicons
              name={o.icon}
              size={20}
              color={order === o.value ? Colors.primary : Colors.textMuted}
            />
            <Text style={[s.optionBtnText, order === o.value && s.optionBtnTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.hardModeRow, hardMode && s.hardModeActive]}>
        <View style={s.hardModeInfo}>
          <Text style={s.hardModeTitle}>⏱️ Hard Mode</Text>
          <Text style={s.hardModeDesc}>دقيقة لكل سؤال — الوقت ينتهي = خطأ</Text>
          {hardMode && (
            <Text style={s.hardModeWarning}>
              ⚠️ الوقت الكلي: {questions.length} دقيقة
            </Text>
          )}
        </View>
        <Switch
          value={hardMode}
          onValueChange={setHardMode}
          trackColor={{ true: Colors.primary, false: Colors.border }}
          thumbColor={hardMode ? "#fff" : Colors.textMuted}
        />
      </View>

      <TouchableOpacity style={s.startBtn} onPress={startQuiz} activeOpacity={0.85}>
        <Ionicons name="rocket-outline" size={22} color="#fff" />
        <Text style={s.startBtnText}>ابدأ الكوز</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 50 },
  headerBox: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary + "22", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  scopeLabel: { color: Colors.textMuted, fontSize: 13, marginBottom: 6 },
  questionCount: { color: Colors.primary, fontSize: 48, fontWeight: "bold", lineHeight: 54 },
  questionLabel: { color: Colors.textMuted, fontSize: 14, marginBottom: 14 },
  headerStats: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerStatText: { color: Colors.textMuted, fontSize: 12 },
  statDivider: { width: 1, height: 14, backgroundColor: Colors.border },
  sectionTitle: { color: Colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" },
  row: { flexDirection: "row", gap: 10 },
  modeBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  modeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  activeIndicator: { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  modeIcon: { fontSize: 26, marginBottom: 6 },
  modeBtnText: { color: Colors.textMuted, fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  modeBtnTextActive: { color: Colors.primary },
  modeDesc: { color: Colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  optionBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  optionBtnText: { color: Colors.textMuted, fontSize: 12 },
  optionBtnTextActive: { color: Colors.primary, fontWeight: "bold" },
  orderBtn: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "center", gap: 8 },
  hardModeRow: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hardModeActive: { borderColor: Colors.wrong, backgroundColor: Colors.wrong + "11" },
  hardModeInfo: { flex: 1, alignItems: "flex-end" },
  hardModeTitle: { color: Colors.text, fontWeight: "bold", fontSize: 15 },
  hardModeDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  hardModeWarning: { color: Colors.wrong, fontSize: 11, marginTop: 4 },
  startBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: "center", marginTop: 28, flexDirection: "row", justifyContent: "center", gap: 10 },
  startBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
