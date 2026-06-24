import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
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
const CARD_WIDTH = (width - 40) / 2;

// ============================================
// CART CONTEXT & STORAGE
// ============================================
let cartItems = [];
const cartListeners = [];

const saveCartToStorage = async (items) => {
  try {
    await AsyncStorage.setItem('cart', JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
};

const loadCartFromStorage = async () => {
  try {
    const saved = await AsyncStorage.getItem('cart');
    if (saved) {
      cartItems = JSON.parse(saved);
      notifyCartListeners();
    }
  } catch (error) {
    console.error('Error loading cart:', error);
  }
};

const notifyCartListeners = () => {
  cartListeners.forEach(listener => listener([...cartItems]));
};

const addToCart = (product, quantity = 1) => {
  const existingIndex = cartItems.findIndex(item => item.id === product.id);
  if (existingIndex !== -1) {
    cartItems[existingIndex].quantity += quantity;
  } else {
    cartItems.push({
      id: product.id,
      name: product.name,
      image: product.image_path || product.image,
      price: product.selling_price || product.price,
      originalPrice: product.selling_price || product.price,
      quantity: quantity,
      stock: product.stock_quantity || 0
    });
  }
  saveCartToStorage(cartItems);
  notifyCartListeners();
};

const updateCartQuantity = (productId, newQuantity) => {
  const index = cartItems.findIndex(item => item.id === productId);
  if (index !== -1) {
    if (newQuantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      cartItems[index].quantity = newQuantity;
    }
    saveCartToStorage(cartItems);
    notifyCartListeners();
  }
};

const updateCartPrice = (productId, newPrice) => {
  const index = cartItems.findIndex(item => item.id === productId);
  if (index !== -1) {
    cartItems[index].price = newPrice;
    saveCartToStorage(cartItems);
    notifyCartListeners();
  }
};

const removeFromCart = (productId) => {
  const index = cartItems.findIndex(item => item.id === productId);
  if (index !== -1) {
    cartItems.splice(index, 1);
    saveCartToStorage(cartItems);
    notifyCartListeners();
  }
};

const clearCart = () => {
  cartItems = [];
  saveCartToStorage(cartItems);
  notifyCartListeners();
};

const getCartItemCount = () => {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
};

const getSubtotal = () => {
  return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

loadCartFromStorage();

// ============================================
// NETWORK CHECK
// ============================================
const checkNetworkConnectivity = async () => {
  try {
    const ipAddress = await Network.getIpAddressAsync();
    const networkState = await Network.getNetworkStateAsync();
    return { ipAddress, networkState };
  } catch (error) {
    return null;
  }
};

// ============================================
// API CALLS
// ============================================
const getCategories = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/mobile/categories/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    Alert.alert("Connection Error", `Cannot connect to backend at ${API_BASE_URL}`);
    return [];
  }
};

const getProductsByCategory = async (categoryId, categoryName) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/mobile/category-products/${categoryId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    return [];
  }
};

const getCustomers = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/customers/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const allCustomers = await response.json();
    return allCustomers.filter(customer => !customer.is_walkin);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

const getLastPrice = async (customerId, productId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/customer-price-history/last-price/${customerId}/${productId}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.found && data.last_unit_price) {
      return parseFloat(data.last_unit_price);
    }
    return null;
  } catch (error) {
    console.error('Error fetching last price:', error);
    return null;
  }
};

const getProductById = async (productId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

const createSalesOrder = async (customerId, orderData) => {
  const url = `${API_BASE_URL}/sales-orders/mobile?customer_id=${customerId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(orderData)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return await response.json();
};

const createSalesOrderItem = async (itemData) => {
  const response = await fetch(`${API_BASE_URL}/sales-order-items/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(itemData)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return await response.json();
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
  let cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${API_BASE_URL}/${cleanPath}`;
};

const formatPrice = (price) => {
  if (!price || isNaN(price)) return 'Rs 0.00';
  return `Rs ${parseFloat(price).toFixed(2)}`;
};

// ============================================
// CHECKOUT PAGE
// ============================================
const CheckoutScreen = ({ onClose, subtotal, cartTaxPercent, cartDiscountPercent, selectedCustomer }) => {
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const getUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      setUserId(id ? parseInt(id) : null);
    };
    getUserId();
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'No customer selected');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    const branch_id = 1;
    const grandTotal = subtotal;
    const taxAmount = (subtotal * (cartTaxPercent || 0)) / 100;
    const discountAmount = (subtotal * (cartDiscountPercent || 0)) / 100;

    const orderPayload = {
      branch_id: branch_id,
      customer_id: selectedCustomer.id,
      user_id: userId,
      total_amount: subtotal,
      discount: discountAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      payment_status: "pending",
      status: "pending"
    };

    setOrderPlacing(true);
    try {
      const createdOrder = await createSalesOrder(selectedCustomer.id, orderPayload);
      const salesOrderId = createdOrder.id;
      for (const item of cartItems) {
        const itemPayload = {
          sales_order_id: salesOrderId,
          product_id: item.id,
          unit_id: 1,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        };
        await createSalesOrderItem(itemPayload);
      }
      clearCart();
      Alert.alert(
        'Order Placed Successfully!',
        `Order #${salesOrderId}\nCustomer: ${selectedCustomer.name}\nTotal: ${formatPrice(grandTotal)}`,
        [{ text: 'OK', onPress: () => onClose() }]
      );
    } catch (error) {
      Alert.alert('Order Failed', error.message);
    } finally {
      setOrderPlacing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Checkout</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Order Summary</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>Total</Text><Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>{formatPrice(subtotal)}</Text>
          </View>
        </View>
        <View style={{ backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Customer</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{selectedCustomer?.name || 'Not selected'}</Text>
            {selectedCustomer?.phone && <Text style={{ color: '#666' }}>{selectedCustomer.phone}</Text>}
            {selectedCustomer?.address && <Text style={{ color: '#666' }}>{selectedCustomer.address}</Text>}
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity onPress={handlePlaceOrder} disabled={orderPlacing || !selectedCustomer} style={{ backgroundColor: (!selectedCustomer || orderPlacing) ? '#adb5bd' : '#FF6B6B', padding: 15, margin: 16, borderRadius: 12 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>{orderPlacing ? 'Placing Order...' : 'Confirm Order'}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// CART PAGE
// ============================================
const CartScreen = ({ onClose, onCheckout }) => {
  const [cartItemsState, setCartItemsState] = useState(cartItems);
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const [taxPercent, setTaxPercent] = useState(0);
  const [lastPriceEnabled, setLastPriceEnabled] = useState(false);
  const [selectedCustomerForLastPrice, setSelectedCustomerForLastPrice] = useState(null);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customersList, setCustomersList] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomersList, setFilteredCustomersList] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [applyingLastPrice, setApplyingLastPrice] = useState(false);
  const [priceDetailsVisible, setPriceDetailsVisible] = useState(true);
  const [editPriceModalVisible, setEditPriceModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newPriceValue, setNewPriceValue] = useState('');
  const [originalSellingPrice, setOriginalSellingPrice] = useState(0);

  useEffect(() => {
    const updateCart = (items) => setCartItemsState([...items]);
    cartListeners.push(updateCart);
    return () => {
      const index = cartListeners.indexOf(updateCart);
      if (index !== -1) cartListeners.splice(index, 1);
    };
  }, []);

  const loadCustomersList = async () => {
    setLoadingCustomers(true);
    const customers = await getCustomers();
    setCustomersList(customers);
    setFilteredCustomersList(customers);
    setLoadingCustomers(false);
  };

  useEffect(() => {
    if (!customerSearch.trim()) {
      setFilteredCustomersList(customersList);
    } else {
      const query = customerSearch.toLowerCase();
      const filtered = customersList.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        (c.address && c.address.toLowerCase().includes(query))
      );
      setFilteredCustomersList(filtered);
    }
  }, [customerSearch, customersList]);

  const applyLastPriceToItem = async (item, customerId) => {
    const lastPrice = await getLastPrice(customerId, item.id);
    if (lastPrice && lastPrice !== item.price) {
      updateCartPrice(item.id, lastPrice);
      return true;
    }
    return false;
  };

  const applyLastPriceToAll = async (customerId) => {
    setApplyingLastPrice(true);
    let updatedCount = 0;
    for (const item of cartItemsState) {
      const success = await applyLastPriceToItem(item, customerId);
      if (success) updatedCount++;
    }
    setApplyingLastPrice(false);
    if (updatedCount > 0) {
      Alert.alert('Success', `Last prices applied to ${updatedCount} product(s) for ${selectedCustomerForLastPrice?.name}`);
    } else {
      Alert.alert('Info', 'No last prices found for any product');
    }
  };

  const restoreOriginalPrices = () => {
    let restored = 0;
    cartItemsState.forEach(item => {
      if (item.originalPrice && item.price !== item.originalPrice) {
        updateCartPrice(item.id, item.originalPrice);
        restored++;
      }
    });
    if (restored > 0) Alert.alert('Success', `Restored original prices for ${restored} product(s)`);
    else Alert.alert('Info', 'No changes to restore');
  };

  const selectCustomerForLastPrice = (customer) => {
    setSelectedCustomerForLastPrice(customer);
    setCustomerModalVisible(false);
    if (lastPriceEnabled) {
      applyLastPriceToAll(customer.id);
    } else {
      Alert.alert('Customer Selected', `${customer.name} selected. Turn ON Last Price to apply.`);
    }
  };

  const toggleLastPrice = () => {
    const newState = !lastPriceEnabled;
    setLastPriceEnabled(newState);
    if (newState && selectedCustomerForLastPrice) {
      applyLastPriceToAll(selectedCustomerForLastPrice.id);
    } else if (!newState && selectedCustomerForLastPrice) {
      restoreOriginalPrices();
    } else if (newState && !selectedCustomerForLastPrice) {
      Alert.alert('Select Customer', 'Please select a customer first to use Last Price');
      setLastPriceEnabled(false);
      setCustomerModalVisible(true);
    }
  };

  const openEditPriceModal = async (item) => {
    setEditingProduct(item);
    setNewPriceValue(item.price.toString());
    try {
      const productData = await getProductById(item.id);
      if (productData && productData.selling_price) {
        setOriginalSellingPrice(parseFloat(productData.selling_price));
      } else {
        setOriginalSellingPrice(item.originalPrice || item.price);
      }
    } catch (error) {
      setOriginalSellingPrice(item.originalPrice || item.price);
    }
    setEditPriceModalVisible(true);
  };

  const handleUpdatePrice = () => {
    const price = parseFloat(newPriceValue);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than 0.');
      return;
    }
    if (price < originalSellingPrice) {
      Alert.alert(
        'Price Validation Failed', 
        `You cannot set a price (${formatPrice(price)}) less than the actual selling price (${formatPrice(originalSellingPrice)}).\n\nMinimum allowed price: ${formatPrice(originalSellingPrice)}`,
        [{ text: 'OK' }]
      );
      return;
    }
    updateCartPrice(editingProduct.id, price);
    setEditPriceModalVisible(false);
    setEditingProduct(null);
    Alert.alert('Success', `Price updated to ${formatPrice(price)}`);
  };

  const subtotal = getSubtotal();
  const taxAmount = (subtotal * taxPercent) / 100;
  const discountAmount = (subtotal * discountPercent) / 100;
  const totalAmount = subtotal + taxAmount - discountAmount;

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'SAVE10') {
      setDiscountPercent(10);
      Alert.alert('Success', '10% discount applied!');
      setShowCoupon(false);
      setCouponCode('');
    } else if (couponCode.toUpperCase() === 'SAVE20') {
      setDiscountPercent(20);
      Alert.alert('Success', '20% discount applied!');
      setShowCoupon(false);
      setCouponCode('');
    } else {
      Alert.alert('Invalid', 'Invalid coupon code');
    }
  };

  if (cartItemsState.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold' }}>My Cart</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 80, marginBottom: 20 }}>🛒</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Your cart is empty</Text>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, backgroundColor: '#FF6B6B', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>My Cart</Text>
        <Text style={{ fontSize: 14, color: '#666', marginLeft: 10 }}>{getCartItemCount()} items</Text>
      </View>

      <View style={{ backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 }}>
        <TouchableOpacity onPress={toggleLastPrice} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: lastPriceEnabled ? '#198754' : '#6c757d', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}>
          <Text style={{ color: '#fff', marginRight: 8 }}>{lastPriceEnabled ? 'Last Price ON' : 'Last Price OFF'}</Text>
          <Text style={{ fontSize: 18, color: '#fff' }}>{lastPriceEnabled ? '✅' : '❌'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setCustomerModalVisible(true); loadCustomersList(); }} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d6efd', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 }}>
          <Text style={{ color: '#fff' }}>{selectedCustomerForLastPrice ? selectedCustomerForLastPrice.name : 'Select Customer'}</Text>
          <Text style={{ fontSize: 16, color: '#fff', marginLeft: 8 }}>▼</Text>
        </TouchableOpacity>
        {selectedCustomerForLastPrice && !lastPriceEnabled && (
          <TouchableOpacity onPress={() => applyLastPriceToAll(selectedCustomerForLastPrice.id)} style={{ backgroundColor: '#FF6B6B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
            <Text style={{ color: '#fff' }}>Apply Now</Text>
          </TouchableOpacity>
        )}
        {selectedCustomerForLastPrice && (
          <TouchableOpacity onPress={restoreOriginalPrices} style={{ backgroundColor: '#dc3545', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 }}>
            <Text style={{ color: '#fff' }}>Reset Prices</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={cartItemsState}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, margin: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 3 }}>
            <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {item.image && !imageErrors[item.id] ? (
                <Image source={{ uri: getImageUrl(item.image) }} style={{ width: 80, height: 80 }} onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))} resizeMode="cover" />
              ) : <Text style={{ fontSize: 40 }}>📦</Text>}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 15, color: '#FF6B6B', fontWeight: 'bold' }}>{formatPrice(item.price)}</Text>
                <TouchableOpacity onPress={() => openEditPriceModal(item)} style={{ marginLeft: 10, padding: 4 }}>
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 25, padding: 4 }}>
                  <TouchableOpacity onPress={() => updateCartQuantity(item.id, item.quantity - 1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginHorizontal: 12 }}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateCartQuantity(item.id, item.quantity + 1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Total: {formatPrice(item.price * item.quantity)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 22, color: '#dc3545' }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <View style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
        <TouchableOpacity
          onPress={() => setPriceDetailsVisible(!priceDetailsVisible)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>Price Details</Text>
          <Text style={{ fontSize: 22, color: '#666' }}>{priceDetailsVisible ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {priceDetailsVisible && (
          <View style={{ padding: 16, paddingTop: 0 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#666' }}>Subtotal ({getCartItemCount()} items)</Text>
              <Text style={{ fontWeight: 'bold' }}>{formatPrice(subtotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#666' }}>Tax (%)</Text>
              <TextInput placeholder="0" value={taxPercent.toString()} onChangeText={(text) => setTaxPercent(parseFloat(text) || 0)} keyboardType="numeric" style={{ width: 80, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 8, textAlign: 'center' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text>Tax Amount</Text>
              <Text>{formatPrice(taxAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text>Discount (%)</Text>
              <TextInput placeholder="0" value={discountPercent.toString()} onChangeText={(text) => setDiscountPercent(parseFloat(text) || 0)} keyboardType="numeric" style={{ width: 80, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 8, textAlign: 'center' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#4CAF50' }}>Discount Amount</Text>
              <Text style={{ color: '#4CAF50' }}>-{formatPrice(discountAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Total Amount</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF6B6B' }}>{formatPrice(totalAmount)}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowCoupon(true)} style={{ flex: 1, borderWidth: 1, borderColor: '#FF6B6B', padding: 12, borderRadius: 12, marginRight: 10, alignItems: 'center' }}>
                <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>Apply Coupon</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onCheckout(totalAmount, taxPercent, discountPercent, selectedCustomerForLastPrice)} style={{ flex: 2, backgroundColor: '#FF6B6B', padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Proceed to Checkout →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [{ text: 'Cancel' }, { text: 'Clear', onPress: clearCart }])} style={{ marginTop: 15, alignItems: 'center' }}>
              <Text style={{ color: '#dc3545' }}>Clear Cart</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={showCoupon} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Apply Coupon</Text>
            <TextInput placeholder="Enter code" value={couponCode} onChangeText={setCouponCode} style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, marginBottom: 15 }} autoCapitalize="characters" />
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 15 }}>Available: SAVE10 (10%), SAVE20 (20%)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setShowCoupon(false)} style={{ flex: 1, padding: 12, borderRadius: 12, marginRight: 10, backgroundColor: '#f0f0f0', alignItems: 'center' }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyCoupon} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#FF6B6B', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editPriceModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '85%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Edit Price</Text>
            <Text style={{ marginBottom: 5, fontWeight: 'bold' }}>Product: {editingProduct?.name}</Text>
            <Text style={{ marginBottom: 15, fontSize: 12, color: '#666' }}>
              Actual Selling Price: {formatPrice(originalSellingPrice)}
            </Text>
            <TextInput
              placeholder="Enter new price"
              value={newPriceValue}
              onChangeText={setNewPriceValue}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 12, marginBottom: 15, fontSize: 16 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setEditPriceModalVisible(false)} style={{ flex: 1, padding: 12, borderRadius: 12, marginRight: 10, backgroundColor: '#f0f0f0', alignItems: 'center' }}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdatePrice} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#FF6B6B', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={customerModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
            <TouchableOpacity onPress={() => setCustomerModalVisible(false)}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Select Customer</Text>
          </View>
          <View style={{ padding: 16 }}>
            <TextInput placeholder="Search customer..." value={customerSearch} onChangeText={setCustomerSearch} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 }} />
            {loadingCustomers ? <ActivityIndicator /> : (
              <FlatList
                data={filteredCustomersList}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => selectCustomerForLastPrice(item)} style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                    {item.phone && <Text style={{ fontSize: 12, color: '#666' }}>{item.phone}</Text>}
                    {item.address && <Text style={{ fontSize: 12, color: '#666' }}>{item.address}</Text>}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================
// MAIN CATEGORIES SCREEN - WITH QUANTITY SELECTOR IN SINGLE PRODUCT MODAL
// ============================================
export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsModalVisible, setProductsModalVisible] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const [cartCount, setCartCount] = useState(0);
  const [showCartPage, setShowCartPage] = useState(false);
  const [showCheckoutPage, setShowCheckoutPage] = useState(false);
  const [checkoutData, setCheckoutData] = useState({ subtotal: 0, taxPercent: 0, discountPercent: 0, selectedCustomer: null });
  const [cartProductIds, setCartProductIds] = useState({});
  
  const [globalProductResults, setGlobalProductResults] = useState([]);
  const [globalProductsLoading, setGlobalProductsLoading] = useState(false);
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  
  // State for single product modal
  const [singleProductModalVisible, setSingleProductModalVisible] = useState(false);
  const [singleProductData, setSingleProductData] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  useEffect(() => {
    const updateCart = (items) => {
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      const newCartIds = {};
      items.forEach(item => { newCartIds[item.id] = item.quantity; });
      setCartProductIds(newCartIds);
    };
    cartListeners.push(updateCart);
    updateCart(cartItems);
    return () => {
      const index = cartListeners.indexOf(updateCart);
      if (index !== -1) cartListeners.splice(index, 1);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCategories(categories);
      setShowGlobalResults(false);
      setGlobalProductResults([]);
    } else {
      setFilteredCategories(categories);
      searchProductsGlobally(searchQuery);
      setShowGlobalResults(true);
    }
  }, [searchQuery, categories]);

  const searchProductsGlobally = async (query) => {
    if (!query.trim()) {
      setGlobalProductResults([]);
      return;
    }
    
    setGlobalProductsLoading(true);
    const allProducts = [];
    for (const category of categories) {
      const products = await getProductsByCategory(category.id, category.name);
      const matchedProducts = products.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase())
      ).map(p => ({ ...p, categoryName: category.name, categoryId: category.id }));
      allProducts.push(...matchedProducts);
    }
    setGlobalProductResults(allProducts);
    setGlobalProductsLoading(false);
  };

  const handleGlobalProductPress = (product) => {
    setSingleProductData(product);
    setSelectedQuantity(1); // Reset quantity to 1 when opening modal
    setSingleProductModalVisible(true);
    setShowGlobalResults(false);
    setSearchQuery("");
  };

  const handleAddToCartWithQuantity = () => {
    if (singleProductData) {
      addToCart(singleProductData, selectedQuantity);
      Alert.alert('Added to Cart', `${selectedQuantity} x ${singleProductData.name} added to cart`);
      setSingleProductModalVisible(false);
      setSelectedQuantity(1);
    }
  };

  const increaseQuantity = () => {
    const maxStock = singleProductData?.stock_quantity || 0;
    if (selectedQuantity < maxStock) {
      setSelectedQuantity(selectedQuantity + 1);
    } else {
      Alert.alert('Maximum Limit', `Only ${maxStock} items available in stock`);
    }
  };

  const decreaseQuantity = () => {
    if (selectedQuantity > 1) {
      setSelectedQuantity(selectedQuantity - 1);
    }
  };

  useEffect(() => {
    if (productSearchQuery.trim() === "") setFilteredProducts(categoryProducts);
    else setFilteredProducts(categoryProducts.filter(p => p.name?.toLowerCase().includes(productSearchQuery.toLowerCase())));
  }, [productSearchQuery, categoryProducts]);

  const loadCategories = async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data || []);
    setFilteredCategories(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  useEffect(() => {
    const init = async () => {
      setNetworkInfo(await checkNetworkConnectivity());
      await loadCategories();
    };
    init();
  }, []);

  const handleImageError = (id) => setImageErrors(prev => ({ ...prev, [id]: true }));

  const handleCategoryPress = async (category) => {
    setSelectedCategory(category);
    setProductsModalVisible(true);
    setProductsLoading(true);
    setProductSearchQuery("");
    const products = await getProductsByCategory(category.id, category.name);
    setCategoryProducts(products);
    setFilteredProducts(products);
    setProductsLoading(false);
    setShowGlobalResults(false);
    if (products.length === 0) Alert.alert("No Products", `No products found in "${category.name}" category.`);
  };

  const handleAddToCart = (product) => addToCart(product, 1);
  const handleCartQuantityUpdate = (productId, newQuantity) => updateCartQuantity(productId, newQuantity);
  const handleCheckout = (subtotal, taxPercent, discountPercent, selectedCustomer) => {
    setCheckoutData({ subtotal, taxPercent, discountPercent, selectedCustomer });
    setShowCartPage(false);
    setShowCheckoutPage(true);
  };

  const renderCategoryItem = ({ item }) => {
    const imageUrl = getImageUrl(item.image);
    const hasImageError = imageErrors[item.id];
    const hasImage = item.image && item.image.trim() !== "";
    return (
      <TouchableOpacity onPress={() => handleCategoryPress(item)} activeOpacity={0.9} style={{ width: CARD_WIDTH, marginBottom: 16, marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, overflow: 'hidden' }}>
        <View style={{ width: '100%', height: 150, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' }}>
          {hasImage && !hasImageError ? <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} onError={() => handleImageError(item.id)} resizeMode="cover" /> : <Text style={{ fontSize: 50 }}>📁</Text>}
        </View>
        <View style={{ padding: 12 }}><Text style={{ fontSize: 14, fontWeight: "600", textAlign: 'center' }} numberOfLines={2}>{item.name}</Text></View>
      </TouchableOpacity>
    );
  };

  const renderProductItem = ({ item }) => {
    const imageUrl = getImageUrl(item.image_path || item.image);
    const hasImageError = imageErrors[`product_${item.id}`];
    const hasImage = (item.image_path || item.image) && (item.image_path || item.image).trim() !== "";
    const stock = item.stock_quantity || 0;
    const cartQuantity = cartProductIds[item.id] || 0;
    const isInCart = cartQuantity > 0;
    return (
      <View style={{ width: CARD_WIDTH, marginBottom: 16, marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, overflow: 'hidden' }}>
        <TouchableOpacity onPress={() => Alert.alert(item.name, `Price: ${formatPrice(item.selling_price || item.price)}\nStock: ${stock} available`)} activeOpacity={0.9} style={{ width: '100%', height: 150, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          {hasImage && !hasImageError ? <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} onError={() => handleImageError(`product_${item.id}`)} resizeMode="cover" /> : <Text style={{ fontSize: 50 }}>📦</Text>}
          {stock === 0 && <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(220,53,69,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Out of Stock</Text></View>}
        </TouchableOpacity>
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }} numberOfLines={2}>{item.name}</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 12 }}>{formatPrice(item.selling_price || item.price)}</Text>
          {isInCart ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderRadius: 30, padding: 4, marginBottom: 8 }}>
                <TouchableOpacity onPress={() => handleCartQuantityUpdate(item.id, cartQuantity - 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: 'bold' }}>-</Text>
                </TouchableOpacity>
                <View><Text style={{ fontSize: 18, fontWeight: 'bold' }}>{cartQuantity}</Text><Text style={{ fontSize: 10, color: '#666' }}>in cart</Text></View>
                <TouchableOpacity onPress={() => handleCartQuantityUpdate(item.id, cartQuantity + 1)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => handleAddToCart(item)} disabled={stock === 0} style={{ backgroundColor: stock === 0 ? '#adb5bd' : '#FF6B6B', paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🛒</Text>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{stock === 0 ? 'Out of Stock' : 'Add to Cart'}</Text>
            </TouchableOpacity>
          )}
          <View style={{ backgroundColor: stock > 0 ? '#e8f5e9' : '#ffebee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 10, color: stock > 0 ? '#2e7d32' : '#c62828', fontWeight: '500' }}>{stock > 0 ? `${stock} in stock` : 'Out of stock'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (showCheckoutPage) return <CheckoutScreen onClose={() => setShowCheckoutPage(false)} subtotal={checkoutData.subtotal} cartTaxPercent={checkoutData.taxPercent} cartDiscountPercent={checkoutData.discountPercent} selectedCustomer={checkoutData.selectedCustomer} />;
  if (showCartPage) return <CartScreen onClose={() => setShowCartPage(false)} onCheckout={handleCheckout} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {networkInfo && <View style={{ backgroundColor: networkInfo?.networkState?.isConnected ? '#28a745' : '#dc3545', padding: 6, paddingHorizontal: 12 }}><Text style={{ fontSize: 11, color: '#fff', textAlign: 'center' }}>{networkInfo?.networkState?.isConnected ? 'Connected' : 'No Network'} | IP: {networkInfo?.ipAddress || 'Unknown'}</Text></View>}
      <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 48, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View><Text style={{ fontSize: 28, fontWeight: 'bold' }}>Categories</Text><Text style={{ fontSize: 13, color: '#666' }}>{filteredCategories.length} Categories</Text></View>
        <TouchableOpacity onPress={() => setShowCartPage(true)} style={{ position: 'relative', padding: 8 }}>
          <Text style={{ fontSize: 28 }}>🛒</Text>
          {cartCount > 0 && <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#FF6B6B', borderRadius: 12, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', margin: 16, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, marginRight: 10, color: '#666' }}>🔍</Text>
        <TextInput 
          placeholder="Search categories or products..." 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
          style={{ flex: 1, paddingVertical: 12, fontSize: 15 }} 
          placeholderTextColor="#999" 
        />
        {searchQuery !== "" && <TouchableOpacity onPress={() => setSearchQuery("")}><Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: 'bold' }}>✕</Text></TouchableOpacity>}
      </View>
      
      {/* Global Product Search Results */}
      {showGlobalResults && searchQuery.trim() !== "" && (
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 16 }}>Products Found:</Text>
          {globalProductsLoading ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : globalProductResults.length > 0 ? (
            globalProductResults.map((product, index) => (
              <TouchableOpacity
                key={product.id}
                onPress={() => handleGlobalProductPress(product)}
                style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}
              >
                <View style={{ width: 50, height: 50, backgroundColor: '#f0f0f0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 24 }}>📦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>{product.name}</Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>{product.categoryName}</Text>
                  <Text style={{ fontSize: 14, color: '#FF6B6B', fontWeight: 'bold' }}>{formatPrice(product.selling_price || product.price)}</Text>
                </View>
                <Text style={{ fontSize: 20 }}>→</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: '#999', textAlign: 'center', padding: 20 }}>No products found matching "{searchQuery}"</Text>
          )}
        </View>
      )}
      
      <TouchableOpacity onPress={loadCategories} disabled={loading} style={{ backgroundColor: loading ? "#adb5bd" : "#FF6B6B", paddingVertical: 12, marginHorizontal: 16, marginBottom: 12, borderRadius: 12 }}>
        <Text style={{ color: "white", textAlign: "center", fontWeight: "600" }}>{loading ? "Loading..." : "Refresh Categories"}</Text>
      </TouchableOpacity>
      
      {loading && categories.length === 0 ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#FF6B6B" /><Text>Loading categories...</Text></View> : (
        <FlatList data={filteredCategories} keyExtractor={(item, index) => String(item?.id || index)} renderItem={renderCategoryItem} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 4 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B6B']} tintColor="#FF6B6B" />} ListEmptyComponent={() => <View style={{ padding: 40 }}><Text style={{ fontSize: 60, textAlign: 'center' }}>📂</Text><Text style={{ textAlign: 'center' }}>{searchQuery ? "No categories match." : "No categories found."}</Text></View>} />
      )}
      
      {/* Modal for Single Product from Search - WITH QUANTITY SELECTOR */}
      <Modal visible={singleProductModalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setSingleProductModalVisible(false)}><Text style={{ fontSize: 28, marginRight: 12 }}>←</Text></TouchableOpacity>
              <Text style={{ fontSize: 22, fontWeight: 'bold' }}>Product Details</Text>
              <TouchableOpacity onPress={() => setShowCartPage(true)} style={{ marginLeft: 'auto' }}>
                <Text style={{ fontSize: 26 }}>🛒</Text>
                {cartCount > 0 && <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}
              </TouchableOpacity>
            </View>
          </View>
          
          {singleProductData && (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 5 }}>
                <View style={{ width: 200, height: 200, backgroundColor: '#f8f9fa', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                  {(singleProductData.image_path || singleProductData.image) && !imageErrors[`single_${singleProductData.id}`] ? (
                    <Image 
                      source={{ uri: getImageUrl(singleProductData.image_path || singleProductData.image) }} 
                      style={{ width: 200, height: 200, borderRadius: 16 }} 
                      onError={() => handleImageError(`single_${singleProductData.id}`)} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <Text style={{ fontSize: 80 }}>📦</Text>
                  )}
                </View>
                
                <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>{singleProductData.name}</Text>
                <Text style={{ fontSize: 18, color: '#666', marginBottom: 10 }}>{singleProductData.categoryName}</Text>
                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 15 }}>
                  {formatPrice(singleProductData.selling_price || singleProductData.price)}
                </Text>
                
                <View style={{ backgroundColor: (singleProductData.stock_quantity || 0) > 0 ? '#e8f5e9' : '#ffebee', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, color: (singleProductData.stock_quantity || 0) > 0 ? '#2e7d32' : '#c62828', fontWeight: '500' }}>
                    {(singleProductData.stock_quantity || 0) > 0 ? `${singleProductData.stock_quantity} in stock` : 'Out of stock'}
                  </Text>
                </View>

                {/* Quantity Selector */}
                {(singleProductData.stock_quantity || 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <TouchableOpacity 
                      onPress={decreaseQuantity} 
                      style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#333' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', marginHorizontal: 30, minWidth: 50, textAlign: 'center' }}>
                      {selectedQuantity}
                    </Text>
                    <TouchableOpacity 
                      onPress={increaseQuantity} 
                      style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity 
                  onPress={handleAddToCartWithQuantity} 
                  disabled={(singleProductData.stock_quantity || 0) === 0}
                  style={{ backgroundColor: (singleProductData.stock_quantity || 0) === 0 ? '#adb5bd' : '#FF6B6B', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    {(singleProductData.stock_quantity || 0) === 0 ? 'Out of Stock' : `Add ${selectedQuantity} to Cart 🛒`}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      
      <Modal visible={productsModalVisible} animationType="slide" transparent={false} onRequestClose={() => { setProductsModalVisible(false); setProductSearchQuery(""); setFilteredProducts([]); }}>
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => { setProductsModalVisible(false); setProductSearchQuery(""); setFilteredProducts([]); }}><Text style={{ fontSize: 28, marginRight: 12 }}>←</Text></TouchableOpacity>
              <View><Text style={{ fontSize: 22, fontWeight: 'bold' }}>{selectedCategory?.name}</Text><Text>{filteredProducts.length} Products</Text></View>
              <TouchableOpacity onPress={() => setShowCartPage(true)} style={{ marginLeft: 'auto' }}><Text style={{ fontSize: 26 }}>🛒</Text>{cartCount > 0 && <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{cartCount > 99 ? '99+' : cartCount}</Text></View>}</TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 16, marginRight: 10, color: '#666' }}>🔍</Text>
              <TextInput placeholder="Search products..." value={productSearchQuery} onChangeText={setProductSearchQuery} style={{ flex: 1, paddingVertical: 12, fontSize: 14 }} placeholderTextColor="#999" />
              {productSearchQuery !== "" && <TouchableOpacity onPress={() => setProductSearchQuery("")}><Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: 'bold' }}>✕</Text></TouchableOpacity>}
            </View>
          </View>
          {productsLoading ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#FF6B6B" /><Text>Loading products...</Text></View> : filteredProducts.length > 0 ? (
            <FlatList data={filteredProducts} keyExtractor={(item) => String(item.id)} renderItem={renderProductItem} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 4 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={productsLoading} onRefresh={async () => { setProductsLoading(true); const products = await getProductsByCategory(selectedCategory?.id, selectedCategory?.name); setCategoryProducts(products); setFilteredProducts(products); setProductsLoading(false); }} colors={['#FF6B6B']} />} />
          ) : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 60 }}>🔍</Text><Text>No products found</Text></View>}
        </View>
      </Modal>
    </View>
  );
}