"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0].value;
            if (!email)
                return done(new Error("No email found from Google"));
            let user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!user) {
                user = await prisma_1.prisma.user.create({
                    data: {
                        email,
                        googleId: profile.id,
                        isVerified: true // Google accounts are implicitly verified
                    }
                });
            }
            else if (!user.googleId) {
                // Link Google account if email matches
                user = await prisma_1.prisma.user.update({
                    where: { email },
                    data: { googleId: profile.id, isVerified: true }
                });
            }
            return done(null, user);
        }
        catch (err) {
            return done(err);
        }
    }));
}
else {
    console.warn("Google Client ID/Secret not found. Google Auth disabled.");
}
router.get('/google/status', (req, res) => {
    const enabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    res.json({ enabled });
});
router.get('/google', (req, res, next) => {
    if (!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) {
        return res.status(501).json({ error: 'Google auth is not configured on the server.' });
    }
    return passport_1.default.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback', (req, res, next) => {
    if (!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) {
        return res.status(501).json({ error: 'Google auth is not configured on the server.' });
    }
    return passport_1.default.authenticate('google', { session: false, failureRedirect: '/login' })(req, res, next);
}, (req, res) => {
    // Successful authentication
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '1d' });
    // Redirect to frontend with token (e.g., via query param or cookie)
    // For now, redirecting to a basic success page or returning JSON if it were an API call (but it's a redirect flow)
    res.redirect(`http://localhost:4200/login/success?token=${token}`);
});
exports.default = router;
//# sourceMappingURL=google.js.map