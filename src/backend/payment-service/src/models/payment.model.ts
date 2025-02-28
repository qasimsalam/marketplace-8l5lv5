import { 
  Payment, 
  PaymentStatus, 
  PaymentMethod,
  PaymentDTO 
} from '../../../shared/src/types/payment.types';
import { config } from '../config';
import { 
  validateUuid, 
  paymentSchemas 
} from '../../../shared/src/utils/validation';
import { 
  ValidationError, 
  ResourceNotFoundError, 
  PaymentError 
} from '../../../shared/src/utils/errors';
import { 
  formatDateForDatabase, 
  addDaysToDate 
} from '../../../shared/src/utils/dates';
import * as pg from 'pg'; // v8.11.3
import Stripe from 'stripe'; // v12.0.0
import { v4 as uuid } from 'uuid'; // v9.0.1
import * as z from 'zod'; // v3.22.2

// Table name for PostgreSQL
const TABLE_NAME = 'payments';

// Default currency for payments
const DEFAULT_CURRENCY = 'USD';

/**
 * Validates payment data before creating a payment record
 * 
 * @param paymentData - Payment data to validate
 * @returns True if the payment data is valid
 * @throws ValidationError if validation fails
 */
export function validatePaymentData(paymentData: Partial<Payment>): boolean {
  // Check if contractId is a valid UUID
  if (paymentData.contractId && !validateUuid(paymentData.contractId)) {
    throw new ValidationError('Invalid contract ID format');
  }

  // Check if milestoneId is a valid UUID or null
  if (paymentData.milestoneId && !validateUuid(paymentData.milestoneId)) {
    throw new ValidationError('Invalid milestone ID format');
  }

  // Validate payment amount is positive and has max 2 decimal places
  if (paymentData.amount !== undefined) {
    if (paymentData.amount <= 0) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    const decimalPlaces = paymentData.amount.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > 2) {
      throw new ValidationError('Payment amount cannot have more than 2 decimal places');
    }
  }

  // Validate payment method
  if (paymentData.method && !Object.values(PaymentMethod).includes(paymentData.method)) {
    throw new ValidationError(`Invalid payment method: ${paymentData.method}`);
  }

  // Validate currency code when provided
  if (paymentData.currency && paymentData.currency.length !== 3) {
    throw new ValidationError('Currency code must be 3 characters');
  }

  return true;
}

/**
 * Calculates the platform fee for a payment amount
 * 
 * @param amount - Payment amount
 * @returns The calculated fee amount
 */
export function calculateFee(amount: number): number {
  const feePercentage = config.fees.platformFeePercent;
  // Calculate fee based on percentage and round to 2 decimal places for currency precision
  return Number((amount * feePercentage / 100).toFixed(2));
}

/**
 * Calculates the automatic escrow release date based on configuration
 * 
 * @param holdDate - The date when the payment was placed in escrow
 * @returns The calculated release date
 */
export function calculateEscrowReleaseDate(holdDate: Date): Date {
  const holdPeriod = config.escrow.defaultHoldPeriodDays;
  return addDaysToDate(holdDate, holdPeriod);
}

/**
 * Model class for payment data management and integration with Stripe
 */
export class PaymentModel {
  private db: pg.Pool;
  private stripe: Stripe;

  /**
   * Creates a new PaymentModel instance with database connection and Stripe client
   * 
   * @param db - PostgreSQL database connection pool
   */
  constructor(db: pg.Pool) {
    this.db = db;
    this.stripe = new Stripe(config.stripe.apiKey, {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 3,
      timeout: config.stripe.timeout
    });
  }

  /**
   * Creates a new payment record in the database and processes it with Stripe
   * 
   * @param paymentData - Payment data to create
   * @returns The created payment record
   * @throws ValidationError if payment data is invalid
   */
  async create(paymentData: Partial<Payment>): Promise<Payment> {
    // Validate payment data
    validatePaymentData(paymentData);

    // Generate a new UUID for the payment
    const id = uuid();
    
    // Calculate fee based on amount
    const fee = calculateFee(paymentData.amount!);
    
    // Set initial status to PENDING
    const status = PaymentStatus.PENDING;
    
    // Set default values for missing fields
    const currency = paymentData.currency || DEFAULT_CURRENCY;
    const createdAt = new Date();
    
    // Format dates for database
    const formattedCreatedAt = formatDateForDatabase(createdAt);
    
    // Determine escrow dates if enabled
    let escrowHoldDate = null;
    let escrowReleaseDate = null;
    let stripePaymentIntentId = null;
    
    // Prepare payment data for insertion
    const payment: Payment = {
      id,
      contractId: paymentData.contractId!,
      milestoneId: paymentData.milestoneId!,
      payerId: paymentData.payerId!,
      payeeId: paymentData.payeeId!,
      amount: paymentData.amount!,
      currency,
      fee,
      status,
      method: paymentData.method!,
      description: paymentData.description || '',
      stripePaymentIntentId,
      stripeTransferId: '',
      metadata: paymentData.metadata || {},
      escrowHoldDate,
      escrowReleaseDate,
      createdAt,
      updatedAt: createdAt,
      completedAt: null as unknown as Date
    };
    
    // Create payment record in database
    const query = `
      INSERT INTO ${TABLE_NAME} (
        id, contract_id, milestone_id, payer_id, payee_id, 
        amount, currency, fee, status, method, description,
        stripe_payment_intent_id, stripe_transfer_id, metadata,
        escrow_hold_date, escrow_release_date, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;
    
    const values = [
      id, payment.contractId, payment.milestoneId, payment.payerId, payment.payeeId,
      payment.amount, payment.currency, payment.fee, payment.status, payment.method, 
      payment.description, payment.stripePaymentIntentId, payment.stripeTransferId, 
      JSON.stringify(payment.metadata), escrowHoldDate, escrowReleaseDate, 
      formattedCreatedAt, formattedCreatedAt
    ];
    
    try {
      const result = await this.db.query(query, values);
      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      throw new PaymentError(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Retrieves a payment record by its ID
   * 
   * @param id - Payment ID
   * @returns The payment record or null if not found
   * @throws ValidationError if ID is invalid
   */
  async findById(id: string): Promise<Payment | null> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid payment ID format');
    }
    
    const query = `SELECT * FROM ${TABLE_NAME} WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPayment(result.rows[0]);
  }

  /**
   * Retrieves all payment records associated with a specific contract
   * 
   * @param contractId - Contract ID
   * @returns Array of payment records
   * @throws ValidationError if contract ID is invalid
   */
  async findByContractId(contractId: string): Promise<Payment[]> {
    if (!validateUuid(contractId)) {
      throw new ValidationError('Invalid contract ID format');
    }
    
    const query = `SELECT * FROM ${TABLE_NAME} WHERE contract_id = $1 ORDER BY created_at DESC`;
    const result = await this.db.query(query, [contractId]);
    
    return result.rows.map(row => this.mapRowToPayment(row));
  }

  /**
   * Retrieves payment record associated with a specific milestone
   * 
   * @param milestoneId - Milestone ID
   * @returns The payment record or null if not found
   * @throws ValidationError if milestone ID is invalid
   */
  async findByMilestoneId(milestoneId: string): Promise<Payment | null> {
    if (!validateUuid(milestoneId)) {
      throw new ValidationError('Invalid milestone ID format');
    }
    
    const query = `SELECT * FROM ${TABLE_NAME} WHERE milestone_id = $1`;
    const result = await this.db.query(query, [milestoneId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToPayment(result.rows[0]);
  }

  /**
   * Updates a payment record with new data
   * 
   * @param id - Payment ID
   * @param paymentData - New payment data
   * @returns The updated payment record
   * @throws ResourceNotFoundError if payment is not found
   * @throws ValidationError if payment data is invalid
   */
  async update(id: string, paymentData: Partial<Payment>): Promise<Payment> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid payment ID format');
    }
    
    // Verify payment exists
    const existingPayment = await this.findById(id);
    if (!existingPayment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', id);
    }
    
    // Validate the update data
    if (Object.keys(paymentData).length > 0) {
      validatePaymentData(paymentData);
    }
    
    // Filter out immutable fields
    const updateData: Partial<Payment> = { ...paymentData };
    delete updateData.id;
    delete updateData.createdAt;
    
    // If there are no fields to update, return the existing payment
    if (Object.keys(updateData).length === 0) {
      return existingPayment;
    }
    
    // Update related Stripe payment intent if necessary
    if (updateData.amount && existingPayment.stripePaymentIntentId) {
      try {
        await this.stripe.paymentIntents.update(existingPayment.stripePaymentIntentId, {
          amount: Math.round(updateData.amount * 100)
        });
      } catch (error) {
        throw new PaymentError(
          `Failed to update Stripe payment intent: ${error.message}`, 
          id
        );
      }
    }
    
    // Set update date
    updateData.updatedAt = new Date();
    
    // Build SET clause for SQL query
    const setClause: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    // Map JavaScript camelCase to database snake_case and build query
    Object.entries(updateData).forEach(([key, value]) => {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
      
      // Format dates for database
      if (value instanceof Date) {
        value = formatDateForDatabase(value);
      }
      
      // Format objects to JSON
      if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        value = JSON.stringify(value);
      }
      
      setClause.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });
    
    // Add ID as the last parameter
    values.push(id);
    
    const query = `
      UPDATE ${TABLE_NAME} 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;
    
    try {
      const result = await this.db.query(query, values);
      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      throw new PaymentError(`Failed to update payment: ${error.message}`, id);
    }
  }

  /**
   * Updates the status of a payment
   * 
   * @param id - Payment ID
   * @param status - New payment status
   * @returns The updated payment record
   * @throws ResourceNotFoundError if payment is not found
   * @throws ValidationError if ID is invalid
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid payment ID format');
    }
    
    // Verify payment exists
    const existingPayment = await this.findById(id);
    if (!existingPayment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', id);
    }
    
    const updateData: Partial<Payment> = {
      status,
      updatedAt: new Date()
    };
    
    // Add completedAt date for COMPLETED or RELEASED_FROM_ESCROW statuses
    if (
      status === PaymentStatus.COMPLETED || 
      status === PaymentStatus.RELEASED_FROM_ESCROW
    ) {
      updateData.completedAt = new Date();
    }
    
    const query = `
      UPDATE ${TABLE_NAME} 
      SET status = $1, updated_at = $2, completed_at = $3
      WHERE id = $4 
      RETURNING *
    `;
    
    const values = [
      status, 
      formatDateForDatabase(updateData.updatedAt), 
      updateData.completedAt ? formatDateForDatabase(updateData.completedAt) : null,
      id
    ];
    
    try {
      const result = await this.db.query(query, values);
      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      throw new PaymentError(`Failed to update payment status: ${error.message}`, id);
    }
  }

  /**
   * Processes a pending payment through Stripe
   * 
   * @param id - Payment ID
   * @returns The processed payment record
   * @throws ResourceNotFoundError if payment is not found
   * @throws PaymentError if payment processing fails
   */
  async processPayment(id: string): Promise<Payment> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid payment ID format');
    }
    
    // Verify payment exists and is in PENDING status
    const payment = await this.findById(id);
    if (!payment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', id);
    }
    
    if (payment.status !== PaymentStatus.PENDING) {
      throw new PaymentError(
        `Cannot process payment with status ${payment.status}`,
        id
      );
    }
    
    // Update to PROCESSING status
    await this.updateStatus(id, PaymentStatus.PROCESSING);
    
    try {
      // Create and confirm payment intent with Stripe
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(payment.amount * 100), // Stripe uses cents
        currency: payment.currency.toLowerCase(),
        description: payment.description || `Payment for contract ${payment.contractId}`,
        metadata: {
          paymentId: payment.id,
          contractId: payment.contractId,
          milestoneId: payment.milestoneId || '',
          platform: 'AI Talent Marketplace'
        }
      });
      
      // Confirm the payment intent (in a real application, this might be a separate step)
      await this.stripe.paymentIntents.confirm(paymentIntent.id);
      
      // Prepare status update
      let newStatus: PaymentStatus;
      let escrowHoldDate: Date | null = null;
      let escrowReleaseDate: Date | null = null;
      let completedAt: Date | null = null;
      
      // If using escrow, set appropriate dates and status
      if (config.escrow.autoReleaseEnabled) {
        newStatus = PaymentStatus.HELD_IN_ESCROW;
        escrowHoldDate = new Date();
        escrowReleaseDate = calculateEscrowReleaseDate(escrowHoldDate);
      } else {
        newStatus = PaymentStatus.COMPLETED;
        completedAt = new Date();
      }
      
      // Update payment record with new status and Stripe intent ID
      const query = `
        UPDATE ${TABLE_NAME} 
        SET status = $1, 
            stripe_payment_intent_id = $2,
            escrow_hold_date = $3,
            escrow_release_date = $4,
            completed_at = $5,
            updated_at = $6
        WHERE id = $7 
        RETURNING *
      `;
      
      const updatedAt = new Date();
      const values = [
        newStatus,
        paymentIntent.id,
        escrowHoldDate ? formatDateForDatabase(escrowHoldDate) : null,
        escrowReleaseDate ? formatDateForDatabase(escrowReleaseDate) : null,
        completedAt ? formatDateForDatabase(completedAt) : null,
        formatDateForDatabase(updatedAt),
        id
      ];
      
      const result = await this.db.query(query, values);
      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      // If payment processing failed, update the status to FAILED
      await this.updateStatus(id, PaymentStatus.FAILED);
      throw new PaymentError(`Payment processing failed: ${error.message}`, id);
    }
  }

  /**
   * Releases a payment from escrow to the payee
   * 
   * @param id - Payment ID
   * @returns The updated payment record
   * @throws ResourceNotFoundError if payment is not found
   * @throws PaymentError if release fails
   */
  async releaseFromEscrow(id: string): Promise<Payment> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid payment ID format');
    }
    
    // Verify payment exists and is in HELD_IN_ESCROW status
    const payment = await this.findById(id);
    if (!payment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', id);
    }
    
    if (payment.status !== PaymentStatus.HELD_IN_ESCROW) {
      throw new PaymentError(
        `Cannot release payment with status ${payment.status}`,
        id
      );
    }
    
    try {
      // In a real application, this would create a transfer to the payee's connected account
      // For simplicity, we're just simulating a transfer here
      const transferId = `tr_${Date.now()}`;
      
      // Update payment status to RELEASED_FROM_ESCROW
      const completedAt = new Date();
      const updatedAt = completedAt;
      
      const query = `
        UPDATE ${TABLE_NAME} 
        SET status = $1, 
            stripe_transfer_id = $2,
            completed_at = $3,
            updated_at = $4
        WHERE id = $5 
        RETURNING *
      `;
      
      const values = [
        PaymentStatus.RELEASED_FROM_ESCROW,
        transferId,
        formatDateForDatabase(completedAt),
        formatDateForDatabase(updatedAt),
        id
      ];
      
      const result = await this.db.query(query, values);
      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      throw new PaymentError(`Failed to release payment from escrow: ${error.message}`, id);
    }
  }

  /**
   * Background job to automatically release payments from escrow after the hold period
   */
  async handleEscrowReleases(): Promise<void> {
    try {
      // Find all payments in HELD_IN_ESCROW status with passed escrow release date
      const query = `
        SELECT * FROM ${TABLE_NAME} 
        WHERE status = $1 
        AND escrow_release_date <= $2
      `;
      
      const now = formatDateForDatabase(new Date());
      const result = await this.db.query(query, [PaymentStatus.HELD_IN_ESCROW, now]);
      
      // Process each eligible payment
      const releasePromises = result.rows.map(async (row) => {
        const payment = this.mapRowToPayment(row);
        try {
          await this.releaseFromEscrow(payment.id);
          console.log(`Auto-released payment ${payment.id} from escrow`);
        } catch (error) {
          console.error(`Failed to auto-release payment ${payment.id}: ${error.message}`);
        }
      });
      
      await Promise.all(releasePromises);
    } catch (error) {
      console.error(`Error in handleEscrowReleases: ${error.message}`);
    }
  }

  /**
   * Issues a refund for a payment through Stripe
   * 
   * @param id - Payment ID
   * @param reason - Reason for the refund
   * @returns The updated payment record
   * @throws ResourceNotFoundError if payment is not found
   * @throws PaymentError if refund fails
   */
  async refundPayment(id: string, reason: string): Promise<Payment> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid payment ID format');
    }
    
    // Verify payment exists and is in appropriate status for refund
    const payment = await this.findById(id);
    if (!payment) {
      throw new ResourceNotFoundError('Payment not found', 'payment', id);
    }
    
    // Check if payment can be refunded
    const refundableStatuses = [
      PaymentStatus.COMPLETED, 
      PaymentStatus.HELD_IN_ESCROW,
      PaymentStatus.RELEASED_FROM_ESCROW
    ];
    
    if (!refundableStatuses.includes(payment.status)) {
      throw new PaymentError(
        `Cannot refund payment with status ${payment.status}`,
        id
      );
    }
    
    // Check if payment has a Stripe payment intent
    if (!payment.stripePaymentIntentId) {
      throw new PaymentError('Payment does not have a Stripe payment intent', id);
    }
    
    try {
      // Create refund in Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer'
      });
      
      // Update payment metadata with refund information
      const metadata = {
        ...payment.metadata,
        refundId: refund.id,
        refundReason: reason,
        refundedAt: new Date().toISOString()
      };
      
      // Update payment status to REFUNDED
      const query = `
        UPDATE ${TABLE_NAME} 
        SET status = $1, 
            metadata = $2,
            updated_at = $3
        WHERE id = $4 
        RETURNING *
      `;
      
      const updatedAt = new Date();
      const values = [
        PaymentStatus.REFUNDED,
        JSON.stringify(metadata),
        formatDateForDatabase(updatedAt),
        id
      ];
      
      const result = await this.db.query(query, values);
      return this.mapRowToPayment(result.rows[0]);
    } catch (error) {
      throw new PaymentError(`Failed to refund payment: ${error.message}`, id);
    }
  }

  /**
   * Finds payments where the user is either the payer or payee
   * 
   * @param userId - User ID
   * @param role - Role of the user (payer or payee)
   * @param options - Search options for pagination, filtering, and sorting
   * @returns Paginated payments and total count
   * @throws ValidationError if user ID is invalid
   */
  async findByUserId(
    userId: string, 
    role: 'payer' | 'payee' = 'payee',
    options: {
      page?: number;
      limit?: number;
      status?: PaymentStatus;
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ payments: Payment[]; total: number }> {
    if (!validateUuid(userId)) {
      throw new ValidationError('Invalid user ID format');
    }
    
    // Determine search field based on role
    const userField = role === 'payer' ? 'payer_id' : 'payee_id';
    
    // Extract pagination and filtering options
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause with filters
    const whereConditions: string[] = [`${userField} = $1`];
    const queryParams: any[] = [userId];
    let paramIndex = 2;
    
    // Add filters for status
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    // Add filters for date range
    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(formatDateForDatabase(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(formatDateForDatabase(endDate));
      paramIndex++;
    }
    
    // Add filters for amount range
    if (minAmount !== undefined) {
      whereConditions.push(`amount >= $${paramIndex}`);
      queryParams.push(minAmount);
      paramIndex++;
    }
    
    if (maxAmount !== undefined) {
      whereConditions.push(`amount <= $${paramIndex}`);
      queryParams.push(maxAmount);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Validate and sanitize sort column to prevent SQL injection
    const validSortColumns = [
      'created_at', 'updated_at', 'amount', 'status', 'method', 'currency'
    ];
    const sanitizedSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    
    // Validate sort order
    const sanitizedSortOrder = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    
    // Count total results
    const countQuery = `
      SELECT COUNT(*) AS total 
      FROM ${TABLE_NAME} 
      ${whereClause}
    `;
    
    // Query for paginated results
    const pagedQuery = `
      SELECT * 
      FROM ${TABLE_NAME} 
      ${whereClause} 
      ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    try {
      // Execute count query
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total, 10);
      
      // Execute paged query with pagination parameters
      const pagedParams = [...queryParams, limit, offset];
      const pagedResult = await this.db.query(pagedQuery, pagedParams);
      
      const payments = pagedResult.rows.map(row => this.mapRowToPayment(row));
      
      return { payments, total };
    } catch (error) {
      throw new PaymentError(`Failed to retrieve user payments: ${error.message}`);
    }
  }

  /**
   * Gets payment statistics for a user
   * 
   * @param userId - User ID
   * @returns Payment statistics for the user
   * @throws ValidationError if user ID is invalid
   */
  async getPaymentStatistics(userId: string): Promise<object> {
    if (!validateUuid(userId)) {
      throw new ValidationError('Invalid user ID format');
    }
    
    try {
      // Calculate total payments made (as payer)
      const paymentsMadeQuery = `
        SELECT 
          COUNT(*) as count, 
          SUM(amount) as total_amount
        FROM ${TABLE_NAME} 
        WHERE payer_id = $1 
        AND status IN ($2, $3, $4)
      `;
      
      const paymentsMadeResult = await this.db.query(paymentsMadeQuery, [
        userId, 
        PaymentStatus.COMPLETED, 
        PaymentStatus.HELD_IN_ESCROW, 
        PaymentStatus.RELEASED_FROM_ESCROW
      ]);
      
      // Calculate total payments received (as payee)
      const paymentsReceivedQuery = `
        SELECT 
          COUNT(*) as count, 
          SUM(amount) as total_amount
        FROM ${TABLE_NAME} 
        WHERE payee_id = $1 
        AND status IN ($2, $3)
      `;
      
      const paymentsReceivedResult = await this.db.query(paymentsReceivedQuery, [
        userId, 
        PaymentStatus.COMPLETED, 
        PaymentStatus.RELEASED_FROM_ESCROW
      ]);
      
      // Calculate amounts in escrow
      const escrowQuery = `
        SELECT 
          COUNT(*) as count, 
          SUM(amount) as total_amount
        FROM ${TABLE_NAME} 
        WHERE payee_id = $1 
        AND status = $2
      `;
      
      const escrowResult = await this.db.query(escrowQuery, [
        userId, 
        PaymentStatus.HELD_IN_ESCROW
      ]);
      
      // Calculate pending payments
      const pendingQuery = `
        SELECT 
          COUNT(*) as count, 
          SUM(amount) as total_amount
        FROM ${TABLE_NAME} 
        WHERE payee_id = $1 
        AND status IN ($2, $3)
      `;
      
      const pendingResult = await this.db.query(pendingQuery, [
        userId, 
        PaymentStatus.PENDING, 
        PaymentStatus.PROCESSING
      ]);
      
      // Calculate total fees paid
      const feesQuery = `
        SELECT 
          SUM(fee) as total_fees
        FROM ${TABLE_NAME} 
        WHERE payer_id = $1 
        AND status IN ($2, $3, $4)
      `;
      
      const feesResult = await this.db.query(feesQuery, [
        userId, 
        PaymentStatus.COMPLETED, 
        PaymentStatus.HELD_IN_ESCROW, 
        PaymentStatus.RELEASED_FROM_ESCROW
      ]);
      
      // Return compiled statistics
      return {
        totalEarnings: parseFloat(paymentsReceivedResult.rows[0].total_amount || 0),
        totalSpent: parseFloat(paymentsMadeResult.rows[0].total_amount || 0),
        pendingPayments: parseFloat(pendingResult.rows[0].total_amount || 0),
        amountInEscrow: parseFloat(escrowResult.rows[0].total_amount || 0),
        paymentsMade: parseInt(paymentsMadeResult.rows[0].count, 10),
        paymentsReceived: parseInt(paymentsReceivedResult.rows[0].count, 10),
        totalFeesPaid: parseFloat(feesResult.rows[0].total_fees || 0)
      };
    } catch (error) {
      throw new PaymentError(`Failed to retrieve payment statistics: ${error.message}`);
    }
  }

  /**
   * Handles webhook events from Stripe
   * 
   * @param event - Stripe webhook event
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    // Validate webhook signature
    try {
      const endpointSecret = config.stripe.webhookSecret;
      // Note: In a real implementation, the signature would be verified
      // using stripe.webhookEndpoints.constructEvent
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const paymentId = paymentIntent.metadata?.paymentId;
          
          if (paymentId) {
            // Update payment status based on escrow settings
            const newStatus = config.escrow.autoReleaseEnabled
              ? PaymentStatus.HELD_IN_ESCROW
              : PaymentStatus.COMPLETED;
              
            await this.updateStatus(paymentId, newStatus);
            
            // If using escrow, update escrow dates
            if (config.escrow.autoReleaseEnabled) {
              const escrowHoldDate = new Date();
              const escrowReleaseDate = calculateEscrowReleaseDate(escrowHoldDate);
              
              await this.update(paymentId, {
                escrowHoldDate,
                escrowReleaseDate
              });
            }
          }
          break;
          
        case 'payment_intent.payment_failed':
          // Handle failed payment
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          const failedPaymentId = failedIntent.metadata?.paymentId;
          
          if (failedPaymentId) {
            await this.updateStatus(failedPaymentId, PaymentStatus.FAILED);
          }
          break;
          
        case 'charge.refunded':
          // Handle refunded payment
          const charge = event.data.object as Stripe.Charge;
          const refundedPaymentIntentId = charge.payment_intent as string;
          
          // Find payment by Stripe payment intent ID
          const query = `
            SELECT * FROM ${TABLE_NAME} 
            WHERE stripe_payment_intent_id = $1
          `;
          
          const result = await this.db.query(query, [refundedPaymentIntentId]);
          
          if (result.rows.length > 0) {
            const payment = this.mapRowToPayment(result.rows[0]);
            
            // Update payment to REFUNDED status
            await this.updateStatus(payment.id, PaymentStatus.REFUNDED);
            
            // Update metadata with refund information
            const metadata = {
              ...payment.metadata,
              refundId: charge.refunds?.data?.[0]?.id,
              refundedAt: new Date().toISOString()
            };
            
            await this.update(payment.id, { metadata });
          }
          break;
          
        default:
          // Ignore other event types
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      console.log(`Handled Stripe webhook event: ${event.type}`);
    } catch (error) {
      console.error(`Error handling Stripe webhook: ${error.message}`);
      throw new PaymentError(`Webhook error: ${error.message}`);
    }
  }

  /**
   * Maps a database row to a Payment object
   * 
   * @param row - Database row
   * @returns Payment object
   * @private
   */
  private mapRowToPayment(row: any): Payment {
    return {
      id: row.id,
      contractId: row.contract_id,
      milestoneId: row.milestone_id,
      payerId: row.payer_id,
      payeeId: row.payee_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      fee: parseFloat(row.fee),
      status: row.status as PaymentStatus,
      method: row.method as PaymentMethod,
      description: row.description,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripeTransferId: row.stripe_transfer_id,
      metadata: row.metadata || {},
      escrowHoldDate: row.escrow_hold_date ? new Date(row.escrow_hold_date) : null as unknown as Date,
      escrowReleaseDate: row.escrow_release_date ? new Date(row.escrow_release_date) : null as unknown as Date,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null as unknown as Date
    };
  }
}