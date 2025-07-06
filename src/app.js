// npm install express cors express-session passport passport-google-oauth20 mysql2 bcryptjs dotenv multer body-parser nodemailer mongoose
// node packages installed currently dreplazav6


const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const passport = require('./routes/passport');
const bodyParser = require('body-parser');
const productRoutes = require('./routes/products');
const db = require('../src/config/db');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { log } = require('console');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/drecomputercenter.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/drecomputercenter.com/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app);

const util = require('util');


const queryAsync = util.promisify(db.query);


require('dotenv').config();
require('./routes/passport');




const API_BASE_URL = 'https://drecomputercenter.com';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});




const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });



app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));



app.use(cors({
    origin: 'https://drecomputercenter.com',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static('public'));



app.use(session({
    secret: 'dreplazasecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: false,
        maxAge: 1000 * 60 * 60
    }
}));



app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRoutes);

app.use('/api/products', productRoutes);

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.user = { id: req.user.id, name: req.user.name, email: req.user.email };

        res.redirect('/index.html');
    }
);





app.use((req, res, next) => {
    console.log('Session:', req.session);
    console.log('Authenticated: 2', req.isAuthenticated());
    next();
});

app.post('/api/manual-login', (req, res) => {
    const { email, password } = req.body;

    validateUser(email, password).then(user => {
        if (user) {
            req.session.user = user;
            res.status(200).json(user);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }).catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    });
});





app.get('/profile', (req, res) => {
    if (req.isAuthenticated() || req.session.user) {
        const user = req.isAuthenticated() ? req.user : req.session.user;
        res.json({ name: user.name, email: user.email });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

app.get('/api/getUserProfile', (req, res) => {
    console.log('Session:', req.session);
    console.log('Authenticated:', req.isAuthenticated());

    const user = req.isAuthenticated() ? req.user : req.session.user;


    if (user) {
        const query = 'SELECT id, name, email, address, street_landmark, phoneNumber FROM users WHERE id = ?';
        db.query(query, [user.id], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: 'Error fetching user profile' });
            }
            if (results.length > 0) {
                const { id, name, email, address, street_landmark, phoneNumber } = results[0];
                return res.json({ id, name, email, address, street_landmark, phoneNumber });
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        });
    } else {
        return res.status(401).json({ error: 'User not authenticated' });
    }
});

app.put('/api/updateUserProfile', (req, res) => {
    console.log("Session Data:", req.session);

    const { name, address, street_landmark, email, phoneNumber } = req.body;

    // Get the user ID from the session
    const userId = req.session.user ? req.session.user.id : null;

    if (!userId) {
        console.log("User is not authenticated");
        return res.status(401).json({ error: 'User not authenticated' });
    }

    const query = 'UPDATE users SET name = ?, address = ?, street_landmark = ?, email = ?, phoneNumber = ? WHERE id = ?';

    db.query(query, [name, address, street_landmark, email, phoneNumber, userId], (err, result) => {
        if (err) {
            console.error("Error updating user profile:", err);
            return res.status(500).json({ error: 'Error updating user profile' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found or no changes made' });
        }

        res.status(200).json({ message: 'User profile updated successfully' });
    });
});


app.post('/api/saveOrder', (req, res) => {
    const { cart, name, totalAmount, address, street_landmark, receiptPath } = req.body;
    const userId = req.session.user ? req.session.user.id : null;

    console.log('Incoming data:', req.body);

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    const query = 'INSERT INTO orders (user_id, name, items, total_amount, address, street_landmark, receipt) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [userId, name, JSON.stringify(cart), totalAmount, address, street_landmark, receiptPath], (err, result) => {
        if (err) {
            console.error('Error saving order to database:', err);
            return res.status(500).json({ error: 'Error saving order' });
        }
        res.json({ success: true, orderId: result.insertId });
    });
});





app.post('/api/orders', async (req, res) => {
    const { user_id, items, total_amount, address, street_landmark, receipt } = req.body;

    const orderItems = items ? JSON.stringify(items) : JSON.stringify({}); // 

    try {
        const result = await db.query('INSERT INTO orders (user_id, items, total_amount, address, street_landmark, receipt) VALUES (?, ?, ?, ?, ?, ?)', [
            user_id,
            orderItems,
            total_amount,
            address,
            street_landmark,
            receipt
        ]);
        res.status(201).json({ message: 'Order saved successfully', orderId: result.insertId });
    } catch (error) {
        console.error('Error saving order:', error);
        res.status(500).json({ error: 'Error saving order' });
    }
});

app.get('/api/getOrders', async (req, res) => {
    try {
        const [orders] = await pool.query('SELECT * FROM orders ORDER BY order_date DESC');
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Error fetching orders' });
    }
});



app.get('/api/ordersSearch', async (req, res) => {
    const searchQuery = req.query.search || '';

    try {
        const [rows] = await pool.query(
            "SELECT orders.*, users.name FROM orders JOIN users ON orders.user_id = users.id WHERE users.name LIKE ?",
            [`%${searchQuery}%`]
        );

        res.json(rows);
    } catch (error) {
        console.error("Error fetching search results:", error);
        res.status(500).json({ error: "Error fetching search results" });
    }
});





app.post('/api/uploadReceipt', (req, res) => {
    const fs = require('fs');
    const path = require('path');

    const receiptsDir = path.join(__dirname, 'uploads/receipts');

    if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
    }
    const receiptData = req.body.receipt;
    const base64Data = receiptData.replace(/^data:image\/jpeg;base64,/, '');
    const fileName = Date.now() + '.jpg';
    const filePath = path.join(__dirname, '../public/uploads/receipts', fileName);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Error saving receipt:', err);
            return res.status(500).json({ error: 'Error saving receipt' });
        }

        res.json({ filePath: `uploads/receipts/${fileName}` });
    });
});



app.put('/api/updateOrderStatus', (req, res) => {
    const { orderId, status } = req.body;

    const query = 'UPDATE orders SET status = ? WHERE order_id = ?';
    db.query(query, [status, orderId], (err, result) => {
        if (err) {
            console.error("Error updating order status:", err);
            return res.status(500).json({ error: 'Error updating order status' });
        }

        res.status(200).json({ message: 'Order status updated successfully' });
    });
});

app.post('/api/confirmOrder', (req, res) => {
    const { orderId, receiptPath } = req.body;

    const query = 'UPDATE orders SET receipt = ? WHERE order_id = ?';
    db.query(query, [receiptPath, orderId], (error, results) => {
        if (error) {
            console.error('Error updating order with receipt:', error);
            return res.status(500).json({ error: 'Failed to update order receipt' });
        }
        res.json({ message: 'Receipt saved successfully' });
    });
});


app.get('/api/userOrders', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    const userId = req.session.user.id;

    console.log(`Fetching orders for user ID: ${userId}`);

    const query = `
        SELECT o.order_id AS orderId,
               o.total_amount AS totalAmount,
               o.items AS items,
               o.status AS status,
               o.receipt AS receipt,
               o.payment_status AS payment_status
        FROM orders o
        WHERE o.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching user orders:", err);
            return res.status(500).json({ error: 'Error fetching orders' });
        }

        console.log('User orders fetched successfully:', results);
        res.json(results);
    });
});


app.post('/api/products', upload.single('productImage'), (req, res) => {
    const { productName, price, category, stock, brand, description } = req.body;
    console.log('Received POST request:', req.body);

    const formattedPrice = price.trim();
    const parsedStock = parseInt(stock, 10);

    if (!productName || !/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(formattedPrice) || !category || isNaN(parsedStock) || !brand) {
        return res.status(400).json({ message: 'Missing required fields or invalid data types' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.existingImageUrl;

    const query = `INSERT INTO products (name, price, category, stock, brand, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [productName, formattedPrice, category, parsedStock, brand, description, imageUrl], (err, results) => {
        if (err) {
            console.error('Error adding product:', err);
            return res.status(500).json({ message: 'Error adding product', error: err });
        }
        res.status(201).json({ message: 'Product added successfully', productId: results.insertId });
    });
});


app.get('/api/productsSearch', (req, res) => {
    const searchQuery = req.query.search || '';
    console.log('Search query:', searchQuery);

    const searchTerms = searchQuery.split(',').map(term => term.trim()).filter(Boolean);

    if (searchTerms.length === 0) {
        return res.json([]);
    }

    const sqlQuery = `
        SELECT * FROM products 
        WHERE ${searchTerms.map(() => '(name LIKE ? OR category LIKE ? OR brand LIKE ?)').join(' OR ')}
    `;

    const queryParams = [];
    searchTerms.forEach(term => {
        const searchPattern = `%${term}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
    });

    db.query(sqlQuery, queryParams, (err, results) => {
        if (err) {
            console.error('Error executing search query:', err);
            return res.status(500).send('Error fetching search results.');
        }

        res.json(results);
    });
});





app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    console.log('Attempting to delete product with ID:', productId);

    const query = 'DELETE FROM products WHERE id = ?';
    db.query(query, [productId], (err, result) => {
        if (err) {
            console.error('Error deleting product:', err);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found 1' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    });
});




app.put('/api/products/:id', upload.single('productImage'), (req, res) => {
    const productId = req.params.id;

    const productName = req.body.productName;
    const price = req.body.price;
    const category = req.body.category;
    const stock = req.body.stock;
    const brand = req.body.brand;
    const description = req.body.description;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.existingImageUrl;

    console.log('Update data:', { productName, price, category, stock, brand, description, imageUrl });

    const query = `UPDATE products SET name = ?, price = ?, category = ?, stock = ?, brand = ?, description = ?, image_url = ? WHERE id = ?`;

    db.query(query, [productName, price, category, stock, brand, description, imageUrl, productId], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Error updating product', error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found 3' });
        }

        res.status(200).json({ message: 'Product updated successfully' });
    });
});

app.get('/api/products/paginated', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    console.log(`Fetching products for page ${page} with limit ${limit} and offset ${offset}`);

    db.query('SELECT * FROM products LIMIT ? OFFSET ?', [limit, offset], (err, results) => {
        if (err) {
            console.error('Error fetching products:', err);
            return res.status(500).json({ error: 'Error fetching products.' });
        }

        db.query('SELECT COUNT(*) AS total FROM products', (countErr, countResults) => {
            if (countErr) {
                console.error('Error fetching product count:', countErr);
                return res.status(500).json({ error: 'Error fetching product count.' });
            }

            const total = countResults[0].total;
            const totalPages = Math.ceil(total / limit);

            res.json({
                products: results,
                currentPage: page,
                totalPages: totalPages,
                totalProducts: total
            });
        });
    });
});

app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    console.log('Product ID loaded:', productId);

    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) {
            console.error('Error fetching product details:', err);
            return res.status(500).send('Error fetching product details.');
        }

        if (results.length === 0) {
            return res.status(404).send('Product not found 2.');
        }

        res.json(results[0]);
    });
});



app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("Failed to log out");
            return res.status(500).send('Failed to log out');
        }

        res.clearCookie('connect.sid');
        console.log("Logged out successfully");
        return res.status(200).send('Logged out successfully');

    });
});



app.post('/register', (req, res) => {
    const { email, password } = req.body;

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const sql = `INSERT INTO users (email, password, verificationToken, tokenExpiration) VALUES (?, ?, ?, ?)`;
    connection.query(sql, [email, password, verificationToken, tokenExpiration], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        const verificationLink = `https://drecomputercenter.com/verify-email?token=${verificationToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Verification',
            html: `<p>Click the link below to verify your email:</p>
               <a href="${verificationLink}">Verify Email</a>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return res.status(500).json({ error: 'Error sending email' });
            }
            res.status(200).json({ message: 'Verification email sent' });
        });
    });
});





app.post('/api/cart', (req, res) => {
    res.status(200).json({ message: 'Cart operations are now managed in local storage.' });
});

app.get('/api/cart/:userId', (req, res) => {
    res.status(200).json({ message: 'Cart retrieval is managed in local storage.' });
});

app.put('/api/cart/:id', (req, res) => {
    res.status(200).json({ message: 'Cart updates are managed in local storage.' });
});

app.delete('/api/cart/:id', (req, res) => {
    res.status(200).json({ message: 'Cart deletion is managed in local storage.' });
});


app.get('/api/admin/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [[{ totalOrders }]] = await pool.query("SELECT COUNT(*) AS totalOrders FROM orders");

        const [orders] = await pool.query(
            "SELECT order_id, user_id, name, items, receipt, total_amount, address, street_landmark, status, order_date FROM orders ORDER BY order_date DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );

        const totalPages = Math.ceil(totalOrders / limit);

        res.json({
            totalOrders,
            orders,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Error fetching orders" });
    }
});






app.get('/api/admin/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const [order] = await pool.query("SELECT * FROM orders WHERE orderId = ?", [orderId]);
        if (order.length > 0) {
            res.json(order[0]);
        } else {
            res.status(404).json({ error: "Order not found" });
        }
    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ error: "Error fetching order" });
    }
});

app.put('/api/admin/orders/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    try {
        const [result] = await pool.query("UPDATE orders SET status = ? WHERE order_id = ?", [status, orderId]);
        if (result.affectedRows > 0) {
            res.status(200).send('Status updated');
        } else {
            res.status(404).send('Order not found');
        }
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).send('Error updating status');
    }
});

app.put('/api/admin/orders/:orderId/payment-status', async (req, res) => {
    const orderId = req.params.orderId;
    const { paymentStatus } = req.body;

    if (!paymentStatus) {
        return res.status(400).json({ message: 'Payment status is required' });
    }

    try {
        console.log("Starting transaction...");
        await pool.query('START TRANSACTION');

        console.log("Updating payment status...");
        const [result] = await pool.query(
            'UPDATE orders SET payment_status = ? WHERE order_id = ?',
            [paymentStatus, orderId]
        );

        if (result.affectedRows === 0) {
            console.log("Order not found. Rolling back...");
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Order not found' });
        }

        if (paymentStatus === 'Paid') {
            console.log("Fetching items for stock adjustment...");
            const [orderRows] = await pool.query(
                'SELECT items FROM orders WHERE order_id = ?',
                [orderId]
            );

            if (orderRows.length === 0) {
                console.log("Order not found during stock adjustment. Rolling back...");
                await pool.query('ROLLBACK');
                return res.status(404).json({ message: 'Order not found' });
            }

            const items = JSON.parse(orderRows[0].items);
            console.log("Items fetched for stock adjustment:", items);

            for (const item of items) {
                const { id, quantity } = item;

                console.log(`Attempting stock adjustment for product ID: ${id}, Quantity: ${quantity}`);
                const [stockResult] = await pool.query(
                    'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                    [quantity, id, quantity]
                );

                console.log(`Stock update result for product ID ${id}:`, stockResult);

                if (stockResult.affectedRows === 0) {
                    console.log(`Insufficient stock for product ID: ${id}. Rolling back...`);
                    await pool.query('ROLLBACK');
                    return res.status(400).json({ message: `Insufficient stock for product ID ${id}` });
                }

                console.log(`Stock successfully adjusted for product ID: ${id}`);
            }
        }

        console.log("Committing transaction...");
        await pool.query('COMMIT');
        console.log("Transaction committed successfully.");
        return res.json({ message: 'Payment status updated and stock adjusted successfully' });
    } catch (error) {
        console.error('Error updating payment status or adjusting stock:', error);
        await pool.query('ROLLBACK');
        return res.status(500).json({ message: 'Something went wrong!' });
    }
});





app.get('/api/admin/orders/:orderId/payment-status', async (req, res) => {
    const orderId = req.params.orderId;
    try {
        const [result] = await pool.query('SELECT payment_status FROM orders WHERE order_id = ?', [orderId]);
        if (result.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json({ paymentStatus: result[0].payment_status });
    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({ message: 'Something went wrong!' });
    }
});




// // Update payment status
// app.put('/api/admin/orders/:orderId/payment', async (req, res) => {
//     const { orderId } = req.params;
//     const { payment_status } = req.body;
//     try {
//         const [result] = await pool.query("UPDATE orders SET payment_status = ? WHERE order_id = ?", [payment_status, orderId]);
//         if (result.affectedRows > 0) {
//             res.status(200).send('Payment status updated');
//         } else {
//             res.status(404).send('Order not found');
//         }
//     } catch (error) {
//         console.error("Error updating payment status:", error);
//         res.status(500).send('Error updating payment status');
//     }
// });





app.delete('/api/admin/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const [result] = await pool.query("DELETE FROM orders WHERE orderId = ?", [orderId]);
        if (result.affectedRows > 0) {
            res.json({ message: "Order deleted successfully" });
        } else {
            res.status(404).json({ error: "Order not found" });
        }
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ error: "Error deleting order" });
    }
});

app.get('/api/admin/orders/status/:status', async (req, res) => {
    const { status } = req.params;

    try {
        const [orders] = await pool.query("SELECT * FROM orders WHERE status = ?", [status]);
        res.json(orders);
    } catch (error) {
        console.error("Error fetching orders by status:", error);
        res.status(500).json({ error: "Error fetching orders by status" });
    }
});




app.get('/api/getProductStock/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const results = await queryAsync('SELECT stock FROM products WHERE id = ?', [productId]);

        if (results.length > 0) {
            res.json({ stock: results[0].stock });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        console.error('Error fetching product stock:', err);
        res.status(500).json({ message: 'Error fetching product stock', error: err.message });
    }
});

app.put('/api/products/:id/stock', (req, res) => {
    const productId = req.params.id;
    const { stock } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ message: 'Invalid stock value' });
    }

    db.query('UPDATE products SET stock = ? WHERE id = ?', [stock, productId], (err, result) => {
        if (err) {
            console.error('Error updating stock:', err);
            return res.status(500).json({ message: 'Error updating stock' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Stock updated successfully' });
    });
});


app.post('/api/products/updateStock', (req, res) => {
    const { productId, stockChange } = req.body;

    if (!productId || typeof stockChange !== 'number') {
        return res.status(400).json({ error: 'Invalid request data' });
    }

    db.query('UPDATE products SET stock = stock + ? WHERE id = ?', [stockChange, productId], (err, result) => {
        if (err) {
            console.error('Error updating stock:', err);
            return res.status(500).json({ error: 'Failed to update stock' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json({ message: 'Stock updated successfully' });
    });
});

app.post('/api/products/restoreStock', async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const [results] = await db.query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [quantity, productId]
        );

        if (results.affectedRows > 0) {
            res.json({ success: true, message: 'Stock restored successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Product not found or stock restoration failed' });
        }
    } catch (err) {
        console.error('Error restoring stock:', err);
        res.status(500).json({ success: false, message: 'Error restoring stock', error: err.message });
    }
});





app.use((err, req, res, next) => {
    console.error('Error details:', err);
    res.status(500).send('Something went wrong!');
});

const envPORT = process.env.PORT || 3000;
const PORT = envPORT;

app.listen(PORT, () => {
    console.log(`Server is running on ${API_BASE_URL}:${PORT}`);
    console.log(`.env port: ${envPORT}`);
});

