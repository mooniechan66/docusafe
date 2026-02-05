"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.heartbeatView = exports.deleteDocument = exports.listDocuments = exports.viewDocument = exports.uploadDocument = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const request_ip_1 = __importDefault(require("request-ip"));
const prisma_1 = require("../prisma");
const watermarkService_1 = require("../services/watermarkService");
// Multer Storage Configuration
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, '../../uploads');
        // Ensure directory exists
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Prevent filename collisions and sanitization issues
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
// File Filter (Optional: restrict to PDF/Images)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only PDF and Images are allowed.'));
    }
};
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
// Controller to handle the DB record creation after file upload
const uploadDocument = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const { title, watermarkText, expiresAt, maxViews } = req.body;
    const userId = req.user.userId;
    // Generate unique link ID
    const linkId = (0, uuid_1.v4)();
    try {
        const document = await prisma_1.prisma.document.create({
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
    }
    catch (error) {
        console.error('Error saving document:', error);
        // Cleanup file if DB save fails
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to save document metadata' });
    }
};
exports.uploadDocument = uploadDocument;
const first = (val) => (Array.isArray(val) ? val[0] : val);
const viewDocument = async (req, res) => {
    const linkId = first(req.params.linkId);
    const sessionIdFromQuery = typeof req.query.sid === 'string' ? req.query.sid : null;
    if (!linkId) {
        return res.status(400).json({ error: 'Missing linkId' });
    }
    try {
        const document = await prisma_1.prisma.document.findUnique({
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
            await prisma_1.prisma.document.update({
                where: { id: document.id },
                data: { isBurned: true },
            });
            return res.status(410).json({ error: 'Document has expired' });
        }
        const ip = request_ip_1.default.getClientIp(req) || 'Unknown IP';
        const userAgent = req.headers['user-agent'] || 'Unknown UA';
        const watermarkContent = `${ip} - ${new Date().toISOString()}`;
        // Generate watermarked buffer
        const watermarkedBuffer = await (0, watermarkService_1.watermarkFile)(document.filePath, watermarkContent);
        // Update View Stats
        const updatedDoc = await prisma_1.prisma.document.update({
            where: { id: document.id },
            data: {
                currentViews: { increment: 1 },
            },
        });
        // Log View
        const sessionId = sessionIdFromQuery || (0, uuid_1.v4)();
        await prisma_1.prisma.viewLog.create({
            data: {
                documentId: document.id,
                sessionId,
                ipAddress: ip,
                userAgent: userAgent,
            },
        });
        // Check Max Views (Burn if limit reached)
        if (document.maxViews && updatedDoc.currentViews >= document.maxViews) {
            await prisma_1.prisma.document.update({
                where: { id: document.id },
                data: { isBurned: true },
            });
        }
        // Determine Content Type
        const ext = path_1.default.extname(document.filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf')
            contentType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg')
            contentType = 'image/jpeg';
        else if (ext === '.png')
            contentType = 'image/png';
        else if (ext === '.webp')
            contentType = 'image/webp';
        res.setHeader('Content-Type', contentType);
        res.send(watermarkedBuffer);
    }
    catch (error) {
        console.error('Error viewing document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.viewDocument = viewDocument;
// List Documents for User
const listDocuments = async (req, res) => {
    try {
        const documents = await prisma_1.prisma.document.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { views: true }
                }
            }
        });
        res.json(documents);
    }
    catch (error) {
        console.error('List documents error:', error);
        res.status(500).json({ error: 'Failed to list documents' });
    }
};
exports.listDocuments = listDocuments;
// Delete (Burn) Document
const deleteDocument = async (req, res) => {
    const id = first(req.params.id);
    if (!id) {
        return res.status(400).json({ error: 'Missing document id' });
    }
    try {
        const document = await prisma_1.prisma.document.findFirst({
            where: { id, userId: req.user.userId }
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        await prisma_1.prisma.document.update({
            where: { id },
            data: { isBurned: true }
        });
        res.json({ message: 'Document burned successfully' });
    }
    catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
exports.deleteDocument = deleteDocument;
const heartbeatView = async (req, res) => {
    const linkId = first(req.params.linkId);
    if (!linkId) {
        return res.status(400).json({ error: 'Missing linkId' });
    }
    const { sessionId, deltaSeconds } = req.body || {};
    const delta = Number(deltaSeconds);
    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId is required' });
    }
    if (!Number.isFinite(delta) || delta <= 0 || delta > 60) {
        // Basic sanity bounds: we expect ~5s deltas
        return res.status(400).json({ error: 'deltaSeconds must be a positive number (<= 60)' });
    }
    try {
        const document = await prisma_1.prisma.document.findUnique({
            where: { oneTimeLink: linkId },
            select: { id: true }
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const ip = request_ip_1.default.getClientIp(req) || 'Unknown IP';
        const userAgent = req.headers['user-agent'] || 'Unknown UA';
        await prisma_1.prisma.viewLog.upsert({
            where: {
                documentId_sessionId: {
                    documentId: document.id,
                    sessionId
                }
            },
            update: {
                durationSeconds: { increment: Math.floor(delta) }
            },
            create: {
                documentId: document.id,
                sessionId,
                ipAddress: ip,
                userAgent,
                durationSeconds: Math.floor(delta)
            }
        });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to record heartbeat' });
    }
};
exports.heartbeatView = heartbeatView;
//# sourceMappingURL=documentController.js.map