import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    // yahan baad mein FastAPI connect hoga
    console.log("Login Data:", { email, password });

    Alert.alert("Success", "Login clicked");
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Order App</Text>
      <Text style={styles.subtitle}>Login to continue</Text>

      <View style={styles.card}>

        <TextInput
          placeholder="Enter Email"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Enter Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 34,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 20,
    borderRadius: 15,
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#38bdf8",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
});