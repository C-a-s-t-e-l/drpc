// const express = require('express');
// const db = require('../config/db');
// const router = express.Router();


// const { addToCart, loadCart, removeFromCart } = require('/Users/RYZEN 5/DRE PC Plaza/public/script-login');

// router.post('/', addToCart);
// router.get('/', loadCart);
// router.delete('/:productId', removeFromCart);

// // Add item to cart
// router.post('/api/cart', (req, res) => {
//     const { userId, productId, quantity } = req.body; // Assuming userId is passed to identify the user

//     if (!userId || !productId || !quantity) {
//         return res.status(400).json({ error: 'Missing required fields: userId, productId, quantity' });
//     }

//     const query = 'INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?';

//     db.query(query, [userId, productId, quantity, quantity], (err, results) => {
//         if (err) {
//             console.error('Error adding to cart:', err);
//             return res.status(500).json({ error: 'Error adding item to cart' });
//         }
//         res.status(201).json({ message: 'Item added to cart successfully' });
//     });
// });

// // Get user's cart
// router.get('/api/cart/:userId', (req, res) => {
//     const userId = req.params.userId;

//     const query = 'SELECT c.id, c.quantity, p.name, p.price FROM cart c JOIN products p ON c.productId = p.id WHERE c.userId = ?';

//     db.query(query, [userId], (err, results) => {
//         if (err) {
//             console.error('Error fetching cart:', err);
//             return res.status(500).json({ error: 'Error fetching cart' });
//         }
//         res.json(results);
//     });
// });

// // Update item quantity in cart
// router.put('/api/cart/:id', (req, res) => {
//     const cartItemId = req.params.id;
//     const { quantity } = req.body;

//     if (quantity < 0) {
//         return res.status(400).json({ error: 'Quantity cannot be negative' });
//     }

//     const query = 'UPDATE cart SET quantity = ? WHERE id = ?';

//     db.query(query, [quantity, cartItemId], (err, result) => {
//         if (err) {
//             console.error('Error updating cart item:', err);
//             return res.status(500).json({ error: 'Error updating cart item' });
//         }

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Cart item not found' });
//         }

//         res.status(200).json({ message: 'Cart item updated successfully' });
//     });
// });

// // Delete item from cart
// router.delete('/api/cart/:id', (req, res) => {
//     const cartItemId = req.params.id;

//     const query = 'DELETE FROM cart WHERE id = ?';

//     db.query(query, [cartItemId], (err, result) => {
//         if (err) {
//             console.error('Error deleting cart item:', err);
//             return res.status(500).json({ error: 'Error deleting cart item' });
//         }

//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: 'Cart item not found' });
//         }

//         res.status(200).json({ message: 'Cart item deleted successfully' });
//     });
// });

// module.exports = router;
