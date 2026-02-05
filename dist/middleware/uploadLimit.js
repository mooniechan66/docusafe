"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUploadLimit = void 0;
const prisma_1 = require("../prisma");
const checkUploadLimit = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { userId, plan } = req.user;
    if (plan === 'FREE') {
        try {
            const documentCount = await prisma_1.prisma.document.count({
                where: {
                    userId: userId,
                    isBurned: false // Only count active documents
                },
            });
            if (documentCount >= 1) {
                return res.status(403).json({
                    error: 'Free tier limit reached. Upgrade to PRO to upload more documents.'
                });
            }
        }
        catch (error) {
            console.error('Error checking document count:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    next();
};
exports.checkUploadLimit = checkUploadLimit;
//# sourceMappingURL=uploadLimit.js.map