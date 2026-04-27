import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch
} from "react-native";
import { API_BASE_URL } from "../../constants/config";

console.log(`📍 Backend URL: ${API_BASE_URL}`);

const checkNetworkConnectivity = async () => {
  try {
    const ipAddress = await Network.getIpAddressAsync();
    const networkState = await Network.getNetworkStateAsync();
    console.log(`📡 Device IP: ${ipAddress}`);
    console.log(`🌐 Network connected: ${networkState.isConnected}`);
    console.log(`📶 Network type: ${networkState.type}`);
    return { ipAddress, networkState };
  } catch (error) {
    console.log("Network info error:", error);
    return null;
  }
};

// ==================== API CALLS ====================

const getCustomers = async () => {
  try {
    console.log(`🌐 Fetching: ${API_BASE_URL}/customers/`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/customers/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    console.log(`✅ Loaded ${data.length} customers`);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("❌ Request timeout - Backend not responding");
      Alert.alert("Timeout Error", `Backend at ${API_BASE_URL} is not responding.`);
    } else {
      console.error("❌ Network error:", error.message);
      Alert.alert("Connection Error", `Cannot connect to backend at ${API_BASE_URL}\n\nError: ${error.message}`);
    }
    return [];
  }
};

const createCustomer = async (data) => {
  try {
    console.log(`🌐 Creating customer at: ${API_BASE_URL}/customers/`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/customers/`, {
      method: "POST",
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}: Failed to create customer`);
    }
    const result = await response.json();
    console.log(`✅ Customer created with ID: ${result.id}`);
    return result;
  } catch (error) {
    console.error("❌ Create error:", error.message);
    Alert.alert("Error", error.message);
    throw error;
  }
};

const updateCustomer = async (id, data) => {
  try {
    console.log(`🌐 Updating customer ${id} at: ${API_BASE_URL}/customers/${id}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "PUT",
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to update customer");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating customer:", error);
    Alert.alert("Error", error.message);
    throw error;
  }
};

// ==================== MAIN SCREEN ====================

export default function CustomersManagerScreen() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    is_walkin: false
  });

  // Search filter – by name, phone, email, or address
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(c =>
        (c.name?.toLowerCase() || "").includes(query) ||
        (c.phone?.toLowerCase() || "").includes(query) ||
        (c.email?.toLowerCase() || "").includes(query) ||
        (c.address?.toLowerCase() || "").includes(query)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await getCustomers();
    setCustomers(data || []);
    setFilteredCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const info = await checkNetworkConnectivity();
      setNetworkInfo(info);
      await loadCustomers();
    };
    init();
  }, []);

  const openCreate = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      is_walkin: false
    });
    setEditMode(false);
    setSelectedId(null);
    setModalVisible(true);
  };

  const openEdit = async (id) => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data) {
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          is_walkin: data.is_walkin || false
        });
        setSelectedId(id);
        setEditMode(true);
        setModalVisible(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load customer details: " + error.message);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Validation Error", "Customer name is required");
      return;
    }

    // Prepare data for API (remove empty strings for optional fields)
    const apiData = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      is_walkin: form.is_walkin
    };

    setLoading(true);
    try {
      if (editMode) {
        await updateCustomer(selectedId, apiData);
        Alert.alert("Success", "Customer updated successfully");
      } else {
        await createCustomer(apiData);
        Alert.alert("Success", "Customer created successfully");
      }
      setModalVisible(false);
      await loadCustomers();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomerItem = ({ item }) => (
    <View style={{
      padding: 12,
      borderWidth: 1,
      marginBottom: 10,
      borderRadius: 8,
      backgroundColor: "#fff",
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>{item.name}</Text>
        {item.is_walkin && (
          <View style={{ backgroundColor: '#ffc107', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#000' }}>Walk-in</Text>
          </View>
        )}
      </View>
      {item.phone && <Text>📞 Phone: {item.phone}</Text>}
      {item.email && <Text>✉️ Email: {item.email}</Text>}
      {item.address && <Text>📍 Address: {item.address}</Text>}
      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TouchableOpacity onPress={() => openEdit(item.id)} disabled={loading}>
          <Text style={{ color: "blue", marginRight: 15, fontSize: 16 }}>Edit</Text>
        </TouchableOpacity>
        {/* No Delete button - as required */}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 15 }}>
      {networkInfo && (
        <View style={{ 
          backgroundColor: networkInfo?.networkState?.isConnected ? '#d4edda' : '#f8d7da',
          padding: 8,
          marginBottom: 10,
          borderRadius: 6,
        }}>
          <Text style={{ fontSize: 12 }}>
            {networkInfo?.networkState?.isConnected ? '✅ Connected' : '❌ No Network'} | 
            IP: {networkInfo?.ipAddress || 'Unknown'} | 
            Backend: {API_BASE_URL}
          </Text>
        </View>
      )}
      
      {/* Search Bar */}
      <View style={{ 
        flexDirection: 'row', 
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        alignItems: 'center'
      }}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
        <TextInput
          placeholder="Search by name, phone, email, address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ flex: 1, padding: 10 }}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={{ color: 'red' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        onPress={openCreate}
        disabled={loading}
        style={{
          backgroundColor: loading ? "gray" : "green",
          padding: 10,
          marginBottom: 10,
          borderRadius: 6,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>+ Add Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={loadCustomers}
        disabled={loading}
        style={{
          backgroundColor: loading ? "gray" : "#007bff",
          padding: 10,
          marginBottom: 10,
          borderRadius: 6,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>🔄 Refresh</Text>
      </TouchableOpacity>

      {loading && customers.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>Loading customers...</Text>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item, index) => String(item?.id || index)}
          ListEmptyComponent={() => (
            <View style={{ marginTop: 20 }}>
              <Text style={{ textAlign: "center" }}>
                {searchQuery ? "No customers match your search." : "No customers found. Tap + Add Customer to create one."}
              </Text>
            </View>
          )}
          renderItem={renderCustomerItem}
        />
      )}

      {/* Modal for Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <ScrollView style={{ padding: 20, marginTop: 40 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
            {editMode ? "Edit Customer" : "Add New Customer"}
          </Text>

          <TextInput
            placeholder="Full Name *"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <TextInput
            placeholder="Phone Number (optional)"
            value={form.phone}
            onChangeText={(t) => setForm({ ...form, phone: t })}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <TextInput
            placeholder="Email (optional)"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <TextInput
            placeholder="Address (optional)"
            value={form.address}
            onChangeText={(t) => setForm({ ...form, address: t })}
            multiline
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6, minHeight: 60 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ marginRight: 10 }}>Walk-in Customer:</Text>
            <Switch
              value={form.is_walkin}
              onValueChange={(val) => setForm({ ...form, is_walkin: val })}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              backgroundColor: loading ? "gray" : "blue",
              padding: 12,
              borderRadius: 6,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "white", textAlign: "center" }}>
              {loading ? "Processing..." : (editMode ? "Update Customer" : "Create Customer")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalVisible(false)} disabled={loading}>
            <Text style={{ textAlign: "center", color: "gray", marginBottom: 40 }}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}