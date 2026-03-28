import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { collection, deleteDoc, getDocs, getFirestore } from "firebase/firestore";
import { auth, deleteResultFromFirestore, fetchResultsFromFirestore, isSyncQueueFlushing, logoutUser } from "../../utils/firebase";
import { clearResults, getSyncQueue, removeResult, QuizResult } from "../../utils/storage";
import { useTheme } from "../../utils/ThemeContext";

type SyncStatus = "ok" | "syncing" | "warning";

export default function StatsScreen() {
  const { theme } = useTheme();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("ok");

  const loadSyncStatus = useCallback(async () => {
    const queue = await getSyncQueue();
    setSyncStatus(isSyncQueueFlushing() ? "syncing" : queue.length > 0 ? "warning" : "ok");
  }, []);

  const load = useCallback(async () => {
    const data = await fetchResultsFromFirestore();
    setResults(data);
    await loadSyncStatus();
    setLoading(false);
  }, [loadSyncStatus]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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
          setResults((previous) => previous.filter((result) => result.id !== resultId));
          await loadSyncStatus();
        },
      },
    ]);
  };

  const handleClear = () => {
    Alert.alert("مسح الكل", "تبي تمسح كل الكوزات؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "مسح",
        style: "destructive",
        onPress: async () => {
          await clearResults();
          const db = getFirestore();
          const uid = auth.currentUser?.uid;

          if (uid) {
            const snapshot = await getDocs(collection(db, "users", uid, "results"));
            await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
          }

          setResults([]);
          await loadSyncStatus();
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
  const avgPercentage =
    totalQuizzes > 0
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
  const getScoreColor = (percentage: number) =>
    percentage >= 70 ? theme.correct : percentage >= 50 ? theme.primary : theme.wrong;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.textSecondary, fontSize: 15 }}>⏳ جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.topRow}>
        <View style={s.titleGroup}>
          <View
            style={[
              s.syncDot,
              {
                backgroundColor:
                  syncStatus === "syncing"
                    ? theme.primary
                    : syncStatus === "warning"
                      ? theme.wrong
                      : theme.correct,
              },
            ]}
          />
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
            {syncStatus === "syncing"
              ? "syncing..."
              : syncStatus === "warning"
                ? "sync pending"
                : "synced"}
          </Text>
          <Text style={[s.title, { color: theme.textPrimary }]}>الإحصائيات</Text>
        </View>

        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: theme.wrong, fontSize: 13, fontWeight: "bold" }}>خروج</Text>
        </TouchableOpacity>
      </View>

      <View style={s.cardsRow}>
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
          <Text style={[s.cardNum, { color: theme.textPrimary }]}>{totalQuizzes}</Text>
          <Text style={[s.cardLabel, { color: theme.textSecondary }]}>كوز مكتمل</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
          <Text style={[s.cardNum, { color: theme.primary }]}>{avgPercentage}%</Text>
          <Text style={[s.cardLabel, { color: theme.textSecondary }]}>متوسط النتائج</Text>
        </View>
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
          <Text style={[s.cardNum, { color: theme.correct }]}>{bestScore}%</Text>
          <Text style={[s.cardLabel, { color: theme.textSecondary }]}>أفضل نتيجة</Text>
        </View>
      </View>

      <View style={s.cardsRow}>
        <View style={[s.card, { flex: 1, backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
          <Text style={[s.cardNum, { color: theme.textPrimary }]}>{totalQuestions}</Text>
          <Text style={[s.cardLabel, { color: theme.textSecondary }]}>إجمالي الأسئلة</Text>
        </View>
        <View style={[s.card, { flex: 1, backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}>
          <Text style={[s.cardNum, { color: theme.correct }]}>{totalCorrect}</Text>
          <Text style={[s.cardLabel, { color: theme.textSecondary }]}>إجمالي الصحيح</Text>
        </View>
      </View>

      {totalQuizzes > 0 ? (
        <>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: theme.textPrimary }]}>سجل الكوزات</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={{ color: theme.wrong, fontSize: 13 }}>مسح الكل</Text>
            </TouchableOpacity>
          </View>

          {results.map((result) => (
            <View
              key={result.id}
              style={[s.resultCard, { backgroundColor: theme.card, borderColor: theme.secondary + "44" }]}
            >
              <View style={s.resultHeader}>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{formatDate(result.date)}</Text>

                <View style={s.resultHeaderRight}>
                  <TouchableOpacity
                    onPress={() => handleRemoveOne(result.id)}
                    style={[s.removeBtnBox, { backgroundColor: theme.wrong + "22" }]}
                  >
                    <Text style={{ color: theme.wrong, fontSize: 15, fontWeight: "bold" }}>✕</Text>
                  </TouchableOpacity>

                  <View
                    style={[
                      s.modeBadge,
                      {
                        backgroundColor:
                          result.mode === "recitation" ? theme.correct + "33" : theme.primary + "33",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: theme.textPrimary }}>
                      {getModeLabel(result.mode)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s.resultBody}>
                <Text style={[s.resultPercentage, { color: getScoreColor(result.percentage) }]}>
                  {result.percentage}%
                </Text>
                <View style={s.resultStats}>
                  <Text style={[s.resultStat, { color: theme.correct }]}>✅ {result.correct}</Text>
                  <Text style={[s.resultStat, { color: theme.wrong }]}>❌ {result.wrong}</Text>
                  <Text style={[s.resultStat, { color: theme.textSecondary }]}>⚪ {result.skipped}</Text>
                  <Text style={[s.resultStat, { color: theme.textPrimary }]}>📝 {result.total}</Text>
                </View>
              </View>

              <View style={[s.progressBg, { backgroundColor: theme.secondary + "44" }]}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${result.percentage}%`,
                      backgroundColor: getScoreColor(result.percentage),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={s.emptyBox}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "bold" }}>لا يوجد سجل بعد</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: "center" }}>
            أكمل كوز واحد على الأقل لتظهر الإحصائيات
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  syncDot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 22, fontWeight: "bold" },
  cardsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  cardNum: { fontSize: 26, fontWeight: "bold" },
  cardLabel: { fontSize: 12, marginTop: 4, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  resultCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeBtnBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  resultBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultPercentage: { fontSize: 28, fontWeight: "bold" },
  resultStats: { flexDirection: "row", gap: 10 },
  resultStat: { fontSize: 13, fontWeight: "bold" },
  progressBg: { height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
});
