import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';

export default function DebugScreen() {
  const [storageData, setStorageData] = useState({});

  useEffect(() => {
    const getAllData = async () => {
      const keys = ['user_id', 'user_full_name', 'user_email', 'user_role', 'auth_token', 'isLoggedIn'];
      const result = {};
      for (let key of keys) {
        result[key] = await AsyncStorage.getItem(key);
      }
      setStorageData(result);
    };
    getAllData();
  }, []);

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Stored Data:</Text>
      {Object.entries(storageData).map(([key, value]) => (
        <Text key={key}>{key}: {value || '❌ not set'}</Text>
      ))}
    </ScrollView>
  );
}