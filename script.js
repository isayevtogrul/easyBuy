let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let cartModal;
let paymentModal;
let successModal;
let errorModal;
let activeFilters = {
    category: '',
    minPrice: '',
    maxPrice: ''
};

// Kart növləri üçün regex patterns
const cardPatterns = {
    visa: {
        pattern: /^4/,
        icon: 'fa-brands fa-cc-visa'
    },
    mastercard: {
        pattern: /^5[1-5]/,
        icon: 'fa-brands fa-cc-mastercard'
    },
    amex: {
        pattern: /^3[47]/,
        icon: 'fa-brands fa-cc-amex'
    },
    discover: {
        pattern: /^6/,
        icon: 'fa-brands fa-cc-discover'
    }
};

// Initialize
async function getProducts() {
    try {
        const response = await fetch('https://dummyjson.com/products');
        const data = await response.json();
        products = data.products;
        displayProducts(products);
        setupFilters();
        updateCartCount();
        cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
        paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
        successModal = new bootstrap.Modal(document.getElementById('successModal'));
        errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
    } catch (error) {
        console.error('Error:', error);
    }
}

// Display products
function displayProducts(products) {
    const container = document.querySelector('#productsContainer');
    container.innerHTML = '';
    
    products.forEach(product => {
        const productCard = `
            <div class="col-md-4 mb-4">
                <div class="card">
                    <img src="${product.thumbnail}" class="card-img-top" alt="${product.title}">
                    <div class="card-body">
                        <h5 class="card-title">${product.title}</h5>
                        <p class="card-text">${product.description.substring(0, 100)}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h5 mb-0">$${product.price}</span>
                            <span class="product-rating">★ ${product.rating}</span>
                        </div>
                        <button onclick="addToCart(${product.id})" class="btn btn-primary w-100 mt-3">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += productCard;
    });
}

// Setup filters
function setupFilters() {
    const categories = [...new Set(products.map(p => p.category))];
    const categoryFilter = document.querySelector('#categoryFilter');
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryFilter.appendChild(option);
    });

    // Event listeners
    categoryFilter.addEventListener('change', function(e) {
        activeFilters.category = e.target.value;
        filterProducts();
        updateActiveFilters();
    });

    // Kart nömrəsinin formatlanması və növünün təyini
    document.getElementById('cardNumber').addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, '');
        let formattedValue = '';
        
        // Formatlanma
        for(let i = 0; i < value.length; i++) {
            if(i > 0 && i % 4 === 0) {
                formattedValue += ' ';
            }
            formattedValue += value[i];
        }
        
        this.value = formattedValue;

        // Kart növünün təyini
        const cardTypeIcon = document.getElementById('cardTypeIcon');
        const cleanValue = value.replace(/\D/g, '');

        cardTypeIcon.className = 'card-type-icon';
        
        for(let [type, details] of Object.entries(cardPatterns)) {
            if(details.pattern.test(cleanValue)) {
                cardTypeIcon.className = `card-type-icon ${details.icon}`;
                cardTypeIcon.style.display = 'block';
                return;
            }
        }
        
        cardTypeIcon.style.display = 'none';
    });

    // Format expiry date
    document.getElementById('expiryDate').addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        this.value = value.slice(0, 5);
    });

    // Format CVV
    document.getElementById('cvv').addEventListener('input', function(e) {
        this.value = this.value.replace(/\D/g, '').slice(0, 3);
    });
}

// Filter products
function filterProducts() {
    let filteredProducts = products;

    if (activeFilters.category) {
        filteredProducts = filteredProducts.filter(p => p.category === activeFilters.category);
    }

    if (activeFilters.minPrice) {
        filteredProducts = filteredProducts.filter(p => p.price >= activeFilters.minPrice);
    }

    if (activeFilters.maxPrice) {
        filteredProducts = filteredProducts.filter(p => p.price <= activeFilters.maxPrice);
    }

    displayProducts(filteredProducts);
    updateActiveFilters();
}

// Update active filters display
function updateActiveFilters() {
    const container = document.getElementById('activeFilters');
    container.innerHTML = '';

    if (activeFilters.category) {
        container.innerHTML += `
            <span class="active-filter">
                Category: ${activeFilters.category}
                <span class="close" onclick="clearFilter('category')">&times;</span>
            </span>
        `;
    }

    if (activeFilters.minPrice || activeFilters.maxPrice) {
        container.innerHTML += `
            <span class="active-filter">
                Price: $${activeFilters.minPrice || '0'} - $${activeFilters.maxPrice || '∞'}
                <span class="close" onclick="clearFilter('price')">&times;</span>
            </span>
        `;
    }
}

// Clear filter
function clearFilter(type) {
    if (type === 'category') {
        activeFilters.category = '';
        document.getElementById('categoryFilter').value = '';
    } else if (type === 'price') {
        activeFilters.minPrice = '';
        activeFilters.maxPrice = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
    }
    filterProducts();
}

// Apply price filter
function applyPriceFilter() {
    activeFilters.minPrice = document.getElementById('minPrice').value;
    activeFilters.maxPrice = document.getElementById('maxPrice').value;
    filterProducts();
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredProducts = products.filter(p => 
        p.title.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
    );
    displayProducts(filteredProducts);
}

// Cart functions
function addToCart(productId) {
    if (getTotalCartItems() >= 20) {
        showError('Cart limit reached! Maximum 20 items allowed.');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (product) {
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cart.push({...product, quantity: 1});
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        showToast('Product added to cart!');
    }
}

function getTotalCartItems() {
    return cart.reduce((total, item) => total + (item.quantity || 1), 0);
}

function updateCartCount() {
    const totalItems = getTotalCartItems();
    document.getElementById('cartCount').textContent = totalItems;
}

function showCart() {
    const container = document.getElementById('cartItems');
    const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const paymentButton = document.getElementById('proceedToPayment');
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center">Your cart is empty</p>';
        paymentButton.style.display = 'none';
    } else {
        container.innerHTML = `
            <div class="d-flex justify-content-end mb-3">
                <button onclick="removeAllFromCart()" class="btn btn-danger">Remove All Items</button>
            </div>
            ${cart.map((item, index) => `
                <div class="card mb-3">
                    <div class="row g-0">
                        <div class="col-md-4">
                            <img src="${item.thumbnail}" class="img-fluid rounded-start" alt="${item.title}">
                        </div>
                        <div class="col-md-8">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="card-title">
                                        ${item.title} 
                                        ${item.quantity > 1 ? `<span class="badge bg-secondary">x${item.quantity}</span>` : ''}
                                    </h5>
                                    <div class="d-flex align-items-center">
                                        <div class="btn-group me-2">
                                            <button onclick="decreaseQuantity(${index})" class="btn btn-sm btn-outline-secondary">-</button>
                                            <button onclick="increaseQuantity(${index})" class="btn btn-sm btn-outline-secondary">+</button>
                                        </div>
                                        <button onclick="removeFromCart(${index})" class="btn btn-sm btn-danger">Remove</button>
                                    </div>
                                </div>
                                <p class="card-text">$${(item.price * (item.quantity || 1)).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}`;
        paymentButton.style.display = 'block';
    }
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
    cartModal.show();
}

function increaseQuantity(index) {
    if (getTotalCartItems() >= 20) {
        showError('Cart limit reached! Maximum 20 items allowed.');
        return;
    }
    
    cart[index].quantity = (cart[index].quantity || 1) + 1;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showCart();
}

function decreaseQuantity(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        showCart();
    } else {
        removeFromCart(index);
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showCart();
}

function removeAllFromCart() {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showCart();
}

function showPaymentForm() {
    cartModal.hide();
    paymentModal.show();
}

// Process payment
function processPayment() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\D/g, '');
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;

    // Validations
    if (!cardNumber || !expiryDate || !cvv) {
        showError('Please fill in all payment details');
        return;
    }

    if (cardNumber.length < 16) {
        showError('Invalid card number');
        return;
    }

    // Expiry date validation
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        showError('Invalid expiry date format (MM/YY)');
        return;
    }

    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits of year
    const currentMonth = currentDate.getMonth() + 1; // Get current month (1-12)
    
    const expMonth = parseInt(month);
    const expYear = parseInt(year);

    if (expMonth < 1 || expMonth > 12) {
        showError('Invalid month in expiry date (must be 1-12)');
        return;
    }

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        showError('Card has expired');
        return;
    }

    if (cvv.length < 3) {
        showError('Invalid CVV');
        return;
    }

    // If all validations pass
    paymentModal.hide();
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    successModal.show();
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorModal.show();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize
window.addEventListener('load', getProducts);