/**
 * Payment Routes Configuration
 *
 * This module defines all payment-related API endpoints for the AI Talent Marketplace platform.
 * It configures routes for payment creation, processing, management, escrow operations,
 * and transaction history with proper authentication, validation, and rate limiting.
 *
 * @version 1.0.0
 */

import express from 'express'; // ^4.18.2
import { 
  PaymentController 
} from '../controllers/payment.controller';

import { 
  authenticate, 
  authorize 
} from '../../../api-gateway/src/middleware/auth';

import { 
  validateRequestBody, 
  validateRequestParams, 
  validateRequestQuery 
} from '../../../api-gateway/src/middleware/validation';

import { 
  authLimiter, 
  webhookLimiter 
} from '../../../api-gateway/src/middleware/rateLimit';

import { 
  paymentSchemas 
} from '../../../shared/src/utils/validation';

import { 
  UserRole 
} from '../../../shared/src/types/user.types';

/**
 * Factory function that creates and configures an Express router with all payment-related routes
 * 
 * @param paymentController - Instance of PaymentController for handling payment operations
 * @returns Configured Express router with payment routes
 */
function createPaymentRoutes(paymentController: PaymentController): express.Router {
  const router = express.Router();
  
  // --------------------------------------
  // Routes for creating and processing payments
  // --------------------------------------
  
  // Create a new payment
  router.post(
    '/',
    authenticate,
    authorize([UserRole.EMPLOYER, UserRole.ADMIN]),
    authLimiter,
    validateRequestBody(paymentSchemas.createPaymentSchema),
    paymentController.createPayment
  );

  // Process a pending payment
  router.post(
    '/process',
    authenticate,
    authorize([UserRole.EMPLOYER, UserRole.ADMIN]),
    authLimiter,
    validateRequestBody(paymentSchemas.processPaymentSchema),
    paymentController.processPayment
  );
  
  // --------------------------------------
  // Routes for searching and retrieving payment information
  // --------------------------------------
  
  // Search/filter payments with pagination
  router.get(
    '/search',
    authenticate,
    authLimiter,
    validateRequestQuery(paymentSchemas.searchPaymentsSchema),
    paymentController.searchPayments
  );
  
  // Get all transactions for the current user
  router.get(
    '/transactions',
    authenticate,
    authLimiter,
    paymentController.getUserTransactions
  );

  // Get user's current balance
  router.get(
    '/balance',
    authenticate,
    authLimiter,
    paymentController.getUserBalance
  );

  // Get user's payment statistics
  router.get(
    '/statistics',
    authenticate,
    authLimiter,
    paymentController.getPaymentStatistics
  );
  
  // Get saved payment methods for the user
  router.get(
    '/methods',
    authenticate,
    authLimiter,
    paymentController.getSavedPaymentMethods
  );
  
  // Webhook endpoint for Stripe events
  router.post(
    '/webhook',
    webhookLimiter,
    paymentController.handleStripeWebhook
  );
  
  // Get all payments for a contract (specific route before param routes)
  router.get(
    '/contract/:contractId',
    authenticate,
    authLimiter,
    validateRequestParams(paymentSchemas.contractIdParamSchema),
    paymentController.getPaymentsByContractId
  );
  
  // --------------------------------------
  // Routes with payment ID parameter
  // --------------------------------------
  
  // Get a payment by ID
  router.get(
    '/:paymentId',
    authenticate,
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    paymentController.getPaymentById
  );
  
  // Get transactions for a payment
  router.get(
    '/:paymentId/transactions',
    authenticate,
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    paymentController.getPaymentTransactions
  );
  
  // Cancel a pending payment
  router.post(
    '/:paymentId/cancel',
    authenticate,
    authorize([UserRole.EMPLOYER, UserRole.ADMIN]),
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    validateRequestBody(paymentSchemas.cancelPaymentSchema),
    paymentController.cancelPayment
  );

  // Refund a completed payment
  router.post(
    '/:paymentId/refund',
    authenticate,
    authorize([UserRole.ADMIN]),
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    validateRequestBody(paymentSchemas.refundPaymentSchema),
    paymentController.refundPayment
  );
  
  // --------------------------------------
  // Escrow operation routes
  // --------------------------------------
  
  // Hold a payment in escrow
  router.post(
    '/:paymentId/escrow/hold',
    authenticate,
    authorize([UserRole.EMPLOYER, UserRole.ADMIN]),
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    paymentController.holdInEscrow
  );

  // Release a payment from escrow
  router.post(
    '/:paymentId/escrow/release',
    authenticate,
    authorize([UserRole.EMPLOYER, UserRole.ADMIN]),
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    paymentController.releaseFromEscrow
  );

  // Get the escrow status of a payment
  router.get(
    '/:paymentId/escrow/status',
    authenticate,
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    paymentController.getEscrowStatus
  );
  
  // --------------------------------------
  // Receipt generation
  // --------------------------------------
  
  // Generate a receipt for a payment
  router.get(
    '/:paymentId/receipt',
    authenticate,
    authLimiter,
    validateRequestParams(paymentSchemas.paymentIdParamSchema),
    paymentController.getPaymentReceipt
  );
  
  return router;
}

export default createPaymentRoutes;