import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma';
import nodemailer from 'nodemailer';

const router = express.Router();

// Mock transport for now - or use Ethereal in dev
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'ethereal.user@example.com', // Replace with real generated creds if needed, or just log
    pass: 'secret'
  }
});

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

    // TODO: Make this configurable based on environment
    const verificationLink = `http://localhost:4200/verify?token=${token}`;
    
    // In production, send real email. Here we log it or use a mock.
    console.log(`[AUTH] Verification link for ${email}: ${verificationLink}`);

    res.status(201).json({ message: 'User created. Please check your email to verify your account.' });

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
