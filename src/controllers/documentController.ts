import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import requestIp from 'request-ip';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { watermarkFile } from '../services/watermarkService';

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Prevent filename collisions and sanitization issues
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File Filter (Optional: restrict to PDF/Images)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Images are allowed.'));
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Controller to handle the DB record creation after file upload
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { title, watermarkText, expiresAt, maxViews } = req.body;
  const userId = req.user!.userId;

  // Generate unique link ID
  const linkId = uuidv4();

  try {
    const document = await prisma.document.create({
      data: {
        userId: userId,
        title: title || req.file.originalname,
        filePath: req.file.path,
        oneTimeLink: linkId,
        watermarkText: watermarkText || 'CONFIDENTIAL',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxViews: maxViews ? parseInt(maxViews) : null,
      },
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      documentId: document.id,
      linkId: document.oneTimeLink,
      linkUrl: `${process.env.APP_URL || 'http://localhost:3000'}/view/${document.oneTimeLink}`
    });

  } catch (error) {
    console.error('Error saving document:', error);
    // Cleanup file if DB save fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to save document metadata' });
  }
};

export const viewDocument = async (req: Request, res: Response) => {
  const { linkId } = req.params;

  try {
    const document = await prisma.document.findUnique({
      where: { oneTimeLink: linkId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.isBurned) {
      return res.status(410).json({ error: 'Document has been burned (view limit reached or expired)' });
    }

    if (document.expiresAt && new Date() > document.expiresAt) {
      // Mark as burned if expired
      await prisma.document.update({
        where: { id: document.id },
        data: { isBurned: true },
      });
      return res.status(410).json({ error: 'Document has expired' });
    }

    const ip = requestIp.getClientIp(req) || 'Unknown IP';
    const userAgent = req.headers['user-agent'] || 'Unknown UA';
    const watermarkContent = `${ip} - ${new Date().toISOString()}`;

    // Generate watermarked buffer
    const watermarkedBuffer = await watermarkFile(document.filePath, watermarkContent);

    // Update View Stats
    const updatedDoc = await prisma.document.update({
      where: { id: document.id },
      data: {
        currentViews: { increment: 1 },
      },
    });

    // Log View
    await prisma.viewLog.create({
      data: {
        documentId: document.id,
        ipAddress: ip,
        userAgent: userAgent,
      },
    });

    // Check Max Views (Burn if limit reached)
    if (document.maxViews && updatedDoc.currentViews >= document.maxViews) {
      await prisma.document.update({
        where: { id: document.id },
        data: { isBurned: true },
      });
    }

    // Determine Content Type
    const ext = path.extname(document.filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.send(watermarkedBuffer);

  } catch (error) {
    console.error('Error viewing document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
