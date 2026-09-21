const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const users = require('./users');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.findById(id);
  done(null, user || false);
});

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (googleEnabled) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;

        let user = users.findByGoogleId(profile.id);
        if (!user && email) {
          // Someone who signed up with email/password before is now using
          // Google with the same address — link the accounts instead of
          // creating a duplicate.
          const existing = users.findByEmail(email);
          if (existing) {
            user = users.linkGoogleId(existing.id, profile.id);
          }
        }
        if (!user) {
          user = users.createUser({
            name: profile.displayName || (email ? email.split('@')[0] : 'Pixelxcript Installations customer'),
            email: email || `${profile.id}@google.pxdoors.local`,
            googleId: profile.id
          });
        }
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  ));
} else {
  console.log('[auth] Google sign-in not configured — set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to enable it.');
}

module.exports = { passport, googleEnabled };
