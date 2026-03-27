import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import { getBookmarks, removeBookmark, clearBookmarks, Bookmark } from "../../utils/storage";
import index from "../../data/subjects/index.json";
import aiData from "../../data/subjects/ai_data.json";
import cnData from "../../data/subjects/cn_data.json";
import dsData from "../../data/subjects/ds_data.json";
import oopData from "../../data/subjects/oop_data.json";
import osData from "../../data/subjects/os_data.json";
import seData from "../../data/subjects/se_data.json";
import { 
  fetchBookmarksFromFirestore, 
  deleteBookmarkFromFirestore 
} from "../../utils/firebase";


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

function findQuestion(subjectId: string, questionId: string) {
  const subject = SUBJECTS[subjectId];
  if (!subject) return null;
  for (const ch of subject.chapters)
    for (const t of ch.topics)
      for (const q of t.questions)
        if (q.id === questionId) return q;
  return null;
}

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks]   = useState<Bookmark[]>([]);
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
  await deleteBookmarkFromFirestore(questionId);
  setBookmarks(prev => prev.filter(b => b.questionId !== questionId));
};

const handleClearAll = async () => {
  await clearBookmarks();
  for (const b of bookmarks) {
    await deleteBookmarkFromFirestore(b.questionId);
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
        <Text style={s.title}>🔖 المحفوظات</Text>
        {bookmarks.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={s.clearBtn}>🗑️ مسح الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      {bookmarks.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>🔖</Text>
          <Text style={s.emptyText}>لا يوجد أسئلة محفوظة</Text>
          <Text style={s.emptySubText}>اضغط على 🔖 في أي سؤال أثناء الكوز لحفظه هنا</Text>
        </View>
      ) : (
        <>
          <Text style={s.count}>{bookmarks.length} سؤال محفوظ</Text>
          {bookmarks.map((b, i) => {
            const q = findQuestion(b.subjectId, b.questionId);
            if (!q) return null;
            return (
              <View key={b.questionId} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardNum}>س {i + 1}</Text>
                  <TouchableOpacity onPress={() => handleRemove(b.questionId)}>
                    <Text style={s.removeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.questionText}>{getQuestionText(q)}</Text>

                <View style={s.divider} />

                {getQuestionOptions(q).map((opt: string, idx: number) => (
                  <View
                    key={idx}
                    style={[s.option, idx === q.answer && s.correctOption]}
                  >
                    <Text style={s.optionLetter}>{["أ", "ب", "ج", "د"][idx]}</Text>
                    <Text style={[s.optionText, idx === q.answer && s.correctText]}>
                      {opt}
                    </Text>
                    {idx === q.answer && (
                      <Text style={s.correctBadge}>✅</Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  content:       { padding: 16, paddingBottom: 60 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title:         { color: Colors.text, fontSize: 22, fontWeight: "bold" },
  clearBtn:      { color: Colors.wrong, fontSize: 13 },
  count:         { color: Colors.textMuted, fontSize: 13, textAlign: "right", marginBottom: 12 },
  emptyBox:      { alignItems: "center", marginTop: 80, gap: 10 },
  emptyEmoji:    { fontSize: 48 },
  emptyText:     { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  emptySubText:  { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  card:          { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardNum:       { color: Colors.textMuted, fontSize: 12 },
  removeBtn:     { color: Colors.wrong, fontSize: 16, fontWeight: "bold", padding: 4 },
  questionText:  { color: Colors.text, fontSize: 15, textAlign: "right", lineHeight: 22, marginBottom: 12 },
  divider:       { height: 1, backgroundColor: Colors.border, marginBottom: 10 },
  option:        { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: Colors.surface },
  correctOption: { backgroundColor: Colors.correct + "22", borderWidth: 1, borderColor: Colors.correct },
  optionLetter:  { color: Colors.textMuted, fontWeight: "bold", width: 20, textAlign: "center" },
  optionText:    { color: Colors.text, fontSize: 13, flex: 1, textAlign: "right" },
  correctText:   { color: Colors.correct, fontWeight: "bold" },
  correctBadge:  { fontSize: 14 },
});
