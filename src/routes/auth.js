// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const path = require('path');
const router = express.Router();


const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();


router.get('/login', (req, res) => {
    res.sendFile('login.html', { root: path.join(__dirname, '../../public') });
});


router.get('/register', (req, res) => {
    res.sendFile('register.html', { root: path.join(__dirname, '../../public') });
});


router.post('/register', async (req, res) => {
    const { email, password, name } = req.body; 

    console.log('Received Email:', email);
    console.log('Received Password:', password);
    console.log('Received Name:', name); 

    if (!email || !password || !name) { 
        return res.status(400).json({ error: 'Missing email, password, or name' });
    }

    const checkEmailSql = 'SELECT * FROM users WHERE email = ?';

    db.query(checkEmailSql, [email], (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).json({ error: 'Error checking email' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Email already registered. Please use a different email.' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiration = new Date(Date.now() + 3600000);
        const sql = 'INSERT INTO users (email, password, name, verificationToken, tokenExpiration) VALUES (?, ?, ?, ?, ?)'; 

        db.query(sql, [email, hashedPassword, name, verificationToken, tokenExpiration], (insertErr, result) => {
            if (insertErr) {
                console.error('Error inserting data:', insertErr);
                return res.status(500).json({ error: 'Error registering user' });
            }
            console.log('Data inserted successfully:', result);
            const transporter = nodemailer.createTransport({
                service: 'gmail', 
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
            const mailOptions = {
                from: 'your-email@example.com', 
                to: email,
                subject: 'Email Verification',
                text: `Please verify your email by clicking on the following link: 
    https://drecomputercenter.com/verify?token=${verificationToken}`,
            };


            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending verification email:', error);
                    return res.status(500).json({ error: 'Error sending verification email' });
                }
                // After sending the verification email
                console.log('Verification email sent:', info.response);
                res.status(200).json({ message: 'Registration successful! Please check your email to verify your account.' });
            });
        });
    });
});



router.get('/verify', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Verification token is missing');
    }

    const sql = 'SELECT * FROM users WHERE verificationToken = ? AND tokenExpiration > NOW()';

    db.query(sql, [token], (err, results) => {
        if (err) {
            console.error('Error verifying token:', err);
            return res.status(500).send('Error verifying token');
        }

        if (results.length === 0) {
            return res.status(400).send('Invalid or expired verification token');
        }

        const updateSql = 'UPDATE users SET verified = 1, verificationToken = NULL, tokenExpiration = NULL WHERE verificationToken = ?';

        db.query(updateSql, [token], (updateErr, updateResult) => {
            if (updateErr) {
                console.error('Error updating user verification:', updateErr);
                return res.status(500).send('Error verifying email');
            }

            console.log('Email verified successfully');
            res.redirect('/index.html');
        });
    });
});


router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Missing email or password');
    }

    const sql = 'SELECT * FROM users WHERE email = ?';

    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Error querying data:', err);
            return res.status(500).send('Error during login');
        }

        if (results.length === 0) {
            return res.status(400).send('User not found');
        }

        const user = results[0];

        if (user.email === 'admin@123') {

            if (password === 'admin') {
                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    isAdmin: true
                };
                console.log(user.id, user.name, user.email);
                return res.redirect('/admin/admin.html');
            } else {
                return res.status(400).send('Invalid admin credentials');
            }
        } else {

            const isMatch = await bcrypt.compare(password, user.password);
            console.log('Password Match:', isMatch);

            if (isMatch) {

                req.session.user = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    isAdmin: false
                };
                console.log(user.id, user.name, user.email);
                return res.redirect('/index.html');
            } else {
                return res.status(400).send('Invalid credentials');
            }
        }
    });
});



module.exports = router;
