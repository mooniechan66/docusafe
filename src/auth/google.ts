import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error("No email found from Google"));

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              googleId: profile.id,
              isVerified: true // Google accounts are implicitly verified
            }
          });
        } else if (!user.googleId) {
          // Link Google account if email matches
          user = await prisma.user.update({
            where: { email },
            data: { googleId: profile.id, isVerified: true }
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
} else {
  console.warn("Google Client ID/Secret not found. Google Auth disabled.");
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    const user = req.user as any;
    const token = jwt.sign(
      { userId: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Redirect to frontend with token (e.g., via query param or cookie)
    // For now, redirecting to a basic success page or returning JSON if it were an API call (but it's a redirect flow)
    res.redirect(`http://localhost:4200/login/success?token=${token}`);
  }
);

export default router;
