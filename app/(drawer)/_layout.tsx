import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function DrawerLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            // Clear all user data from AsyncStorage
            const keys = [
              "user_id",
              "user_full_name",
              "user_email",
              "user_role",
              "auth_token",
              "isLoggedIn",
              "cart"
            ];
            await AsyncStorage.multiRemove(keys);
            
            // Optional: Clear global cart if you have a reference (will be reloaded on next login)
            // global.cartItems = []; etc.
            
            // Redirect to login screen
            router.replace("/login");
          },
        },
      ]
    );
  };

  // Custom drawer content
  const CustomDrawerContent = (props) => {
    const { state, navigation, descriptors } = props;
    
    return (
      <View style={styles.drawerContainer}>
        {/* Optional: User info header */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>Order Tracker</Text>
        </View>

        {/* Drawer Screens */}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title !== undefined ? options.title : route.name;
          const isFocused = state.index === index;
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.drawerItem, isFocused && styles.drawerItemFocused]}
            >
              <Text style={[styles.drawerLabel, isFocused && styles.drawerLabelFocused]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Spacer to push logout to bottom */}
        <View style={{ flex: 1 }} />

        {/* Logout Button */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
      }}
      drawerContent={CustomDrawerContent}
    >
      <Drawer.Screen name="index" options={{ title: "Dashboard" }} />
      <Drawer.Screen name="orders" options={{ title: "Orders" }} />
      <Drawer.Screen name="profile" options={{ title: "Profile" }} />
      <Drawer.Screen name="settings" options={{ title: "Settings" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  userInfo: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  drawerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  drawerItemFocused: {
    backgroundColor: "#f0f0f0",
  },
  drawerLabel: {
    fontSize: 16,
    color: "#333",
  },
  drawerLabelFocused: {
    fontWeight: "bold",
    color: "#FF6B6B",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8d7da",
    padding: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    color: "#721c24",
    fontWeight: "600",
  },
});