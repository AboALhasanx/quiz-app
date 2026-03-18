import { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { Colors } from "../../constants/colors";
import { getResults, clearResults, QuizResult } from "../../utils/storage";

export default function StatsScreen() {
  const [results, setResults]     = useState<QuizResult[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await getResults();
    setResults(data);
    setLoading(false);
  };

  // يحدّث كل مرة تفتح الشاشة
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleClear = async () => {
    await clearResults();
    setResults([]);
  };

  // ── إحصائيات عامة ──
  const totalQuizzes  = results.length;
  const avgPercentage = totalQuizzes > 0
    ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / totalQuizzes)
    : 0;
  const bestScore = totalQuizzes > 0
    ? Math.max(...results.map(r => r.percentage))
    : 0;
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);
  const totalCorrect   = results.reduce((s, r) => s + r.correct, 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const getModeLabel = (mode: string) =>
    mode === "recitation" ? "تسميع" : "ورقة";

  const getPercentageColor = (p: number) =>
    p >= 70 ? Colors.correct : p >= 50 ? Colors.primary : Colors.wrong;

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
      <Text style={s.title}>📊 الإحصائيات</Text>

      {/* بطاقات الإحصائيات العامة */}
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

      {/* سجل الكوزات */}
      {totalQuizzes > 0 ? (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>📋 سجل الكوزات</Text>
            <TouchableOpacity onPress={handleClear}>
              <Text style={s.clearBtn}>🗑️ مسح الكل</Text>
            </TouchableOpacity>
          </View>

          {results.map((r, i) => (
            <View key={r.id} style={s.resultCard}>
              <View style={s.resultHeader}>
                <Text style={s.resultDate}>{formatDate(r.date)}</Text>
                <View style={[s.modeBadge, r.mode === "recitation" ? s.modeRecitation : s.modePaper]}>
                  <Text style={s.modeText}>{getModeLabel(r.mode)}</Text>
                </View>
              </View>

              <View style={s.resultBody}>
                <Text style={[s.resultPercentage, { color: getPercentageColor(r.percentage) }]}>
                  {r.percentage}%
                </Text>
                <View style={s.resultStats}>
                  <Text style={[s.resultStat, { color: Colors.correct }]}>✅ {r.correct}</Text>
                  <Text style={[s.resultStat, { color: Colors.wrong   }]}>❌ {r.wrong}</Text>
                  <Text style={[s.resultStat, { color: Colors.textMuted }]}>⚪ {r.skipped}</Text>
                  <Text style={[s.resultStat, { color: Colors.text }]}>📝 {r.total}</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={s.progressBg}>
                <View style={[
                  s.progressFill,
                  { width: `${r.percentage}%`, backgroundColor: getPercentageColor(r.percentage) }
                ]} />
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
  container:       { flex: 1, backgroundColor: Colors.background },
  content:         { padding: 16, paddingBottom: 60 },
  center:          { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  muted:           { color: Colors.textMuted, fontSize: 15 },
  title:           { color: Colors.text, fontSize: 22, fontWeight: "bold", textAlign: "right", marginBottom: 16 },
  cardsRow:        { flexDirection: "row", gap: 10, marginBottom: 10 },
  card:            { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  cardNum:         { fontSize: 26, fontWeight: "bold", color: Colors.text },
  cardLabel:       { color: Colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" },
  sectionHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  sectionTitle:    { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  clearBtn:        { color: Colors.wrong, fontSize: 13 },
  resultCard:      { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  resultHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  resultDate:      { color: Colors.textMuted, fontSize: 12 },
  modeBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  modePaper:       { backgroundColor: Colors.primary + "33" },
  modeRecitation:  { backgroundColor: Colors.correct  + "33" },
  modeText:        { fontSize: 11, fontWeight: "bold", color: Colors.text },
  resultBody:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  resultPercentage:{ fontSize: 28, fontWeight: "bold" },
  resultStats:     { flexDirection: "row", gap: 10 },
  resultStat:      { fontSize: 13, fontWeight: "bold" },
  progressBg:      { height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill:    { height: 4, borderRadius: 2 },
  emptyBox:        { alignItems: "center", marginTop: 60, gap: 10 },
  emptyEmoji:      { fontSize: 48 },
  emptyText:       { color: Colors.text, fontSize: 16, fontWeight: "bold" },
  emptySubText:    { color: Colors.textMuted, fontSize: 13, textAlign: "center" },
});
