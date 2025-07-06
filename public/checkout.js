document.addEventListener('DOMContentLoaded', () => {
    console.log('checkout.js ! loaded');
    const print1 = 'one';

    console.log(print1);


    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalElement = document.getElementById('checkout-total');
    const checkoutItemsElement = document.getElementById('checkout-items');

    const userAddressParagraph = document.getElementById('user-address');
    const userAddress = '123 Example St, City, Country';
    if (userAddressParagraph) {
        userAddressParagraph.textContent = userAddress;
    } else {
        console.error('Element with ID "user-address" not found');
    }


    function displayCartItems() {
        if (cart.length === 0) {
            checkoutItemsElement.innerHTML = '<p>Your cart is empty.</p>';
            totalElement.textContent = '$0.00';
            return;
        }


        checkoutItemsElement.innerHTML = '';
        let total = 0;


        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('checkout-item');
            itemElement.innerHTML = `
                <p><strong>${item.name}</strong></p>
                <p>Price: $${item.price.toFixed(2)}</p>
                <p>Quantity: ${item.quantity}</p>
                <p>Subtotal: $${(item.price * item.quantity).toFixed(2)}</p>
            `;
            checkoutItemsElement.appendChild(itemElement);
            total += item.price * item.quantity;
        });

        totalElement.textContent = `$${total.toFixed(2)}`;
    }


    displayCartItems();
});



document.body.addEventListener('click', function (event) {
    if (event.target && event.target.id === 'googleBtn') {
        console.log('Google Login Button Clicked');
        window.location.href = 'https://drecomputercenter.com/auth/google';
    }
});



document.getElementById('checkout-button').addEventListener('click', function () {
    const cartData = JSON.parse(localStorage.getItem('cart')) || [];
    localStorage.setItem('checkoutCart', JSON.stringify(cartData));
    loadContent('checkout');
});
