import { StyleSheet, Text, View } from "react-native";

export default function Orders() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🛒 Orders</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" },
  title: { color: "#fff", fontSize: 24 },
});