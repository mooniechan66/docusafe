import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma';
import nodemailer from 'nodemailer';

const router = express.Router();

async function getTransporter() {
  // Production: configure real SMTP via env
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
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
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
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

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      }
    });

    // Create verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        email,
        token,
        expiresAt
      }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const verificationLink = `${frontendUrl}/verify?token=${token}`;

    // Send verification email (or Ethereal in dev)
    let previewUrl: string | null = null;
    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Docusafe <no-reply@docusafe.local>',
        to: email,
        subject: 'Verify your email - Docusafe',
        text: `Verify your email: ${verificationLink}`,
        html: `<p>Verify your email:</p><p><a href="${verificationLink}">${verificationLink}</a></p>`
      });

      previewUrl = nodemailer.getTestMessageUrl(info) || null;
      if (previewUrl) {
        console.log(`[AUTH] Ethereal preview URL: ${previewUrl}`);
      }
    } catch (e) {
      console.warn('[AUTH] Failed to send verification email (still created user):', e);
    }

    console.log(`[AUTH] Verification link for ${email}: ${verificationLink}`);

    res.status(201).json({
      message: 'User created. Please check your email to verify your account.',
      ...(process.env.NODE_ENV !== 'production'
        ? { verificationLink, previewUrl }
        : {})
    });

  } catch (error) {
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

    const verificationRecord = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (verificationRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    await prisma.user.update({
      where: { email: verificationRecord.email },
      data: { isVerified: true }
    });

    await prisma.verificationToken.delete({ where: { id: verificationRecord.id } });

    res.json({ message: 'Email verified successfully. You can now login.' });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
