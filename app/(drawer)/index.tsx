import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function DashboardScreen() {
  const stats = [
    { label: "Total Orders", value: "₹12,450", change: "+12%", color: "#10b981" },
    { label: "Active Shops", value: "8", change: "+2", color: "#3b82f6" },
    { label: "Products", value: "156", change: "+5", color: "#f59e0b" },
    { label: "Categories", value: "12", change: "0", color: "#8b5cf6" },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Here's what's happening today</Text>
      </View>
      <View style={styles.statsGrid}>
        {stats.map((stat, i) => (
          <View key={i} style={[styles.card, { borderTopColor: stat.color }]}>
            <Text style={styles.cardLabel}>{stat.label}</Text>
            <Text style={styles.cardValue}>{stat.value}</Text>
            <Text style={[styles.cardChange, { color: stat.color }]}>{stat.change}</Text>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityText}>No recent orders yet</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { padding: 24, paddingTop: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  welcome: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  card: { flex: 1, minWidth: "45%", backgroundColor: "#fff", borderRadius: 16, padding: 16, borderTopWidth: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 14, color: "#475569" },
  cardValue: { fontSize: 22, fontWeight: "bold", color: "#0f172a", marginTop: 8 },
  cardChange: { fontSize: 12, fontWeight: "600", marginTop: 8 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#0f172a", marginBottom: 12 },
  activityCard: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  activityText: { color: "#94a3b8" },
});