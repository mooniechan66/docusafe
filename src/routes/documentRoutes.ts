import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkUploadLimit } from '../middleware/uploadLimit';
import { upload, uploadDocument } from '../controllers/documentController';

const router = Router();

// POST /api/documents/upload
router.post(
  '/upload', 
  authenticateToken, 
  checkUploadLimit, 
  upload.single('file'), 
  uploadDocument
);

export default router;
