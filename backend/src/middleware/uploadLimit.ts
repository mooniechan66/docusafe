import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from './auth';

export const checkUploadLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { userId, plan } = req.user;

  if (plan === 'FREE') {
    try {
      const documentCount = await prisma.document.count({
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
    } catch (error) {
      console.error('Error checking document count:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  next();
};
