import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { API_BASE_URL } from "../../constants/config";

const formatPrice = (price) => {
  if (!price || isNaN(price)) return '₹0.00';
  return `₹${parseFloat(price).toFixed(2)}`;
};

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      
      if (!token || !userId) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Fetch orders for this user
      const ordersResponse = await fetch(`${API_BASE_URL}/sales-orders/?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!ordersResponse.ok) throw new Error('Failed to fetch orders');
      const orders = await ordersResponse.json();
      
      // Calculate totals
      const totalOrders = orders.length;
      
      // Get unique customers from orders
      const uniqueCustomerIds = [...new Set(orders.filter(o => o.customer_id).map(o => o.customer_id))];
      const totalCustomers = uniqueCustomerIds.length;
      
      // Fetch products count
      const productsResponse = await fetch(`${API_BASE_URL}/products/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const products = await productsResponse.json();
      const totalProducts = products.length || 0;
      
      setStats({
        totalOrders,
        totalCustomers,
        totalProducts,
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (type) => {
    switch(type) {
      case 'orders':
        router.push('/(drawer)/orders');
        break;
      case 'customers':
        // Navigate to Customers page using the correct route
        router.push('/(drawer)/CustomersManagerScreen');
        break;
      case 'products':
        router.push('/(drawer)/categories');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const statCards = [
    { 
      label: "Total Orders", 
      value: stats.totalOrders.toString(), 
      change: "View All →", 
      color: "#10b981", 
      type: "orders",
      icon: "📦"
    },
    { 
      label: "Customers", 
      value: stats.totalCustomers.toString(), 
      change: "View All →", 
      color: "#f59e0b", 
      type: "customers",
      icon: "👥"
    },
    { 
      label: "Products", 
      value: stats.totalProducts.toString(), 
      change: "Browse Categories →", 
      color: "#8b5cf6", 
      type: "products",
      icon: "📱"
    }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Here's your business overview</Text>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((stat, i) => (
          <TouchableOpacity 
            key={i} 
            onPress={() => handleCardPress(stat.type)}
            activeOpacity={0.8}
            style={[styles.card, { borderTopColor: stat.color }]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{stat.icon}</Text>
              <Text style={styles.cardLabel}>{stat.label}</Text>
            </View>
            <Text style={styles.cardValue}>{stat.value}</Text>
            <Text style={[styles.cardChange, { color: stat.color }]}>{stat.change}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b'
  },
  header: { 
    padding: 20, 
    paddingTop: 16, 
    backgroundColor: "#fff", 
    borderBottomWidth: 1, 
    borderBottomColor: "#e2e8f0" 
  },
  welcome: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#0f172a" 
  },
  subtitle: { 
    fontSize: 14, 
    color: "#64748b", 
    marginTop: 4 
  },
  statsGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    padding: 12, 
    gap: 12 
  },
  card: { 
    flex: 1, 
    minWidth: "45%", 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 16, 
    borderTopWidth: 4, 
    shadowColor: "#000", 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8
  },
  cardLabel: { 
    fontSize: 13, 
    color: "#475569",
    flex: 1
  },
  cardValue: { 
    fontSize: 32, 
    fontWeight: "bold", 
    color: "#0f172a", 
    marginTop: 4 
  },
  cardChange: { 
    fontSize: 12, 
    fontWeight: "600", 
    marginTop: 8 
  }
});