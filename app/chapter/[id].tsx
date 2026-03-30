import { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/ThemeContext";
import { buildTopicCompletionKey, getTopicCompletions } from "../../utils/storage";
import { loadSubjectDataById } from "../../utils/subjects";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Asset } from "expo-asset";

// ── 1) MAP ثابت لكل ملفات PDF ──────────────────────────────────────────────
const PDF_MAP: Record<string, any> = {
  "assets/pdfs/ai/AI_Ch01.pdf":            require("../../assets/pdfs/ai/AI_Ch01.pdf"),
  "assets/pdfs/ai/AI_Ch02.pdf":            require("../../assets/pdfs/ai/AI_Ch02.pdf"),
  "assets/pdfs/ai/AI_Ch03.pdf":            require("../../assets/pdfs/ai/AI_Ch03.pdf"),
  "assets/pdfs/ai/AI_Ch04.pdf":            require("../../assets/pdfs/ai/AI_Ch04.pdf"),
  "assets/pdfs/ai/Sum_AI_Ch01.pdf":        require("../../assets/pdfs/ai/Sum_AI_Ch01.pdf"),
  "assets/pdfs/ai/Sum_AI_Ch02.pdf":        require("../../assets/pdfs/ai/Sum_AI_Ch02.pdf"),
  "assets/pdfs/ai/Sum_AI_Ch03.pdf":        require("../../assets/pdfs/ai/Sum_AI_Ch03.pdf"),
  "assets/pdfs/ai/Sum_AI_Ch04.pdf":        require("../../assets/pdfs/ai/Sum_AI_Ch04.pdf"),

  "assets/pdfs/algo/Algo_Ch03.pdf":        require("../../assets/pdfs/algo/Algo_Ch03.pdf"),
  "assets/pdfs/algo/Algo_Ch04.pdf":        require("../../assets/pdfs/algo/Algo_Ch04.pdf"),
  "assets/pdfs/algo/Algo_Ch05.pdf":        require("../../assets/pdfs/algo/Algo_Ch05.pdf"),
  "assets/pdfs/algo/Algo_Ch06.pdf":        require("../../assets/pdfs/algo/Algo_Ch06.pdf"),
  "assets/pdfs/algo/Algo_Ch07.pdf":        require("../../assets/pdfs/algo/Algo_Ch07.pdf"),
  "assets/pdfs/algo/Algo_Ch10.pdf":        require("../../assets/pdfs/algo/Algo_Ch10.pdf"),
  "assets/pdfs/algo/Algo_Ch11.pdf":        require("../../assets/pdfs/algo/Algo_Ch11.pdf"),
  "assets/pdfs/algo/Algo_Ch13.pdf":        require("../../assets/pdfs/algo/Algo_Ch13.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch03.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch03.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch04.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch04.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch05.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch05.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch06.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch06.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch07.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch07.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch10.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch10.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch11.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch11.pdf"),
  "assets/pdfs/algo/Sum_Algo_Ch13.pdf":    require("../../assets/pdfs/algo/Sum_Algo_Ch13.pdf"),

  "assets/pdfs/net/Net_Ch01_Introduction.pdf":       require("../../assets/pdfs/net/Net_Ch01_Introduction.pdf"),
  "assets/pdfs/net/Net_Ch02_Models.pdf":             require("../../assets/pdfs/net/Net_Ch02_Models.pdf"),
  "assets/pdfs/net/Net_Ch03_Logical_Addressing.pdf": require("../../assets/pdfs/net/Net_Ch03_Logical_Addressing.pdf"),
  "assets/pdfs/net/Net_Ch04_Error_Detection.pdf":    require("../../assets/pdfs/net/Net_Ch04_Error_Detection.pdf"),
  "assets/pdfs/net/Sum_Net_Introduction.pdf":        require("../../assets/pdfs/net/Sum_Net_Introduction.pdf"),
  "assets/pdfs/net/Sum_Net_Models.pdf":              require("../../assets/pdfs/net/Sum_Net_Models.pdf"),
  "assets/pdfs/net/Sum_Net_Logical_Addressing.pdf":  require("../../assets/pdfs/net/Sum_Net_Logical_Addressing.pdf"),
  "assets/pdfs/net/Sum_Net_Error_Detection.pdf":     require("../../assets/pdfs/net/Sum_Net_Error_Detection.pdf"),

  "assets/pdfs/oop/OOP_Ch01_Review.pdf":           require("../../assets/pdfs/oop/OOP_Ch01_Review.pdf"),
  "assets/pdfs/oop/OOP_Ch02_Class_Definition.pdf": require("../../assets/pdfs/oop/OOP_Ch02_Class_Definition.pdf"),
  "assets/pdfs/oop/OOP_Ch03_Object_Interaction.pdf":require("../../assets/pdfs/oop/OOP_Ch03_Object_Interaction.pdf"),
  "assets/pdfs/oop/OOP_Ch04_Grouping_Objects.pdf":  require("../../assets/pdfs/oop/OOP_Ch04_Grouping_Objects.pdf"),
  "assets/pdfs/oop/OOP_Ch05_Inheritance.pdf":       require("../../assets/pdfs/oop/OOP_Ch05_Inheritance.pdf"),
  "assets/pdfs/oop/OOP_Ch06_More_Inheritance.pdf":  require("../../assets/pdfs/oop/OOP_Ch06_More_Inheritance.pdf"),
  "assets/pdfs/oop/OOP_Ch07_Abstraction.pdf":       require("../../assets/pdfs/oop/OOP_Ch07_Abstraction.pdf"),
  "assets/pdfs/oop/Sum_OOP_Introduction.pdf":       require("../../assets/pdfs/oop/Sum_OOP_Introduction.pdf"),
  "assets/pdfs/oop/Sum_OOP_Class_Concept.pdf":      require("../../assets/pdfs/oop/Sum_OOP_Class_Concept.pdf"),
  "assets/pdfs/oop/Sum_OOP_Object_Interaction.pdf": require("../../assets/pdfs/oop/Sum_OOP_Object_Interaction.pdf"),
  "assets/pdfs/oop/Sum_OOP_Grouping_Objects.pdf":   require("../../assets/pdfs/oop/Sum_OOP_Grouping_Objects.pdf"),
  "assets/pdfs/oop/Sum_OOP_Inheritance.pdf":        require("../../assets/pdfs/oop/Sum_OOP_Inheritance.pdf"),
  "assets/pdfs/oop/Sum_OOP_More_Inheritance.pdf":   require("../../assets/pdfs/oop/Sum_OOP_More_Inheritance.pdf"),
  "assets/pdfs/oop/Sum_OOP_Abstraction.pdf":        require("../../assets/pdfs/oop/Sum_OOP_Abstraction.pdf"),

  "assets/pdfs/os/OS_Ch03.pdf":              require("../../assets/pdfs/os/OS_Ch03.pdf"),
  "assets/pdfs/os/OS_Ch04.pdf":              require("../../assets/pdfs/os/OS_Ch04.pdf"),
  "assets/pdfs/os/OS_Ch05.pdf":              require("../../assets/pdfs/os/OS_Ch05.pdf"),
  "assets/pdfs/os/OS_Ch06.pdf":              require("../../assets/pdfs/os/OS_Ch06.pdf"),
  "assets/pdfs/os/OS_Ch07.pdf":              require("../../assets/pdfs/os/OS_Ch07.pdf"),
  "assets/pdfs/os/OS_Ch08.pdf":              require("../../assets/pdfs/os/OS_Ch08.pdf"),
  "assets/pdfs/os/Sum_OS_Introduction.pdf":  require("../../assets/pdfs/os/Sum_OS_Introduction.pdf"),
  "assets/pdfs/os/Sum_OS_Ch03.pdf":          require("../../assets/pdfs/os/Sum_OS_Ch03.pdf"),
  "assets/pdfs/os/Sum_OS_Ch04.pdf":          require("../../assets/pdfs/os/Sum_OS_Ch04.pdf"),
  "assets/pdfs/os/Sum_OS_Ch05.pdf":          require("../../assets/pdfs/os/Sum_OS_Ch05.pdf"),
  "assets/pdfs/os/Sum_OS_Ch06.pdf":          require("../../assets/pdfs/os/Sum_OS_Ch06.pdf"),
  "assets/pdfs/os/Sum_OS_Ch07.pdf":          require("../../assets/pdfs/os/Sum_OS_Ch07.pdf"),
  "assets/pdfs/os/Sum_OS_Ch08.pdf":          require("../../assets/pdfs/os/Sum_OS_Ch08.pdf"),

  "assets/pdfs/se/SE_Ch01.pdf":         require("../../assets/pdfs/se/SE_Ch01.pdf"),
  "assets/pdfs/se/SE_Ch02.pdf":         require("../../assets/pdfs/se/SE_Ch02.pdf"),
  "assets/pdfs/se/SE_Ch03.pdf":         require("../../assets/pdfs/se/SE_Ch03.pdf"),
  "assets/pdfs/se/SE_Ch07.pdf":         require("../../assets/pdfs/se/SE_Ch07.pdf"),
  "assets/pdfs/se/SE_Ch08.pdf":         require("../../assets/pdfs/se/SE_Ch08.pdf"),
  "assets/pdfs/se/SE_Ch09.pdf":         require("../../assets/pdfs/se/SE_Ch09.pdf"),
  "assets/pdfs/se/Sum_SE_Ch01.pdf":     require("../../assets/pdfs/se/Sum_SE_Ch01.pdf"),
  "assets/pdfs/se/Sum_SE_Ch02.pdf":     require("../../assets/pdfs/se/Sum_SE_Ch02.pdf"),
  "assets/pdfs/se/Sum_SE_Ch03.pdf":     require("../../assets/pdfs/se/Sum_SE_Ch03.pdf"),
  "assets/pdfs/se/Sum_SE_Ch07.pdf":     require("../../assets/pdfs/se/Sum_SE_Ch07.pdf"),
  "assets/pdfs/se/Sum_SE_Ch08.pdf":     require("../../assets/pdfs/se/Sum_SE_Ch08.pdf"),
  "assets/pdfs/se/Sum_SE_Ch09.pdf":     require("../../assets/pdfs/se/Sum_SE_Ch09.pdf"),
};

// ── 2) دالة فتح PDF خارجياً ─────────────────────────────────────────────────
const openPdf = async (pdfKey: string) => {
  const module = PDF_MAP[pdfKey];
  if (!module) return;
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const localUri = FileSystem.cacheDirectory + "open.pdf";
  await FileSystem.copyAsync({ from: asset.localUri!, to: localUri });
  if (Platform.OS === "android") {
    const contentUri = await FileSystem.getContentUriAsync(localUri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      flags: 1,
      type: "application/pdf",
    });
  }
};

// ────────────────────────────────────────────────────────────────────────────

export default function ChapterScreen() {
  const { theme } = useTheme();
  const { id, subjectId } = useLocalSearchParams<{ id: string; subjectId: string }>();
  const router = useRouter();
  const subject = loadSubjectDataById(subjectId ?? "");
  const chapter = subject?.chapters.find((item) => item.id === id);

  const [completedTopics, setCompletedTopics] = useState<Record<string, boolean>>({});
  const [completedTopicsCount, setCompletedTopicsCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getTopicCompletions().then((topicCompletions) => {
        if (!chapter) return;
        const completedMap: Record<string, boolean> = {};
        let completedCount = 0;
        chapter.topics.forEach((topic) => {
          const key = buildTopicCompletionKey(subjectId ?? "", id ?? "", topic.id);
          const isCompleted = !!topicCompletions[key]?.completed;
          completedMap[topic.id] = isCompleted;
          if (isCompleted) completedCount += 1;
        });
        setCompletedTopics(completedMap);
        setCompletedTopicsCount(completedCount);
      });
    }, [chapter, id, subjectId])
  );

  if (!chapter) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.wrong, textAlign: "center", fontSize: 16 }}>الفصل غير موجود</Text>
      </View>
    );
  }

  const totalQuestions = chapter.topics.reduce((sum, topic) => sum + topic.questions.length, 0);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.chapterCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
        <Text style={[s.chapterTitle, { color: theme.textPrimary }]}>{chapter.title}</Text>
        <View style={s.chapterMeta}>
          <View style={s.metaItem}>
            <Ionicons name="layers-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.metaText, { color: theme.textSecondary }]}>{chapter.topics.length} موضوع</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={theme.textSecondary} />
            <Text style={[s.metaText, { color: theme.textSecondary }]}>{totalQuestions} سؤال</Text>
          </View>
        </View>

        {chapter.topics.length > 0 && (
          <View style={s.progressContainer}>
            <View style={[s.progressTrack, { backgroundColor: theme.secondary + "22" }]}>
              <View
                style={[
                  s.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${(completedTopicsCount / chapter.topics.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[s.completionText, { color: theme.textSecondary }]}>
              تم إنهاء {completedTopicsCount} من {chapter.topics.length} مواضيع
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.fullChapterBtn, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/quiz/setup?scope=chapter&subjectId=${subjectId}&chapterId=${id}` as any)}
        >
          <Ionicons name="play-circle-outline" size={18} color="#fff" />
          <Text style={s.fullChapterBtnText}>كوز الفصل كامل</Text>
        </TouchableOpacity>

        {/* ── 3) زرا الملزمة والملخص ─────────────────────────────────────── */}
        {(chapter.malzama || chapter.summary) && (
          <View style={s.pdfRow}>
            {chapter.malzama && (
              <TouchableOpacity
                style={[s.pdfBtn, { borderColor: theme.primary + "88" }]}
                onPress={() => openPdf(chapter.malzama!)}
              >
                <Ionicons name="book-outline" size={16} color={theme.primary} />
                <Text style={[s.pdfBtnText, { color: theme.primary }]}>ملزمة</Text>
              </TouchableOpacity>
            )}
            {chapter.summary && (
              <TouchableOpacity
                style={[s.pdfBtn, { borderColor: theme.secondary + "88" }]}
                onPress={() => openPdf(chapter.summary!)}
              >
                <Ionicons name="document-text-outline" size={16} color={theme.secondary} />
                <Text style={[s.pdfBtnText, { color: theme.secondary }]}>ملخص</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>المواضيع</Text>

      <FlatList
        data={chapter.topics}
        keyExtractor={(topic) => topic.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: topic }) => (
          <View style={[s.topicCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
            <View style={s.topicBody}>
              <View style={s.topicInfo}>
                <View style={s.topicTitleRow}>
                  {completedTopics[topic.id] && (
                    <Text style={[s.completedBadge, { color: theme.correct }]}>✓</Text>
                  )}
                  <Text style={[s.topicTitle, { color: theme.textPrimary }]}>{topic.title}</Text>
                </View>
                <View style={s.topicMeta}>
                  <Text style={[s.topicMetaText, { color: theme.textSecondary }]}>❓ {topic.questions.length} سؤال</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s.startBtn, { backgroundColor: theme.primary }]}
                onPress={() =>
                  router.push({
                    pathname: "../quiz/setup",
                    params: { scope: "topic", subjectId, chapterId: id, topicId: topic.id },
                  })
                }
              >
                <Ionicons name="play-outline" size={16} color="#fff" />
                <Text style={s.startBtnText}>ابدأ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  chapterCard: { borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1 },
  chapterTitle: { fontSize: 18, fontWeight: "bold", textAlign: "right", marginBottom: 10 },
  chapterMeta: {
    flexDirection: "row", justifyContent: "flex-end",
    alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13 },
  progressContainer: { marginTop: 8, gap: 6 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  completionText: { fontSize: 13, textAlign: "right", marginBottom: 20 },
  fullChapterBtn: {
    borderRadius: 10, padding: 12,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8,
  },
  fullChapterBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  // ── 4) ستايلات الـ PDF ────────────────────────────────────────────────────
  pdfRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  pdfBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 10,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 6, borderWidth: 1,
  },
  pdfBtnText: { fontWeight: "bold", fontSize: 13 },
  // ─────────────────────────────────────────────────────────────────────────
  sectionTitle: { fontSize: 16, fontWeight: "bold", textAlign: "right", marginBottom: 12 },
  topicCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  topicBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  topicInfo: { flex: 1 },
  topicTitleRow: {
    flexDirection: "row", justifyContent: "flex-end",
    alignItems: "center", gap: 6, marginBottom: 4,
  },
  topicTitle: { fontSize: 14, fontWeight: "600", textAlign: "right" },
  completedBadge: { fontSize: 15, fontWeight: "bold" },
  topicMeta: { flexDirection: "row", justifyContent: "flex-end", gap: 6 },
  topicMetaText: { fontSize: 12 },
  startBtn: {
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  startBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});