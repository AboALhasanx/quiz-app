import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Colors } from "../../constants/colors";
import ds501 from "../../data/subjects/ds501.json";

const SUBJECTS: Record<string, typeof ds501> = {
  ds501: ds501,
};

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const subject = SUBJECTS[id];

  if (!subject) {
    return (
      <View style={s.container}>
        <Text style={s.errorText}>المادة غير موجودة</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.header}>{subject.title}</Text>
      <FlatList
        data={subject.chapters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const totalQ = item.topics.reduce(
            (sum, t) => sum + t.questions.length, 0
          );
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() =>
                router.push(`/chapter/${item.id}?subjectId=${id}` as any)
              }
            >
              <Text style={s.chapterTitle}>{item.title}</Text>
              <Text style={s.meta}>{totalQ} سؤال</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background, padding: 16 },
  header:       { fontSize: 20, fontWeight: "bold", color: Colors.text, marginBottom: 16, textAlign: "right" },
  card:         { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chapterTitle: { color: Colors.text, fontSize: 15, fontWeight: "600", flex: 1, textAlign: "right" },
  meta:         { color: Colors.primary, fontSize: 13, fontWeight: "bold", marginLeft: 8 },
  errorText:    { color: Colors.wrong, textAlign: "center", marginTop: 40 },
});
