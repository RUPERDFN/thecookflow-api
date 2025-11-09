import { google } from 'googleapis';
import crypto from 'crypto';
import { env, getGooglePlayPublicKey } from '../config/env.js';
import { logger } from '../utils/logger.js';

const playLogger = logger.child({ module: 'google-play' });

// Initialize Google Play Developer API
const androidpublisher = google.androidpublisher('v3');

// Authenticate with service account
async function getAuthClient() {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error('Firebase service account not configured');
  }

  const serviceAccount = env.FIREBASE_SERVICE_ACCOUNT_JSON as google.auth.JWTInput;

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/androidpublisher']
  });

  return auth.getClient();
}

// Verify purchase with Google Play API
export async function verifyGooglePlayPurchase(
  productId: string,
  purchaseToken: string
): Promise<{
  valid: boolean;
  purchaseTime?: Date;
  expiryTime?: Date;
  autoRenewing?: boolean;
  receipt?: any;
  error?: string;
}> {
  try {
    const authClient = await getAuthClient();

    // Get subscription details from Google Play
    const response = await androidpublisher.purchases.subscriptions.get({
      auth: authClient as any,
      packageName: 'com.cookflow.app',
      subscriptionId: productId,
      token: purchaseToken
    });

    const subscription = response.data;

    // Check if subscription is valid
    if (!subscription.startTimeMillis || !subscription.expiryTimeMillis) {
      return {
        valid: false,
        error: 'Invalid subscription data'
      };
    }

    const now = Date.now();
    const expiryTime = parseInt(subscription.expiryTimeMillis);
    
    // Check if subscription is expired
    if (expiryTime < now) {
      return {
        valid: false,
        error: 'Subscription expired',
        purchaseTime: new Date(parseInt(subscription.startTimeMillis)),
        expiryTime: new Date(expiryTime)
      };
    }

    playLogger.info({ 
      productId,
      valid: true,
      expiryTime: new Date(expiryTime)
    }, 'Purchase verified successfully');

    return {
      valid: true,
      purchaseTime: new Date(parseInt(subscription.startTimeMillis)),
      expiryTime: new Date(expiryTime),
      autoRenewing: subscription.autoRenewing || false,
      receipt: subscription
    };
  } catch (error) {
    playLogger.error({ error, productId }, 'Failed to verify with Google Play API');
    
    // Fallback to signature verification if API fails
    return verifyPurchaseSignature(productId, purchaseToken);
  }
}

// Verify purchase signature (fallback method)
export async function verifyPurchaseSignature(
  productId: string,
  purchaseData: string,
  signature?: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const publicKey = getGooglePlayPublicKey();
    
    if (!publicKey) {
      return {
        valid: false,
        error: 'Google Play public key not configured'
      };
    }

    if (!signature) {
      return {
        valid: false,
        error: 'Purchase signature missing'
      };
    }

    // Verify signature using RSA SHA1
    const verifier = crypto.createVerify('RSA-SHA1');
    verifier.update(purchaseData);
    
    const isValid = verifier.verify(publicKey, signature, 'base64');

    playLogger.info({ 
      productId,
      valid: isValid
    }, 'Signature verification completed');

    return {
      valid: isValid,
      error: isValid ? undefined : 'Invalid signature'
    };
  } catch (error) {
    playLogger.error({ error }, 'Signature verification failed');
    return {
      valid: false,
      error: 'Signature verification failed'
    };
  }
}

// Get subscription products
export async function getSubscriptionProducts() {
  return [
    {
      id: 'thecookflow_premium_monthly',
      name: 'TheCookFlow Premium',
      description: 'Acceso completo a todas las funciones premium',
      price: '€1.99',
      priceAmount: 1.99,
      currency: 'EUR',
      period: 'month',
      trialDays: 7,
      features: [
        'Menús ilimitados',
        'Reconocimiento de alimentos',
        'Recetas exclusivas',
        'Sin anuncios',
        'Soporte prioritario'
      ]
    }
  ];
}