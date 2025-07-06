let orders = [];


function initializeProductManagement() {
    const productForm = document.getElementById('productForm');
    const tableBody = document.getElementById('productTableBody');

    if (productForm) {
        productForm.addEventListener('submit', submitProduct);
        console.log('Product form event listener added.');

        const imageInput = document.querySelector('input[name="productImage"]');
        const imagePreview = document.getElementById('imagePreview');

        if (imageInput && imagePreview) {
            imageInput.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        imagePreview.src = e.target.result;
                        imagePreview.alt = 'Uploaded product image';
                    };
                    reader.readAsDataURL(file);
                } else {
                    imagePreview.src = '';
                }
            });
            console.log('Image preview functionality initialized.');
        }
    } else {
        console.error('Product form not found');
    }

    if (tableBody) {
        fetchProducts();
    } else {
        console.error('Product table body not found');
    }
}




document.addEventListener('DOMContentLoaded', (event) => {
    const productForm = document.getElementById('productForm');

    if (productForm) {
        productForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const formData = new FormData(productForm);


            fetch('/api/products', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Success:', data);

                })
                .catch((error) => {
                    console.error('Error:', error);
                });
        });
    }
});


function initializeDescriptionTextarea() {
    const descriptionTextarea = document.querySelector('textarea[name="description"]');

    if (descriptionTextarea) {

        descriptionTextarea.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
        console.log("Textarea event listener initialized.");
    } else {
        console.error('Textarea element with name="description" not found');
    }
}

function loadContent(category) {
    var file = category + '.html';
    var xhr = new XMLHttpRequest();
    const contentContainer = document.getElementById('main-admin-container');

    xhr.open('GET', file, true);
    xhr.send();

    xhr.onload = function () {
        if (xhr.status !== 200) {
            alert(`Error ${xhr.status}: ${xhr.statusText}`);
        } else {
            contentContainer.innerHTML = xhr.responseText;

            initializeDescriptionTextarea();
            initializeProductManagement();

            if (category === 'dash-overview') {


                const inventoryTable = document.getElementById('inventory-table').getElementsByTagName('tbody')[0];

                fetch('/api/products')
                    .then(response => response.json())
                    .then(products => {
                        products.forEach(product => {
                            const row = inventoryTable.insertRow();
                            row.innerHTML = `
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.stock}</td>
                <td>
                    <button onclick="adjustStock(${product.id})">Adjust Stock</button>
                </td>
            `;
                        });
                    });

            }

            if (category === 'product-management') {

                document.getElementById('productForm').addEventListener('submit', submitProduct);
            }

            if (category === 'order-management') {
                let currentPage = 1;
                const limit = 10;

                fetchOrders(currentPage);

                async function fetchOrders(page) {
                    try {
                        const response = await fetch(`/api/admin/orders?page=${page}&limit=${limit}`);
                        const { totalOrders, orders, totalPages, currentPage: fetchedPage } = await response.json();

                        const ordersTable = document.getElementById('ordersTable').getElementsByTagName('tbody')[0];
                        ordersTable.innerHTML = '';

                        orders.forEach(order => {
                            const row = document.createElement('tr');
                            row.appendChild(createCell(order.order_id));
                            row.appendChild(createCell(order.name));
                            let itemsDisplay = 'N/A';
                            if (order.items) {
                                try {
                                    // Check if 'items' is a string that needs parsing
                                    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

                                    // Create a display string for the items
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
                            row.appendChild(createCell(itemsDisplay));
                            row.appendChild(createCell(renderReceipt(order.receipt)));
                            row.appendChild(createCell(order.total_amount));
                            row.appendChild(createCell(renderAddress(order.address, order.street_landmark)));
                            row.appendChild(createStatusDropdown(order));
                            row.appendChild(createPaymentStatusDropdown(order));
                            ordersTable.appendChild(row);
                        });

                        updatePaginationControls(totalPages, fetchedPage);
                    } catch (error) {
                        console.error("Error fetching orders:", error);
                    }

                }
                function checkPaymentStatus(totalAmount) {
                    return totalAmount > 0 ? "Paid" : "Unpaid";
                }
                // Helper function to create a table cell
                function createCell(content) {
                    const cell = document.createElement('td');
                    cell.innerHTML = content; // Allows HTML content
                    return cell;
                }




                function createStatusDropdown(order) {
                    const statusCell = document.createElement('td');
                    const statusSelect = document.createElement('select');
                    ['pending', 'shipped', 'delivered', 'cancelled'].forEach(status => {
                        const option = document.createElement('option');
                        option.value = status;
                        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                        option.selected = order.status === status;
                        statusSelect.appendChild(option);
                    });
                    statusSelect.addEventListener('change', (event) => {
                        updateOrderStatus(order.order_id, event.target.value);
                    });
                    statusCell.appendChild(statusSelect);
                    return statusCell;
                }


                function createPaymentStatusDropdown(order) {
                    const paymentStatusCell = document.createElement('td');
                    const paymentStatusSelect = document.createElement('select');


                    const currentPaymentStatus = order.payment_status;


                    ['paid', 'unpaid'].forEach(paymentStatus => {
                        const paymentOption = document.createElement('option');
                        paymentOption.value = paymentStatus;
                        paymentOption.textContent = paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
                        paymentOption.selected = paymentStatus === currentPaymentStatus;
                        paymentStatusSelect.appendChild(paymentOption);
                    });

                    const currentStatusText = document.createElement('p');
                    currentStatusText.textContent = `Current Status: ${currentPaymentStatus.charAt(0).toUpperCase() + currentPaymentStatus.slice(1)}`;
                    currentStatusText.style.margin = '0';

                    paymentStatusSelect.addEventListener('change', async (event) => {
                        try {
                            await updatePaymentStatus(order.order_id, event.target.value);


                            currentStatusText.textContent = `Current Status: ${event.target.value.charAt(0).toUpperCase() + event.target.value.slice(1)}`;
                        } catch (error) {
                            console.error("Error updating payment status:", error);
                        }
                    });


                    paymentStatusCell.appendChild(paymentStatusSelect);
                    paymentStatusCell.appendChild(currentStatusText);
                    return paymentStatusCell;
                }



                function updatePaginationControls(totalPages, currentPage) {
                    const paginationContainer = document.getElementById('pagination');
                    paginationContainer.innerHTML = '';

                    if (currentPage > 1) {
                        const prevButton = document.createElement('button');
                        prevButton.textContent = 'Previous';
                        prevButton.addEventListener('click', () => fetchOrders(currentPage - 1));
                        paginationContainer.appendChild(prevButton);
                    }

                    for (let i = 1; i <= totalPages; i++) {
                        const pageButton = document.createElement('button');
                        pageButton.textContent = i;
                        pageButton.disabled = i === currentPage;
                        pageButton.addEventListener('click', () => fetchOrders(i));
                        paginationContainer.appendChild(pageButton);
                    }

                    if (currentPage < totalPages) {
                        const nextButton = document.createElement('button');
                        nextButton.textContent = 'Next';
                        nextButton.addEventListener('click', () => fetchOrders(currentPage + 1));
                        paginationContainer.appendChild(nextButton);
                    }
                }

                function searchProducts() {
                    const searchQuery = document.getElementById('productSearch').value.trim();

                    if (searchQuery === '') {
                        fetch(`${API_BASE_URL}/api/products`)
                            .then(response => response.json())
                            .then(products => {
                                updateProductTable(products);
                            })
                            .catch(error => console.error('Error fetching all products:', error));
                    } else {

                        fetch(`${API_BASE_URL}/api/productsSearch?search=${encodeURIComponent(searchQuery)}`)
                            .then(response => response.json())
                            .then(products => {
                                updateProductTable(products);
                            })
                            .catch(error => console.error('Error fetching search results:', error));
                    }
                }


                function updateOrderTable(orders) {
                    const tableBody = document.querySelector('#ordersTable tbody');
                    tableBody.innerHTML = '';

                    orders.forEach(order => {
                        const row = document.createElement('tr');


                        row.appendChild(createCell(order.order_id));
                        row.appendChild(createCell(order.name));
                        let itemsDisplay = 'N/A';
                        if (order.items) {
                            try {

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
                        row.appendChild(createCell(itemsDisplay));

                        const receiptCell = document.createElement('td');
                        receiptCell.innerHTML = renderReceipt(order.receipt);
                        row.appendChild(receiptCell);

                        row.appendChild(createCell(order.total_amount));
                        row.appendChild(createCell(renderAddress(order.address, order.street_landmark)));

                        row.appendChild(createStatusDropdown(order));
                        row.appendChild(createPaymentStatusDropdown(order));

                        tableBody.appendChild(row);
                    });
                }


                function renderReceipt(receipt) {
                    if (!receipt) {
                        return 'No receipt available';
                    }
                    const receiptURL = `/${receipt}`;
                    return `<a href="${receiptURL}" target="_blank">
                                <img src="${receiptURL}" alt="Receipt" width="100" height="100" 
                                     onerror="this.onerror=null; this.src='path/to/default-image.jpg';">
                            </a>`;
                }

                function renderAddress(address, streetLandmark) {
                    return `
                        <div>
                            <div>${address}</div>
                            <div>${streetLandmark}</div>
                        </div>
                    `;
                }

                function checkPaymentStatus(totalAmount) {
                    return totalAmount > 0 ? "Paid" : "Unpaid";
                }

            }



        }
    };

    xhr.onerror = function () {
        alert('Network error. Please try again later.');
    };
}

function createCell(value) {
    const cell = document.createElement('td'); // Create a table cell
    cell.textContent = value; // Set the cell's text content
    return cell; // Return the created cell
}



// Function to update the payment status
async function updatePaymentStatus(orderId, paymentStatus) {
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/payment-status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentStatus })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to update payment status');
        }

        showModalNotification(result.message);
        // Save payment status in localStorage
        localStorage.setItem(`paymentStatus_${orderId}`, paymentStatus);

        // Now that orders is defined globally, you can call the update function without passing it explicitly
        updateOrderTable(orders);  // Using the globally defined 'orders'
    } catch (error) {
        console.error("Error updating payment status:", error);
        // alert("Error updating payment status: " + error.message);
        showModalNotification('Payment status updated and adjusted.')
    }
}




function searchProducts() {
    const searchQuery = document.getElementById('productSearch').value.trim();

    // If the search query is empty, fetch all products
    if (searchQuery === '') {
        fetch(`${API_BASE_URL}/api/products`) // Use API_BASE_URL for the endpoint
            .then(response => response.json())
            .then(products => {
                updateProductTable(products);
            })
            .catch(error => console.error('Error fetching all products:', error));
    } else {
        // Fetch products based on the search query
        fetch(`${API_BASE_URL}/api/productsSearch?search=${encodeURIComponent(searchQuery)}`)
            .then(response => response.json())
            .then(products => {
                updateProductTable(products);
            })
            .catch(error => console.error('Error fetching search results:', error));
    }
}



function updateOrderTable(orders) {
    const searchTag = document.getElementById('order-search-tag')
    const tableBody = document.querySelector('#ordersTable tbody'); // Get the table body
    tableBody.innerHTML = ''; // Clear existing rows
    searchTag.style.display = 'none';

    orders.forEach(order => {
        const row = document.createElement('tr'); // Create a new table row

        // Append cells for each order property
        row.appendChild(createCell(order.order_id)); // Order ID
        row.appendChild(createCell(order.name)); // Display Name
        let itemsDisplay = 'N/A';
        if (order.items) {
            try {
                // Check if 'items' is a string that needs parsing
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

                // Create a display string for the items
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
        row.appendChild(createCell(itemsDisplay));

        // Append the receipt cell using the renderReceipt function
        const receiptCell = document.createElement('td');
        receiptCell.innerHTML = renderReceipt(order.receipt); // Use the renderReceipt function
        row.appendChild(receiptCell); // Append the receipt cell to the row

        row.appendChild(createCell(order.total_amount)); // Total Amount
        row.appendChild(createCell(renderAddress(order.address, order.street_landmark))); // Address

        // Replace direct shipping_status and payment_status with dropdowns
        row.appendChild(createStatusDropdown(order)); // Shipping Status Dropdown
        row.appendChild(createPaymentStatusDropdown(order)); // Payment Status Dropdown

        tableBody.appendChild(row); // Append the row to the table body
    });
}

function renderAddress(address, streetLandmark) {
    return `
        <div>
            <div>${address}</div>
            <div>${streetLandmark}</div>
        </div>
    `;
}

// Function to check if the order is paid or unpaid
function checkPaymentStatus(totalAmount) {
    return totalAmount > 0 ? "Paid" : "Unpaid";
}

function createCell(content) {
    const cell = document.createElement('td');
    cell.innerHTML = content; // Allows HTML content
    return cell;
}

// Create Status Dropdown
function createStatusDropdown(order) {
    const statusCell = document.createElement('td');
    const statusSelect = document.createElement('select');
    ['pending', 'shipped', 'delivered', 'cancelled'].forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        option.selected = order.status === status;
        statusSelect.appendChild(option);
    });
    statusSelect.addEventListener('change', (event) => {
        updateOrderStatus(order.order_id, event.target.value);
    });
    statusCell.appendChild(statusSelect);
    return statusCell;
}// Create Payment Status Dropdown


function createPaymentStatusDropdown(order) {
    const paymentStatusCell = document.createElement('td');
    const paymentStatusSelect = document.createElement('select');

    // Populate the dropdown options
    ['paid', 'unpaid'].forEach(paymentStatus => {
        const paymentOption = document.createElement('option');
        paymentOption.value = paymentStatus;
        paymentOption.textContent = paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);
        paymentStatusSelect.appendChild(paymentOption);
    });

    // Set the selected value based on the current payment status
    paymentStatusSelect.value = order.payment_status; // Assuming payment_status is directly from the order object

    // Create a paragraph to display the current payment status
    const currentStatusText = document.createElement('p');
    currentStatusText.textContent = `Current Status: ${order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}`;
    currentStatusText.style.margin = '0'; // Optional: Style the paragraph as needed

    // Modified event listener in createPaymentStatusDropdown
    paymentStatusSelect.addEventListener('change', async (event) => {
        // Pass the orders array to the updatePaymentStatus function
        await updatePaymentStatus(order.order_id, event.target.value, orders);

        // Update the displayed current status after changing payment status
        currentStatusText.textContent = `Current Status: ${event.target.value.charAt(0).toUpperCase() + event.target.value.slice(1)}`;

        // Reload the order table to reflect changes (optional, if needed)
        // updateOrderTable(orders); // Uncomment if you want to refresh the entire table
    });

    // Append the dropdown and the current status text to the payment status cell
    paymentStatusCell.appendChild(paymentStatusSelect);
    paymentStatusCell.appendChild(currentStatusText);
    return paymentStatusCell;
}




// Update pagination controls
function updatePaginationControls(totalPages, currentPage) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = ''; // Clear previous controls

    // Create Previous Button
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.addEventListener('click', () => fetchOrders(currentPage - 1));
        paginationContainer.appendChild(prevButton);
    }

    // Create Page Number Buttons
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.disabled = i === currentPage; // Disable the current page button
        pageButton.addEventListener('click', () => fetchOrders(i));
        paginationContainer.appendChild(pageButton);
    }

    // Create Next Button
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.addEventListener('click', () => fetchOrders(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }
}


// Function to render the receipt
function renderReceipt(receipt) {
    if (!receipt) {
        return 'No receipt available';
    }
    const receiptURL = `/${receipt}`; // Adjust this if needed to include the correct path
    return `<a href="${receiptURL}" target="_blank">
                <img src="${receiptURL}" alt="Receipt" width="100" height="100" 
                     onerror="this.onerror=null; this.src='path/to/default-image.jpg';">
            </a>`;
}


function searchOrders() {
    const searchQuery = document.getElementById('productSearch').value.trim();

    // Helper function to sort orders by order_id (latest to oldest)
    function sortOrdersById(orders) {
        return orders.sort((a, b) => b.order_id - a.order_id);
    }

    // If the search query is empty, fetch all orders
    if (searchQuery === '') {
        fetch(`${API_BASE_URL}/api/getOrders`) // Use API_BASE_URL for the endpoint
            .then(response => response.json())
            .then(orders => {
                const sortedOrders = sortOrdersById(orders); // Sort orders by order_id
                updateOrderTable(sortedOrders); // Update the table with sorted orders
            })
            .catch(error => console.error('Error fetching all orders:', error));
    } else {
        // Fetch orders based on the search query
        fetch(`${API_BASE_URL}/api/ordersSearch?search=${encodeURIComponent(searchQuery)}`)
            .then(response => response.json())
            .then(orders => {
                const sortedOrders = sortOrdersById(orders); // Sort orders by order_id
                updateOrderTable(sortedOrders); // Update the table with sorted results
            })
            .catch(error => console.error('Error fetching search results:', error));
    }
}








function updateProductTable(products) {
    const productTableBody = document.getElementById('productTableBody');
    productTableBody.innerHTML = ''; // Clear the existing rows

    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.brand}</td>
            <td>${product.price}</td>
            <td>${product.category}</td>
            <td>${product.stock}</td>
            <td>
                <button onclick="editProduct(${product.id})">Edit</button>
                <button onclick="removeProduct(${product.id})">Delete</button>
            </td>
        `;
        productTableBody.appendChild(row);
    });
}



function updateOrderStatus(orderId, newStatus) {
    fetch(`/api/updateOrderStatus`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId, status: newStatus })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error updating order status');
            }
            return response.json();
        })
        .then(data => {
            console.log('Order status updated:', data);
        })
        .catch(error => console.error('Error updating order status:', error));
}

// Call loadOrders function when the page loads
// window.onload = loadOrders;
// window.onload = console.log('order JS loaded');
let currentPage = 1;
const productsPerPage = 8;

function fetchProducts(page = currentPage) {
    fetch(`${API_BASE_URL}/api/products/paginated?page=${page}&limit=${productsPerPage}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched products:', data.products);
            renderProductList(data.products);
            displayPagination(data.currentPage, data.totalPages);
        })
        .catch(err => console.error('Error fetching products:', err));
}


function renderProductList(products) {
    const tableBody = document.getElementById('productTableBody');
    if (!tableBody) {
        console.error('Product table body not found during render');
        return;
    }
    tableBody.innerHTML = '';
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.brand}</td> 
            <td>${product.price}</td>
            <td>${product.category}</td>
            <td>${product.stock}</td>
            <td>
                <button onclick="editProduct(${product.id})">Edit</button>
                <button onclick="removeProduct(${product.id})">Remove</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function displayPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.className = 'pagination-button'; // Add class for styling
        prevButton.onclick = () => fetchProducts(currentPage - 1);
        paginationContainer.appendChild(prevButton);
    }

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageInfo);

    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.className = 'pagination-button'; // Add class for styling
        nextButton.onclick = () => fetchProducts(currentPage + 1);
        paginationContainer.appendChild(nextButton);
    }
}

// // Initial fetch to load the first page of products
// fetchProducts();



async function removeProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            console.log(`Product with ID ${productId} has been removed.`);
            showModalNotification(`${productId} has been removed`)
            fetchProducts();
        } catch (error) {
            console.error('Error removing product:', error);
        }
    }
}


function formatPrice(price) {
    return parseFloat(price).toLocaleString();
}

async function submitProduct(event) {
    event.preventDefault(); // Prevent the default form submission

    const formData = new FormData(event.target);
    const productId = formData.get('productId');
    const productName = formData.get('productName');
    const priceInput = formData.get('price');

    // Add the brand to formData
    const brandInput = formData.get('brand');
    formData.set('brand', brandInput);

    // Pass the price as entered
    formData.set('price', priceInput);

    const method = productId ? 'PUT' : 'POST';
    const url = productId ? `${API_BASE_URL}/api/products/${productId}` : `${API_BASE_URL}/api/products`;

    try {
        const response = await fetch(url, {
            method: method,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Product saved:', data);

        showModalNotification('Product saved successfully!');

        fetchProducts();
    } catch (error) {
        console.error('Error saving product:', error);
        showModalNotification('Error saving product: ' + error.message);

    }
}

function editProduct(productId) {
    fetch(`${API_BASE_URL}/api/products/${productId}`)
        .then(response => response.json())
        .then(product => {
            console.log('Product data:', product);
            console.log("Product ID:", productId);

            // Set product details in the form fields
            document.getElementById('productId').value = product.id;
            document.querySelector('input[name="productName"]').value = product.name;

            // Add brand to the form
            document.querySelector('input[name="brand"]').value = product.brand;

            // Display price with commas using formatPrice function
            document.querySelector('input[name="price"]').value = formatPrice(product.price);
            document.querySelector('input[name="category"]').value = product.category;
            document.querySelector('input[name="stock"]').value = product.stock;

            // Set the image preview and existing image URL
            const imagePreview = document.getElementById('imagePreview');
            const existingImageUrl = document.getElementById('existingImageUrl'); // Hidden input

            if (imagePreview) {
                imagePreview.src = product.image_url;
                imagePreview.alt = 'Current product image';
            } else {
                console.error('Image preview element not found');
            }

            // Set the hidden input for existing image URL
            if (existingImageUrl) {
                existingImageUrl.value = product.image_url;
            } else {
                console.error('Existing image URL input not found');
            }

            // Set the description textarea
            document.querySelector('textarea[name="description"]').value = product.description;
        })
        .catch(error => console.error('Error fetching product:', error));
}



// Helper function to format the price with commas
function formatPrice(price) {
    if (typeof price === 'string') {
        // Remove any existing commas and reformat with commas
        price = price.replace(/,/g, '');
    }
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}



function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}


function adjustStock(productId) {
    const newStock = prompt('Enter new stock level');
    if (newStock && !isNaN(newStock)) {
        updateStock(productId, Number(newStock)); // Convert to number
    } else {
        alert('Please enter a valid number for the stock level.');
    }
}


function updateStock(productId, newStock) {
    // Send the request to the new API endpoint for stock update
    fetch(`${API_BASE_URL}/api/products/${productId}/stock`, {
        method: 'PUT',
        body: JSON.stringify({ stock: newStock }), // Send stock as JSON
        headers: { 'Content-Type': 'application/json' },
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Stock updated successfully') {
                showModalNotification('Stock updated!');
                location.reload(); // Reload the page to see the updated stock levels
            } else {
                showModalNotification('Error updating stock');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error updating stock');
        });
}


document.addEventListener("DOMContentLoaded", function () {
    loadContent('product-management');

    const productNameInput = document.getElementById('productName');
    if (productNameInput) {
        setTimeout(() => {
            productNameInput.focus();
        }, 1000);
    }

    const imageInput = document.getElementById('productImageInput');
    const imagePreview = document.getElementById('imagePreview');

    if (imageInput) {
        imageInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    imagePreview.alt = 'Uploaded product image';
                };
                reader.readAsDataURL(file);
            }
        });
    } else {
        console.error('Element with ID productImageInput not found');
    }
});

function logoutUser() {

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
            showModalNotification(`Error during logout: ${error.message}`);
        });
}

