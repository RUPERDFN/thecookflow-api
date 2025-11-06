import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';
import { users } from '@thecookflow/shared/schemas';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const authLogger = logger.child({ module: 'auth' });

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isPremium: boolean;
    provider: string;
  };
}

// Generate JWT token
export function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      isPremium: user.isPremium || false,
      provider: user.provider || 'email'
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authentication middleware
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check session first
    if ((req.session as any)?.userId) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, (req.session as any).userId))
        .limit(1);
      
      if (user.length > 0) {
        req.user = {
          id: user[0].id,
          email: user[0].email,
          firstName: user[0].firstName || undefined,
          lastName: user[0].lastName || undefined,
          isPremium: user[0].isPremium || false,
          provider: user[0].provider || 'email'
        };
        return next();
      }
    }

    // Check Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const decoded = verifyToken(token);
    
    // Get fresh user data from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    req.user = {
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName || undefined,
      lastName: user[0].lastName || undefined,
      isPremium: user[0].isPremium || false,
      provider: user[0].provider || 'email'
    };

    next();
  } catch (error) {
    authLogger.error({ error }, 'Authentication failed');
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check session first
    if ((req.session as any)?.userId) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, (req.session as any).userId))
        .limit(1);
      
      if (user.length > 0) {
        req.user = {
          id: user[0].id,
          email: user[0].email,
          firstName: user[0].firstName || undefined,
          lastName: user[0].lastName || undefined,
          isPremium: user[0].isPremium || false,
          provider: user[0].provider || 'email'
        };
      }
    } else {
      // Check Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        const decoded = verifyToken(token);
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.id))
          .limit(1);

        if (user.length > 0) {
          req.user = {
            id: user[0].id,
            email: user[0].email,
            firstName: user[0].firstName || undefined,
            lastName: user[0].lastName || undefined,
            isPremium: user[0].isPremium || false,
            provider: user[0].provider || 'email'
          };
        }
      }
    }
  } catch (error) {
    // Silent fail for optional auth
    authLogger.debug({ error }, 'Optional auth failed, continuing without user');
  }

  next();
};

// Premium subscription check middleware
export const requirePremium = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  if (!req.user.isPremium) {
    return res.status(403).json({ 
      success: false, 
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }

  next();
};

// Admin check middleware
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  // Check if user is admin (you might want to add an isAdmin field to users table)
  const adminEmails = ['admin@thecookflow.com']; // Configure admin emails
  if (!adminEmails.includes(req.user.email)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }

  next();
};