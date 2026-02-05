import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkUploadLimit } from '../middleware/uploadLimit';
import { upload, uploadDocument, listDocuments, deleteDocument } from '../controllers/documentController';

const router = Router();

// GET /api/documents - List documents
router.get('/', authenticateToken as any, listDocuments as any);

// DELETE /api/documents/:id - Burn document
router.delete('/:id', authenticateToken as any, deleteDocument as any);

// POST /api/documents/upload
router.post(
  '/upload',
  authenticateToken as any,
  checkUploadLimit as any,
  upload.single('file'),
  uploadDocument as any
);

export default router;
