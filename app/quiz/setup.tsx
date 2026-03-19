import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from "react-native";
import Slider from "@react-native-community/slider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Colors } from "../../constants/colors";
import ds501 from "../../data/subjects/ds501.json";
import { Ionicons } from "@expo/vector-icons";
import { fetchQuestionHistory } from "../../utils/firebase";

const SUBJECTS: Record<string, typeof ds501> = { ds501 };

export default function QuizSetupScreen() {
  const params = useLocalSearchParams<{
    scope: string; subjectId: string;
    chapterId: string; topicId: string;
  }>();
  const router = useRouter();

  const [mode,       setMode]       = useState<"paper" | "recitation">("paper");
  const [filter,     setFilter]     = useState<"all" | "wrong" | "unanswered">("all");
  const [hardMode,   setHardMode]   = useState(false);
  const [order,      setOrder]      = useState<"random" | "sequential">("random");
  const [percentage, setPercentage] = useState(100);
  const [history,    setHistory]    = useState<Record<string, "correct"|"wrong">>({});

  const subject = SUBJECTS[params.subjectId];
  let allQuestions: any[] = [];
  if (subject) {
    const chapters = params.chapterId
      ? subject.chapters.filter(c => c.id === params.chapterId)
      : subject.chapters;
    chapters.forEach(ch => {
      const topics = params.topicId
        ? ch.topics.filter(t => t.id === params.topicId)
        : ch.topics;
      topics.forEach(t => allQuestions.push(...t.questions));
    });
  }

  // جيب تاريخ الإجابات من Firestore
  useEffect(() => {
    fetchQuestionHistory(params.subjectId ?? "").then(setHistory);
  }, []);

  // فلتر الأسئلة حسب الاختيار
  const filteredQuestions = allQuestions.filter(q => {
    if (filter === "all")        return true;
    if (filter === "wrong")      return history[q.id] === "wrong";
    if (filter === "unanswered") return !history[q.id];
    return true;
  });

  // حساب عدد الأسئلة بالنسبة المؤوية
  const selectedCount = Math.max(1, Math.round(filteredQuestions.length * percentage / 100));
  const totalMinutes  = selectedCount;

  const scopeLabel =
    params.topicId   ? "كوز موضوع" :
    params.chapterId ? "كوز فصل"   : "كوز شامل";

  const scopeIcon =
    params.topicId   ? "document-text-outline" :
    params.chapterId ? "library-outline"        : "school-outline";

  const startQuiz = () => {
    const p = new URLSearchParams({
      scope:      params.scope     ?? "",
      subjectId:  params.subjectId ?? "",
      chapterId:  params.chapterId ?? "",
      topicId:    params.topicId   ?? "",
      mode, filter, order,
      hardMode:   hardMode ? "1" : "0",
      percentage: percentage.toString(),
    });
    router.push(`/quiz/play?${p.toString()}` as any);
  };

  const filterCount = (f: "all"|"wrong"|"unanswered") => {
    if (f === "all")        return allQuestions.length;
    if (f === "wrong")      return allQuestions.filter(q => history[q.id] === "wrong").length;
    if (f === "unanswered") return allQuestions.filter(q => !history[q.id]).length;
    return 0;
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Header */}
      <View style={s.headerBox}>
        <View style={s.headerIcon}>
          <Ionicons name={scopeIcon as any} size={28} color={Colors.primary} />
        </View>
        <Text style={s.scopeLabel}>{scopeLabel}</Text>
        <Text style={s.questionCount}>{selectedCount}</Text>
        <Text style={s.questionLabel}>
          سؤال {percentage < 100 ? `(${percentage}% من ${filteredQuestions.length})` : ""}
        </Text>
        <View style={s.headerStats}>
          <View style={s.headerStat}>
            <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
            <Text style={s.headerStatText}>~{Math.ceil(selectedCount * 1.5)} دقيقة</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.headerStat}>
            <Ionicons name="trophy-outline" size={14} color={Colors.textMuted} />
            <Text style={s.headerStatText}>70% للنجاح</Text>
          </View>
        </View>
      </View>

      {/* نوع الكوز */}
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

      {/* فلتر الأسئلة */}
      <Text style={s.sectionTitle}>فلتر الأسئلة</Text>
      <View style={s.filterRow}>
        {([
          { value: "all",        label: "الكل",      icon: "apps-outline"         },
          { value: "unanswered", label: "غير مجاوب", icon: "ellipse-outline"      },
          { value: "wrong",      label: "الخاطئة",   icon: "close-circle-outline" },
        ] as const).map(f => (
          <TouchableOpacity
            key={f.value}
            style={[s.filterBtn, filter === f.value && s.filterBtnActive]}
            onPress={() => { setFilter(f.value); setPercentage(100); }}
          >
            <Ionicons name={f.icon} size={18} color={filter === f.value ? Colors.primary : Colors.textMuted} />
            <Text style={[s.filterBtnText, filter === f.value && s.filterBtnTextActive]}>
              {f.label}
            </Text>
            <Text style={s.filterCount}>{filterCount(f.value)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* نسبة الأسئلة */}
      <Text style={s.sectionTitle}>نسبة الأسئلة — {percentage}%</Text>
      <View style={s.sliderBox}>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={10}
          maximumValue={100}
          step={5}
          value={percentage}
          onValueChange={v => setPercentage(Math.round(v))}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.primary}
        />
        <View style={s.sliderLabels}>
          <Text style={s.sliderLabel}>10%</Text>
          <Text style={[s.sliderLabel, { color: Colors.primary, fontWeight: "bold" }]}>
            {selectedCount} سؤال
          </Text>
          <Text style={s.sliderLabel}>100%</Text>
        </View>
      </View>

      {/* ترتيب الأسئلة */}
      <Text style={s.sectionTitle}>ترتيب الأسئلة</Text>
      <View style={s.row}>
        {([
          { value: "random",     label: "عشوائي", icon: "shuffle-outline" },
          { value: "sequential", label: "تسلسلي", icon: "list-outline"    },
        ] as const).map(o => (
          <TouchableOpacity
            key={o.value}
            style={[s.orderBtn, order === o.value && s.filterBtnActive]}
            onPress={() => setOrder(o.value)}
          >
            <Ionicons name={o.icon} size={20} color={order === o.value ? Colors.primary : Colors.textMuted} />
            <Text style={[s.filterBtnText, order === o.value && s.filterBtnTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hard Mode */}
      <View style={[s.hardModeRow, hardMode && s.hardModeActive]}>
        <View style={s.hardModeInfo}>
          <Text style={s.hardModeTitle}>⏱️ Hard Mode</Text>
          <Text style={s.hardModeDesc}>دقيقة لكل سؤال — الوقت ينتهي = خطأ</Text>
          {hardMode && (
            <Text style={s.hardModeWarning}>⚠️ الوقت الكلي: {totalMinutes} دقيقة</Text>
          )}
        </View>
        <Switch
          value={hardMode}
          onValueChange={setHardMode}
          trackColor={{ true: Colors.primary, false: Colors.border }}
          thumbColor={hardMode ? "#fff" : Colors.textMuted}
        />
      </View>

      {/* زر البدء */}
      <TouchableOpacity style={s.startBtn} onPress={startQuiz} activeOpacity={0.85}>
        <Ionicons name="rocket-outline" size={22} color="#fff" />
        <Text style={s.startBtnText}>ابدأ الكوز — {selectedCount} سؤال</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: Colors.background },
  content:             { padding: 16, paddingBottom: 50 },
  headerBox:           { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  headerIcon:          { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary + "22", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  scopeLabel:          { color: Colors.textMuted, fontSize: 13, marginBottom: 6 },
  questionCount:       { color: Colors.primary, fontSize: 48, fontWeight: "bold", lineHeight: 54 },
  questionLabel:       { color: Colors.textMuted, fontSize: 14, marginBottom: 14 },
  headerStats:         { flexDirection: "row", alignItems: "center", gap: 16 },
  headerStat:          { flexDirection: "row", alignItems: "center", gap: 4 },
  headerStatText:      { color: Colors.textMuted, fontSize: 12 },
  statDivider:         { width: 1, height: 14, backgroundColor: Colors.border },
  sectionTitle:        { color: Colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 16, textAlign: "right" },
  row:                 { flexDirection: "row", gap: 10 },
  modeBtn:             { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  modeBtnActive:       { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  activeIndicator:     { position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  modeIcon:            { fontSize: 26, marginBottom: 6 },
  modeBtnText:         { color: Colors.textMuted, fontWeight: "bold", fontSize: 14, marginBottom: 4 },
  modeBtnTextActive:   { color: Colors.primary },
  modeDesc:            { color: Colors.textMuted, fontSize: 11, textAlign: "center", lineHeight: 16 },
  filterRow:           { flexDirection: "row", gap: 8 },
  filterBtn:           { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border, gap: 4 },
  filterBtnActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
  filterBtnText:       { color: Colors.textMuted, fontSize: 12 },
  filterBtnTextActive: { color: Colors.primary, fontWeight: "bold" },
  filterCount:         { color: Colors.textMuted, fontSize: 11 },
  sliderBox:           { backgroundColor: Colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  sliderLabels:        { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  sliderLabel:         { color: Colors.textMuted, fontSize: 12 },
  orderBtn:            { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "center", gap: 8 },
  hardModeRow:         { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hardModeActive:      { borderColor: Colors.wrong, backgroundColor: Colors.wrong + "11" },
  hardModeInfo:        { flex: 1, alignItems: "flex-end" },
  hardModeTitle:       { color: Colors.text, fontWeight: "bold", fontSize: 15 },
  hardModeDesc:        { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  hardModeWarning:     { color: Colors.wrong, fontSize: 11, marginTop: 4 },
  startBtn:            { backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: "center", marginTop: 28, flexDirection: "row", justifyContent: "center", gap: 10 },
  startBtnText:        { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
