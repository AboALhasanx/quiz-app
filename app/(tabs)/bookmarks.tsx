import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Colors } from "../../constants/colors";
import { removeBookmark, clearBookmarks, Bookmark } from "../../utils/storage";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { fetchBookmarksFromFirestore, deleteBookmarkFromFirestore } from "../../utils/firebase";

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

export default function BookmarksScreen() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await fetchBookmarksFromFirestore();
    setBookmarks(data);
  };

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemove = async (questionId: string) => {
    await removeBookmark(questionId);
    setBookmarks((prev) => prev.filter((bookmark) => bookmark.questionId !== questionId));
  };

  const handleClearAll = async () => {
    await clearBookmarks();
    for (const bookmark of bookmarks) {
      await deleteBookmarkFromFirestore(bookmark.questionId);
    }
    setBookmarks([]);
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.header}>
        <Text style={s.title}>المحفوظات</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={s.clearBtn}>مسح الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>🔖</Text>
          <Text style={s.emptyText}>لا يوجد أسئلة محفوظة</Text>
          <Text style={s.emptySubText}>احفظ أي سؤال أثناء الكوز حتى يظهر هنا</Text>
        </View>
      ) : (
        <>
          <Text style={s.count}>{bookmarks.length} سؤال محفوظ</Text>
          {bookmarks.map((bookmark, indexValue) => {
            const details = findQuestionDetails(bookmark.subjectId, bookmark.questionId);
            if (!details) return null;

            const { subject, question } = details;

            return (
              <View key={bookmark.questionId} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardNum}>س {indexValue + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemove(bookmark.questionId)}>
                    <Text style={s.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(`/bookmarks/${bookmark.questionId}?subjectId=${bookmark.subjectId}` as any)
                  }
                >
                  <Text style={s.subjectName}>{subject.title}</Text>
                  <Text style={s.questionText}>{getQuestionText(question)}</Text>

                  <View style={s.divider} />

                  {getQuestionOptions(question).map((option: string, optionIndex: number) => (
                    <View
                      key={optionIndex}
                      style={[s.option, optionIndex === question.answer && s.correctOption]}
                    >
                      <Text style={s.optionLetter}>{["أ", "ب", "ج", "د"][optionIndex] ?? "-"}</Text>
                      <Text style={[s.optionText, optionIndex === question.answer && s.correctText]}>
                        {option}
                      </Text>
                      {optionIndex === question.answer && <Text style={s.correctBadge}>✓</Text>}
                    </View>
                  ))}
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: "bold" },
  clearBtn: { color: Colors.wrong, fontSize: 13 },
  count: { color: Colors.textMuted, fontSize: 13, textAlign: "right", marginBottom: 12 },
  emptyBox: { alignItems: "center", marginTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardNum: { color: Colors.textMuted, fontSize: 12 },
  removeBtn: { color: Colors.wrong, fontSize: 16, fontWeight: "bold", padding: 4 },
  subjectName: { color: Colors.primary, fontSize: 12, textAlign: "right", marginBottom: 6 },
  questionText: {
    color: Colors.text,
    fontSize: 15,
    textAlign: "right",
    lineHeight: 22,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: Colors.surface,
  },
  correctOption: {
    backgroundColor: Colors.correct + "22",
    borderWidth: 1,
    borderColor: Colors.correct,
  },
  optionLetter: {
    color: Colors.textMuted,
    fontWeight: "bold",
    width: 20,
    textAlign: "center",
  },
  optionText: { color: Colors.text, fontSize: 13, flex: 1, textAlign: "right" },
  correctText: { color: Colors.correct, fontWeight: "bold" },
  correctBadge: { fontSize: 14, color: Colors.correct },
});
