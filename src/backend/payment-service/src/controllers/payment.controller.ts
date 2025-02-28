import express from 'express'; // v4.18.2
import { z } from 'zod'; // v3.22.2
import logger from 'pino'; // v8.14.1

import { PaymentModel } from '../models/payment.model';
import { TransactionModel } from '../models/transaction.model';
import { StripeService } from '../services/stripe.service';
import { EscrowService } from '../services/escrow.service';

import {
  Payment,
  PaymentDTO,
  PaymentStatus,
  PaymentSearchParams,
  TransactionType
} from '../../../shared/src/types/payment.types';

import {
  ValidationError,
  ResourceNotFoundError,
  PaymentError,
  formatErrorResponse
} from '../../../shared/src/utils/errors';

import { config } from '../config';

/**
 * Controller for handling payment-related HTTP requests in the AI Talent Marketplace
 */
export class PaymentController {
  private paymentModel: PaymentModel;
  private transactionModel: TransactionModel;
  private stripeService: StripeService;
  private escrowService: EscrowService;
  private logger: logger.Logger;

  /**
   * Initializes the PaymentController with required dependencies
   * 
   * @param paymentModel - Payment data access model
   * @param transactionModel - Transaction data access model
   * @param stripeService - Stripe payment processing service
   * @param escrowService - Escrow management service
   */
  constructor(
    paymentModel: PaymentModel,
    transactionModel: TransactionModel,
    stripeService: StripeService,
    escrowService: EscrowService
  ) {
    this.paymentModel = paymentModel;
    this.transactionModel = transactionModel;
    this.stripeService = stripeService;
    this.escrowService = escrowService;
    this.logger = logger({
      name: 'payment-controller',
      level: process.env.LOG_LEVEL || 'info'
    });
  }

  /**
   * Creates a new payment record from a payment request
   * 
   * @param req - HTTP request with payment data in body
   * @param res - HTTP response
   * @param next - Express next function
   */
  async createPayment(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      // Extract payment data from request body
      const paymentData: PaymentDTO = req.body;

      // Validate payment data using Zod schema
      const paymentSchema = z.object({
        contractId: z.string().uuid(),
        milestoneId: z.string().uuid(),
        amount: z.number().positive(),
        method: z.enum(['credit_card', 'bank_transfer', 'paypal', 'platform_credit']),
        description: z.string().optional(),
        paymentMethodId: z.string().optional(),
        currency: z.string().length(3).optional()
      });

      const validationResult = paymentSchema.safeParse(paymentData);
      if (!validationResult.success) {
        throw new ValidationError(
          'Invalid payment data',
          validationResult.error.format()
        );
      }

      // Check if user has permission to create this payment
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // Add the payer ID (current user) to the payment data
      const paymentDataWithUser = {
        ...paymentData,
        payerId: userId
      };

      // Retrieve contract information to validate milestone and payment details
      // In a real implementation, this would typically be a call to a contracts service
      // For this example, we'll assume the validation passes

      // Create the payment record
      const payment = await this.paymentModel.create(paymentDataWithUser);

      // Determine if payment should go through escrow
      const useEscrow = this.escrowService.isEligibleForEscrow(payment);

      if (useEscrow) {
        // Hold payment in escrow
        const escrowedPayment = await this.escrowService.holdInEscrow(payment.id);
        
        this.logger.info({
          msg: 'Payment created and placed in escrow',
          paymentId: payment.id,
          userId,
          amount: payment.amount
        });
        
        return res.status(201).json(escrowedPayment);
      } else {
        // For direct payments, create a payment intent with Stripe
        if (paymentData.paymentMethodId) {
          const paymentIntent = await this.stripeService.createPaymentIntent(
            payment,
            paymentData.paymentMethodId
          );
          
          // Update payment with Stripe payment intent ID
          const updatedPayment = await this.paymentModel.update(payment.id, {
            stripePaymentIntentId: paymentIntent.id
          });
          
          this.logger.info({
            msg: 'Payment created with Stripe payment intent',
            paymentId: payment.id,
            userId,
            amount: payment.amount,
            paymentIntentId: paymentIntent.id
          });
          
          return res.status(201).json(updatedPayment);
        }
        
        this.logger.info({
          msg: 'Payment created',
          paymentId: payment.id,
          userId,
          amount: payment.amount
        });
        
        return res.status(201).json(payment);
      }
    } catch (error) {
      this.logger.error({
        msg: 'Error creating payment',
        error: error instanceof Error ? error.message : String(error)
      });
      
      next(error);
    }
  }

  /**
   * Processes a pending payment by confirming the Stripe payment intent
   * 
   * @param req - HTTP request with payment ID and payment method info
   * @param res - HTTP response
   * @param next - Express next function
   */
  async processPayment(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { paymentMethodId } = req.body;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if payment is in a processable state
      if (payment.status !== PaymentStatus.PENDING) {
        throw new PaymentError(
          `Cannot process payment with status ${payment.status}`,
          paymentId
        );
      }

      // Confirm payment intent with Stripe
      const confirmOptions = paymentMethodId ? { payment_method: paymentMethodId } : {};
      
      const paymentIntent = await this.stripeService.confirmPaymentIntent(
        payment.stripePaymentIntentId,
        confirmOptions
      );

      // Update payment status based on Stripe response
      let newStatus: PaymentStatus;
      
      switch (paymentIntent.status) {
        case 'succeeded':
          newStatus = PaymentStatus.COMPLETED;
          break;
        case 'processing':
          newStatus = PaymentStatus.PROCESSING;
          break;
        case 'requires_capture':
          // For payments that will be held in escrow
          newStatus = PaymentStatus.HELD_IN_ESCROW;
          break;
        case 'requires_payment_method':
        case 'requires_confirmation':
        case 'requires_action':
          // Payment needs further action
          newStatus = PaymentStatus.PENDING;
          break;
        case 'canceled':
          newStatus = PaymentStatus.CANCELLED;
          break;
        default:
          newStatus = PaymentStatus.PROCESSING;
      }

      // Update payment with new status
      const updatedPayment = await this.paymentModel.updateStatus(paymentId, newStatus);

      // Update related milestone status if applicable
      // In a real implementation, we would call a milestones service
      
      // Create transaction records for the payment
      if (newStatus === PaymentStatus.COMPLETED) {
        await this.transactionModel.createPaymentTransactions(updatedPayment);
      }

      this.logger.info({
        msg: 'Payment processed',
        paymentId,
        userId: req.user?.id,
        newStatus,
        stripeStatus: paymentIntent.status
      });

      return res.status(200).json(updatedPayment);
    } catch (error) {
      this.logger.error({
        msg: 'Error processing payment',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Retrieves a payment record by ID
   * 
   * @param req - HTTP request with payment ID parameter
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getPaymentById(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if user has permission to view this payment
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would check if the user is the payer, payee,
      // or an admin before allowing access to the payment details
      const isAuthorized = payment.payerId === userId || 
                           payment.payeeId === userId || 
                           req.user?.role === 'admin';
                           
      if (!isAuthorized) {
        throw new ValidationError('Not authorized to view this payment');
      }

      return res.status(200).json(payment);
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving payment',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Retrieves all payments associated with a contract
   * 
   * @param req - HTTP request with contract ID parameter
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getPaymentsByContractId(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { contractId } = req.params;

      // Validate contract ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(contractId)) {
        throw new ValidationError('Invalid contract ID format');
      }

      // Check if user has permission to view contract payments
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would check if the user is associated with the contract
      // before allowing access to the payment details

      // Retrieve payment records
      const payments = await this.paymentModel.findByContractId(contractId);

      return res.status(200).json(payments);
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving contract payments',
        error: error instanceof Error ? error.message : String(error),
        contractId: req.params.contractId
      });
      
      next(error);
    }
  }

  /**
   * Searches and filters payments based on query parameters
   * 
   * @param req - HTTP request with search parameters
   * @param res - HTTP response
   * @param next - Express next function
   */
  async searchPayments(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // Extract query parameters
      const {
        status,
        method,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      // Build search params object
      const searchParams: Partial<PaymentSearchParams> = {
        userId,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      };

      // Add optional filters
      if (status) {
        searchParams.status = status as PaymentStatus;
      }

      if (method) {
        searchParams.method = method as any;
      }

      if (minAmount) {
        searchParams.minAmount = parseFloat(minAmount as string);
      }

      if (maxAmount) {
        searchParams.maxAmount = parseFloat(maxAmount as string);
      }

      if (startDate) {
        searchParams.startDate = new Date(startDate as string);
      }

      if (endDate) {
        searchParams.endDate = new Date(endDate as string);
      }

      if (sortBy) {
        searchParams.sortBy = sortBy as string;
      }

      if (sortOrder) {
        searchParams.sortOrder = sortOrder as string;
      }

      // Apply user-specific filters based on user role
      // In a real implementation, we would check the user role and apply appropriate filters
      const userRole = req.user?.role;
      
      let role: 'payer' | 'payee' = 'payee';
      
      if (userRole === 'employer') {
        role = 'payer'; // Employers primarily make payments
        searchParams.payerId = userId;
      } else if (userRole === 'freelancer') {
        role = 'payee'; // Freelancers primarily receive payments
        searchParams.payeeId = userId;
      }
      // Admins can see all payments, so no additional filters needed

      // Retrieve payments
      const result = await this.paymentModel.findByUserId(userId, role, searchParams);

      // Return payments with pagination metadata
      return res.status(200).json({
        payments: result.payments,
        pagination: {
          total: result.total,
          page: searchParams.page || 1,
          limit: searchParams.limit || 20,
          pages: Math.ceil(result.total / (searchParams.limit || 20))
        }
      });
    } catch (error) {
      this.logger.error({
        msg: 'Error searching payments',
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      });
      
      next(error);
    }
  }

  /**
   * Retrieves all transactions associated with a payment
   * 
   * @param req - HTTP request with payment ID parameter
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getPaymentTransactions(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Check if payment exists
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if user has permission to view this payment's transactions
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would check if the user is the payer, payee,
      // or an admin before allowing access to the transaction details
      const isAuthorized = payment.payerId === userId || 
                           payment.payeeId === userId || 
                           req.user?.role === 'admin';
                           
      if (!isAuthorized) {
        throw new ValidationError('Not authorized to view these transactions');
      }

      // Retrieve transactions
      const transactions = await this.transactionModel.findByPaymentId(paymentId);

      return res.status(200).json(transactions);
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving payment transactions',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Retrieves all transactions for the current user
   * 
   * @param req - HTTP request with search parameters
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getUserTransactions(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // Extract query parameters
      const {
        type,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      // Build search params object
      const searchParams: any = {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      };

      // Add optional filters
      if (type) {
        searchParams.type = type as any;
      }

      if (minAmount) {
        searchParams.minAmount = parseFloat(minAmount as string);
      }

      if (maxAmount) {
        searchParams.maxAmount = parseFloat(maxAmount as string);
      }

      if (startDate) {
        searchParams.startDate = new Date(startDate as string);
      }

      if (endDate) {
        searchParams.endDate = new Date(endDate as string);
      }

      if (sortBy) {
        searchParams.sortBy = sortBy as string;
      }

      if (sortOrder) {
        searchParams.sortOrder = sortOrder as string;
      }

      // Retrieve transactions
      const result = await this.transactionModel.findByUserId(userId, searchParams);

      // Return transactions with pagination metadata
      return res.status(200).json({
        transactions: result.transactions,
        pagination: {
          total: result.total,
          page: searchParams.page || 1,
          limit: searchParams.limit || 20,
          pages: Math.ceil(result.total / (searchParams.limit || 20))
        }
      });
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving user transactions',
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      });
      
      next(error);
    }
  }

  /**
   * Retrieves current balance information for the user
   * 
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getUserBalance(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // Calculate available balance from completed transactions
      const availableBalance = await this.transactionModel.getUserBalance(userId);

      // Get payments in escrow for this user
      const escrowStats = await this.escrowService.getEscrowStatistics(userId);
      const escrowBalance = (escrowStats as any).escrowStatistics.totalHeldAsPayee || 0;

      // Get pending payments (not yet completed or in escrow)
      const pendingPayments = await this.paymentModel.findByUserId(
        userId,
        'payee',
        { status: PaymentStatus.PENDING }
      );

      const pendingBalance = pendingPayments.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      // Return balance summary
      return res.status(200).json({
        userId,
        availableBalance,
        pendingBalance,
        escrowBalance,
        totalBalance: availableBalance + pendingBalance + escrowBalance,
        currency: 'USD', // Default currency - in a real implementation, this might be user-specific
        updatedAt: new Date()
      });
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving user balance',
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      });
      
      next(error);
    }
  }

  /**
   * Retrieves payment statistics for the current user
   * 
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getPaymentStatistics(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // Get payment statistics
      const statistics = await this.paymentModel.getPaymentStatistics(userId);

      return res.status(200).json(statistics);
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving payment statistics',
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      });
      
      next(error);
    }
  }

  /**
   * Cancels a pending payment
   * 
   * @param req - HTTP request with payment ID and cancellation reason
   * @param res - HTTP response
   * @param next - Express next function
   */
  async cancelPayment(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if payment is in a cancellable state
      if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PROCESSING) {
        throw new PaymentError(
          `Cannot cancel payment with status ${payment.status}`,
          paymentId
        );
      }

      // Check if user has permission to cancel this payment
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would check if the user is the payer,
      // or an admin before allowing cancellation
      const isAuthorized = payment.payerId === userId || req.user?.role === 'admin';
                           
      if (!isAuthorized) {
        throw new ValidationError('Not authorized to cancel this payment');
      }

      // Cancel Stripe payment intent if one exists
      if (payment.stripePaymentIntentId) {
        await this.stripeService.cancelPaymentIntent(
          payment.stripePaymentIntentId,
          reason || 'Cancelled by user'
        );
      }

      // Update payment status to CANCELLED
      const updatedPayment = await this.paymentModel.updateStatus(
        paymentId,
        PaymentStatus.CANCELLED
      );

      // Update payment metadata with cancellation reason
      await this.paymentModel.update(paymentId, {
        metadata: {
          ...payment.metadata,
          cancellationReason: reason || 'Cancelled by user',
          cancelledAt: new Date().toISOString()
        }
      });

      this.logger.info({
        msg: 'Payment cancelled',
        paymentId,
        userId,
        reason: reason || 'Cancelled by user'
      });

      return res.status(200).json(updatedPayment);
    } catch (error) {
      this.logger.error({
        msg: 'Error cancelling payment',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Processes a refund for a completed payment
   * 
   * @param req - HTTP request with payment ID, refund amount, and reason
   * @param res - HTTP response
   * @param next - Express next function
   */
  async refundPayment(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Validate refund amount
      if (amount && (typeof amount !== 'number' || amount <= 0)) {
        throw new ValidationError('Refund amount must be a positive number');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if payment is in a refundable state
      const refundableStatuses = [
        PaymentStatus.COMPLETED, 
        PaymentStatus.HELD_IN_ESCROW,
        PaymentStatus.RELEASED_FROM_ESCROW
      ];
      
      if (!refundableStatuses.includes(payment.status)) {
        throw new PaymentError(
          `Cannot refund payment with status ${payment.status}`,
          paymentId
        );
      }

      // Check if user has permission to refund this payment
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would check if the user is the payer, payee,
      // or an admin before allowing refund
      const isAuthorized = payment.payerId === userId || 
                           req.user?.role === 'admin';
                           
      if (!isAuthorized) {
        throw new ValidationError('Not authorized to refund this payment');
      }

      // Process refund through Stripe
      const refundAmount = amount || payment.amount;
      
      // Validate refund amount is not greater than payment amount
      if (refundAmount > payment.amount) {
        throw new ValidationError('Refund amount cannot exceed the payment amount');
      }

      if (!payment.stripePaymentIntentId) {
        throw new PaymentError('Payment has no associated payment intent for refund', paymentId);
      }

      const refund = await this.stripeService.createRefund(
        payment.stripePaymentIntentId,
        refundAmount,
        reason
      );

      // Update payment status to REFUNDED
      const updatedPayment = await this.paymentModel.updateStatus(
        paymentId,
        PaymentStatus.REFUNDED
      );

      // Update payment metadata with refund information
      await this.paymentModel.update(paymentId, {
        metadata: {
          ...payment.metadata,
          refundId: refund.id,
          refundAmount,
          refundReason: reason || 'Customer requested',
          refundedAt: new Date().toISOString()
        }
      });

      // Create refund transaction records
      await this.transactionModel.createRefundTransactions(
        payment,
        refundAmount,
        reason || 'Customer requested'
      );

      this.logger.info({
        msg: 'Payment refunded',
        paymentId,
        userId,
        refundAmount,
        reason: reason || 'Customer requested'
      });

      return res.status(200).json(updatedPayment);
    } catch (error) {
      this.logger.error({
        msg: 'Error refunding payment',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Places a payment in escrow
   * 
   * @param req - HTTP request with payment ID
   * @param res - HTTP response
   * @param next - Express next function
   */
  async holdInEscrow(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Check if escrow is enabled
      if (!config.escrow.autoReleaseEnabled) {
        throw new PaymentError('Escrow functionality is not enabled');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if payment is eligible for escrow
      if (!this.escrowService.isEligibleForEscrow(payment)) {
        throw new PaymentError('Payment is not eligible for escrow', paymentId);
      }

      // Place payment in escrow
      const escrowedPayment = await this.escrowService.holdInEscrow(paymentId);

      this.logger.info({
        msg: 'Payment placed in escrow',
        paymentId,
        userId: req.user?.id
      });

      return res.status(200).json(escrowedPayment);
    } catch (error) {
      this.logger.error({
        msg: 'Error placing payment in escrow',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Releases a payment from escrow to the recipient
   * 
   * @param req - HTTP request with payment ID
   * @param res - HTTP response
   * @param next - Express next function
   */
  async releaseFromEscrow(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if user has permission to release from escrow
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would check if the user is the payer,
      // or an admin before allowing escrow release
      const isAuthorized = payment.payerId === userId || req.user?.role === 'admin';
                           
      if (!isAuthorized) {
        throw new ValidationError('Not authorized to release this payment from escrow');
      }

      // Release payment from escrow
      const releasedPayment = await this.escrowService.releaseFromEscrow(paymentId);

      // Update related milestone status if applicable
      // In a real implementation, we would call a milestones service
      if (payment.milestoneId) {
        // Code to update milestone status would go here
      }

      this.logger.info({
        msg: 'Payment released from escrow',
        paymentId,
        userId
      });

      return res.status(200).json(releasedPayment);
    } catch (error) {
      this.logger.error({
        msg: 'Error releasing payment from escrow',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Retrieves the current escrow status for a payment
   * 
   * @param req - HTTP request with payment ID
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getEscrowStatus(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Get escrow details
      const escrowDetails = await this.escrowService.getEscrowDetails(paymentId);

      return res.status(200).json(escrowDetails);
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving escrow status',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Generates a receipt for a completed payment
   * 
   * @param req - HTTP request with payment ID
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getPaymentReceipt(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const { paymentId } = req.params;

      // Validate payment ID is UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(paymentId)) {
        throw new ValidationError('Invalid payment ID format');
      }

      // Retrieve payment record
      const payment = await this.paymentModel.findById(paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
      }

      // Check if payment is in a completed state
      const completedStatuses = [
        PaymentStatus.COMPLETED,
        PaymentStatus.RELEASED_FROM_ESCROW,
        PaymentStatus.REFUNDED
      ];
      
      if (!completedStatuses.includes(payment.status)) {
        throw new PaymentError(
          `Cannot generate receipt for payment with status ${payment.status}`,
          paymentId
        );
      }

      // Check if user has permission to view this receipt
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      const isAuthorized = payment.payerId === userId || 
                           payment.payeeId === userId || 
                           req.user?.role === 'admin';
                           
      if (!isAuthorized) {
        throw new ValidationError('Not authorized to view this receipt');
      }

      // Generate receipt data
      const receiptData = {
        receiptId: `RCPT-${Date.now().toString(36).toUpperCase()}`,
        receiptDate: new Date(),
        paymentId: payment.id,
        paymentDate: payment.completedAt || payment.updatedAt,
        paymentMethod: payment.method,
        paymentStatus: payment.status,
        contractId: payment.contractId,
        milestoneId: payment.milestoneId,
        description: payment.description,
        
        // Amount details
        amount: payment.amount,
        fee: payment.fee,
        total: payment.amount + payment.fee,
        currency: payment.currency,
        
        // Payer/payee details
        payerId: payment.payerId,
        payeeId: payment.payeeId,
        
        // Transaction details
        stripePaymentIntentId: payment.stripePaymentIntentId,
        stripeTransferId: payment.stripeTransferId,
        
        // Timestamps
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        
        // Platform details
        platform: 'AI Talent Marketplace',
        receiptGeneratedAt: new Date()
      };

      return res.status(200).json(receiptData);
    } catch (error) {
      this.logger.error({
        msg: 'Error generating payment receipt',
        error: error instanceof Error ? error.message : String(error),
        paymentId: req.params.paymentId
      });
      
      next(error);
    }
  }

  /**
   * Retrieves saved payment methods for the current user
   * 
   * @param req - HTTP request
   * @param res - HTTP response
   * @param next - Express next function
   */
  async getSavedPaymentMethods(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('User not authenticated');
      }

      // In a real implementation, we would retrieve the user's Stripe customer ID
      // Here we'll assume we have a Stripe customer ID mapping
      const stripeCustomerId = `cus_${userId.replace(/-/g, '').substring(0, 14)}`;

      // Retrieve payment methods from Stripe
      const paymentMethods = await this.stripeService.listCustomerPaymentMethods(
        stripeCustomerId
      );

      // Filter and sanitize payment method data for security
      const sanitizedPaymentMethods = paymentMethods.map(method => ({
        id: method.id,
        type: method.type,
        created: new Date(method.created * 1000),
        isDefault: method.metadata?.isDefault === 'true',
        billingDetails: {
          name: method.billing_details?.name,
          email: method.billing_details?.email,
          phone: method.billing_details?.phone
        },
        card: method.card ? {
          brand: method.card.brand,
          last4: method.card.last4,
          expMonth: method.card.exp_month,
          expYear: method.card.exp_year,
          country: method.card.country,
          funding: method.card.funding
        } : undefined,
        bankAccount: method.us_bank_account ? {
          bankName: method.us_bank_account.bank_name,
          last4: method.us_bank_account.last4,
          accountType: method.us_bank_account.account_type
        } : undefined
      }));

      return res.status(200).json(sanitizedPaymentMethods);
    } catch (error) {
      this.logger.error({
        msg: 'Error retrieving saved payment methods',
        error: error instanceof Error ? error.message : String(error),
        userId: req.user?.id
      });
      
      next(error);
    }
  }

  /**
   * Handles webhook events from Stripe
   * 
   * @param req - HTTP request with Stripe webhook event
   * @param res - HTTP response
   * @param next - Express next function
   */
  async handleStripeWebhook(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> {
    // Extract raw body and Stripe signature
    const rawBody = req.body;
    const signature = req.headers['stripe-signature'] as string;

    // Return 200 immediately to acknowledge receipt of the webhook
    // This is important because Stripe will retry webhooks if it doesn't get a quick response
    res.status(200).json({ received: true });

    try {
      // Validate webhook signature
      const event = await this.stripeService.handleWebhookEvent(
        rawBody,
        signature
      );

      // Process the webhook event asynchronously to prevent timeout
      setImmediate(async () => {
        try {
          // Handle different event types
          switch (event.type) {
            case 'payment_intent.succeeded':
              const paymentIntent = event.data.object as any;
              const paymentId = paymentIntent.metadata?.paymentId;
              
              if (paymentId) {
                // Retrieve payment
                const payment = await this.paymentModel.findById(paymentId);
                if (payment) {
                  // Update payment status based on escrow settings
                  let newStatus: PaymentStatus;
                  
                  if (config.escrow.autoReleaseEnabled) {
                    newStatus = PaymentStatus.HELD_IN_ESCROW;
                    
                    // Update escrow dates
                    const escrowHoldDate = new Date();
                    const escrowReleaseDate = new Date(
                      escrowHoldDate.getTime() + (config.escrow.defaultHoldPeriodDays * 24 * 60 * 60 * 1000)
                    );
                    
                    await this.paymentModel.update(paymentId, {
                      escrowHoldDate,
                      escrowReleaseDate
                    });
                  } else {
                    newStatus = PaymentStatus.COMPLETED;
                  }
                  
                  // Update payment status
                  const updatedPayment = await this.paymentModel.updateStatus(paymentId, newStatus);
                  
                  // Create transaction records
                  if (newStatus === PaymentStatus.COMPLETED) {
                    await this.transactionModel.createPaymentTransactions(updatedPayment);
                  } else if (newStatus === PaymentStatus.HELD_IN_ESCROW) {
                    await this.transactionModel.createEscrowTransactions(
                      updatedPayment,
                      TransactionType.ESCROW_HOLD
                    );
                  }
                }
              }
              break;
              
            case 'payment_intent.payment_failed':
              const failedIntent = event.data.object as any;
              const failedPaymentId = failedIntent.metadata?.paymentId;
              
              if (failedPaymentId) {
                await this.paymentModel.updateStatus(failedPaymentId, PaymentStatus.FAILED);
                
                // Update payment metadata with failure reason
                await this.paymentModel.update(failedPaymentId, {
                  metadata: {
                    failureReason: failedIntent.last_payment_error?.message || 'Unknown error',
                    failedAt: new Date().toISOString()
                  }
                });
              }
              break;
              
            case 'charge.refunded':
              const charge = event.data.object as any;
              const refundedPaymentIntentId = charge.payment_intent;
              
              if (refundedPaymentIntentId) {
                // Find payment by Stripe payment intent ID - this would be implemented in a real system
                this.logger.info({
                  msg: 'Received refund webhook for payment intent',
                  paymentIntentId: refundedPaymentIntentId
                });
              }
              break;
              
            default:
              this.logger.debug({
                msg: 'Unhandled webhook event type',
                eventType: event.type,
                eventId: event.id
              });
          }
          
          this.logger.info({
            msg: 'Successfully processed webhook event',
            eventId: event.id,
            eventType: event.type
          });
        } catch (error) {
          this.logger.error({
            msg: 'Error processing webhook event',
            error: error instanceof Error ? error.message : String(error),
            eventId: event.id,
            eventType: event.type
          });
        }
      });
    } catch (error) {
      this.logger.error({
        msg: 'Error validating webhook signature',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}