import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../config/database.js';
import { users } from '@ruperdfn/thecookflow-shared/schemas';
import { eq } from 'drizzle-orm';
import { 
  hashPassword, 
  comparePassword, 
  generateToken,
  authenticateToken,
  type AuthRequest
} from '../middleware/auth.js';
import { authRateLimit } from '../middleware/security.js';
import { logger } from '../utils/logger.js';

const router = Router();
const authLogger = logger.child({ module: 'auth-routes' });

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Register endpoint
router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        provider: 'email'
      })
      .returning();

    // Generate token
    const token = generateToken(newUser);

    // Set session
    (req.session as any).userId = newUser.id;

    authLogger.info({ userId: newUser.id, email: newUser.email }, 'User registered');

    res.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          isPremium: newUser.isPremium
        },
        token
      }
    });
  } catch (error) {
    authLogger.error({ error }, 'Registration failed');
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError 
        ? 'Invalid input data' 
        : 'Registration failed'
    });
  }
});

// Login endpoint
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValid = await comparePassword(data.password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Set session
    (req.session as any).userId = user.id;

    authLogger.info({ userId: user.id, email: user.email }, 'User logged in');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isPremium: user.isPremium,
          subscriptionStatus: user.subscriptionStatus
        },
        token
      }
    });
  } catch (error) {
    authLogger.error({ error }, 'Login failed');
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError 
        ? 'Invalid input data' 
        : 'Login failed'
    });
  }
});

// Logout endpoint
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      authLogger.error({ error: err }, 'Logout failed');
      return res.status(500).json({
        success: false,
        error: 'Logout failed'
      });
    }

    res.clearCookie('tcf.sid');
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Get fresh user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium: user.isPremium,
        subscriptionStatus: user.subscriptionStatus,
        provider: user.provider,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    authLogger.error({ error, userId: req.user?.id }, 'Failed to get user');
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authenticateToken, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  const newToken = generateToken(req.user);

  res.json({
    success: true,
    data: { token: newToken }
  });
});

export default router;