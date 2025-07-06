console.log('Script is loaded');

function handleSelection(selectedValue) {
    if (selectedValue === 'profile') {
        loadContent('profile'); // Load Profile content
    } else if (selectedValue === 'address') {
        loadContent('address'); // Load Address content
    } else if (selectedValue === 'how-to-order') {
        loadContent('orderGuide'); // Load How to Order content
    } else if (selectedValue === 'logout') {
        logoutUser(); // Load Address content
    } else if (selectedValue === 'guest') {
        console.log("Guest selected. No action needed.");
    }
}



let cart = [];
let totalAmount = 0;

function getCurrentUserId() {
    return sessionStorage.getItem('userId');
}

function loadCart() {
    const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
    console.log('Loaded cart from localStorage:', storedCart);

    cart = storedCart;
    totalAmount = cart.reduce((total, item) => total + parseFloat(item.price) * item.quantity || 0, 0);
    updateTotalAmount();
    updateCartDisplay();
}

async function addToCart(product) {
    if (product.stock <= 0) {
        console.log(`Cannot add ${product.name} to cart: stock is 0.`);
        showModalNotification('This product is out of stock.');
        return;
    }

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += 1;
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/updateStock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    stockChange: -1,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update stock on the server.');
            }

            const result = await response.json();
            console.log('Stock updated successfully:', result);

        } catch (err) {
            console.error('Error updating stock on the server:', err);
            showModalNotification('An error occurred while updating stock.');
        }
    } else {
        const productToAdd = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price.replace(/,/g, '')),
            quantity: 1,
            imageUrl: product.imageUrl || 'default-image.jpg',
        };
        cart.push(productToAdd);

        try {
            const response = await fetch(`${API_BASE_URL}/api/products/updateStock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    stockChange: -1,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update stock on the server.');
            }

            const result = await response.json();
            console.log('Stock updated successfully:', result);

        } catch (err) {
            console.error('Error updating stock on the server:', err);
            showModalNotification('An error occurred while updating stock.');
        }
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateTotalAmount();
    updateCartDisplay();

    console.log('Product being added to cart:', product);
}




function updateTotalAmount() {
    totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function removeFromCart(index) {
    const product = cart[index];

    // Adjust the totalAmount by removing the price of the removed item
    totalAmount -= parseFloat(product.price) * product.quantity || 0;

    // Restore the stock in the database for the removed product
    fetch(`${API_BASE_URL}/api/products/restoreStock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity: product.quantity })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Stock restored successfully');
            } else {
                console.error('Failed to restore stock:', data.message);
            }
        })
        .catch(err => console.error('Error restoring stock:', err));

    // Remove the item from the cart array
    cart.splice(index, 1);

    // Save the updated cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));

    // Update the total amount and the display immediately
    updateTotalAmount();
    updateCartDisplay();
}



function formatPrice(price) {
    return `Php ${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

async function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = ''; // Clear the cart display before updating it

    // Rebuild the cart display
    cart.forEach((item, index) => {
        // Create a new item div or update an existing one
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('cart-item');
        itemDiv.setAttribute('data-item-id', item.id);  // Unique id to track this item

        itemDiv.innerHTML = `
            <div class="item-details">
                <img src="${item.imageUrl || 'default-image.jpg'}" alt="${item.name || 'Product Image'}" class="cart-item-image" onclick="getProductDetails(${item.id})">
                <div class="name-quantity-container">
                    <span>${item.name || 'Unnamed Product'} - ${formatPrice(parseFloat(item.price).toFixed(2) || 0)}</span>
                    <div class="quantity-container">
                        <button class="quantity-btn min" onclick="adjustQuantity(${index}, ${item.quantity - 1})">-</button>
                        <span class="item-quantity">x ${item.quantity}</span>
                        <button class="quantity-btn add" onclick="adjustQuantity(${index}, ${item.quantity + 1})">+</button>
                    </div>
                </div>
            </div>
            <button class="remove-btn checkoutBtn" onclick="removeFromCart(${index})">Remove</button>
        `;

        // Append the item div to the container
        cartItemsContainer.appendChild(itemDiv);
    });

    // Update the total amount after all items are rendered
    document.getElementById('cart-total').textContent = `Total: ${formatPrice(totalAmount.toFixed(2))}`;
}


async function adjustQuantity(index, newQuantity) {
    const item = cart[index];
    const stock = await getProductStock(item.id);

    if (stock === undefined) {
        showModalNotification('Unable to fetch stock information.');
        return;
    }

    if (newQuantity > 0) {
        const oldQuantity = item.quantity;
        const quantityDifference = newQuantity - oldQuantity;

        if (newQuantity <= stock + oldQuantity) {
            cart[index].quantity = newQuantity;

            try {
                const response = await fetch(`${API_BASE_URL}/api/products/updateStock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: item.id,
                        stockChange: -quantityDifference,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update stock in the database.');
                }

                const result = await response.json();
                console.log('Stock updated successfully:', result);

                updateTotalAmount();
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
            } catch (err) {
                console.error('Error updating stock in the database:', err);
                showModalNotification('An error occurred while updating stock in the database.');
            }
        } else {
            showModalNotification(`${stock} units are available in stock.`);
        }
    } else if (newQuantity <= 0) {
        showModalNotification('Quantity cannot be less than 1.');

        cart.splice(index, 1);
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/updateStock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: item.id,
                    stockChange: item.quantity, 
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to restore stock in the database.');
            }

            const result = await response.json();
            console.log('Stock restored successfully:', result);

            updateTotalAmount();
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
        } catch (err) {
            console.error('Error restoring stock in the database:', err);
            showModalNotification('An error occurred while restoring stock in the database.');
        }
    }
}



async function getProductStock(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);

        if (!response.ok) {
            throw new Error('Product not found');
        }

        const product = await response.json();
        const stock = product.stock; 

        console.log('Product ID:', product.id, 'Stock:', stock);
        return stock; 
    } catch (err) {
        console.error('Error fetching product stock:', err);
        return undefined;
    }
}


function queryAsync(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}




async function getProductDetails(id) {

    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const product = await response.json();
        const descriptionLines = product.description.split('\n').map(line => `<div class="description-line">${line}</div>`).join('');

        const numericPrice = parseFloat(product.price.replace(/,/g, ''));
        const formattedPrice = numericPrice.toLocaleString();

        document.getElementById('content-div').innerHTML = `
            <div id="viewProduct-container" data-product-id="${product.id}">
                <h1 id="nameH1">${product.name}</h1>
                <div class="productDetails">
                    <div id="productImg">
                        <img src="${product.image_url}" alt="${product.name}">
                    </div>
                    <div id="productInfo">
                        <p><strong>Price:</strong> Php ${formattedPrice}</p>
                        <p><strong>Category:</strong> ${product.category}</p>
                        <p id="stockInfo"><strong>Stock:</strong> ${product.stock > 0 ? product.stock + ' available' : 'Out of stock'}</p>
                        <p><strong>Created At:</strong> ${new Date(product.created_at).toLocaleDateString()}</p>

                        <div class="product-actions">
                            <button id="addToCartBtn" >Add to Cart</button>
                            <button id="buyNowBtn">Buy Now</button>
                            

                           
                        </div>
                    </div>
                </div>

                <div id="product-description">
                    ${descriptionLines}
                </div>
            </div>
        `;

        const productToAdd = {
            id: product.id,
            name: product.name,
            price: numericPrice,
            quantity: 1,
            imageUrl: product.image_url || 'default-image.jpg'
        };

        async function addToCartForAddButton(product) {
           t
            if (product.stock <= 0) {
                console.log(`${product.name} has 0 stock available.`);
                showModalNotification('This product is out of stock.');
                return; 
            }

            try {
                const stockResponse = await fetch(`${API_BASE_URL}/api/products/${product.id}`);
                if (!stockResponse.ok) {
                    throw new Error('Failed to fetch the latest stock information.');
                }
                const updatedProduct = await stockResponse.json();

                if (updatedProduct.stock <= 0) {
                    console.log(`${product.name} has 0 stock available (after server check).`);
                    showModalNotification('This product is out of stock.');
                    return;
                }

                showModalNotification(`${product.name} added to cart!`);

                const existingItem = cart.find(item => item.id === product.id);
                if (existingItem) {

                    existingItem.quantity += 1;
                } else {
                    const productPrice = typeof product.price === 'string'
                        ? parseFloat(product.price.replace(/,/g, ''))
                        : product.price;

                    const productToAdd = {
                        id: product.id,
                        name: product.name,
                        price: productPrice,
                        quantity: 1,
                        imageUrl: product.imageUrl || 'default-image.jpg',
                    };
                    cart.push(productToAdd);
                }

                const updateResponse = await fetch(`${API_BASE_URL}/api/products/updateStock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        productId: product.id,
                        stockChange: -1,
                    }),
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update stock on the server.');
                }

                const result = await updateResponse.json();
                console.log('Stock updated successfully:', result);

                const stockInfo = document.getElementById(`stockInfo-${product.id}`);
                if (stockInfo) {
                    let currentStock = parseInt(stockInfo.textContent.match(/\d+/)[0]) - 1;

                    if (currentStock === 0) {
                        showModalNotification(`${product.name} has 0 stock available.`);
                        stockInfo.textContent = `Stock: 0 available`;
                    } else {
                        stockInfo.textContent = `Stock: ${currentStock} available`;
                    }
                }

                localStorage.setItem('cart', JSON.stringify(cart));
                updateTotalAmount();
                updateCartDisplay();

                console.log('Product added to cart:', product);
            } catch (error) {
                console.error('Error updating stock or adding to cart:', error);
                showModalNotification('An error occurred while processing your request.');
            }
        }




        const addToCartBtn = document.getElementById('addToCartBtn');
        addToCartBtn.addEventListener('click', () => addToCartForAddButton(productToAdd));

        const buyNowBtn = document.getElementById('buyNowBtn');
        buyNowBtn.addEventListener('click', async () => {
            if (productToAdd.stock <= 0) {
                console.log(`${productToAdd.name} has 0 stock available.`);
                showModalNotification('This product is out of stock.');
                return;
            }

            try {
                await addToCartForAddButton(productToAdd);

                const response = await fetch(`${API_BASE_URL}/api/products/${productToAdd.id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch updated product details.');
                }

                const updatedProduct = await response.json();
                if (updatedProduct.stock <= 0) {
                    console.log(`${productToAdd.name} is now out of stock.`);
                    showModalNotification('This product is out of stock.');
                    return;
                }

                loadContent('checkout');
            } catch (err) {
                console.error('Error while adding product to cart or loading checkout:', err);
                showModalNotification('An error occurred. Please try again.');
            }
        });



        startStockPolling(id);
    } catch (err) {
        console.error('Error fetching product details:', err);
    }
}


loadCart();




let stockPollingInterval;

function startStockPolling(productId) {
    if (stockPollingInterval) clearInterval(stockPollingInterval);

    stockPollingInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/getProductStock/${productId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch stock data');
            }

            const data = await response.json();
            const stockInfo = document.getElementById('stockInfo');

            if (data.stock > 0) {
                stockInfo.innerHTML = `<strong>Stock:</strong> ${data.stock} available`;
            } else {
                stockInfo.innerHTML = `<strong>Stock:</strong> Out of stock`;
            }
        } catch (err) {
            console.error('Error polling stock data:', err);
        }
    }, 1000); // Poll every 5 seconds
}

function stopStockPolling() {
    if (stockPollingInterval) {
        clearInterval(stockPollingInterval);
        stockPollingInterval = null;
    }
}





document.addEventListener('DOMContentLoaded', () => {

    document.body.addEventListener('click', function (event) {
        if (event.target && event.target.id === 'googleBtn') {
            console.log('Google Login Button Clicked');
            window.location.href = 'https://drecomputercenter.com/auth/google';
        }
    });
});






function loadHTML(url, elementId) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
        })
        .catch(error => console.error('Error loading HTML:', error));
}


loadHTML('nav.html', 'nav-container');
loadHTML('footer.html', 'footer-container');
loadHTML('marquee.html', 'marquee-container');
loadHTML('header.html', 'head-container');






function loadContent(page, productId = null) {
    var file = page + '.html';

    var xhr = new XMLHttpRequest();
    const aside = document.getElementById('cart');
    const asideImg = document.getElementById('asideImg');

    xhr.open('GET', file, true);
    xhr.send();

    xhr.onload = function () {
        if (xhr.status != 200) {
            alert(`Error ${xhr.status}: ${xhr.statusText}`);
        } else {


            document.getElementById('content-div').innerHTML = xhr.responseText;

            if (page === 'checkout') {
                stopStockPolling();
                fetch('/checkout.html')
                    .then(response => response.text())
                    .then(html => {
                        document.getElementById('content-div').innerHTML = html;

                        console.log('checkout.js loaded');
                        const print1 = 'one';
                        console.log(print1);

                        const cart = JSON.parse(localStorage.getItem('cart')) || [];
                        const totalElement = document.getElementById('checkout-total');
                        const checkoutItemsElement = document.getElementById('checkout-items');
                        const userAddressParagraph = document.getElementById('user-address');
                        const userLandmark = document.getElementById('landmark-address');
                        const userNameElement = document.getElementById('user-name');
                        const userEmailElement = document.getElementById('user-email');
                        const userPhoneElement = document.getElementById('user-phone');
                        const orderDateElement = document.getElementById('order-date');

                        const currentDateTime = new Date().toLocaleString('en-PH', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        });
                        orderDateElement.textContent = currentDateTime;


                        fetch('/api/getUserProfile')
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Failed to fetch user profile');
                                }
                                return response.json();
                            })
                            .then(userData => {

                                userNameElement.textContent = userData.name || 'Name not available';
                                userEmailElement.textContent = userData.email || 'Email not available';
                                userPhoneElement.textContent = userData.phoneNumber || 'Phone number not available';
                                userLandmark.textContent = userData.street_landmark || 'Landmark not available';

                                userAddressParagraph.textContent = userData.address || 'Address not available';
                            })
                            .catch(error => {
                                console.error('Error fetching user profile:', error);
                            });

                        function formatPrice(amount) {
                            return `Php ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
                        }

                        function displayCartItems() {
                            if (cart.length === 0) {
                                checkoutItemsElement.innerHTML = '<p>Your cart is empty.</p>';
                                totalElement.textContent = formatPrice(0);
                                return;
                            }

                            checkoutItemsElement.innerHTML = '';
                            let total = 0;

                            cart.forEach(item => {
                                const itemElement = document.createElement('div');
                                itemElement.classList.add('checkout-item');
                                const itemSubtotal = (item.price * item.quantity).toFixed(2);
                                total += item.price * item.quantity;

                                itemElement.innerHTML = `
                                    <p><strong>${item.name}</strong></p>
                                    <p>Price: ${formatPrice(item.price)}</p>
                                    <p>Quantity: ${item.quantity}</p>
                                    <p>Subtotal: ${formatPrice(itemSubtotal)}</p>
                                `;
                                checkoutItemsElement.appendChild(itemElement);
                            });

                            totalElement.textContent = formatPrice(total.toFixed(2));
                        }

                        displayCartItems();
                    })
                    .catch(error => console.error('Error loading checkout.html:', error));
            }

            initCartEvents();
            updateWelcomeMessage();

            if (page === 'product-detail' && productId) {
                getProductDetails(productId);
            }
            if (page === 'default-home') {
                const API_BASE_URL = 'https://drecomputercenter.com';
                stopStockPolling();

            }

            if (page === 'profile') {
                fetch('/profile.html')
                    .then(response => response.text())
                    .then(html => {
                        document.getElementById('content-div').innerHTML = html;
                        aside.style.display = 'none';
                        console.log('profile.html loaded');

                        fetchUserProfile();
                        initializeEventListeners();

                        fetch('/api/userOrders')
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error('Failed to fetch user orders');
                                }
                                return response.json();
                            })
                            .then(ordersData => {
                                displayUserOrders(ordersData);
                            })
                            .catch(error => {
                                console.error('Error fetching user orders:', error);
                            });

                        function fetchUserProfile() {
                            fetch('/api/getUserProfile')
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error('Network response was not ok');
                                    }
                                    return response.json();
                                })
                                .then(data => {
                                    populateProfile(data);
                                })
                                .catch(error => console.error('Error fetching user profile:', error));
                        }

                        function populateProfile(userData) {
                            document.getElementById('profile-name').textContent = userData.name;
                            document.getElementById('profile-address').textContent = userData.address || 'Not provided';
                            document.getElementById('profile-landmark').textContent = userData.street_landmark || 'Not provided';
                            document.getElementById('profile-email').textContent = userData.email || 'Not provided';
                            document.getElementById('profile-phone').textContent = userData.phoneNumber || 'Not provided';
                            document.getElementById('profile-name-input').value = userData.name;
                            document.getElementById('profile-address-input').value = userData.address || '';
                            document.getElementById('profile-landmark-input').value = userData.street_landmark || '';
                            document.getElementById('profile-email-input').value = userData.email;
                            document.getElementById('profile-phone-input').value = userData.phoneNumber || '';
                        }

                        async function initializeEventListeners() {
                            const editButton = document.getElementById('edit-button');

                            try {
                                // Fetch user profile to determine if the user is logged in
                                const response = await fetch('/api/getUserProfile');
                                if (response.ok) {
                                    const userProfile = await response.json();
                                    console.log('User Profile:', userProfile);

                                    // If user is logged in, enable the Edit Profile button
                                    editButton.addEventListener('click', function () {
                                        console.log("Edit button clicked");
                                        document.getElementById('profile-data').style.display = 'none';
                                        document.getElementById('profile-form').style.display = 'block';
                                    });

                                    // Add other event listeners (e.g., for form submission)
                                    document.getElementById('profile-form').addEventListener('submit', async function (event) {
                                        event.preventDefault();
                                        const updatedData = {
                                            name: document.getElementById('profile-name-input').value,
                                            address: document.getElementById('profile-address-input').value,
                                            street_landmark: document.getElementById('profile-landmark-input').value,
                                            email: document.getElementById('profile-email-input').value,
                                            phoneNumber: document.getElementById('profile-phone-input').value,
                                        };

                                        console.log("Updating profile with data:", updatedData);

                                        try {
                                            const updateResponse = await fetch('/api/updateUserProfile', {
                                                method: 'PUT',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                },
                                                body: JSON.stringify(updatedData),
                                            });

                                            if (updateResponse.ok) {
                                                showModalNotification('Profile updated successfully!');
                                                location.reload();
                                            } else {
                                                const errorMessage = await updateResponse.text();
                                                console.error('Error details:', errorMessage);
                                                showModalNotification('Failed to update profile. ' + errorMessage);
                                            }
                                        } catch (error) {
                                            console.error('Error updating profile:', error);
                                        }
                                    });

                                    document.getElementById('cancel-edit').addEventListener('click', function () {
                                        console.log("Cancel button clicked");
                                        document.getElementById('profile-data').style.display = 'block';
                                        document.getElementById('profile-form').style.display = 'none';
                                    });

                                } else {

                                    console.log('User not authenticated');
                                    editButton.disabled = true;
                                    editButton.style.cursor = 'not-allowed';
                                    editButton.title = 'Log in to edit your profile';
                                }
                            } catch (error) {
                                console.error('Error fetching user profile:', error);
                                editButton.disabled = true; // Disable the button in case of an error
                                editButton.style.cursor = 'not-allowed';
                                editButton.title = 'Error occurred. Try again later.';
                            }
                        }



                        function displayUserOrders(orders) {
                            const ordersTableBody = document.getElementById('orders-table-body');
                            ordersTableBody.innerHTML = '';

                            if (orders.length === 0) {
                                ordersTableBody.innerHTML = '<tr><td colspan="6">No orders found.</td></tr>';
                                return;
                            }

                            const recentOrders = [...orders].reverse();
                            recentOrders.forEach(order => {
                                const row = document.createElement('tr');

                                // Handle the 'items' column, checking if it's already parsed or needs parsing
                                let itemsDisplay = 'N/A';
                                if (order.items) {
                                    try {
                                        // Check if 'items' is a string that needs parsing
                                        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

                                        itemsDisplay = items.map(item =>
                                            `<div>
                                                <strong>${item.name}</strong> - Php ${item.price.toLocaleString()} x ${item.quantity}
                                            </div>`
                                        ).join('<br>');
                                    } catch (e) {
                                        console.error('Error parsing items JSON:', e);
                                        itemsDisplay = 'Error displaying items';
                                    }
                                }

                                row.innerHTML = `
                                    <td>${order.orderId}</td>
                                    <td>Php ${order.totalAmount.toLocaleString()}</td>
                                    <td>${itemsDisplay}</td>
                                    <td>${order.status}</td>
                                    <td>${order.payment_status || 'N/A'}</td>
                                    <td><img src="${order.receipt}" alt="Receipt" style="width: 100px; height: auto; cursor: pointer;" class="receipt-image"></td>
                                `;
                                ordersTableBody.appendChild(row);
                            });

                            document.querySelectorAll('.receipt-image').forEach(img => {
                                img.addEventListener('click', function () {
                                    window.open(this.src, '_blank');
                                });
                            });
                        }

                    })
                    .catch(error => console.error('Error loading profile.html:', error));
            }



            if (page === 'register') {
                // stopStockPolling();
                console.log('register logic loaded');

                const showNotification = (message, isSuccess) => {
                    const notificationElement = document.getElementById('notification');
                    notificationElement.innerText = message;
                    notificationElement.style.display = 'block';
                    notificationElement.style.backgroundColor = isSuccess ? '#dff0d8' : '#f2dede';
                    notificationElement.style.color = isSuccess ? '#3c763d' : '#a94442';

                    setTimeout(() => {
                        notificationElement.style.display = 'none';
                    }, 10000);
                };

                document.getElementById('registerForm').addEventListener('submit', async (event) => {
                    event.preventDefault();

                    const formData = new FormData(event.target);
                    const name = formData.get('name');
                    const email = formData.get('email');
                    const password = formData.get('password');

                    try {
                        const response = await fetch(`${API_BASE_URL}/register`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ name, email, password }),
                        });
                        const data = await response.json();

                        if (response.ok) {
                            showNotification(data.message, true);
                        } else {
                            showNotification(data.message || 'Registration failed. Please try again.', false);
                        }

                    } catch (error) {
                        console.error('Error:', error);
                        showNotification('An error occurred. Please try again later.', false);
                    }
                });

                aside.style.display = 'none';
            }

            if (page === 'login') {
                // stopStockPolling();
                const API_BASE_URL = 'https://drecomputercenter.com';
                document.getElementById('loginForm').action = `${API_BASE_URL}/login`; // Dynamically setting the action
            }


            if (page === 'products') {
                // stopStockPolling();
                fetchProducts(currentPage);
                const contentDiv = document.getElementById('content-div');
                contentDiv.style.display = 'flex'
                contentDiv.style.flexDirection = 'column';
                contentDiv.style.alignItems = 'center';
                contentDiv.style.justifyContent = 'center';



            } else if (page === 'address') {
                // stopStockPolling();

                aside.style.display = 'none';
            } else if (page === 'carousel') {
                initCarousel();
                aside.style.display = 'none';
            } else {
                aside.style.display = 'none';

                const searchInput = document.getElementById('searchInput');
                const searchButton = document.getElementById('searchButton');

                function fetchProductsSearch(query = '') {
                    let url = `${API_BASE_URL}/api/productsSearch`;


                    if (query === '') {
                        return;
                    }

                    const categories = query.split(',').map(cat => cat.trim());
                    url += `?search=${encodeURIComponent(categories.join(','))}`;

                    fetch(url)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Fetched products:', data);
                            const productContainer = document.getElementById('content-div');
                            if (data.length === 0) {
                                productContainer.innerHTML = `<p>No results found for "${query}"</p>`;
                            } else {
                                displayProducts(data);
                            }
                        })
                        .catch(err => console.error('Error fetching products:', err));
                }

                searchInput.addEventListener('input', () => {
                    const searchQuery = searchInput.value.trim();
                    fetchProductsSearch(searchQuery);
                });

                searchButton.addEventListener('click', () => {
                    const searchQuery = searchInput.value.trim();
                    fetchProductsSearch(searchQuery);
                });

                searchInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        const searchQuery = event.target.value.trim();
                        fetchProductsSearch(searchQuery);
                    }
                });

                searchInput.addEventListener('focus', () => {
                    if (searchInput.value.trim() === '') {
                        fetchProducts();
                    }
                });

                searchInput.addEventListener('click', () => {
                    if (searchInput.value.trim() === '') {
                        fetchProducts();
                    }
                });

            }
        }
    };
}

function loadJS(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;

    if (callback) {
        script.onload = callback;
    }

    document.body.appendChild(script);
}





function fetchUserProfile() {
    fetch('/api/getUserProfile')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('profile-name').textContent = data.name;
            document.getElementById('profile-address').textContent = data.address || '';
            document.getElementById('profile-email').textContent = data.email;
            document.getElementById('profile-phone').textContent = data.phoneNumber || '';
            document.getElementById('profile-name-input').value = data.name;
            document.getElementById('profile-address-input').value = data.address || '';
            document.getElementById('profile-email-input').value = data.email;
            document.getElementById('profile-phone-input').value = data.phoneNumber || '';
        })
        .catch(error => console.error('Error fetching user profile:', error));
}



async function initializeEventListeners() {
    const editButton = document.getElementById('edit-button');

    try {
        // Fetch user profile to determine if the user is logged in
        const response = await fetch('/api/getUserProfile');
        if (response.ok) {
            const userProfile = await response.json();
            console.log('User Profile:', userProfile);

            // If user is logged in, enable the Edit Profile button
            editButton.addEventListener('click', function () {
                console.log("Edit button clicked");
                document.getElementById('profile-data').style.display = 'none';
                document.getElementById('profile-form').style.display = 'block';
            });

            // Add other event listeners (e.g., for form submission)
            document.getElementById('profile-form').addEventListener('submit', async function (event) {
                event.preventDefault();
                const updatedData = {
                    name: document.getElementById('profile-name-input').value,
                    address: document.getElementById('profile-address-input').value,
                    street_landmark: document.getElementById('profile-landmark-input').value,
                    email: document.getElementById('profile-email-input').value,
                    phoneNumber: document.getElementById('profile-phone-input').value,
                };

                console.log("Updating profile with data:", updatedData);

                try {
                    const updateResponse = await fetch('/api/updateUserProfile', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updatedData),
                    });

                    if (updateResponse.ok) {
                        showModalNotification('Profile updated successfully!');
                        location.reload();
                    } else {
                        const errorMessage = await updateResponse.text();
                        console.error('Error details:', errorMessage);
                        showModalNotification('Failed to update profile. ' + errorMessage);
                    }
                } catch (error) {
                    console.error('Error updating profile:', error);
                }
            });

            document.getElementById('cancel-edit').addEventListener('click', function () {
                console.log("Cancel button clicked");
                document.getElementById('profile-data').style.display = 'block';
                document.getElementById('profile-form').style.display = 'none';
            });

        } else {
            // If the user is not authenticated, disable the button
            console.log('User not authenticated');
            editButton.disabled = true;
            editButton.style.cursor = 'not-allowed';
            editButton.title = 'Log in to edit your profile';
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        editButton.disabled = true; // Disable the button in case of an error
        editButton.style.cursor = 'not-allowed';
        editButton.title = 'Error occurred. Try again later.';
    }
}





function populateProfile(userData) {
    console.log('Populating profile with:', userData);
    document.getElementById('profile-name').textContent = userData.name;
    document.getElementById('profile-address').textContent = userData.address || 'Not provided';
    document.getElementById('profile-landmark').textContent = userData.street_landmark || 'Not provided'; // Check if this key is correct
    document.getElementById('profile-email').textContent = userData.email || 'Not provided';
    document.getElementById('profile-phone').textContent = userData.phoneNumber || 'Not provided';

    document.getElementById('profile-name-input').value = userData.name;
    document.getElementById('profile-address-input').value = userData.address || '';
    document.getElementById('profile-landmark-input').value = userData.street_landmark || ''; // Ensure this key matches the response
    document.getElementById('profile-email-input').value = userData.email;
    document.getElementById('profile-phone-input').value = userData.phoneNumber || '';
}



function loadCategoryProducts(category) {

    var apiEndpoint = '/api/products?category=' + category;


    var xhr = new XMLHttpRequest();


    xhr.open('GET', apiEndpoint, true);


    xhr.send();


    xhr.onload = function () {
        if (xhr.status != 200) {

            alert(`Error ${xhr.status}: ${xhr.statusText}`);
        } else {

            var products = JSON.parse(xhr.responseText);


            displayProducts(products);
        }
    };
}


function updateBreadcrumb(pageName, category) {
    const breadcrumbList = document.getElementById('breadcrumb-list');
    const newCrumb = document.createElement('li');
    newCrumb.innerHTML = `<a href="#" onclick="loadContent('${category}')">${pageName}</a>`;
    breadcrumbList.appendChild(newCrumb);
}

function updateWelcomeMessage() {
    const welcomeMessage = document.getElementById('welcome-message');

    welcomeMessage.options[0].textContent = "Loading...";

    fetch('/profile', { cache: 'no-cache' })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Not authenticated');
            }
        })
        .then(user => {
            welcomeMessage.options[0].textContent = `Welcome, ${user.name}`;
            welcomeMessage.options[0].value = "user";

            const logoutOption = Array.from(welcomeMessage.options).find(option => option.value === "logout");
            if (!logoutOption) {
                const newLogoutOption = document.createElement('option');
                newLogoutOption.value = "logout";
                newLogoutOption.textContent = "Logout";
                welcomeMessage.appendChild(newLogoutOption);
            }
        })
        .catch(error => {
            console.log('Error fetching profile:', error);

            welcomeMessage.options[0].textContent = "Welcome, Guest";
            welcomeMessage.options[0].value = "guest";

            const logoutOption = Array.from(welcomeMessage.options).find(option => option.value === "logout");
            if (logoutOption) {
                logoutOption.remove();
            }
        });
}




function logoutUser() {
    const modal = document.getElementById('modal-notification');
    const modalMessage = document.getElementById('modal-message');
    modalMessage.textContent = "Are you sure you want to log out?";
    const closeBtn = document.getElementById('close-modal-btn');


    modal.classList.add('logout-modal');
    modal.style.display = 'flex';

    if (modal.classList.contains('logout-modal')) {
        closeBtn.style.display = 'none';
    }

    const yesButton = document.createElement('button');
    yesButton.textContent = "Yes";
    yesButton.onclick = () => {
        fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
        })
            .then(response => {
                if (response.ok) {
                    localStorage.removeItem('token');
                    sessionStorage.clear();
                    console.log('User logged out');
                    window.location.href = '/index.html';
                } else {
                    return response.text().then(text => {
                        throw new Error(text || 'Failed to log out');
                    });
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
            })
            .finally(() => closeModalNotification());
    };

    const noButton = document.createElement('button');
    noButton.textContent = "No";
    noButton.onclick = () => {
        console.log('Logout canceled');
        closeModalNotification();
    };

    const modalContent = modal.querySelector('.modal-content');
    modalContent.appendChild(yesButton);
    modalContent.appendChild(noButton);
}





const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (productId) {
    getProductDetails(productId);
} else {
    document.getElementById('content-div').innerHTML = 'Product not found.';
}


function initCartEvents() {

    const showCartBtn = document.getElementById('showCartBtn');
    if (showCartBtn) {
        showCartBtn.addEventListener('click', () => {
            const cart = document.getElementById('cart');
            cart.style.display = 'block';
        });
    } else {
        console.warn('Show Cart Button not found in the DOM');
    }


    const hideCartBtn = document.getElementById('hideCartBtn');
    if (hideCartBtn) {
        hideCartBtn.addEventListener('click', () => {
            const cart = document.getElementById('cart');
            cart.style.display = 'none';
        });
    } else {
        console.warn('Hide Cart Button not found in the DOM');
    }
}


module.exports = {
    addToCart,
    loadCart,
    removeFromCart,
};