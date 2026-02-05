"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documentController_1 = require("../controllers/documentController");
const router = (0, express_1.Router)();
// GET /view/:linkId
router.get('/:linkId', documentController_1.viewDocument);
// POST /view/:linkId/heartbeat
router.post('/:linkId/heartbeat', documentController_1.heartbeatView);
exports.default = router;
//# sourceMappingURL=viewRoutes.js.map