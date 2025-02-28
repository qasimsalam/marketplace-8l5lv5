/**
 * Escrow Service
 * 
 * This service manages the escrow functionality for the AI Talent Marketplace,
 * handling secure holding of funds between clients and freelancers until
 * project milestones are completed and conditions are met.
 * 
 * @version 1.0.0
 */

import { config } from '../config';
import {
  Payment,
  PaymentStatus,
  EscrowSettings,
  TransactionType
} from '../../../shared/src/types/payment.types';
import { PaymentModel } from '../models/payment.model';
import { TransactionModel } from '../models/transaction.model';
import { StripeService } from './stripe.service';
import { addDaysToDate, isDateBefore } from '../../../shared/src/utils/dates';
import { PaymentError, ResourceNotFoundError } from '../../../shared/src/utils/errors';
import logger from 'pino'; // v8.14.1

// Default number of days to hold funds in escrow if not configured
const DEFAULT_ESCROW_HOLD_DAYS = config.escrow.defaultHoldPeriodDays || 14;

/**
 * Calculates the automatic escrow release date based on hold date and configuration
 * 
 * @param holdDate - The date when the payment was placed in escrow
 * @returns The calculated release date
 */
export function calculateEscrowReleaseDate(holdDate: Date): Date {
  const holdPeriod = config.escrow.defaultHoldPeriodDays || DEFAULT_ESCROW_HOLD_DAYS;
  return addDaysToDate(holdDate, holdPeriod);
}

/**
 * Validates that a payment is eligible for an escrow operation
 * 
 * @param payment - Payment to validate
 * @param operation - The escrow operation to perform ('hold' or 'release')
 * @returns True if the payment is eligible for the operation
 * @throws PaymentError if validation fails
 */
function validateEscrowOperation(payment: Payment, operation: string): boolean {
  if (!payment) {
    throw new ResourceNotFoundError('Payment not found');
  }

  // Common validations for all operations
  if (!payment.amount || payment.amount <= 0) {
    throw new PaymentError(`Invalid payment amount for escrow ${operation}`);
  }

  if (!payment.payerId) {
    throw new PaymentError(`Missing payer ID for escrow ${operation}`);
  }

  if (!payment.payeeId) {
    throw new PaymentError(`Missing payee ID for escrow ${operation}`);
  }

  // Operation-specific validations
  if (operation === 'hold') {
    const validStatuses = [PaymentStatus.PENDING, PaymentStatus.PROCESSING];
    if (!validStatuses.includes(payment.status)) {
      throw new PaymentError(
        `Cannot place payment in escrow with status ${payment.status}. Payment must be in PENDING or PROCESSING status.`,
        payment.id
      );
    }
  } else if (operation === 'release') {
    if (payment.status !== PaymentStatus.HELD_IN_ESCROW) {
      throw new PaymentError(
        `Cannot release payment with status ${payment.status}. Payment must be in HELD_IN_ESCROW status.`,
        payment.id
      );
    }

    if (!payment.escrowHoldDate) {
      throw new PaymentError('Payment has no escrow hold date.', payment.id);
    }
  }

  return true;
}

/**
 * Service responsible for managing payment escrow functionality
 */
export class EscrowService {
  private paymentModel: PaymentModel;
  private transactionModel: TransactionModel;
  private stripeService: StripeService;
  private logger: logger.Logger;
  private config: {
    escrow: EscrowSettings;
  };

  /**
   * Initializes the EscrowService with required dependencies
   * 
   * @param paymentModel - Payment data access model
   * @param transactionModel - Transaction data access model
   * @param stripeService - Service for Stripe payment operations
   */
  constructor(
    paymentModel: PaymentModel,
    transactionModel: TransactionModel,
    stripeService: StripeService
  ) {
    this.paymentModel = paymentModel;
    this.transactionModel = transactionModel;
    this.stripeService = stripeService;
    this.logger = logger({
      name: 'escrow-service',
      level: process.env.LOG_LEVEL || 'info'
    });

    // Load escrow configuration
    this.config = {
      escrow: {
        enabled: config.escrow.autoReleaseEnabled,
        releaseDelay: config.escrow.defaultHoldPeriodDays,
        disputeWindow: config.escrow.disputeWindowDays,
        automaticRelease: config.escrow.autoReleaseEnabled
      }
    };
  }

  /**
   * Places a payment in escrow, preventing immediate transfer to the recipient
   * 
   * @param paymentId - ID of the payment to place in escrow
   * @returns Updated payment with escrow details
   * @throws PaymentError if the operation fails
   */
  async holdInEscrow(paymentId: string): Promise<Payment> {
    // Find the payment
    const payment = await this.paymentModel.findById(paymentId);
    
    // Validate payment for escrow hold
    validateEscrowOperation(payment, 'hold');

    try {
      // Set escrow dates
      const escrowHoldDate = new Date();
      const escrowReleaseDate = calculateEscrowReleaseDate(escrowHoldDate);

      // Process with Stripe - place in escrow
      const paymentIntent = await this.stripeService.placeInEscrow(payment);

      // Update payment record with escrow information
      const updatedPayment = await this.paymentModel.update(paymentId, {
        status: PaymentStatus.HELD_IN_ESCROW,
        escrowHoldDate,
        escrowReleaseDate,
        stripePaymentIntentId: paymentIntent.id,
        metadata: {
          ...payment.metadata,
          escrowReleaseDate: escrowReleaseDate.toISOString()
        }
      });

      // Create transaction records for the escrow hold
      await this.transactionModel.createEscrowTransactions(
        updatedPayment,
        TransactionType.ESCROW_HOLD
      );

      this.logger.info({
        msg: 'Payment placed in escrow',
        paymentId,
        holdDate: escrowHoldDate,
        releaseDate: escrowReleaseDate
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to place payment in escrow',
        paymentId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new PaymentError(
        `Failed to place payment in escrow: ${error instanceof Error ? error.message : String(error)}`,
        paymentId
      );
    }
  }

  /**
   * Releases funds from escrow to the recipient after conditions are met
   * 
   * @param paymentId - ID of the payment to release from escrow
   * @returns Updated payment after escrow release
   * @throws PaymentError if the operation fails
   */
  async releaseFromEscrow(paymentId: string): Promise<Payment> {
    // Find the payment
    const payment = await this.paymentModel.findById(paymentId);
    
    // Validate payment for escrow release
    validateEscrowOperation(payment, 'release');

    try {
      // Process with Stripe - release from escrow
      await this.stripeService.releaseFromEscrow(payment);

      // Update payment status
      const completedAt = new Date();
      const updatedPayment = await this.paymentModel.update(paymentId, {
        status: PaymentStatus.RELEASED_FROM_ESCROW,
        completedAt,
        metadata: {
          ...payment.metadata,
          escrowReleasedAt: completedAt.toISOString()
        }
      });

      // Create transaction records for the escrow release
      await this.transactionModel.createEscrowTransactions(
        updatedPayment,
        TransactionType.ESCROW_RELEASE
      );

      this.logger.info({
        msg: 'Payment released from escrow',
        paymentId,
        releasedAt: completedAt
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to release payment from escrow',
        paymentId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new PaymentError(
        `Failed to release payment from escrow: ${error instanceof Error ? error.message : String(error)}`,
        paymentId
      );
    }
  }

  /**
   * Retrieves detailed information about a payment in escrow
   * 
   * @param paymentId - ID of the payment to get escrow details for
   * @returns Escrow details including dates, status, and dispute window
   * @throws ResourceNotFoundError if payment is not found
   */
  async getEscrowDetails(paymentId: string): Promise<object> {
    const payment = await this.paymentModel.findById(paymentId);
    
    if (!payment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
    }

    const isInEscrow = payment.status === PaymentStatus.HELD_IN_ESCROW;
    const now = new Date();
    
    // Calculate days remaining until automatic release (if in escrow)
    let daysUntilRelease = 0;
    if (isInEscrow && payment.escrowReleaseDate) {
      const releaseDate = new Date(payment.escrowReleaseDate);
      daysUntilRelease = Math.max(0, Math.ceil(
        (releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      ));
    }

    // Check if payment is within dispute window
    let isWithinDisputeWindow = false;
    if (payment.escrowHoldDate) {
      const disputeWindowEnd = addDaysToDate(
        payment.escrowHoldDate,
        this.config.escrow.disputeWindow
      );
      isWithinDisputeWindow = isDateBefore(now, disputeWindowEnd);
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      isInEscrow,
      escrowHoldDate: payment.escrowHoldDate,
      escrowReleaseDate: payment.escrowReleaseDate,
      daysUntilRelease: isInEscrow ? daysUntilRelease : 0,
      isWithinDisputeWindow,
      canRelease: isInEscrow && (daysUntilRelease <= 0 || !isWithinDisputeWindow),
      disputeWindowDays: this.config.escrow.disputeWindow,
      automaticReleaseEnabled: this.config.escrow.automaticRelease
    };
  }

  /**
   * Background job that automatically releases payments from escrow after the hold period
   * 
   * @returns Number of payments released
   */
  async processAutomaticReleases(): Promise<number> {
    // Only proceed if automatic release is enabled
    if (!this.config.escrow.automaticRelease) {
      this.logger.info('Automatic escrow release is disabled. Skipping job.');
      return 0;
    }

    try {
      // Find all payments in escrow that are past their release date
      const now = new Date();
      const eligiblePayments = await this.paymentModel.findPaymentsByStatus(
        PaymentStatus.HELD_IN_ESCROW,
        { escrowReleaseDateBefore: now }
      );

      this.logger.info({
        msg: `Found ${eligiblePayments.length} payments eligible for automatic release from escrow`
      });

      // Process each eligible payment
      let releasedCount = 0;
      const releasePromises = eligiblePayments.map(async (payment) => {
        try {
          await this.releaseFromEscrow(payment.id);
          releasedCount++;
          this.logger.info({
            msg: 'Automatically released payment from escrow',
            paymentId: payment.id,
            amount: payment.amount,
            currency: payment.currency
          });
        } catch (error) {
          // Log error but continue with other payments
          this.logger.error({
            msg: 'Failed to automatically release payment from escrow',
            paymentId: payment.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      await Promise.all(releasePromises);
      
      this.logger.info({
        msg: `Successfully released ${releasedCount} payments from escrow automatically`
      });
      
      return releasedCount;
    } catch (error) {
      this.logger.error({
        msg: 'Error processing automatic escrow releases',
        error: error instanceof Error ? error.message : String(error)
      });
      throw new PaymentError(
        `Error processing automatic escrow releases: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancels a payment in escrow, returning funds to the payer
   * 
   * @param paymentId - ID of the payment to cancel
   * @param reason - Reason for cancellation
   * @returns Updated payment after escrow cancellation
   * @throws PaymentError if the operation fails
   */
  async cancelEscrow(paymentId: string, reason: string): Promise<Payment> {
    // Find the payment
    const payment = await this.paymentModel.findById(paymentId);
    
    if (!payment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
    }

    if (payment.status !== PaymentStatus.HELD_IN_ESCROW) {
      throw new PaymentError(
        `Cannot cancel payment with status ${payment.status}. Payment must be in HELD_IN_ESCROW status.`,
        paymentId
      );
    }

    try {
      // Cancel the payment intent in Stripe
      if (payment.stripePaymentIntentId) {
        await this.stripeService.cancelPaymentIntent(
          payment.stripePaymentIntentId, 
          reason || 'Escrow cancelled by platform'
        );
      }

      // Update payment status to CANCELLED
      const updatedPayment = await this.paymentModel.update(paymentId, {
        status: PaymentStatus.CANCELLED,
        metadata: {
          ...payment.metadata,
          cancellationReason: reason,
          cancelledAt: new Date().toISOString()
        }
      });

      this.logger.info({
        msg: 'Payment escrow cancelled',
        paymentId,
        reason
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to cancel payment escrow',
        paymentId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new PaymentError(
        `Failed to cancel payment escrow: ${error instanceof Error ? error.message : String(error)}`,
        paymentId
      );
    }
  }

  /**
   * Extends the escrow hold period for a payment
   * 
   * @param paymentId - ID of the payment to extend escrow for
   * @param additionalDays - Number of additional days to hold in escrow
   * @param reason - Reason for extension
   * @returns Updated payment with extended escrow period
   * @throws PaymentError if the operation fails
   */
  async extendEscrowPeriod(
    paymentId: string,
    additionalDays: number,
    reason: string
  ): Promise<Payment> {
    if (additionalDays <= 0) {
      throw new PaymentError('Additional days must be a positive number');
    }

    // Find the payment
    const payment = await this.paymentModel.findById(paymentId);
    
    if (!payment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', paymentId);
    }

    if (payment.status !== PaymentStatus.HELD_IN_ESCROW) {
      throw new PaymentError(
        `Cannot extend escrow for payment with status ${payment.status}. Payment must be in HELD_IN_ESCROW status.`,
        paymentId
      );
    }

    if (!payment.escrowReleaseDate) {
      throw new PaymentError('Payment has no escrow release date', paymentId);
    }

    try {
      // Calculate new release date
      const currentReleaseDate = new Date(payment.escrowReleaseDate);
      const newReleaseDate = addDaysToDate(currentReleaseDate, additionalDays);

      // Update payment with new release date
      const updatedPayment = await this.paymentModel.update(paymentId, {
        escrowReleaseDate: newReleaseDate,
        metadata: {
          ...payment.metadata,
          escrowExtensions: [...(payment.metadata?.escrowExtensions || []), {
            extendedAt: new Date().toISOString(),
            additionalDays,
            reason,
            previousReleaseDate: currentReleaseDate.toISOString(),
            newReleaseDate: newReleaseDate.toISOString()
          }]
        }
      });

      this.logger.info({
        msg: 'Extended payment escrow period',
        paymentId,
        additionalDays,
        reason,
        oldReleaseDate: currentReleaseDate,
        newReleaseDate
      });

      return updatedPayment;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to extend payment escrow period',
        paymentId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new PaymentError(
        `Failed to extend payment escrow period: ${error instanceof Error ? error.message : String(error)}`,
        paymentId
      );
    }
  }

  /**
   * Checks if a payment is eligible for escrow based on criteria
   * 
   * @param payment - Payment to check
   * @returns Whether the payment is eligible for escrow
   */
  isEligibleForEscrow(payment: Payment): boolean {
    // Check if escrow is enabled
    if (!this.config.escrow.enabled) {
      return false;
    }

    // Check if payment has required fields
    if (
      !payment.amount || 
      payment.amount <= 0 || 
      !payment.payerId || 
      !payment.payeeId
    ) {
      return false;
    }

    // Check if payment amount meets minimum threshold (if configured)
    const minimumAmount = config.escrow.minimumAmount;
    if (minimumAmount && payment.amount < minimumAmount) {
      return false;
    }

    return true;
  }

  /**
   * Retrieves statistics about payments in escrow for a user
   * 
   * @param userId - User ID to get statistics for
   * @returns Escrow statistics for the user
   */
  async getEscrowStatistics(userId: string): Promise<object> {
    try {
      // Get payments where user is payer (money sent)
      const paymentsAsPayer = await this.paymentModel.findByUserId(
        userId, 
        'payer', 
        { status: PaymentStatus.HELD_IN_ESCROW }
      );

      // Get payments where user is payee (money to be received)
      const paymentsAsPayee = await this.paymentModel.findByUserId(
        userId, 
        'payee', 
        { status: PaymentStatus.HELD_IN_ESCROW }
      );

      // Calculate total amount held in escrow as payer
      const totalHeldAsPayer = paymentsAsPayer.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      // Calculate total amount held in escrow as payee
      const totalHeldAsPayee = paymentsAsPayee.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      // Count payments by status
      const getPaymentCountsByStatus = (payments: Payment[]) => {
        const counts: Record<string, number> = {};
        payments.forEach(payment => {
          counts[payment.status] = (counts[payment.status] || 0) + 1;
        });
        return counts;
      };

      const payerStatusCounts = getPaymentCountsByStatus(paymentsAsPayer.payments);
      const payeeStatusCounts = getPaymentCountsByStatus(paymentsAsPayee.payments);

      return {
        userId,
        escrowStatistics: {
          // Amounts by role
          totalHeldAsPayer,
          totalHeldAsPayee,
          // Payment counts
          paymentsHeldAsPayer: paymentsAsPayer.total,
          paymentsHeldAsPayee: paymentsAsPayee.total,
          // Additional details
          payerPaymentsByStatus: payerStatusCounts,
          payeePaymentsByStatus: payeeStatusCounts,
          // Collect payments pending release in next 7 days
          soonToBeReleased: paymentsAsPayee.payments.filter(payment => {
            if (!payment.escrowReleaseDate) return false;
            const daysUntilRelease = Math.ceil(
              (new Date(payment.escrowReleaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysUntilRelease <= 7 && daysUntilRelease >= 0;
          }).length
        }
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to retrieve escrow statistics',
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new PaymentError(
        `Failed to retrieve escrow statistics: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}