import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { 
  users, 
  googlePlayPurchases 
} from '@thecookflow/shared/schemas';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, type AuthRequest } from '../middleware/auth.js';
import { verifyGooglePlayPurchase } from '../services/googlePlay.js';
import { logger } from '../utils/logger.js';

const router = Router();
const billingLogger = logger.child({ module: 'billing-routes' });

// Verify Google Play purchase
router.post('/verify-purchase', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { purchaseToken, orderId, productId } = req.body;

    if (!purchaseToken || !orderId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Missing purchase information'
      });
    }

    // Verify with Google Play API
    const verification = await verifyGooglePlayPurchase(
      productId,
      purchaseToken
    );

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid purchase',
        details: verification.error
      });
    }

    // Check if purchase already exists
    const [existingPurchase] = await db
      .select()
      .from(googlePlayPurchases)
      .where(eq(googlePlayPurchases.orderId, orderId))
      .limit(1);

    if (existingPurchase) {
      // Update existing purchase
      await db
        .update(googlePlayPurchases)
        .set({
          expiryTime: verification.expiryTime,
          isValid: true,
          updatedAt: new Date()
        })
        .where(eq(googlePlayPurchases.orderId, orderId));
    } else {
      // Create new purchase record
      await db.insert(googlePlayPurchases).values({
        userId: req.user.id,
        orderId,
        productId,
        purchaseToken,
        purchaseTime: verification.purchaseTime,
        expiryTime: verification.expiryTime,
        isValid: true,
        originalJson: JSON.stringify(verification.receipt)
      });
    }

    // Update user premium status
    await db
      .update(users)
      .set({
        isPremium: true,
        subscriptionStatus: 'active',
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.id));

    billingLogger.info({ 
      userId: req.user.id, 
      orderId,
      productId 
    }, 'Purchase verified and activated');

    res.json({
      success: true,
      data: {
        isPremium: true,
        expiresAt: verification.expiryTime
      }
    });
  } catch (error) {
    billingLogger.error({ error, userId: req.user?.id }, 'Purchase verification failed');
    res.status(500).json({
      success: false,
      error: 'Failed to verify purchase'
    });
  }
});

// Get subscription status
router.get('/subscription', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get latest valid purchase
    const [latestPurchase] = await db
      .select()
      .from(googlePlayPurchases)
      .where(and(
        eq(googlePlayPurchases.userId, req.user.id),
        eq(googlePlayPurchases.isValid, true)
      ))
      .orderBy(desc(googlePlayPurchases.expiryTime))
      .limit(1);

    if (!latestPurchase) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          isPremium: false
        }
      });
    }

    const now = new Date();
    const expiryDate = new Date(latestPurchase.expiryTime!);
    const isActive = expiryDate > now;

    // Update user status if expired
    if (!isActive && req.user.isPremium) {
      await db
        .update(users)
        .set({
          isPremium: false,
          subscriptionStatus: 'expired',
          updatedAt: new Date()
        })
        .where(eq(users.id, req.user.id));
    }

    res.json({
      success: true,
      data: {
        hasSubscription: isActive,
        isPremium: isActive,
        expiresAt: latestPurchase.expiryTime,
        productId: latestPurchase.productId,
        autoRenewing: latestPurchase.autoRenewing
      }
    });
  } catch (error) {
    billingLogger.error({ error, userId: req.user?.id }, 'Failed to get subscription status');
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Mark user's purchases as cancelled
    await db
      .update(googlePlayPurchases)
      .set({
        autoRenewing: false,
        cancelReason: 'user_cancelled',
        updatedAt: new Date()
      })
      .where(and(
        eq(googlePlayPurchases.userId, req.user.id),
        eq(googlePlayPurchases.isValid, true)
      ));

    // Update user status
    await db
      .update(users)
      .set({
        subscriptionStatus: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.id));

    billingLogger.info({ userId: req.user.id }, 'Subscription cancelled');

    res.json({
      success: true,
      message: 'Subscription cancelled. You will retain access until the end of your billing period.'
    });
  } catch (error) {
    billingLogger.error({ error, userId: req.user?.id }, 'Failed to cancel subscription');
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

export default router;