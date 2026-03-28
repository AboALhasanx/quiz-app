import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { removeBookmark, clearBookmarks, Bookmark } from "../../utils/storage";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { fetchBookmarksFromFirestore, deleteBookmarkFromFirestore } from "../../utils/firebase";
import { useTheme } from "../../utils/ThemeContext";

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
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await fetchBookmarksFromFirestore();
    setBookmarks(data);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

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
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.header}>
        <Text style={[s.title, { color: theme.textPrimary }]}>المحفوظات</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={{ color: theme.wrong, fontSize: 13 }}>مسح الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={{ fontSize: 48 }}>🔖</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "bold" }}>لا يوجد أسئلة محفوظة</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            احفظ أي سؤال أثناء الكوز حتى يظهر هنا
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "right", marginBottom: 12 }}>
            {bookmarks.length} سؤال محفوظ
          </Text>

          {bookmarks.map((bookmark, indexValue) => {
            const details = findQuestionDetails(bookmark.subjectId, bookmark.questionId);
            if (!details) return null;
            const { subject, question } = details;

            return (
              <View key={bookmark.questionId} style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
                <View style={s.cardHeader}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>س {indexValue + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemove(bookmark.questionId)}>
                    <Text style={{ color: theme.wrong, fontSize: 16, fontWeight: "bold", padding: 4 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push(`/bookmarks/${bookmark.questionId}?subjectId=${bookmark.subjectId}` as any)}
                >
                  <Text style={{ color: theme.primary, fontSize: 12, textAlign: "right", marginBottom: 6 }}>
                    {subject.title}
                  </Text>
                  <Text style={{ color: theme.textPrimary, fontSize: 15, textAlign: "right", lineHeight: 22, marginBottom: 12 }}>
                    {getQuestionText(question)}
                  </Text>

                  <View style={{ height: 1, backgroundColor: theme.secondary + "44", marginBottom: 10 }} />

                  {getQuestionOptions(question).map((option: string, optionIndex: number) => (
                    <View
                      key={optionIndex}
                      style={[
                        s.option,
                        { backgroundColor: theme.background },
                        optionIndex === question.answer && { backgroundColor: theme.correct + "22", borderWidth: 1, borderColor: theme.correct },
                      ]}
                    >
                      <Text style={{ color: theme.textSecondary, fontWeight: "bold", width: 20, textAlign: "center" }}>
                        {["أ", "ب", "ج", "د"][optionIndex] ?? "-"}
                      </Text>
                      <Text style={{ color: optionIndex === question.answer ? theme.correct : theme.textPrimary, fontSize: 13, flex: 1, textAlign: "right", fontWeight: optionIndex === question.answer ? "bold" : "normal" }}>
                        {option}
                      </Text>
                      {optionIndex === question.answer && (
                        <Text style={{ fontSize: 14, color: theme.correct }}>✓</Text>
                      )}
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
  content:   { padding: 16, paddingBottom: 60 },
  header:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: "bold" },
  emptyBox:  { alignItems: "center", marginTop: 80, gap: 10 },
  card:      { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  option:    { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, marginBottom: 6 },
});