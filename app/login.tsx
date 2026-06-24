import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// ✅ Computer ka actual IP (ipconfig se 192.168.1.148)
const API_BASE_URL = "http://161.97.187.200:8000";
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("55@gmail.com");   // pre-filled for testing
  const [password, setPassword] = useState("");         // enter your password
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }

    setLoading(true);
    try {
      console.log(`📡 POST ${API_BASE_URL}/mobile/auth/login`);
      const response = await fetch(`${API_BASE_URL}/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();
      console.log("📦 Response status:", response.status);
      console.log("📦 Response data:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      // ✅ Check role (backend ne allow kar diya, phir bhi)
      if (data.user.role_name !== "Order Tracker" && data.user.role_name !== "OrderTaker") {
        Alert.alert("Access Denied", `Role '${data.user.role_name}' not allowed`);
        return;
      }

      // ✅ Store data
      await AsyncStorage.multiSet([
        ["user_id", data.user.id.toString()],
        ["user_full_name", data.user.full_name],
        ["user_email", data.user.email],
        ["user_role", data.user.role_name],
        ["auth_token", data.access_token],
        ["isLoggedIn", "true"],
      ]);

      console.log("✅ Stored, now redirecting to drawer");
      router.replace("/(drawer)");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Tracker</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={login} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
      <Text style={styles.debug}>Backend: {API_BASE_URL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#0f172a" },
  title: { fontSize: 28, color: "#38bdf8", textAlign: "center", marginBottom: 30 },
  input: { backgroundColor: "#1e293b", padding: 12, borderRadius: 8, marginBottom: 12, color: "#fff" },
  button: { backgroundColor: "#38bdf8", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold" },
  debug: { color: "#64748b", textAlign: "center", marginTop: 20 },
});