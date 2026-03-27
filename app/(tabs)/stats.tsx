import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Colors } from "../../constants/colors";
import { clearResults, removeResult, QuizResult } from "../../utils/storage";
import { fetchResultsFromFirestore, logoutUser, deleteResultFromFirestore } from "../../utils/firebase";
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export default function StatsScreen() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await fetchResultsFromFirestore();
    setResults(data);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleRemoveOne = (resultId: string) => {
    Alert.alert("حذف النتيجة", "تريد حذف هذه النتيجة فقط؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          await removeResult(resultId);
          await deleteResultFromFirestore(resultId);
          setResults((prev) => prev.filter((result) => result.id !== resultId));
        },
      },
    ]);
  };

  const handleClear = async () => {
    Alert.alert("مسح الكل", "تبي تمسح كل الكوزات؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "مسح",
        style: "destructive",
        onPress: async () => {
          await clearResults();
          const db = getFirestore();
          const uid = getAuth().currentUser?.uid;
          if (uid) {
            const snap = await getDocs(collection(db, "users", uid, "results"));
            await Promise.all(snap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
          }
          setResults([]);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "تبي تخرج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/login");
        },
      },
    ]);
  };

  const totalQuizzes = results.length;
  const avgPercentage = totalQuizzes > 0
    ? Math.round(results.reduce((sum, result) => sum + result.percentage, 0) / totalQuizzes)
    : 0;
  const bestScore = totalQuizzes > 0 ? Math.max(...results.map((result) => result.percentage)) : 0;
  const totalQuestions = results.reduce((sum, result) => sum + result.total, 0);
  const totalCorrect = results.reduce((sum, result) => sum + result.correct, 0);

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const getModeLabel = (mode: string) => (mode === "recitation" ? "تسميع" : "ورقة");
  const getPercentageColor = (percentage: number) =>
    percentage >= 70 ? Colors.correct : percentage >= 50 ? Colors.primary : Colors.wrong;

  if (loading) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>⏳ جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.topRow}>
        <Text style={s.title}>الإحصائيات</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={s.logoutBtn}>خروج</Text>
        </TouchableOpacity>
      </View>

      <View style={s.cardsRow}>
        <View style={s.card}>
          <Text style={s.cardNum}>{totalQuizzes}</Text>
          <Text style={s.cardLabel}>كوز مكتمل</Text>
        </View>
        <View style={s.card}>
          <Text style={[s.cardNum, { color: Colors.primary }]}>{avgPercentage}%</Text>
          <Text style={s.cardLabel}>متوسط النتائج</Text>
        </View>
        <View style={s.card}>
          <Text style={[s.cardNum, { color: Colors.correct }]}>{bestScore}%</Text>
          <Text style={s.cardLabel}>أفضل نتيجة</Text>
        </View>
      </View>

      <View style={s.cardsRow}>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={s.cardNum}>{totalQuestions}</Text>
          <Text style={s.cardLabel}>إجمالي الأسئلة</Text>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <Text style={[s.cardNum, { color: Colors.correct }]}>{totalCorrect}</Text>
          <Text style={s.cardLabel}>إجمالي الصحيح</Text>
        </View>
      </View>

      {totalQuizzes > 0 ? (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>سجل الكوزات</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={s.clearBtn}>مسح الكل</Text>
            </TouchableOpacity>
          </View>

          {results.map((result) => (
            <View key={result.id} style={s.resultCard}>
              <View style={s.resultHeader}>
                <Text style={s.resultDate}>{formatDate(result.date)}</Text>
                <View style={s.resultHeaderRight}>
                  <TouchableOpacity onPress={() => handleRemoveOne(result.id)} style={s.removeBtnBox}>
                    <Text style={s.removeBtn}>✕</Text>
                  </TouchableOpacity>
                  <View
                    style={[
                      s.modeBadge,
                      result.mode === "recitation" ? s.modeRecitation : s.modePaper,
                    ]}
                  >
                    <Text style={s.modeText}>{getModeLabel(result.mode)}</Text>
                  </View>
                </View>
              </View>

              <View style={s.resultBody}>
                <Text
                  style={[s.resultPercentage, { color: getPercentageColor(result.percentage) }]}
                >
                  {result.percentage}%
                </Text>
                <View style={s.resultStats}>
                  <Text style={[s.resultStat, { color: Colors.correct }]}>✅ {result.correct}</Text>
                  <Text style={[s.resultStat, { color: Colors.wrong }]}>❌ {result.wrong}</Text>
                  <Text style={[s.resultStat, { color: Colors.textMuted }]}>⚪ {result.skipped}</Text>
                  <Text style={[s.resultStat, { color: Colors.text }]}>📝 {result.total}</Text>
                </View>
              </View>

              <View style={s.progressBg}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${result.percentage}%`,
                      backgroundColor: getPercentageColor(result.percentage),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={s.emptyBox}>
          <Text style={s.emptyEmoji}>📭</Text>
          <Text style={s.emptyText}>لا يوجد سجل بعد</Text>
          <Text style={s.emptySubText}>أكمل كوز واحد على الأقل لتظهر الإحصائيات</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 60 },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  muted: { color: Colors.textMuted, fontSize: 15 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: "bold", textAlign: "right" },
  logoutBtn: { color: Colors.wrong, fontSize: 13, fontWeight: "bold" },
  cardsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardNum: { fontSize: 26, fontWeight: "bold", color: Colors.text },
  cardLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  clearBtn: { color: Colors.wrong, fontSize: 13 },
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultDate: { color: Colors.textMuted, fontSize: 12 },
  removeBtnBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.wrong + "22",
  },
  removeBtn: { color: Colors.wrong, fontSize: 15, fontWeight: "bold" },
  modeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modePaper: { backgroundColor: Colors.primary + "33" },
  modeRecitation: { backgroundColor: Colors.correct + "33" },
  modeText: { fontSize: 11, fontWeight: "bold", color: Colors.text },
  resultBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultPercentage: { fontSize: 28, fontWeight: "bold" },
  resultStats: { flexDirection: "row", gap: 10 },
  resultStat: { fontSize: 13, fontWeight: "bold" },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  emptySubText: { color: Colors.textMuted, fontSize: 13, textAlign: "center" },
});
