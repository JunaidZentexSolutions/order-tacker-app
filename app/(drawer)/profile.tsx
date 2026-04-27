import { StyleSheet, Text, View } from "react-native";

export default function Profile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" },
  title: { color: "#fff", fontSize: 24 },
});