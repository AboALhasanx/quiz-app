import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginUser, registerUser } from "../utils/firebase";
import { useTheme } from "../utils/ThemeContext"; // تأكد من مسار الملف الصحيح

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert("خطأ", "أدخل الإيميل وكلمة المرور");
      return;
    }
    if (password.length < 6) {
      Alert.alert("خطأ", "كلمة المرور لازم 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        await registerUser(email.trim(), password);
      } else {
        await loginUser(email.trim(), password);
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg =
        e.code === "auth/user-not-found"
          ? "الحساب غير موجود"
          : e.code === "auth/wrong-password"
          ? "كلمة المرور خاطئة"
          : e.code === "auth/email-already-in-use"
          ? "الإيميل مستخدم مسبقاً"
          : e.code === "auth/invalid-email"
          ? "إيميل غير صحيح"
          : "حدث خطأ، حاول مرة ثانية";
      Alert.alert("خطأ", msg);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* العنوان */}
      <Text style={[s.subtitle, { color: theme.textSecondary }]}>
        {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}
      </Text>

      {/* حقل الإيميل */}
      <View style={[s.inputWrapper, { backgroundColor: theme.card, borderColor: theme.secondary + "22" }]}>
        <TextInput
          style={[s.input, { color: theme.textPrimary }]}
          placeholder="الإيميل"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {/* حقل كلمة المرور مع زر العين */}
      <View style={[s.inputWrapper, { backgroundColor: theme.card, borderColor: theme.secondary + "22" }]}>
        <TextInput
          style={[s.input, { color: theme.textPrimary, flex: 1 }]}
          placeholder="كلمة المرور"
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secureTextEntry}
        />
        <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)} style={s.eyeBtn}>
          <Ionicons
            name={secureTextEntry ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* زر الدخول / إنشاء حساب */}
      <TouchableOpacity
        style={[s.btn, { backgroundColor: theme.primary }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.btnText}>{isRegister ? "إنشاء الحساب" : "دخول"}</Text>
        )}
      </TouchableOpacity>

      {/* زر التبديل */}
      <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={s.toggleBtn}>
        <Text style={[s.toggleText, { color: theme.primary }]}>
          {isRegister ? "عندي حساب — تسجيل الدخول" : "ما عندي حساب — إنشاء حساب"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52, // ارتفاع ثابت لتنظيم الشكل
  },
  input: {
    fontSize: 15,
    height: "100%",
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  btn: {
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 8,
    height: 52,
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  toggleBtn: {
    marginTop: 8,
  },
  toggleText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
});