const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require('dotenv').config(); // Correct way to load .env variables

//const env = require('dotenv').config; 

const User = require("../models/userSchema");




passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/google/callback'
},



    async (accessToken, refreshTocken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                return done(null, user);
            } else if (!user) {
                user = new User({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    googleId: profile.id,
                })

                await user.save();
                return done(null, user)
            }

        } catch (error) {
            return done(error, null)
        }
    }))

passport.serializeUser((user, done) => {

    done(null, user.id)

});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user)
        })
        .catch(error => {
            done(error, null)
        })
})




module.exports = passport;