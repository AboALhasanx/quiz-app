import { useState } from "react";
import {
  Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { loginUser, registerUser } from "../utils/firebase";
import { router } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [isRegister, setIsRegister] = useState(false);

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
      const msg = e.code === "auth/user-not-found"   ? "الحساب غير موجود" :
                  e.code === "auth/wrong-password"   ? "كلمة المرور خاطئة" :
                  e.code === "auth/email-already-in-use" ? "الإيميل مستخدم مسبقاً" :
                  e.code === "auth/invalid-email"    ? "إيميل غير صحيح" :
                  "حدث خطأ، حاول مرة ثانية";
      Alert.alert("خطأ", msg);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={s.title}>📚 كوز</Text>
      <Text style={s.subtitle}>{isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول"}</Text>

      <TextInput
        style={s.input}
        placeholder="الإيميل"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={s.input}
        placeholder="كلمة المرور"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>{isRegister ? "إنشاء الحساب" : "دخول"}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
        <Text style={s.toggle}>
          {isRegister ? "عندي حساب — تسجيل الدخول" : "ما عندي حساب — إنشاء حساب"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f13", justifyContent: "center", padding: 24, gap: 14 },
  title:     { color: "#f1f5f9", fontSize: 36, fontWeight: "bold", textAlign: "center" },
  subtitle:  { color: "#94a3b8", fontSize: 16, textAlign: "center", marginBottom: 10 },
  input:     { backgroundColor: "#1e1e2e", borderRadius: 12, padding: 14, color: "#f1f5f9", fontSize: 15, borderWidth: 1, borderColor: "#2d2d3d" },
  btn:       { backgroundColor: "#6366f1", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 6 },
  btnText:   { color: "#fff", fontWeight: "bold", fontSize: 16 },
  toggle:    { color: "#6366f1", textAlign: "center", fontSize: 14, marginTop: 6 },
});
