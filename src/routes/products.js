const express = require('express');
const router = express.Router();
const db = require('../config/db');
console.log('Loaded products.js');


router.get('/', (req, res) => {
    const query = 'SELECT * FROM products';
    db.query(query, (err, result) => {
        if (err) {
            res.status(500).send('Error fetching products');
        } else {
            console.log('Product database is connected');
            res.json(result);
        }
    });
});

module.exports = router;
