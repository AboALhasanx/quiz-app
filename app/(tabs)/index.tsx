import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/colors";
import index from "../../data/subjects/index.json";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.header}>📚 موادي</Text>
      <FlatList
        data={index.subjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => router.push(`/subject/${item.id}` as any)}
          >
            <Text style={s.code}>{item.code}</Text>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.meta}>
              {item.chaptersCount} فصول · {item.questionsCount} سؤال
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background, padding: 16 },
  header:     { fontSize: 24, fontWeight: "bold", color: Colors.text, marginBottom: 16, textAlign: "right" },
  card:       { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  code:       { color: Colors.primary, fontWeight: "bold", fontSize: 13, textAlign: "right" },
  title:      { color: Colors.text, fontSize: 17, fontWeight: "bold", marginVertical: 4, textAlign: "right" },
  meta:       { color: Colors.textMuted, fontSize: 13, textAlign: "right" },
});
