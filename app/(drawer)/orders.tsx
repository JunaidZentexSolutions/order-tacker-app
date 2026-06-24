import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { API_BASE_URL } from "../../constants/config";

const { width } = Dimensions.get('window');

const formatPrice = (price) => {
  if (!price || isNaN(price)) return 'Rs 0.00';
  return `Rs ${parseFloat(price).toFixed(2)}`;
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  let cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Format date to YYYY-MM-DD
const formatDateToYMD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in YYYY-MM-DD
const getTodayDate = () => formatDateToYMD(new Date());

// Get yesterday's date
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateToYMD(yesterday);
};

// ============================================
// ORDER STATUS COLORS
// ============================================
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return '#FFA500';
    case 'processing': return '#2196F3';
    case 'completed': return '#4CAF50';
    case 'cancelled': return '#f44336';
    default: return '#999';
  }
};

const getStatusBgColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return '#FFF3E0';
    case 'processing': return '#E3F2FD';
    case 'completed': return '#E8F5E9';
    case 'cancelled': return '#FFEBEE';
    default: return '#F5F5F5';
  }
};

const getPaymentStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'paid': return '#4CAF50';
    case 'partial': return '#FF9800';
    case 'pending': return '#f44336';
    default: return '#999';
  }
};

// ============================================
// DATE FILTER MODAL
// ============================================
const DateFilterModal = ({ visible, onClose, onApplyFilter, currentFilter }) => {
  const [selectedRange, setSelectedRange] = useState(currentFilter?.range || 'today');
  const [startDate, setStartDate] = useState(currentFilter?.startDate || getTodayDate());
  const [endDate, setEndDate] = useState(currentFilter?.endDate || getTodayDate());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const ranges = [
    { id: 'today', label: 'Today', value: 'today' },
    { id: 'yesterday', label: 'Yesterday', value: 'yesterday' },
    { id: 'this_week', label: 'This Week', value: 'this_week' },
    { id: 'this_month', label: 'This Month', value: 'this_month' },
    { id: 'custom', label: 'Custom Range', value: 'custom' }
  ];

  const handleApply = () => {
    let start = startDate;
    let end = endDate;
    
    if (selectedRange === 'today') {
      start = getTodayDate();
      end = getTodayDate();
    } else if (selectedRange === 'yesterday') {
      start = getYesterdayDate();
      end = getYesterdayDate();
    } else if (selectedRange === 'this_week') {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      start = formatDateToYMD(monday);
      end = getTodayDate();
    } else if (selectedRange === 'this_month') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDateToYMD(firstDay);
      end = getTodayDate();
    }
    
    onApplyFilter({
      range: selectedRange,
      startDate: start,
      endDate: end
    });
    onClose();
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(formatDateToYMD(selectedDate));
      if (selectedRange !== 'custom') setSelectedRange('custom');
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(formatDateToYMD(selectedDate));
      if (selectedRange !== 'custom') setSelectedRange('custom');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Filter by Date</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 24 }}>✕</Text></TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {ranges.map((range) => (
              <TouchableOpacity
                key={range.id}
                onPress={() => setSelectedRange(range.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f0f0f0'
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedRange === range.value ? '#FF6B6B' : '#ccc',
                  backgroundColor: selectedRange === range.value ? '#FF6B6B' : 'transparent',
                  marginRight: 12,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  {selectedRange === range.value && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />}
                </View>
                <Text style={{ fontSize: 16 }}>{range.label}</Text>
              </TouchableOpacity>
            ))}
            
            {selectedRange === 'custom' && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>Start Date</Text>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12 }}
                >
                  <Text>{startDate}</Text>
                </TouchableOpacity>
                
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>End Date</Text>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginBottom: 12 }}
                >
                  <Text>{endDate}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          
          {showStartPicker && (
            <DateTimePicker
              value={new Date(startDate)}
              mode="date"
              display="default"
              onChange={onStartDateChange}
            />
          )}
          
          {showEndPicker && (
            <DateTimePicker
              value={new Date(endDate)}
              mode="date"
              display="default"
              onChange={onEndDateChange}
            />
          )}
          
          <TouchableOpacity
            onPress={handleApply}
            style={{ backgroundColor: '#FF6B6B', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// EDIT ORDER MODAL
// ============================================
const EditOrderModal = ({ visible, order, onClose, onUpdate }) => {
  const [status, setStatus] = useState(order?.status || 'pending');
  const [paymentStatus, setPaymentStatus] = useState(order?.payment_status || 'pending');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (order) {
      setStatus(order.status || 'pending');
      setPaymentStatus(order.payment_status || 'pending');
    }
  }, [order]);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/sales-orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: order.branch_id,
          customer_id: order.customer_id,
          user_id: parseInt(userId),
          total_amount: order.total_amount,
          discount: order.discount,
          tax_amount: order.tax_amount,
          grand_total: order.grand_total,
          status: status,
          payment_status: paymentStatus
        })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      const updatedOrder = await response.json();
      Alert.alert('Success', 'Order updated successfully');
      onUpdate(updatedOrder);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Edit Order #{order?.id}</Text>
        </View>
        
        <ScrollView style={{ padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Order Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['pending', 'processing', 'completed', 'cancelled'].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatus(s)}
                  style={{
                    backgroundColor: status === s ? getStatusColor(s) : '#f0f0f0',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 10,
                    marginBottom: 10
                  }}
                >
                  <Text style={{ color: status === s ? '#fff' : '#333', fontWeight: '500' }}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Payment Status</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['pending', 'partial', 'paid'].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setPaymentStatus(s)}
                  style={{
                    backgroundColor: paymentStatus === s ? getPaymentStatusColor(s) : '#f0f0f0',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 10,
                    marginBottom: 10
                  }}
                >
                  <Text style={{ color: paymentStatus === s ? '#fff' : '#333', fontWeight: '500' }}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={updating}
            style={{ backgroundColor: updating ? '#adb5bd' : '#FF6B6B', padding: 16, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{updating ? 'Updating...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ============================================
// EDIT ORDER ITEM MODAL
// ============================================
const EditOrderItemModal = ({ visible, item, orderId, onClose, onUpdate }) => {
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [unitPrice, setUnitPrice] = useState(item?.unit_price?.toString() || '0');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity?.toString() || '1');
      setUnitPrice(item.unit_price?.toString() || '0');
    }
  }, [item]);

  const handleUpdate = async () => {
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Price must be greater than 0');
      return;
    }
    
    setUpdating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const totalPrice = qty * price;
      
      const response = await fetch(`${API_BASE_URL}/sales-order-items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sales_order_id: orderId,
          product_id: item.product_id,
          unit_id: item.unit_id || 1,
          quantity: qty,
          unit_price: price,
          total_price: totalPrice
        })
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      Alert.alert('Success', 'Order item updated successfully');
      
      const orderResponse = await fetch(`${API_BASE_URL}/sales-orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updatedOrder = await orderResponse.json();
      onUpdate(updatedOrder);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_BASE_URL}/sales-order-items/${item.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (!response.ok) throw new Error('Delete failed');
              
              Alert.alert('Success', 'Item removed from order');
              const orderResponse = await fetch(`${API_BASE_URL}/sales-orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const updatedOrder = await orderResponse.json();
              onUpdate(updatedOrder);
              onClose();
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Edit Item</Text>
        </View>
        
        <ScrollView style={{ padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>{item?.product_name || 'Product'}</Text>
            
            <Text style={{ color: '#666', marginTop: 10 }}>Quantity</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginTop: 5, fontSize: 16 }}
            />
            
            <Text style={{ color: '#666', marginTop: 15 }}>Unit Price</Text>
            <TextInput
              value={unitPrice}
              onChangeText={setUnitPrice}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, marginTop: 5, fontSize: 16 }}
            />
            
            <Text style={{ color: '#666', marginTop: 15 }}>Total: {formatPrice(parseFloat(quantity || 0) * parseFloat(unitPrice || 0))}</Text>
            
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={updating}
              style={{ backgroundColor: updating ? '#adb5bd' : '#FF6B6B', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{updating ? 'Updating...' : 'Save Changes'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleDelete}
              disabled={updating}
              style={{ backgroundColor: '#dc3545', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ============================================
// ORDER DETAILS MODAL
// ============================================
const OrderDetailsModal = ({ visible, order, onClose, onOrderUpdate }) => {
  const [editItemModalVisible, setEditItemModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [productDetails, setProductDetails] = useState({});
  const [customerDetails, setCustomerDetails] = useState(null);

  // Fetch product details for each item
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!order?.items) return;
      
      const token = await AsyncStorage.getItem('auth_token');
      const details = {};
      
      for (const item of order.items) {
        if (item.product_id && !details[item.product_id]) {
          try {
            const response = await fetch(`${API_BASE_URL}/products/${item.product_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              const product = await response.json();
              details[item.product_id] = product;
            }
          } catch (error) {
            console.error('Error fetching product:', error);
          }
        }
      }
      setProductDetails(details);
    };
    
    fetchProductDetails();
  }, [order]);

  // Fetch customer details
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!order?.customer_id || order.customer_id === null) {
        setCustomerDetails(null);
        return;
      }
      
      const token = await AsyncStorage.getItem('auth_token');
      try {
        const response = await fetch(`${API_BASE_URL}/customers/${order.customer_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const customer = await response.json();
          setCustomerDetails(customer);
        } else {
          setCustomerDetails(null);
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        setCustomerDetails(null);
      }
    };
    
    fetchCustomerDetails();
  }, [order]);

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setEditItemModalVisible(true);
  };

  const renderOrderItem = ({ item }) => {
    const product = productDetails[item.product_id];
    const productName = product?.name || item.product_name || `Product #${item.product_id}`;
    const imageUrl = getImageUrl(product?.image_path);
    const hasImageError = imageErrors[item.id];
    
    return (
      <View style={{ flexDirection: 'row', backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, marginBottom: 10 }}>
        <View style={{ width: 60, height: 60, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          {!hasImageError && imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={{ width: 60, height: 60, borderRadius: 8 }} 
              onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))} 
              resizeMode="cover" 
            />
          ) : (
            <Text style={{ fontSize: 30 }}>📦</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{productName}</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>Qty: {item.quantity} × {formatPrice(item.unit_price)}</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#FF6B6B' }}>{formatPrice(item.total_price)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleEditItem(item)} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18 }}>✏️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!order) return null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Order #{order.id}</Text>
          </View>
          
          <ScrollView style={{ padding: 20 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Order Information</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666' }}>Date:</Text>
                <Text>{new Date(order.order_date).toLocaleDateString()}</Text>
              </View>
              
              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: '#666' }}>Customer:</Text>
                {customerDetails ? (
                  <View>
                    <Text style={{ fontWeight: 'bold' }}>{customerDetails.name}</Text>
                    {customerDetails.phone && <Text style={{ fontSize: 12, color: '#666' }}>{customerDetails.phone}</Text>}
                    {customerDetails.email && <Text style={{ fontSize: 12, color: '#666' }}>{customerDetails.email}</Text>}
                  </View>
                ) : order.customer_id ? (
                  <Text>Customer ID: {order.customer_id}</Text>
                ) : (
                  <Text>Walk-in Customer</Text>
                )}
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666' }}>Status:</Text>
                <View style={{ backgroundColor: getStatusBgColor(order.status), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ color: getStatusColor(order.status), fontWeight: 'bold' }}>{order.status?.toUpperCase()}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#666' }}>Payment:</Text>
                <Text style={{ color: getPaymentStatusColor(order.payment_status), fontWeight: 'bold' }}>{order.payment_status?.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Items ({order.items?.length || 0})</Text>
              <FlatList
                data={order.items || []}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderOrderItem}
                scrollEnabled={false}
              />
            </View>
            
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Price Summary</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666' }}>Subtotal:</Text>
                <Text>{formatPrice(order.total_amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666' }}>Discount:</Text>
                <Text style={{ color: '#4CAF50' }}>-{formatPrice(order.discount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#666' }}>Tax:</Text>
                <Text>+{formatPrice(order.tax_amount)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Grand Total:</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF6B6B' }}>{formatPrice(order.grand_total)}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      <EditOrderItemModal
        visible={editItemModalVisible}
        item={selectedItem}
        orderId={order?.id}
        onClose={() => setEditItemModalVisible(false)}
        onUpdate={onOrderUpdate}
      />
    </>
  );
};

// ============================================
// ORDER CARD COMPONENT (Separate component to avoid hook issues)
// ============================================
const OrderCard = ({ order, onPress, onEdit, customerDetails }) => {
  const customer = customerDetails[order.customer_id];
  
  return (
    <TouchableOpacity 
      onPress={() => onPress(order)}
      style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Order #{order.id}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ backgroundColor: getStatusBgColor(order.status), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: getStatusColor(order.status), fontSize: 12, fontWeight: 'bold' }}>{order.status?.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(order)} style={{ marginLeft: 10, padding: 5 }}>
            <Text style={{ fontSize: 16 }}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={{ color: '#666', marginBottom: 5 }}>
        Customer: {customer ? customer.name : (order.customer_id ? `Customer #${order.customer_id}` : 'Walk-in Customer')}
      </Text>
      {customer?.phone && <Text style={{ color: '#666', marginBottom: 5, fontSize: 12 }}>📞 {customer.phone}</Text>}
      
      <Text style={{ color: '#666', marginBottom: 5 }}>{new Date(order.order_date).toLocaleDateString()}</Text>
      <Text style={{ color: '#666', marginBottom: 10 }}>Items: {order.items?.length || 0}</Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FF6B6B' }}>{formatPrice(order.grand_total)}</Text>
        <View style={{ backgroundColor: getPaymentStatusColor(order.payment_status) + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: getPaymentStatusColor(order.payment_status), fontSize: 11 }}>{order.payment_status?.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================
// MAIN ORDERS SCREEN
// ============================================
export default function OrdersScreen() {
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [dateFilterModalVisible, setDateFilterModalVisible] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({});
  const [dateFilter, setDateFilter] = useState({
    range: 'today',
    startDate: getTodayDate(),
    endDate: getTodayDate()
  });

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const storedUserId = await AsyncStorage.getItem('user_id');
      
      if (!storedUserId) {
        Alert.alert('Error', 'User not logged in');
        setLoading(false);
        return;
      }
      
      console.log('Fetching orders for user:', storedUserId);
      
      const response = await fetch(`${API_BASE_URL}/sales-orders/?user_id=${storedUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      console.log('Orders fetched:', data.length);
      setAllOrders(data);
      applyDateFilter(data, dateFilter);
      
      // Fetch customer details for all orders
      const uniqueCustomerIds = [...new Set(data.filter(o => o.customer_id).map(o => o.customer_id))];
      const customers = {};
      
      for (const customerId of uniqueCustomerIds) {
        try {
          const custResponse = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (custResponse.ok) {
            const customer = await custResponse.json();
            customers[customerId] = customer;
          }
        } catch (error) {
          console.error('Error fetching customer:', error);
        }
      }
      setCustomerDetails(customers);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyDateFilter = (orders, dateFilter) => {
    let filtered = [...orders];
    
    if (dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(order => {
        const orderDate = formatDateToYMD(order.order_date);
        return orderDate >= dateFilter.startDate && orderDate <= dateFilter.endDate;
      });
    }
    
    filtered.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
    setFilteredOrders(filtered);
  };

  useEffect(() => {
    applyDateFilter(allOrders, dateFilter);
  }, [dateFilter, allOrders]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setDetailsModalVisible(true);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditModalVisible(true);
  };

  const handleOrderUpdate = (updatedOrder) => {
    setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
  };

  const handleDateFilterApply = (newFilter) => {
    setDateFilter(newFilter);
    setDateFilterModalVisible(false);
  };

  const getDateFilterDisplayText = () => {
    if (dateFilter.range === 'today') return 'Today';
    if (dateFilter.range === 'yesterday') return 'Yesterday';
    if (dateFilter.range === 'this_week') return 'This Week';
    if (dateFilter.range === 'this_month') return 'This Month';
    return `${dateFilter.startDate} to ${dateFilter.endDate}`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ marginTop: 10 }}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold' }}>My Orders</Text>
        <Text style={{ fontSize: 13, color: '#666' }}>{filteredOrders.length} Orders found</Text>
      </View>
      
      <View style={{ flexDirection: 'row', padding: 16, paddingBottom: 8, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={() => setDateFilterModalVisible(true)}
          style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>📅</Text>
          <Text style={{ fontSize: 14 }}>{getDateFilterDisplayText()}</Text>
          <Text style={{ fontSize: 14, marginLeft: 8 }}>▼</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard 
            order={item} 
            onPress={handleOrderPress} 
            onEdit={handleEditOrder}
            customerDetails={customerDetails}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B6B']} />}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={() => (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 60 }}>📦</Text>
            <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>No orders found</Text>
            <Text style={{ fontSize: 12, color: '#999', marginTop: 5 }}>Try changing date filter</Text>
          </View>
        )}
      />
      
      <OrderDetailsModal
        visible={detailsModalVisible}
        order={selectedOrder}
        onClose={() => setDetailsModalVisible(false)}
        onOrderUpdate={handleOrderUpdate}
      />
      
      <EditOrderModal
        visible={editModalVisible}
        order={selectedOrder}
        onClose={() => setEditModalVisible(false)}
        onUpdate={handleOrderUpdate}
      />
      
      <DateFilterModal
        visible={dateFilterModalVisible}
        onClose={() => setDateFilterModalVisible(false)}
        onApplyFilter={handleDateFilterApply}
        currentFilter={dateFilter}
      />
    </View>
  );
}