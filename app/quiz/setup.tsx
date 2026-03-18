import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Colors } from "../../constants/colors";
import ds501 from "../../data/subjects/ds501.json";

const SUBJECTS: Record<string, typeof ds501> = { ds501 };

export default function QuizSetupScreen() {
  const params = useLocalSearchParams<{
    scope: string; subjectId: string;
    chapterId: string; topicId: string;
  }>();
  const router = useRouter();

  const [mode, setMode]         = useState<"paper" | "recitation">("paper");
  const [filter, setFilter]     = useState<"all" | "wrong" | "unanswered">("all");
  const [hardMode, setHardMode] = useState(false);
  const [order, setOrder]       = useState<"random" | "sequential">("random");

  // حساب عدد الأسئلة
  const subject = SUBJECTS[params.subjectId];
  let questions: any[] = [];
  if (subject) {
    const chapters = params.chapterId
      ? subject.chapters.filter(c => c.id === params.chapterId)
      : subject.chapters;
    chapters.forEach(ch => {
      const topics = params.topicId
        ? ch.topics.filter(t => t.id === params.topicId)
        : ch.topics;
      topics.forEach(t => questions.push(...t.questions));
    });
  }

  const scopeLabel =
    params.topicId  ? "كوز موضوع" :
    params.chapterId ? "كوز فصل"   : "كوز شامل";

  const startQuiz = () => {
    const p = new URLSearchParams({
      scope:      params.scope     ?? "",
      subjectId:  params.subjectId ?? "",
      chapterId:  params.chapterId ?? "",
      topicId:    params.topicId   ?? "",
      mode,
      filter,
      order,
      hardMode:   hardMode ? "1" : "0",
    });
    router.push(`/quiz/play?${p.toString()}` as any);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Header */}
      <View style={s.headerBox}>
        <Text style={s.scopeLabel}>{scopeLabel}</Text>
        <Text style={s.questionCount}>{questions.length} سؤال</Text>
      </View>

      {/* Mode */}
      <Text style={s.sectionTitle}>نوع الكوز</Text>
      <View style={s.row}>
        <TouchableOpacity
          style={[s.modeBtn, mode === "paper" && s.modeBtnActive]}
          onPress={() => setMode("paper")}
        >
          <Text style={s.modeIcon}>📄</Text>
          <Text style={[s.modeBtnText, mode === "paper" && s.modeBtnTextActive]}>Paper</Text>
          <Text style={s.modeDesc}>تجاوب الكل ثم شوف النتيجة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, mode === "recitation" && s.modeBtnActive]}
          onPress={() => setMode("recitation")}
        >
          <Text style={s.modeIcon}>⚡</Text>
          <Text style={[s.modeBtnText, mode === "recitation" && s.modeBtnTextActive]}>Recitation</Text>
          <Text style={s.modeDesc}>كشف فوري بعد كل سؤال</Text>
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <Text style={s.sectionTitle}>فلتر الأسئلة</Text>
      <View style={s.row}>
        {(["all", "unanswered", "wrong"] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterBtnText, filter === f && s.filterBtnTextActive]}>
              {f === "all" ? "🔵 الكل" : f === "unanswered" ? "⚪ غير مجاوب" : "🔴 الخاطئة"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order — recitation فقط */}
      {mode === "recitation" && (
        <>
          <Text style={s.sectionTitle}>ترتيب الأسئلة</Text>
          <View style={s.row}>
            {(["random", "sequential"] as const).map(o => (
              <TouchableOpacity
                key={o}
                style={[s.filterBtn, order === o && s.filterBtnActive]}
                onPress={() => setOrder(o)}
              >
                <Text style={[s.filterBtnText, order === o && s.filterBtnTextActive]}>
                  {o === "random" ? "🔀 عشوائي" : "🔢 تسلسلي"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Hard Mode */}
      <View style={s.hardModeRow}>
        <View>
          <Text style={s.hardModeTitle}>⏱️ Hard Mode</Text>
          <Text style={s.hardModeDesc}>دقيقة لكل سؤال — الوقت ينتهي = خطأ</Text>
        </View>
        <Switch
          value={hardMode}
          onValueChange={setHardMode}
          trackColor={{ true: Colors.primary, false: Colors.border }}
          thumbColor={hardMode ? "#fff" : Colors.textMuted}
        />
      </View>

      {/* Start Button */}
      <TouchableOpacity style={s.startBtn} onPress={startQuiz}>
        <Text style={s.startBtnText}>🚀 ابدأ الكوز</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  content:            { padding: 16, paddingBottom: 40 },
  headerBox:          { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  scopeLabel:         { color: Colors.textMuted, fontSize: 13, marginBottom: 4 },
  questionCount:      { color: Colors.primary, fontSize: 32, fontWeight: "bold" },
  sectionTitle:       { color: Colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" },
  row:                { flexDirection: "row", gap: 10 },
  modeBtn:            { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  modeBtnActive:      { borderColor: Colors.primary, backgroundColor: Colors.primary + "22" },
  modeIcon:           { fontSize: 24, marginBottom: 4 },
  modeBtnText:        { color: Colors.textMuted, fontWeight: "bold", fontSize: 14 },
  modeBtnTextActive:  { color: Colors.primary },
  modeDesc:           { color: Colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 4 },
  filterBtn:          { flex: 1, backgroundColor: Colors.card, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  filterBtnActive:    { borderColor: Colors.primary, backgroundColor: Colors.primary + "22" },
  filterBtnText:      { color: Colors.textMuted, fontSize: 12 },
  filterBtnTextActive:{ color: Colors.primary, fontWeight: "bold" },
  hardModeRow:        { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hardModeTitle:      { color: Colors.text, fontWeight: "bold", fontSize: 15, textAlign: "right" },
  hardModeDesc:       { color: Colors.textMuted, fontSize: 12, marginTop: 2, textAlign: "right" },
  startBtn:           { backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: "center", marginTop: 30 },
  startBtnText:       { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
