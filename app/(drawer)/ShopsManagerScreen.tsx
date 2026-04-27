import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Import for user_id
import DateTimePicker from '@react-native-community/datetimepicker';
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
  View
} from "react-native";

// 🔥 APNE PC KA ACTUAL IP YAHAN DALO
const API_BASE_URL = "http://192.168.1.114:8000";
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

const getShops = async () => {
  try {
    console.log(`🌐 Fetching: ${API_BASE_URL}/shops/`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE_URL}/shops/`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Loaded ${data.length} shops`);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("❌ Request timeout - Backend not responding");
      Alert.alert(
        "Timeout Error",
        `Backend at ${API_BASE_URL} is not responding.\n\nMake sure:\n1. Backend is running\n2. Phone and PC on same WiFi\n3. Windows Firewall allows port 8000`
      );
    } else {
      console.error("❌ Network error:", error.message);
      Alert.alert(
        "Connection Error",
        `Cannot connect to backend at ${API_BASE_URL}\n\nError: ${error.message}`
      );
    }
    return [];
  }
};

const createShop = async (data) => {
  try {
    console.log(`🌐 Creating shop at: ${API_BASE_URL}/shops/`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE_URL}/shops/`, {
      method: "POST",
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}: Failed to create shop`);
    }
    
    const result = await response.json();
    console.log(`✅ Shop created with ID: ${result.id}`);
    return result;
  } catch (error) {
    console.error("❌ Create error:", error.message);
    Alert.alert("Error", error.message);
    throw error;
  }
};

const updateShop = async (id, data) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE_URL}/shops/${id}`, {
      method: "PUT",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to update shop");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error updating shop:", error);
    Alert.alert("Error", error.message);
    throw error;
  }
};

const deleteShop = async (id) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${API_BASE_URL}/shops/${id}`, {
      method: "DELETE",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to delete shop");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error deleting shop:", error);
    Alert.alert("Error", error.message);
    throw error;
  }
};

const WORKING_DAYS_OPTIONS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

export default function ShopsManagerScreen() {
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showOpeningTimePicker, setShowOpeningTimePicker] = useState(false);
  const [showClosingTimePicker, setShowClosingTimePicker] = useState(false);
  const [tempOpeningTime, setTempOpeningTime] = useState(new Date());
  const [tempClosingTime, setTempClosingTime] = useState(new Date());
  
  // Time format states (12-hour format with AM/PM)
  const [isOpeningTimeAM, setIsOpeningTimeAM] = useState(true);
  const [isClosingTimeAM, setIsClosingTimeAM] = useState(true);

  const [form, setForm] = useState({
    name: "",
    owner_name: "",
    phone: "",
    email: "",
    logo: "",
    address_line: "",
    opening_time: "",
    closing_time: "",
    working_days: ""
  });

  // Search filter - only by shop name and owner name
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredShops(shops);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = shops.filter(shop => 
        shop.name?.toLowerCase().includes(query) ||
        shop.owner_name?.toLowerCase().includes(query)
      );
      setFilteredShops(filtered);
    }
  }, [searchQuery, shops]);

  const loadShops = async () => {
    setLoading(true);
    const data = await getShops();
    setShops(data || []);
    setFilteredShops(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const info = await checkNetworkConnectivity();
      setNetworkInfo(info);
      await loadShops();
    };
    init();
  }, []);

  // Helper function to convert 24-hour time to 12-hour format with AM/PM
  const convertTo12HourFormat = (time24) => {
    if (!time24) return { time12: "", isAM: true };
    
    const [hours, minutes, seconds] = time24.split(':');
    let hour = parseInt(hours);
    const isAM = hour < 12;
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    
    return {
      time12: `${hour12.toString().padStart(2, '0')}:${minutes}`,
      isAM: isAM
    };
  };

  // Helper function to convert 12-hour time with AM/PM to 24-hour format
  const convertTo24HourFormat = (time12, isAM) => {
    if (!time12) return "";
    
    let [hours, minutes] = time12.split(':');
    let hour = parseInt(hours);
    
    if (!isAM && hour !== 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const openCreate = () => {
    setForm({
      name: "",
      owner_name: "",
      phone: "",
      email: "",
      logo: "",
      address_line: "",
      opening_time: "",
      closing_time: "",
      working_days: ""
    });
    setIsOpeningTimeAM(true);
    setIsClosingTimeAM(true);
    setTempOpeningTime(new Date());
    setTempClosingTime(new Date());
    setEditMode(false);
    setSelectedId(null);
    setModalVisible(true);
  };

  const openEdit = async (id) => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/shops/${id}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data) {
        setForm({
          name: data.name || "",
          owner_name: data.owner_name || "",
          phone: data.phone || "",
          email: data.email || "",
          logo: data.logo || "",
          address_line: data.address_line || "",
          opening_time: data.opening_time || "",
          closing_time: data.closing_time || "",
          working_days: data.working_days || ""
        });
        
        // Convert times to 12-hour format for display
        if (data.opening_time) {
          const { time12, isAM } = convertTo12HourFormat(data.opening_time);
          setIsOpeningTimeAM(isAM);
        }
        if (data.closing_time) {
          const { time12, isAM } = convertTo12HourFormat(data.closing_time);
          setIsClosingTimeAM(isAM);
        }
        
        setSelectedId(id);
        setEditMode(true);
        setModalVisible(true);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load shop details: " + error.message);
    }
    setLoading(false);
  };

  const toggleWorkingDay = (day) => {
    let currentDays = form.working_days ? form.working_days.split(",").map(d => d.trim()) : [];
    
    if (currentDays.includes(day)) {
      currentDays = currentDays.filter(d => d !== day);
    } else {
      currentDays.push(day);
    }
    
    setForm({ ...form, working_days: currentDays.join(",") });
  };

  const onOpeningTimeChange = (event, selectedDate) => {
    setShowOpeningTimePicker(false);
    if (selectedDate) {
      setTempOpeningTime(selectedDate);
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const isAM = hours < 12;
      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12;
      const time12 = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      setIsOpeningTimeAM(isAM);
      // Store in 24-hour format for backend
      const time24 = convertTo24HourFormat(time12, isAM);
      setForm({ ...form, opening_time: time24 });
    }
  };

  const onClosingTimeChange = (event, selectedDate) => {
    setShowClosingTimePicker(false);
    if (selectedDate) {
      setTempClosingTime(selectedDate);
      const hours = selectedDate.getHours();
      const minutes = selectedDate.getMinutes();
      const isAM = hours < 12;
      let hour12 = hours % 12;
      if (hour12 === 0) hour12 = 12;
      const time12 = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      setIsClosingTimeAM(isAM);
      // Store in 24-hour format for backend
      const time24 = convertTo24HourFormat(time12, isAM);
      setForm({ ...form, closing_time: time24 });
    }
  };

  // ✅ UPDATED handleSave - includes user_id from AsyncStorage
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Validation Error", "Shop name is required");
      return;
    }
    if (!form.owner_name.trim()) {
      Alert.alert("Validation Error", "Owner name is required");
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert("Validation Error", "Phone number is required");
      return;
    }

    // ✅ Get logged-in user ID from AsyncStorage
    let userId = null;
    try {
      userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        Alert.alert("Error", "User not logged in. Please login again.");
        return;
      }
    } catch (err) {
      Alert.alert("Error", "Failed to get user info");
      return;
    }

    // ✅ Prepare data for API
    const apiData = {
      user_id: parseInt(userId),   // ✅ Add user_id to the payload
      name: form.name,
      owner_name: form.owner_name,
      phone: form.phone,
      email: form.email || null,
      logo: form.logo || null,
      address_line: form.address_line || null,
      opening_time: form.opening_time || null,
      closing_time: form.closing_time || null,
      working_days: form.working_days || null
    };

    setLoading(true);
    
    try {
      if (editMode) {
        // For update, do NOT send user_id (to avoid changing owner accidentally)
        const updateData = { ...apiData };
        delete updateData.user_id;
        await updateShop(selectedId, updateData);
        Alert.alert("Success", "Shop updated successfully");
      } else {
        await createShop(apiData);
        Alert.alert("Success", "Shop created successfully");
      }
      
      setModalVisible(false);
      await loadShops();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Delete Shop", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await deleteShop(id);
            Alert.alert("Success", "Shop deleted successfully");
            await loadShops();
          } catch (error) {
            console.error("Delete error:", error);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Format time for display (convert 24-hour to 12-hour with AM/PM)
  const formatDisplayTime = (time24) => {
    if (!time24) return "N/A";
    const { time12, isAM } = convertTo12HourFormat(time24);
    return `${time12} ${isAM ? 'AM' : 'PM'}`;
  };

  const renderShopItem = ({ item }) => (
    <View
      style={{
        padding: 12,
        borderWidth: 1,
        marginBottom: 10,
        borderRadius: 8,
        backgroundColor: "#fff",
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>
        {item.name}
      </Text>
      
      <Text style={{ marginTop: 4 }}>👤 Owner: {item.owner_name}</Text>
      <Text>📞 Phone: {item.phone}</Text>
      {item.email && <Text>✉️ Email: {item.email}</Text>}
      
      {item.address_line && (
        <Text>📍 Address: {item.address_line}</Text>
      )}
      
      {(item.opening_time || item.closing_time) && (
        <Text>🕐 Hours: {formatDisplayTime(item.opening_time)} - {formatDisplayTime(item.closing_time)}</Text>
      )}
      
      {item.working_days && (
        <Text>📅 Working Days: {item.working_days}</Text>
      )}
      
      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TouchableOpacity onPress={() => openEdit(item.id)} disabled={loading}>
          <Text style={{ color: "blue", marginRight: 15, fontSize: 16 }}>
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} disabled={loading}>
          <Text style={{ color: "red", fontSize: 16 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Get display time for button
  const getOpeningDisplayTime = () => {
    if (form.opening_time) {
      const { time12, isAM } = convertTo12HourFormat(form.opening_time);
      return `${time12} ${isAM ? 'AM' : 'PM'}`;
    }
    return "Select Time";
  };

  const getClosingDisplayTime = () => {
    if (form.closing_time) {
      const { time12, isAM } = convertTo12HourFormat(form.closing_time);
      return `${time12} ${isAM ? 'AM' : 'PM'}`;
    }
    return "Select Time";
  };

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
          placeholder="Search by shop name or owner name..."
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
        <Text style={{ color: "white", textAlign: "center" }}>
          {loading ? "Loading..." : "+ Add Shop"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={loadShops}
        disabled={loading}
        style={{
          backgroundColor: loading ? "gray" : "#007bff",
          padding: 10,
          marginBottom: 10,
          borderRadius: 6,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {loading ? "Loading..." : "🔄 Refresh"}
        </Text>
      </TouchableOpacity>

      {loading && shops.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          Loading shops from backend...
        </Text>
      ) : (
        <FlatList
          data={filteredShops}
          keyExtractor={(item, index) => String(item?.id || index)}
          ListEmptyComponent={() => (
            <View style={{ marginTop: 20 }}>
              <Text style={{ textAlign: "center" }}>
                {searchQuery ? "No shops match your search." : "No shops found. Tap + Add Shop to create one."}
              </Text>
              <Text style={{ textAlign: "center", marginTop: 10, color: 'gray' }}>
                Backend: {API_BASE_URL}
              </Text>
            </View>
          )}
          renderItem={renderShopItem}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <ScrollView style={{ padding: 20, marginTop: 40 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
            {editMode ? "Edit Shop" : "Create New Shop"}
          </Text>

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>Basic Information</Text>
          
          <TextInput
            placeholder="Shop Name *"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <TextInput
            placeholder="Owner Name *"
            value={form.owner_name}
            onChangeText={(t) => setForm({ ...form, owner_name: t })}
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <TextInput
            placeholder="Phone Number *"
            value={form.phone}
            onChangeText={(t) => setForm({ ...form, phone: t })}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <TextInput
            placeholder="Email (Optional)"
            value={form.email}
            onChangeText={(t) => setForm({ ...form, email: t })}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <Text style={{ fontWeight: "bold", marginTop: 15 }}>Address Information</Text>
          
          <TextInput
            placeholder="Address Line"
            value={form.address_line}
            onChangeText={(t) => setForm({ ...form, address_line: t })}
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 6 }}
          />

          <Text style={{ fontWeight: "bold", marginTop: 15 }}>Working Hours</Text>
          
          <TouchableOpacity
            onPress={() => setShowOpeningTimePicker(true)}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 6,
              padding: 10,
              marginBottom: 10,
              backgroundColor: '#fff'
            }}
          >
            <Text>
              Opening Time: {getOpeningDisplayTime()}
            </Text>
          </TouchableOpacity>

          {showOpeningTimePicker && (
            <DateTimePicker
              value={tempOpeningTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onOpeningTimeChange}
            />
          )}

          <TouchableOpacity
            onPress={() => setShowClosingTimePicker(true)}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 6,
              padding: 10,
              marginBottom: 10,
              backgroundColor: '#fff'
            }}
          >
            <Text>
              Closing Time: {getClosingDisplayTime()}
            </Text>
          </TouchableOpacity>

          {showClosingTimePicker && (
            <DateTimePicker
              value={tempClosingTime}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onClosingTimeChange}
            />
          )}

          <Text style={{ fontWeight: "bold", marginTop: 10 }}>Working Days</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 20 }}>
            {WORKING_DAYS_OPTIONS.map(day => {
              const isSelected = form.working_days?.split(",").map(d => d.trim()).includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => toggleWorkingDay(day)}
                  style={{
                    backgroundColor: isSelected ? "#007bff" : "#e0e0e0",
                    padding: 8,
                    margin: 4,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: isSelected ? "white" : "black" }}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
              {loading ? "Processing..." : (editMode ? "Update Shop" : "Create Shop")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setModalVisible(false)} disabled={loading}>
            <Text style={{ textAlign: "center", color: "gray", marginBottom: 40 }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}