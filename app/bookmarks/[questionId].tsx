import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "../../utils/ThemeContext";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";

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

function getQuestionText(question: any) { return question.text ?? question.text_en ?? ""; }
function getQuestionOptions(question: any): string[] { return question.options ?? question.options_en ?? []; }
function getQuestionExplanation(question: any) { return question.explanation ?? question.explanation_en ?? ""; }

function findQuestionDetails(subjectId: string, questionId: string) {
  const subject = SUBJECTS[subjectId];
  if (!subject) return null;
  for (const chapter of subject.chapters)
    for (const topic of chapter.topics)
      for (const question of topic.questions)
        if (question.id === questionId)
          return { subject, chapter, topic, question };
  return null;
}

export default function BookmarkDetailsScreen() {
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ questionId: string; subjectId: string }>();
  const details = findQuestionDetails(params.subjectId ?? "", params.questionId ?? "");

  if (!details) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.wrong, fontSize: 16, textAlign: "center" }}>
          تعذر العثور على السؤال المحفوظ
        </Text>
      </View>
    );
  }

  const { subject, chapter, topic, question } = details;
  const options = getQuestionOptions(question);
  const correctAnswer = options[question.answer] ?? "";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={s.content}>

      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.metaLabel, { color: theme.textSecondary }]}>المادة</Text>
        <Text style={[s.metaValue, { color: theme.textPrimary }]}>{subject.title}</Text>
        <Text style={[s.metaLabel, { color: theme.textSecondary }]}>الفصل</Text>
        <Text style={[s.metaValue, { color: theme.textPrimary }]}>{chapter.title}</Text>
        <Text style={[s.metaLabel, { color: theme.textSecondary }]}>الموضوع</Text>
        <Text style={[s.metaValue, { color: theme.textPrimary }]}>{topic.title}</Text>
      </View>

      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.sectionTitle, { color: theme.primary }]}>نص السؤال</Text>
        <Text style={{ color: theme.textPrimary, fontSize: 16, lineHeight: 26, textAlign: "right" }}>
          {getQuestionText(question)}
        </Text>
      </View>

      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.sectionTitle, { color: theme.primary }]}>الخيارات</Text>
        {options.map((option: string, i: number) => (
          <View
            key={i}
            style={[
              s.option,
              { backgroundColor: theme.background },
              i === question.answer && { backgroundColor: theme.correct + "22", borderWidth: 1, borderColor: theme.correct },
            ]}
          >
            <Text style={{ color: theme.textSecondary, fontWeight: "bold", width: 20, textAlign: "center" }}>
              {["أ", "ب", "ج", "د"][i] ?? "-"}
            </Text>
            <Text style={{ color: i === question.answer ? theme.correct : theme.textPrimary, fontSize: 14, flex: 1, textAlign: "right", fontWeight: i === question.answer ? "bold" : "normal" }}>
              {option}
            </Text>
          </View>
        ))}
      </View>

      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.sectionTitle, { color: theme.primary }]}>الإجابة الصحيحة</Text>
        <Text style={{ color: theme.correct, fontSize: 15, fontWeight: "bold", textAlign: "right" }}>
          {correctAnswer}
        </Text>
      </View>

      <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.sectionTitle, { color: theme.primary }]}>الشرح</Text>
        <Text style={{ color: theme.textPrimary, fontSize: 14, lineHeight: 24, textAlign: "right" }}>
          {getQuestionExplanation(question) || "لا يوجد شرح."}
        </Text>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  content:      { padding: 16, paddingBottom: 40, gap: 12 },
  center:       { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  card:         { borderRadius: 12, padding: 16, borderWidth: 1 },
  metaLabel:    { fontSize: 12, textAlign: "right", marginBottom: 4 },
  metaValue:    { fontSize: 15, fontWeight: "600", textAlign: "right", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  option:       { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
});