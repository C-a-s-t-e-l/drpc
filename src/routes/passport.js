const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../config/db');

passport.use(new GoogleStrategy({
   
},



    (token, tokenSecret, profile, done) => {
        console.log('Google profile:', profile);
        const sql = 'SELECT * FROM users WHERE google_id = ?';
        db.query(sql, [profile.id], (err, results) => {
            if (err) return done(err);
            if (results.length > 0) {
                return done(null, results[0]);
            } else {
                const newUser = { email: profile.emails[0].value, google_id: profile.id, name: profile.displayName };
                const insertSql = 'INSERT INTO users (email, google_id, name) VALUES (?, ?, ?)';
                db.query(insertSql, [newUser.email, newUser.google_id, newUser.name], (err, result) => {
                    if (err) return done(err);
                    newUser.id = result.insertId;
                    return done(null, newUser);
                });
            }
        });
    }));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) return done(err);
        done(null, results[0]);
    });
});

module.exports = passport;
