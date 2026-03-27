import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/colors";
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

function getQuestionText(question: any) {
  return question.text ?? question.text_en ?? "";
}

function getQuestionOptions(question: any): string[] {
  return question.options ?? question.options_en ?? [];
}

function getQuestionExplanation(question: any) {
  return question.explanation ?? question.explanation_en ?? "";
}

function findQuestionDetails(subjectId: string, questionId: string) {
  const subject = SUBJECTS[subjectId];
  if (!subject) return null;

  for (const chapter of subject.chapters) {
    for (const topic of chapter.topics) {
      for (const question of topic.questions) {
        if (question.id === questionId) {
          return { subject, chapter, topic, question };
        }
      }
    }
  }

  return null;
}

export default function BookmarkDetailsScreen() {
  const params = useLocalSearchParams<{ questionId: string; subjectId: string }>();
  const details = findQuestionDetails(params.subjectId ?? "", params.questionId ?? "");

  if (!details) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>تعذر العثور على السؤال المحفوظ</Text>
      </View>
    );
  }

  const { subject, chapter, topic, question } = details;
  const options = getQuestionOptions(question);
  const correctAnswer = options[question.answer] ?? "";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.metaCard}>
        <Text style={s.metaLabel}>المادة</Text>
        <Text style={s.metaValue}>{subject.title}</Text>

        <Text style={s.metaLabel}>الفصل</Text>
        <Text style={s.metaValue}>{chapter.title}</Text>

        <Text style={s.metaLabel}>الموضوع</Text>
        <Text style={s.metaValue}>{topic.title}</Text>
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>نص السؤال</Text>
        <Text style={s.questionText}>{getQuestionText(question)}</Text>
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>الخيارات</Text>
        {options.map((option: string, indexValue: number) => (
          <View
            key={indexValue}
            style={[s.option, indexValue === question.answer && s.correctOption]}
          >
            <Text style={s.optionLetter}>{["أ", "ب", "ج", "د"][indexValue] ?? "-"}</Text>
            <Text style={[s.optionText, indexValue === question.answer && s.correctText]}>
              {option}
            </Text>
          </View>
        ))}
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>الإجابة الصحيحة</Text>
        <Text style={s.answerText}>{correctAnswer}</Text>
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>الشرح</Text>
        <Text style={s.explanationText}>{getQuestionExplanation(question) || "لا يوجد شرح."}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { color: Colors.wrong, fontSize: 16, textAlign: "center" },
  metaCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaLabel: { color: Colors.textMuted, fontSize: 12, textAlign: "right", marginBottom: 4 },
  metaValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 10,
  },
  questionText: { color: Colors.text, fontSize: 16, lineHeight: 26, textAlign: "right" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  correctOption: {
    backgroundColor: Colors.correct + "22",
    borderWidth: 1,
    borderColor: Colors.correct,
  },
  optionLetter: { color: Colors.textMuted, fontWeight: "bold", width: 20, textAlign: "center" },
  optionText: { color: Colors.text, fontSize: 14, flex: 1, textAlign: "right" },
  correctText: { color: Colors.correct, fontWeight: "bold" },
  answerText: { color: Colors.correct, fontSize: 15, fontWeight: "bold", textAlign: "right" },
  explanationText: { color: Colors.text, fontSize: 14, lineHeight: 24, textAlign: "right" },
});
