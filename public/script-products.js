console.log('script-products.js is loaded');

function fetchProductsSearch(query = '') {
    let url = `${API_BASE_URL}/api/productsSearch`;
    if (query) {
        const categories = query.split(',').map(cat => cat.trim());
        url += `?search=${encodeURIComponent(categories.join(','))}`;
    }

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
                productContainer.innerHTML = `<p>No ${query} found</p>`;
            } else {
                displayProducts(data);
            }
        })
        .catch(err => console.error('Error fetching products:', err));
}


let currentPage = 1;
const productsPerPage = 12;

function fetchProducts(page = 1) {

    sessionStorage.setItem('lastVisitedPage', page);

    const url = `${API_BASE_URL}/api/products/paginated?page=${page}&limit=${productsPerPage}`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched products:', data.products);
            displayProducts(data.products);
            displayPagination(data.currentPage, data.totalPages);
        })
        .catch(err => console.error('Error fetching products:', err));
}



function displayProducts(products) {
    const catalog = document.getElementById('product-catalog') || document.getElementById('content-div');
    if (catalog) {
        catalog.innerHTML = '';
        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'card';
            productCard.innerHTML = `
                <div class="imgBox">
                    <img src="${product.image_url || 'default-image.jpg'}" alt="${product.name}" class="mouse" onclick="getProductDetails(${product.id})"> 
                    <div class="add-to-cart-icon" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image_url || 'default-image.jpg'}">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                </div>
                <div class="contentBox">
                    <h3>${product.name}</h3>
                    <p class="price">Price: Php ${product.price}</p>
                </div>
                <div style="display: flex; justify-content: flex-end; width: 100%; align-items: flex-end;">
    <div id="prod-stock" style="color: white; font-size: 1em; margin-right: 10px;
    font-weight: bold;">Stock: ${product.stock}</div>
</div>

            `;

            const addToCartIcon = productCard.querySelector('.add-to-cart-icon');
            addToCartIcon.addEventListener('click', () => {
                // Check if the stock is 0 before proceeding
                if (product.stock <= 0) {
                    console.log(`Cannot add ${product.name} to cart: stock is 0.`);
                    showModalNotification('This product is out of stock.');
                    return; // Exit the function
                }

                const productToAdd = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    imageUrl: addToCartIcon.getAttribute('data-image')
                };

                addToCart(productToAdd);
                showModalNotification(`${product.name} added to cart!`);
            });


            catalog.appendChild(productCard);
        });
    } else {
        console.error('Product catalog or content div not found.');
    }
}



function displayPagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.className = 'pagination-button';
        prevButton.onclick = () => fetchProducts(currentPage - 1);
        paginationContainer.appendChild(prevButton);
    }

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageInfo);

    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.className = 'pagination-button';
        nextButton.onclick = () => fetchProducts(currentPage + 1);
        paginationContainer.appendChild(nextButton);
    }
}



function loadProductDetail(productId) {
    loadContent('product-detail.html');

    setTimeout(() => {
        fetchProductDetail(productId);
    }, 200);
}

function fetchProductDetail(productId) {
    fetch(`/api/getProductById?id=${productId}`)
        .then(response => response.json())
        .then(product => {
            document.querySelector('#product-name').innerText = product.name;
            document.querySelector('#product-price').innerText = `Price: Php ${product.price}`;
            document.querySelector('#product-description').innerText = product.description;
            document.querySelector('#product-image').src = product.image_url || 'default-image.jpg';
        })
        .catch(error => {
            console.error('Error fetching product details:', error);
        });
}



document.addEventListener("DOMContentLoaded", (event) => {
    loadContent('default-home');
});
