const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');

passport.use(
  new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:5000/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'picture.type(large)']
  },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        let user = await User.findOne({
          $or: [
            { facebookId: profile.id },
            ...(email ? [{ email: email }] : [])
          ]
        });

        if (!user) {
          user = new User({
            username: profile.displayName,
            email: email || `${profile.id}@facebook.com`,
            facebookId: profile.id,
            profilePic: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          });
          await user.save();
        } else {
          if (!user.facebookId) {
            user.facebookId = profile.id;
            if (!user.profilePic && profile.photos && profile.photos[0]) {
              user.profilePic = profile.photos[0].value;
            }
            await user.save();
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    })
);
