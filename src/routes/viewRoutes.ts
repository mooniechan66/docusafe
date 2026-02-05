import { Router } from 'express';
import { viewDocument } from '../controllers/documentController';

const router = Router();

// GET /view/:linkId
router.get('/:linkId', viewDocument);

export default router;
