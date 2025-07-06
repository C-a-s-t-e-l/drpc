
console.log('orders loaded');

function loadUserOrders() {
    const userId = sessionStorage.getItem('userId');

    fetch(`/api/userOrders/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching orders');
            }
            return response.json();
        })
        .then(orders => {
            const ordersTableBody = document.querySelector('#orders-table tbody');
            ordersTableBody.innerHTML = ''; // Clear loading message

            if (orders.length === 0) {
                ordersTableBody.innerHTML = `<tr><td colspan="4">No orders found.</td></tr>`;
                return;
            }

            orders.forEach(order => {
                const row = document.createElement('tr');

                const orderIdCell = document.createElement('td');
                orderIdCell.textContent = order.orderId;
                row.appendChild(orderIdCell);

                const totalAmountCell = document.createElement('td');
                totalAmountCell.textContent = `₱${parseFloat(order.totalAmount).toLocaleString()}`;
                row.appendChild(totalAmountCell);

                const statusCell = document.createElement('td');
                statusCell.textContent = order.status.charAt(0).toUpperCase() + order.status.slice(1);
                row.appendChild(statusCell);

                const receiptCell = document.createElement('td');
                if (order.receipt) {
                    const receiptImage = document.createElement('img');
                    receiptImage.src = order.receipt;
                    receiptImage.alt = 'Order Receipt';
                    receiptImage.style.width = '100px'; 
                    receiptImage.style.cursor = 'pointer';
                    receiptImage.addEventListener('click', () => {
                        window.open(order.receipt, '_blank'); 
                    });
                    receiptCell.appendChild(receiptImage);
                } else {
                    receiptCell.textContent = 'No Receipt';
                }
                row.appendChild(receiptCell);

                ordersTableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error loading user orders:', error));
}

loadUserOrders();

document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
});

async function fetchOrders() {
    try {
        const response = await fetch('/api/userOrders'); 
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const orders = await response.json();
        displayOrders(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        document.querySelector('#orders-table tbody').innerHTML = '<tr><td colspan="4">Failed to load orders.</td></tr>';
    }
}


function displayOrders(orders) {
    const ordersTableBody = document.querySelector('#orders-table tbody');
    ordersTableBody.innerHTML = '';

    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="4">No orders found.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.orderId}</td>
            <td>${order.totalAmount}</td>
            <td>${order.status}</td>
            <td><a href="${order.receipt}" target="_blank">View Receipt</a></td>
        `;
        ordersTableBody.appendChild(row);
    });
}

