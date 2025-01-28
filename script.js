let products = [], cart = JSON.parse(localStorage.getItem('cart')) || [];
let cartModal, paymentModal, successModal, errorModal;
let activeFilters = { category: '', minPrice: '', maxPrice: '' };

const $ = document.querySelector.bind(document);
const $$ = document.getElementById.bind(document);

const cardPatterns = {
    visa: { pattern: /^4/, icon: 'fa-brands fa-cc-visa' },
    mastercard: { pattern: /^5[1-5]/, icon: 'fa-brands fa-cc-mastercard' },
    amex: { pattern: /^3[47]/, icon: 'fa-brands fa-cc-amex' },
    discover: { pattern: /^6/, icon: 'fa-brands fa-cc-discover' }
};

const updateLocalStorage = () => localStorage.setItem('cart', JSON.stringify(cart));

const showModal = (modal) => modal.show();
const hideModal = (modal) => modal.hide();

const updateCartCount = () => $$('cartCount').textContent = cart.reduce((total, item) => total + (item.quantity || 1), 0);

const showToast = message => {
    const toast = Object.assign(document.createElement('div'), {
        className: 'toast',
        textContent: message
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

const showError = message => {
    $$('errorMessage').textContent = message;
    showModal(errorModal);
};

async function getProducts() {
    try {
        const response = await fetch('https://dummyjson.com/products');
        const data = await response.json();
        products = data.products;
        displayProducts(products);
        setupFilters();
        updateCartCount();
        [cartModal, paymentModal, successModal, errorModal] = ['cart', 'payment', 'success', 'error']
            .map(id => new bootstrap.Modal($$(id + 'Modal')));
    } catch (error) {
        console.error('Error:', error);
    }
}

const displayProducts = products => {
    $('#productsContainer').innerHTML = products.map(p => `
        <div class="col-md-4 mb-4">
            <div class="card">
                <img src="${p.thumbnail}" class="card-img-top" alt="${p.title}">
                <div class="card-body">
                    <h5 class="card-title">${p.title}</h5>
                    <p class="card-text">${p.description.substring(0, 100)}...</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="h5 mb-0">$${p.price}</span>
                        <span class="product-rating">★ ${p.rating}</span>
                    </div>
                    <button onclick="addToCart(${p.id})" class="btn btn-primary w-100 mt-3">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
};

const setupFilters = () => {
    const categories = [...new Set(products.map(p => p.category))];
    const categoryFilter = $('#categoryFilter');
    
    categoryFilter.innerHTML = `
        <option value="">All Categories</option>
        ${categories.map(cat => 
            `<option value="${cat}">${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
        ).join('')}
    `;

    const setupInputHandler = (id, handler) => $$(id).addEventListener('input', handler);

    // Category filter change handler
    categoryFilter.addEventListener('change', e => {
        activeFilters.category = e.target.value;
        filterProducts();
    });

    // Price filter handlers
    setupInputHandler('minPrice', function() {
        activeFilters.minPrice = this.value ? Number(this.value) : '';
        filterProducts();
    });

    setupInputHandler('maxPrice', function() {
        activeFilters.maxPrice = this.value ? Number(this.value) : '';
        filterProducts();
    });

    // Card input handlers
    setupInputHandler('cardNumber', function() {
        let value = this.value.replace(/\D/g, '');
        this.value = value.replace(/(\d{4})/g, '$1 ').trim();
        
        const cardTypeIcon = $$('cardTypeIcon');
        cardTypeIcon.className = 'card-type-icon';
        
        const matchedCard = Object.values(cardPatterns).find(({pattern}) => pattern.test(value));
        if (matchedCard) {
            cardTypeIcon.className = `card-type-icon ${matchedCard.icon}`;
            cardTypeIcon.style.display = 'block';
        } else {
            cardTypeIcon.style.display = 'none';
        }
    });

    setupInputHandler('expiryDate', function() {
        let value = this.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }
        this.value = value.slice(0, 5);
    });

    setupInputHandler('cvv', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 3);
    });
};

const filterProducts = () => {
    let filtered = products;
    const {category, minPrice, maxPrice} = activeFilters;

    if (category && category !== '') {
        filtered = filtered.filter(p => p.category === category);
    }
    if (minPrice) {
        filtered = filtered.filter(p => p.price >= minPrice);
    }
    if (maxPrice) {
        filtered = filtered.filter(p => p.price <= maxPrice);
    }

    displayProducts(filtered);
    updateActiveFilters();
};

const updateActiveFilters = () => {
    $$('activeFilters').innerHTML = [
        activeFilters.category && `
            <span class="active-filter">
                Category: ${activeFilters.category}
                <span class="close" onclick="clearFilter('category')">&times;</span>
            </span>
        `,
        (activeFilters.minPrice || activeFilters.maxPrice) && `
            <span class="active-filter">
                Price: $${activeFilters.minPrice || '0'} - $${activeFilters.maxPrice || '∞'}
                <span class="close" onclick="clearFilter('price')">&times;</span>
            </span>
        `
    ].filter(Boolean).join('');
};

const clearFilter = type => {
    if (type === 'category') {
        activeFilters.category = '';
        $$('categoryFilter').value = '';
    } else if (type === 'price') {
        activeFilters.minPrice = '';
        activeFilters.maxPrice = '';
        $$('minPrice').value = '';
        $$('maxPrice').value = '';
    }
    filterProducts();
};

const searchProducts = () => {
    const searchTerm = $$('searchInput').value.toLowerCase();
    const filtered = products.filter(p => 
        p.title.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
    );
    displayProducts(filtered);
};

const addToCart = productId => {
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalItems >= 20) {
        return showError('Cart limit reached! Maximum 20 items allowed.');
    }

    const product = products.find(p => p.id === productId);
    if (product) {
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cart.push({...product, quantity: 1});
        }
        
        updateLocalStorage();
        updateCartCount();
        showToast('Product added to cart!');
    }
};

const showCart = () => {
    const container = $$('cartItems');
    const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const paymentBtn = $$('proceedToPayment');
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="text-center">Your cart is empty</p>';
        paymentBtn.style.display = 'none';
    } else {
        container.innerHTML = `
            <div class="d-flex justify-content-end mb-3">
                <button onclick="removeAllFromCart()" class="btn btn-danger">Remove All</button>
            </div>
            ${cart.map((item, i) => `
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
                                            <button onclick="decreaseQuantity(${i})" class="btn btn-sm btn-outline-secondary">-</button>
                                            <button onclick="increaseQuantity(${i})" class="btn btn-sm btn-outline-secondary">+</button>
                                        </div>
                                        <button onclick="removeFromCart(${i})" class="btn btn-sm btn-danger">Remove</button>
                                    </div>
                                </div>
                                <p class="card-text">$${(item.price * (item.quantity || 1)).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}`;
        paymentBtn.style.display = 'block';
    }
    
    $$('cartTotal').textContent = total.toFixed(2);
    showModal(cartModal);
};

const updateCart = (index, action) => {
    if (action === 'increase') {
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        if (totalItems >= 20) {
            return showError('Cart limit reached! Maximum 20 items allowed.');
        }
        cart[index].quantity = (cart[index].quantity || 1) + 1;
    } else if (action === 'decrease') {
        if (cart[index].quantity > 1) {
            cart[index].quantity -= 1;
        } else {
            return removeFromCart(index);
        }
    }
    updateLocalStorage();
    updateCartCount();
    showCart();
};

const increaseQuantity = index => updateCart(index, 'increase');
const decreaseQuantity = index => updateCart(index, 'decrease');

const removeFromCart = index => {
    cart.splice(index, 1);
    updateLocalStorage();
    updateCartCount();
    showCart();
};

const removeAllFromCart = () => {
    cart = [];
    updateLocalStorage();
    updateCartCount();
    showCart();
};

const processPayment = () => {
    const cardNumber = $$('cardNumber').value.replace(/\D/g, '');
    const expiryDate = $$('expiryDate').value;
    const cvv = $$('cvv').value;

    if (!cardNumber || !expiryDate || !cvv) {
        return showError('Please fill in all payment details');
    }
    if (cardNumber.length < 16) {
        return showError('Invalid card number');
    }
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        return showError('Invalid expiry date format (MM/YY)');
    }

    const [month, year] = expiryDate.split('/').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (month < 1 || month > 12) {
        return showError('Invalid month in expiry date (must be 1-12)');
    }
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return showError('Card has expired');
    }
    if (cvv.length < 3) {
        return showError('Invalid CVV');
    }

    hideModal(paymentModal);
    cart = [];
    updateLocalStorage();
    updateCartCount();
    showModal(successModal);
};

const showPaymentForm = () => {
    hideModal(cartModal);
    showModal(paymentModal);
};

// Initialize the application when the page loads
window.addEventListener('load', getProducts);