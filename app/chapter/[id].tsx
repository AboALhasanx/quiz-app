import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../constants/colors";
import ds501 from "../../data/subjects/ds501.json";

const SUBJECTS: Record<string, typeof ds501> = { ds501 };

export default function ChapterScreen() {
  // ✅ يقرأ subjectId من الـ query string
const { id, subjectId } = useLocalSearchParams<{ id: string; subjectId: string }>();

  const router = useRouter();

  const subject = SUBJECTS[subjectId];
  const chapter = subject?.chapters.find((c) => c.id === id);

  if (!chapter) {
    return (
      <View style={s.container}>
        <Text style={s.errorText}>الفصل غير موجود</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.header}>{chapter.title}</Text>
      <FlatList
        data={chapter.topics}
        keyExtractor={(t) => t.id}
        renderItem={({ item: topic }) => (
          <View style={s.topicCard}>
            <View style={s.topicInfo}>
              <Text style={s.topicTitle}>{topic.title}</Text>
              <Text style={s.topicMeta}>{topic.questions.length} سؤال</Text>
            </View>
            <TouchableOpacity
              style={s.startBtn}
              onPress={() =>
                router.push({
                  pathname: "../quiz/setup",
                  params: {
                    scope: "chapter",
                    subjectId,
                    chapterId: id,
                    topicId: topic.id,
                  },
                })
              }
            >
              <Text style={s.startBtnText}>ابدأ</Text>
            </TouchableOpacity>
          </View>
        )}
// ✅ صح - بدون topicId
ListFooterComponent={
  <TouchableOpacity
    style={s.fullChapterBtn}
    onPress={() =>
      router.push(`/quiz/setup?scope=chapter&subjectId=${subjectId}&chapterId=${id}` as any)
    }
  >
    <Text style={s.fullChapterBtnText}>🎯 كوز الفصل كامل</Text>
  </TouchableOpacity>
}

      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
    textAlign: "right",
  },
  topicCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicInfo: { flex: 1, alignItems: "flex-end" },
  topicTitle: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  topicMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 10,
  },
  startBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  fullChapterBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
  },
  fullChapterBtnText: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  errorText: { color: Colors.wrong, textAlign: "center", marginTop: 40 },
});
