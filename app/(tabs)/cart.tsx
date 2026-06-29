import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 45) / 2;
import { API_BASE_URL } from "../../constants/config";

// ============================================
// 1️⃣ CART CONTEXT
// ============================================
const CartContext = createContext();

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => { loadCart(); }, []);
  useEffect(() => { saveCart(); }, [cartItems]);

  const loadCart = async () => {
    try {
      const saved = await AsyncStorage.getItem('cart');
      if (saved) setCartItems(JSON.parse(saved));
    } catch (error) { console.error('Error loading cart:', error); }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) { console.error('Error saving cart:', error); }
  };

  const addToCart = (product, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        image: product.image_path || product.image,
        price: product.selling_price || product.price,
        quantity: quantity,
        stock: product.stock_quantity || 0
      }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, newQty) => {
    if (newQty <= 0) { removeFromCart(id); return; }
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
  };

  const clearCart = () => setCartItems([]);
  const getTotalItems = () => cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const getSubtotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getTax = () => getSubtotal() * 0.10;
  const getDeliveryCharge = () => getSubtotal() >= 500 ? 0 : 40;
  const getGrandTotal = () => getSubtotal() + getTax() + getDeliveryCharge();

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart,
      getTotalItems, getSubtotal, getTax, getDeliveryCharge, getGrandTotal
    }}>
      {children}
    </CartContext.Provider>
  );
};

// ============================================
// 2️⃣ HELPER FUNCTIONS
// ============================================
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  let clean = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${API_BASE_URL}/${clean}`;
};

const formatPrice = (price) => {
  if (!price) return '₹0.00';
  return `₹${parseFloat(price).toFixed(2)}`;
};

// ============================================
// 3️⃣ API CALLS
// ============================================
const getCategories = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/mobile/categories/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    Alert.alert('Error', 'Failed to load categories');
    return [];
  }
};

const getProductsByCategory = async (categoryId) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${API_BASE_URL}/mobile/category-products/${categoryId}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return [];
  }
};

// ============================================
// 4️⃣ CART PAGE COMPONENT
// ============================================
function CartScreenContent() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotalItems, getSubtotal, getTax, getDeliveryCharge, getGrandTotal } = useCart();
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'SAVE10') {
      setDiscount(getSubtotal() * 0.10);
      Alert.alert('Success', '10% discount applied!');
      setShowCoupon(false);
    } else if (couponCode.toUpperCase() === 'SAVE20') {
      setDiscount(getSubtotal() * 0.20);
      Alert.alert('Success', '20% discount applied!');
      setShowCoupon(false);
    } else {
      Alert.alert('Invalid', 'Invalid coupon code');
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>🛒</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>Your cart is empty</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 10, marginBottom: 20 }}>Add some products to get started</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>My Cart 🛒</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{getTotalItems()} items</Text>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, margin: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
            <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
              {item.image && !imageErrors[item.id] ? (
                <Image source={{ uri: getImageUrl(item.image) }} style={{ width: 80, height: 80 }} onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 40 }}>📦</Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
              <Text style={{ fontSize: 14, color: '#4CAF50', fontWeight: 'bold', marginTop: 4 }}>{formatPrice(item.price)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginHorizontal: 15 }}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold' }}>Total: {formatPrice(item.price * item.quantity)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20, color: '#f44336' }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
      />

      <View style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>Price Details</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#666' }}>Subtotal ({getTotalItems()} items)</Text>
          <Text style={{ fontWeight: 'bold' }}>{formatPrice(getSubtotal())}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#666' }}>Tax (10%)</Text>
          <Text style={{ fontWeight: 'bold' }}>{formatPrice(getTax())}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#666' }}>Delivery Charge</Text>
          <Text style={{ fontWeight: 'bold', color: getDeliveryCharge() === 0 ? '#4CAF50' : '#333' }}>{getDeliveryCharge() === 0 ? 'FREE' : formatPrice(getDeliveryCharge())}</Text>
        </View>
        {discount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ color: '#4CAF50' }}>Discount</Text>
            <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>-{formatPrice(discount)}</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Grand Total</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>{formatPrice(getGrandTotal() - discount)}</Text>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <TouchableOpacity onPress={() => setShowCoupon(true)} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2196F3', padding: 12, borderRadius: 10, marginRight: 10, alignItems: 'center' }}>
            <Text style={{ color: '#2196F3', fontWeight: 'bold' }}>📦 Coupon</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Checkout', 'Proceeding to checkout')} style={{ flex: 2, backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Proceed →</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => { Alert.alert('Clear Cart', 'Remove all items?', [{ text: 'Cancel' }, { text: 'Clear', onPress: clearCart }]); }} style={{ marginTop: 10, alignItems: 'center' }}>
          <Text style={{ color: '#f44336' }}>Clear Cart</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCoupon} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '80%' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>Apply Coupon</Text>
            <TextInput placeholder="Enter code" value={couponCode} onChangeText={setCouponCode} style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, marginBottom: 15 }} autoCapitalize="characters" />
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 15 }}>Available: SAVE10 (10%), SAVE20 (20%)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => setShowCoupon(false)} style={{ flex: 1, padding: 12, borderRadius: 10, marginRight: 10, backgroundColor: '#f0f0f0', alignItems: 'center' }}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={applyCoupon} style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#2196F3', alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// 5️⃣ CATEGORIES PAGE (with Add to Cart)
// ============================================
function CategoriesScreenContent() {
  const { addToCart } = useCart();
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productModal, setProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    if (search.trim() === '') setFiltered(categories);
    else setFiltered(categories.filter(c => c.name?.toLowerCase().includes(search.toLowerCase())));
  }, [search, categories]);

  useEffect(() => {
    if (productSearch.trim() === '') setFilteredProducts(products);
    else setFilteredProducts(products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())));
  }, [productSearch, products]);

  const loadCategories = async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data);
    setFiltered(data);
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, []);

  const openCategory = async (cat) => {
    setSelectedCat(cat);
    setProductModal(true);
    const prods = await getProductsByCategory(cat.id);
    setProducts(prods);
    setFilteredProducts(prods);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity onPress={() => openCategory(item)} style={{ width: CARD_WIDTH, marginBottom: 16, marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden' }}>
      <View style={{ width: '100%', height: 140, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
        {item.image && !imageErrors[item.id] ? (
          <Image source={{ uri: getImageUrl(item.image) }} style={{ width: '100%', height: '100%' }} onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))} resizeMode="cover" />
        ) : <Text style={{ fontSize: 50 }}>📁</Text>}
      </View>
      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <View style={{ width: CARD_WIDTH, marginBottom: 16, marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, overflow: 'hidden' }}>
      <View style={{ width: '100%', height: 140, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' }}>
        {(item.image_path || item.image) && !imageErrors[`p_${item.id}`] ? (
          <Image source={{ uri: getImageUrl(item.image_path || item.image) }} style={{ width: '100%', height: '100%' }} onError={() => setImageErrors(prev => ({ ...prev, [`p_${item.id}`]: true }))} resizeMode="cover" />
        ) : <Text style={{ fontSize: 50 }}>📦</Text>}
      </View>
      <View style={{ padding: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 }} numberOfLines={2}>{item.name}</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center', marginBottom: 4 }}>{formatPrice(item.selling_price || item.price)}</Text>
        <TouchableOpacity onPress={() => { addToCart(item); Alert.alert('Added', `${item.name} added to cart!`); }} style={{ backgroundColor: '#2196F3', paddingVertical: 8, borderRadius: 8, marginTop: 6 }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>Add to Cart 🛒</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: (item.stock_quantity || 0) > 0 ? '#e8f5e9' : '#ffebee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center', marginTop: 6 }}>
          <Text style={{ fontSize: 11, color: (item.stock_quantity || 0) > 0 ? '#2e7d32' : '#c62828', fontWeight: 'bold' }}>Stock: {item.stock_quantity || 0}</Text>
        </View>
      </View>
    </View>
  );

  if (loading && categories.length === 0) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#2196F3" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Categories</Text>
        <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{filtered.length} Categories</Text>
      </View>
      <View style={{ flexDirection: 'row', margin: 15, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
        <TextInput placeholder="Search categories..." value={search} onChangeText={setSearch} style={{ flex: 1, padding: 12 }} />
        {search !== '' && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: '#f44336' }}>✕</Text></TouchableOpacity>}
      </View>
      <FlatList data={filtered} keyExtractor={(item) => String(item.id)} renderItem={renderCategory} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between' }} contentContainerStyle={{ padding: 12 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadCategories} colors={['#2196F3']} />} />

      <Modal visible={productModal} animationType="slide" onRequestClose={() => setProductModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <TouchableOpacity onPress={() => setProductModal(false)}><Text style={{ fontSize: 28, marginRight: 15 }}>←</Text></TouchableOpacity>
              <View><Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedCat?.name}</Text><Text style={{ fontSize: 12, color: '#666' }}>{filteredProducts.length} Products</Text></View>
            </View>
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 15, alignItems: 'center', backgroundColor: '#f9f9f9' }}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
              <TextInput placeholder="Search products..." value={productSearch} onChangeText={setProductSearch} style={{ flex: 1, padding: 10 }} />
              {productSearch !== '' && <TouchableOpacity onPress={() => setProductSearch('')}><Text style={{ color: '#f44336' }}>✕</Text></TouchableOpacity>}
            </View>
          </View>
          <FlatList data={filteredProducts} keyExtractor={(item) => String(item.id)} renderItem={renderProduct} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between' }} contentContainerStyle={{ padding: 12 }} />
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// 6️⃣ MAIN EXPORT (Tabs Navigation)
// ============================================
export default function CartAndCategories() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <CartProvider>
      <View style={{ flex: 1 }}>
        {activeTab === 'categories' ? <CategoriesScreenContent /> : <CartScreenContent />}
        
        {/* Bottom Tab Bar */}
        <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingVertical: 10 }}>
          <TouchableOpacity onPress={() => setActiveTab('categories')} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 24 }}>🏠</Text>
            <Text style={{ fontSize: 12, color: activeTab === 'categories' ? '#2196F3' : '#999', fontWeight: activeTab === 'categories' ? 'bold' : 'normal' }}>Categories</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setActiveTab('cart')} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 24 }}>🛒</Text>
            <Text style={{ fontSize: 12, color: activeTab === 'cart' ? '#2196F3' : '#999', fontWeight: activeTab === 'cart' ? 'bold' : 'normal' }}>Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    </CartProvider>
  );
}