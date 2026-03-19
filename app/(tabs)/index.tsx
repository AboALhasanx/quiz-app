import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const SUBJECTS = [
  {
    id: "ds501",
    title: "هياكل البيانات",
    code: "DS 501",
    image: require("../../assets/images/subjects/ds.png"),
    gradient: ["#4F8EF7", "#6C63FF"] as [string, string],
  },
  {
    id: "oop",
    title: "البرمجة الكائنية",
    code: "OOP",
    image: require("../../assets/images/subjects/oop.png"),
    gradient: ["#43C6AC", "#191654"] as [string, string],
  },
  {
    id: "cn",
    title: "شبكات الحاسوب",
    code: "CN",
    image: require("../../assets/images/subjects/cn.png"),
    gradient: ["#F7971E", "#FFD200"] as [string, string],
  },
  {
    id: "os",
    title: "أنظمة التشغيل",
    code: "OS",
    image: require("../../assets/images/subjects/os.png"),
    gradient: ["#f953c6", "#b91d73"] as [string, string],
  },
  {
    id: "ai",
    title: "الذكاء الاصطناعي",
    code: "AI",
    image: require("../../assets/images/subjects/ai.png"),
    gradient: ["#A18CD1", "#FBC2EB"] as [string, string],
  },
  {
    id: "se",
    title: "هندسة البرمجيات",
    code: "SE",
    image: require("../../assets/images/subjects/se.png"),
    gradient: ["#43E97B", "#38F9D7"] as [string, string],
  },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.pageTitle}>📚 موادي</Text>

      <FlatList
        data={SUBJECTS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push(`/subject/${item.id}` as any)}
          >
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.card}
            >
              {/* ديكور */}
              <Text style={s.star1}>✦</Text>
              <Text style={s.star2}>✦</Text>

              {/* النصوص */}
              <Text style={s.code}>{item.code}</Text>
              <Text style={s.title}>{item.title}</Text>

              {/* الأيقونة العائمة */}
              <Image
                source={item.image}
                style={s.icon}
                resizeMode="contain"
              />
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16, paddingTop: 60 },
  pageTitle: { color: Colors.text, fontSize: 22, fontWeight: "bold", textAlign: "right", marginBottom: 20 },
  row:       { justifyContent: "space-between", marginBottom: 14 },
  card: {
    width:        CARD_WIDTH,
    height:       CARD_WIDTH * 1.15,
    borderRadius: 20,
    padding:      16,
    overflow:     "hidden",
    justifyContent: "flex-start",
  },
  star1:  { position: "absolute", top: 10, right: 12, color: "rgba(255,255,255,0.5)", fontSize: 12 },
  star2:  { position: "absolute", top: 30, left: 16,  color: "rgba(255,255,255,0.3)", fontSize: 8  },
  code:   { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "bold", marginBottom: 6 },
  title: {
    color:      "#fff",
    fontSize:   15,
    fontWeight: "bold",
    maxWidth:   "60%",
    lineHeight: 20,
  },
  icon: {
    position:  "absolute",
    bottom:    -6,
    right:     -6,
    width:     CARD_WIDTH * 0.52,
    height:    CARD_WIDTH * 0.52,
    transform: [{ rotate: "10deg" }],
    opacity:   0.95,
  },
});
