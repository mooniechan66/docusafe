"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const uploadLimit_1 = require("../middleware/uploadLimit");
const documentController_1 = require("../controllers/documentController");
const router = (0, express_1.Router)();
// GET /api/documents - List documents
router.get('/', auth_1.authenticateToken, documentController_1.listDocuments);
// DELETE /api/documents/:id - Burn document
router.delete('/:id', auth_1.authenticateToken, documentController_1.deleteDocument);
// POST /api/documents/upload
router.post('/upload', auth_1.authenticateToken, uploadLimit_1.checkUploadLimit, documentController_1.upload.single('file'), documentController_1.uploadDocument);
exports.default = router;
//# sourceMappingURL=documentRoutes.js.map