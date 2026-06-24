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

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({
    id: null,
    full_name: "",
    email: "",
    role_name: "",
    is_active: true
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const fullName = await AsyncStorage.getItem('user_full_name');
      const email = await AsyncStorage.getItem('user_email');
      const roleName = await AsyncStorage.getItem('user_role');
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!userId) {
        Alert.alert('Error', 'Please login again');
        router.replace('/');
        return;
      }

      setUser({
        id: parseInt(userId),
        full_name: fullName || "",
        email: email || "",
        role_name: roleName || "",
        is_active: true
      });

      // Also fetch fresh data from API
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser({
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role_name: roleName || "",
          is_active: userData.is_active
        });
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'user_id',
                'user_full_name',
                'user_email',
                'user_role',
                'auth_token',
                'isLoggedIn'
              ]);
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role) => {
    switch(role?.toLowerCase()) {
      case 'ordertaker':
        return '#10b981';
      case 'order tracker':
        return '#3b82f6';
      case 'admin':
        return '#f59e0b';
      default:
        return '#8b5cf6';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: user.is_active ? '#10b981' : '#ef4444' }]}>
            <Text style={styles.statusText}>{user.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        <Text style={styles.userName}>{user.full_name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role_name) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(user.role_name) }]}>
            {user.role_name || 'User'}
          </Text>
        </View>
      </View>

      {/* Info Cards - WITHOUT User ID */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📛 Full Name</Text>
            <Text style={styles.infoValue}>{user.full_name}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>✉️ Email Address</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>👔 Role</Text>
            <Text style={styles.infoValue}>{user.role_name || 'Not Assigned'}</Text>
          </View>
        </View>
      </View>

      {/* Only Logout Button - NO EDIT BUTTON */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  versionContainer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});