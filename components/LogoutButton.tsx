// components/LogoutButton.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Alert, Text, TouchableOpacity } from 'react-native';

export default function LogoutButton() {
  const router = useRouter();

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
            // Clear all user data from AsyncStorage
            const keys = [
              'user_id',
              'user_full_name',
              'user_email',
              'user_role',
              'auth_token',
              'isLoggedIn',
              'cart'
            ];
            await AsyncStorage.multiRemove(keys);
            
            // Optional: also clear any other app data
            // await AsyncStorage.clear(); // Use carefully
            
            // Redirect to login screen
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        marginTop: 20,
        backgroundColor: '#f8d7da',
        borderRadius: 8,
      }}
    >
      <Text style={{ fontSize: 18, marginRight: 12 }}>🚪</Text>
      <Text style={{ fontSize: 16, color: '#721c24', fontWeight: '600' }}>Logout</Text>
    </TouchableOpacity>
  );
}