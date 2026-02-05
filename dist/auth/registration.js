"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const nodemailer_1 = __importDefault(require("nodemailer"));
const router = express_1.default.Router();
async function getTransporter() {
    // Production: configure real SMTP via env
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: String(process.env.SMTP_SECURE || 'false') === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    // Dev: use Ethereal test mailbox (no real email delivery)
    const testAccount = await nodemailer_1.default.createTestAccount();
    return nodemailer_1.default.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
}
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
            }
        });
        // Create verification token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await prisma_1.prisma.verificationToken.create({
            data: {
                email,
                token,
                expiresAt
            }
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const verificationLink = `${frontendUrl}/verify?token=${token}`;
        // Send verification email (or Ethereal in dev)
        let previewUrl = null;
        try {
            const transporter = await getTransporter();
            const info = await transporter.sendMail({
                from: process.env.EMAIL_FROM || 'Docusafe <no-reply@docusafe.local>',
                to: email,
                subject: 'Verify your email - Docusafe',
                text: `Verify your email: ${verificationLink}`,
                html: `<p>Verify your email:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`
            });
            previewUrl = nodemailer_1.default.getTestMessageUrl(info) || null;
            if (previewUrl) {
                console.log(`[AUTH] Ethereal preview URL: ${previewUrl}`);
            }
        }
        catch (e) {
            console.warn('[AUTH] Failed to send verification email (still created user):', e);
        }
        console.log(`[AUTH] Verification link for ${email}: ${verificationLink}`);
        res.status(201).json({
            message: 'User created. Please check your email to verify your account.',
            ...(process.env.NODE_ENV !== 'production'
                ? { verificationLink, previewUrl }
                : {})
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Invalid token' });
        }
        const verificationRecord = await prisma_1.prisma.verificationToken.findUnique({
            where: { token }
        });
        if (!verificationRecord) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        if (verificationRecord.expiresAt < new Date()) {
            return res.status(400).json({ error: 'Token expired' });
        }
        await prisma_1.prisma.user.update({
            where: { email: verificationRecord.email },
            data: { isVerified: true }
        });
        await prisma_1.prisma.verificationToken.delete({ where: { id: verificationRecord.id } });
        res.json({ message: 'Email verified successfully. You can now login.' });
    }
    catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=registration.js.map