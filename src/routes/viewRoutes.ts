import { Router } from 'express';
import { heartbeatView, viewDocument } from '../controllers/documentController';

const router = Router();

// GET /view/:linkId
router.get('/:linkId', viewDocument);

// POST /view/:linkId/heartbeat
router.post('/:linkId/heartbeat', heartbeatView);

export default router;
