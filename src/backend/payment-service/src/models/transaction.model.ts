/**
 * Transaction Model
 * 
 * Defines the data model and operations for financial transactions in the AI Talent Marketplace.
 * This model handles creation, retrieval, and management of all transaction records including
 * payments, fees, withdrawals, deposits, and escrow operations.
 * 
 * @version 1.0.0
 */

import { Pool, QueryResult } from 'pg'; // v8.11.3
import { v4 as uuidv4 } from 'uuid'; // v9.0.1

import {
  Transaction,
  TransactionType,
  TransactionSearchParams,
  Payment
} from '../../../shared/src/types/payment.types';

import { config } from '../config';
import { validateUuid } from '../../../shared/src/utils/validation';
import { ValidationError, ResourceNotFoundError } from '../../../shared/src/utils/errors';
import { formatForTimestamp } from '../../../shared/src/utils/dates';

// Database table name constant
const TABLE_NAME = 'transactions';

// Default currency for transactions
const DEFAULT_CURRENCY = 'USD';

/**
 * Validates transaction data before creating a transaction record
 * 
 * @param transactionData - Partial transaction data to validate
 * @returns True if the transaction data is valid
 * @throws ValidationError if validation fails
 */
export function validateTransactionData(transactionData: Partial<Transaction>): boolean {
  // Validate paymentId if provided
  if (transactionData.paymentId && !validateUuid(transactionData.paymentId)) {
    throw new ValidationError('Invalid payment ID format');
  }

  // Validate userId
  if (transactionData.userId && !validateUuid(transactionData.userId)) {
    throw new ValidationError('Invalid user ID format');
  }

  // Validate transaction type
  if (transactionData.type && !Object.values(TransactionType).includes(transactionData.type)) {
    throw new ValidationError(`Invalid transaction type: ${transactionData.type}`);
  }

  // Validate amount (must be a number and have at most 2 decimal places)
  if (transactionData.amount !== undefined) {
    if (typeof transactionData.amount !== 'number') {
      throw new ValidationError('Transaction amount must be a number');
    }

    const amountStr = transactionData.amount.toString();
    const decimalParts = amountStr.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      throw new ValidationError('Transaction amount cannot have more than 2 decimal places');
    }
  }

  // Validate currency if provided (must be a 3-letter code)
  if (transactionData.currency && (typeof transactionData.currency !== 'string' || transactionData.currency.length !== 3)) {
    throw new ValidationError('Currency must be a valid 3-letter code');
  }

  return true;
}

/**
 * Calculates a user's current balance based on transaction history
 * 
 * @param userId - The user ID to calculate balance for
 * @returns The calculated user balance
 * @throws ValidationError if user ID is invalid
 */
export async function calculateUserBalance(userId: string): Promise<number> {
  if (!validateUuid(userId)) {
    throw new ValidationError('Invalid user ID format');
  }

  try {
    const db = config.db.pool;
    
    // Query the database for the latest transaction for this user
    const query = {
      text: `
        SELECT balance 
        FROM ${TABLE_NAME} 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `,
      values: [userId]
    };

    const result: QueryResult = await db.query(query);

    // If a transaction exists, return its balance value, otherwise return 0
    return result.rowCount > 0 ? parseFloat(result.rows[0].balance) : 0;
  } catch (error) {
    console.error('Error calculating user balance:', error);
    throw error;
  }
}

/**
 * Transaction Model class for handling transaction data operations
 */
export class TransactionModel {
  private db: Pool;

  /**
   * Creates a new TransactionModel instance
   * 
   * @param db - PostgreSQL database connection pool
   */
  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Creates a new transaction record in the database
   * 
   * @param transactionData - Transaction data to create
   * @returns The created transaction record
   * @throws ValidationError if data validation fails
   */
  async create(transactionData: Partial<Transaction>): Promise<Transaction> {
    // Validate the transaction data
    validateTransactionData(transactionData);

    // Generate a new UUID for the transaction
    const id = uuidv4();

    // Calculate user balance if not provided
    let balance = transactionData.balance;
    if (balance === undefined && transactionData.userId) {
      const currentBalance = await calculateUserBalance(transactionData.userId);
      // Add or subtract amount based on transaction type
      const amount = transactionData.amount || 0;
      
      // Determine if transaction amount should be added or subtracted from balance
      const isCredit = [
        TransactionType.DEPOSIT,
        TransactionType.ESCROW_RELEASE
      ].includes(transactionData.type as TransactionType);
      
      const isDebit = [
        TransactionType.FEE,
        TransactionType.WITHDRAWAL,
        TransactionType.ESCROW_HOLD,
        TransactionType.REFUND
      ].includes(transactionData.type as TransactionType);

      // For payments, it depends on whether the user is payer or payee
      const isPayment = transactionData.type === TransactionType.PAYMENT;
      
      if (isPayment) {
        // Check metadata to determine if user is payer or payee
        const isPayer = transactionData.metadata?.payeeId !== undefined;
        balance = isPayer ? (currentBalance - amount) : (currentBalance + amount);
      } else {
        balance = isCredit ? (currentBalance + amount) : isDebit ? (currentBalance - amount) : currentBalance;
      }
    }

    // Set current timestamp if not provided
    const now = new Date();
    const createdAt = transactionData.createdAt || now;
    const updatedAt = transactionData.updatedAt || now;

    // Set default currency if not provided
    const currency = transactionData.currency || DEFAULT_CURRENCY;

    // Format dates for database
    const formattedCreatedAt = formatForTimestamp(createdAt);
    const formattedUpdatedAt = formatForTimestamp(updatedAt);

    // Prepare the SQL query
    const query = {
      text: `
        INSERT INTO ${TABLE_NAME} (
          id, 
          payment_id, 
          user_id, 
          type, 
          amount, 
          currency, 
          description, 
          balance, 
          metadata, 
          created_at, 
          updated_at
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *
      `,
      values: [
        id,
        transactionData.paymentId,
        transactionData.userId,
        transactionData.type,
        transactionData.amount,
        currency,
        transactionData.description || '',
        balance,
        transactionData.metadata || {},
        formattedCreatedAt,
        formattedUpdatedAt
      ]
    };

    try {
      const result = await this.db.query(query);
      
      // Convert the result to a Transaction object
      const transaction: Transaction = {
        id: result.rows[0].id,
        paymentId: result.rows[0].payment_id,
        userId: result.rows[0].user_id,
        type: result.rows[0].type as TransactionType,
        amount: parseFloat(result.rows[0].amount),
        currency: result.rows[0].currency,
        description: result.rows[0].description,
        balance: parseFloat(result.rows[0].balance),
        metadata: result.rows[0].metadata,
        createdAt: new Date(result.rows[0].created_at),
        updatedAt: new Date(result.rows[0].updated_at)
      };

      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Retrieves a transaction record by its ID
   * 
   * @param id - Transaction ID
   * @returns The transaction record or null if not found
   * @throws ValidationError if ID is invalid
   */
  async findById(id: string): Promise<Transaction | null> {
    if (!validateUuid(id)) {
      throw new ValidationError('Invalid transaction ID format');
    }

    try {
      const query = {
        text: `SELECT * FROM ${TABLE_NAME} WHERE id = $1`,
        values: [id]
      };

      const result = await this.db.query(query);

      if (result.rowCount === 0) {
        return null;
      }

      // Convert the result to a Transaction object
      const transaction: Transaction = {
        id: result.rows[0].id,
        paymentId: result.rows[0].payment_id,
        userId: result.rows[0].user_id,
        type: result.rows[0].type as TransactionType,
        amount: parseFloat(result.rows[0].amount),
        currency: result.rows[0].currency,
        description: result.rows[0].description,
        balance: parseFloat(result.rows[0].balance),
        metadata: result.rows[0].metadata,
        createdAt: new Date(result.rows[0].created_at),
        updatedAt: new Date(result.rows[0].updated_at)
      };

      return transaction;
    } catch (error) {
      console.error('Error finding transaction by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all transaction records associated with a specific payment
   * 
   * @param paymentId - Payment ID
   * @returns Array of transaction records
   * @throws ValidationError if payment ID is invalid
   */
  async findByPaymentId(paymentId: string): Promise<Transaction[]> {
    if (!validateUuid(paymentId)) {
      throw new ValidationError('Invalid payment ID format');
    }

    try {
      const query = {
        text: `SELECT * FROM ${TABLE_NAME} WHERE payment_id = $1 ORDER BY created_at ASC`,
        values: [paymentId]
      };

      const result = await this.db.query(query);

      // Convert the results to Transaction objects
      const transactions: Transaction[] = result.rows.map(row => ({
        id: row.id,
        paymentId: row.payment_id,
        userId: row.user_id,
        type: row.type as TransactionType,
        amount: parseFloat(row.amount),
        currency: row.currency,
        description: row.description,
        balance: parseFloat(row.balance),
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      return transactions;
    } catch (error) {
      console.error('Error finding transactions by payment ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all transaction records for a specific user with optional filtering
   * 
   * @param userId - User ID
   * @param searchParams - Optional search parameters for filtering transactions
   * @returns Paginated transactions and total count
   * @throws ValidationError if user ID is invalid
   */
  async findByUserId(
    userId: string, 
    searchParams: Partial<TransactionSearchParams> = {}
  ): Promise<{ transactions: Transaction[], total: number }> {
    if (!validateUuid(userId)) {
      throw new ValidationError('Invalid user ID format');
    }

    try {
      // Extract pagination and filtering parameters
      const {
        type,
        paymentId,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = searchParams;

      // Build the WHERE clause
      const conditions = ['user_id = $1'];
      const values: any[] = [userId];
      let paramIndex = 2;

      if (type) {
        conditions.push(`type = $${paramIndex}`);
        values.push(type);
        paramIndex++;
      }

      if (paymentId) {
        if (!validateUuid(paymentId)) {
          throw new ValidationError('Invalid payment ID format');
        }
        conditions.push(`payment_id = $${paramIndex}`);
        values.push(paymentId);
        paramIndex++;
      }

      if (minAmount !== undefined) {
        conditions.push(`amount >= $${paramIndex}`);
        values.push(minAmount);
        paramIndex++;
      }

      if (maxAmount !== undefined) {
        conditions.push(`amount <= $${paramIndex}`);
        values.push(maxAmount);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(formatForTimestamp(startDate));
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(formatForTimestamp(endDate));
        paramIndex++;
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Add pagination parameters
      values.push(limit);
      values.push(offset);

      // Create the WHERE clause string
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Validate and sanitize sortBy to prevent SQL injection
      const allowedSortColumns = ['created_at', 'amount', 'type', 'id'];
      const sanitizedSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      
      // Validate sortOrder to prevent SQL injection
      const sanitizedSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Count query for total results
      const countQuery = {
        text: `SELECT COUNT(*) FROM ${TABLE_NAME} ${whereClause}`,
        values: values.slice(0, -2) // Remove pagination parameters
      };

      // Data query with pagination
      const dataQuery = {
        text: `
          SELECT * FROM ${TABLE_NAME} 
          ${whereClause} 
          ORDER BY ${sanitizedSortBy} ${sanitizedSortOrder} 
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        values
      };

      // Execute both queries in parallel
      const [countResult, dataResult] = await Promise.all([
        this.db.query(countQuery),
        this.db.query(dataQuery)
      ]);

      const total = parseInt(countResult.rows[0].count, 10);

      // Convert the results to Transaction objects
      const transactions: Transaction[] = dataResult.rows.map(row => ({
        id: row.id,
        paymentId: row.payment_id,
        userId: row.user_id,
        type: row.type as TransactionType,
        amount: parseFloat(row.amount),
        currency: row.currency,
        description: row.description,
        balance: parseFloat(row.balance),
        metadata: row.metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));

      return { transactions, total };
    } catch (error) {
      console.error('Error finding transactions by user ID:', error);
      throw error;
    }
  }

  /**
   * Gets the current balance for a user
   * 
   * @param userId - User ID
   * @returns Current user balance
   * @throws ValidationError if user ID is invalid
   */
  async getUserBalance(userId: string): Promise<number> {
    return calculateUserBalance(userId);
  }

  /**
   * Gets transaction statistics for a user
   * 
   * @param userId - User ID
   * @param options - Optional parameters for filtering statistics
   * @returns Transaction statistics for the user
   * @throws ValidationError if user ID is invalid
   */
  async getTransactionStatistics(
    userId: string, 
    options: { 
      startDate?: Date; 
      endDate?: Date; 
      currency?: string;
    } = {}
  ): Promise<object> {
    if (!validateUuid(userId)) {
      throw new ValidationError('Invalid user ID format');
    }

    try {
      const { startDate, endDate, currency = DEFAULT_CURRENCY } = options;
      
      // Base conditions for all queries
      const conditions = ['user_id = $1', 'currency = $2'];
      const baseValues = [userId, currency];
      let paramIndex = 3;
      
      // Add date filters if provided
      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        baseValues.push(formatForTimestamp(startDate));
        paramIndex++;
      }
      
      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        baseValues.push(formatForTimestamp(endDate));
        paramIndex++;
      }
      
      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      
      // Calculate total income (deposits and payments received)
      const incomeQuery = {
        text: `
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM ${TABLE_NAME} 
          ${whereClause} 
          AND type IN ($${paramIndex}, $${paramIndex + 1})
        `,
        values: [...baseValues, TransactionType.DEPOSIT, TransactionType.PAYMENT]
      };
      
      // Calculate total expenses (withdrawals, payments made, fees)
      const expensesQuery = {
        text: `
          SELECT COALESCE(SUM(amount), 0) as total 
          FROM ${TABLE_NAME} 
          ${whereClause} 
          AND type IN ($${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})
        `,
        values: [...baseValues, TransactionType.WITHDRAWAL, TransactionType.PAYMENT, TransactionType.FEE]
      };
      
      // Calculate counts by transaction type
      const typeCountQuery = {
        text: `
          SELECT type, COUNT(*) as count 
          FROM ${TABLE_NAME} 
          ${whereClause} 
          GROUP BY type
        `,
        values: baseValues
      };
      
      // Execute all queries in parallel
      const [incomeResult, expensesResult, typeCountResult] = await Promise.all([
        this.db.query(incomeQuery),
        this.db.query(expensesQuery),
        this.db.query(typeCountQuery)
      ]);
      
      // Calculate the current balance
      const currentBalance = await this.getUserBalance(userId);
      
      // Process type counts into a map
      const typeCounts: Record<string, number> = {};
      typeCountResult.rows.forEach(row => {
        typeCounts[row.type] = parseInt(row.count, 10);
      });
      
      // Return compiled statistics
      return {
        currentBalance,
        totalIncome: parseFloat(incomeResult.rows[0].total) || 0,
        totalExpenses: parseFloat(expensesResult.rows[0].total) || 0,
        transactionCounts: {
          payments: typeCounts[TransactionType.PAYMENT] || 0,
          deposits: typeCounts[TransactionType.DEPOSIT] || 0,
          withdrawals: typeCounts[TransactionType.WITHDRAWAL] || 0,
          fees: typeCounts[TransactionType.FEE] || 0,
          refunds: typeCounts[TransactionType.REFUND] || 0,
          escrowHolds: typeCounts[TransactionType.ESCROW_HOLD] || 0,
          escrowReleases: typeCounts[TransactionType.ESCROW_RELEASE] || 0,
          total: typeCountResult.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0)
        },
        currency
      };
    } catch (error) {
      console.error('Error getting transaction statistics:', error);
      throw error;
    }
  }

  /**
   * Creates all necessary transaction records associated with a payment
   * 
   * @param payment - Payment object
   * @returns Array of created transaction records
   * @throws ValidationError if payment validation fails
   */
  async createPaymentTransactions(payment: Payment): Promise<Transaction[]> {
    if (!payment.id || !payment.payerId || !payment.payeeId || payment.amount <= 0) {
      throw new ValidationError('Invalid payment data');
    }

    // Use a transaction to ensure all operations are atomic
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactions: Transaction[] = [];
      
      // 1. Create payment transaction for the payer (negative amount)
      const payerTransaction = await this.create({
        paymentId: payment.id,
        userId: payment.payerId,
        type: TransactionType.PAYMENT,
        amount: payment.amount,
        currency: payment.currency,
        description: `Payment to ${payment.payeeId}`,
        metadata: {
          paymentId: payment.id,
          payeeId: payment.payeeId
        }
      });
      
      transactions.push(payerTransaction);
      
      // 2. Create payment transaction for the payee (positive amount)
      const payeeTransaction = await this.create({
        paymentId: payment.id,
        userId: payment.payeeId,
        type: TransactionType.PAYMENT,
        amount: payment.amount,
        currency: payment.currency,
        description: `Payment from ${payment.payerId}`,
        metadata: {
          paymentId: payment.id,
          payerId: payment.payerId
        }
      });
      
      transactions.push(payeeTransaction);
      
      // 3. If there's a fee, create a fee transaction
      if (payment.fee > 0) {
        const feeTransaction = await this.create({
          paymentId: payment.id,
          userId: payment.payeeId, // Fee is typically deducted from the payee
          type: TransactionType.FEE,
          amount: payment.fee,
          currency: payment.currency,
          description: `Fee for payment ${payment.id}`,
          metadata: {
            paymentId: payment.id,
            feeType: 'platform_fee'
          }
        });
        
        transactions.push(feeTransaction);
      }
      
      await client.query('COMMIT');
      return transactions;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating payment transactions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Creates transaction records for a refund
   * 
   * @param payment - Original payment object
   * @param refundAmount - Amount to refund
   * @param reason - Reason for the refund
   * @returns Array of created refund transaction records
   * @throws ValidationError if refund validation fails
   */
  async createRefundTransactions(
    payment: Payment, 
    refundAmount: number, 
    reason: string
  ): Promise<Transaction[]> {
    if (!payment.id || !payment.payerId || !payment.payeeId || refundAmount <= 0) {
      throw new ValidationError('Invalid refund data');
    }

    if (refundAmount > payment.amount) {
      throw new ValidationError('Refund amount cannot exceed original payment amount');
    }

    // Use a transaction to ensure all operations are atomic
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactions: Transaction[] = [];
      
      // 1. Create refund transaction for the payer (positive amount - getting money back)
      const payerRefundTransaction = await this.create({
        paymentId: payment.id,
        userId: payment.payerId,
        type: TransactionType.REFUND,
        amount: refundAmount,
        currency: payment.currency,
        description: `Refund for payment to ${payment.payeeId}: ${reason}`,
        metadata: {
          paymentId: payment.id,
          payeeId: payment.payeeId,
          refundReason: reason
        }
      });
      
      transactions.push(payerRefundTransaction);
      
      // 2. Create refund transaction for the payee (negative amount - giving money back)
      const payeeRefundTransaction = await this.create({
        paymentId: payment.id,
        userId: payment.payeeId,
        type: TransactionType.REFUND,
        amount: refundAmount,
        currency: payment.currency,
        description: `Refund to ${payment.payerId}: ${reason}`,
        metadata: {
          paymentId: payment.id,
          payerId: payment.payerId,
          refundReason: reason
        }
      });
      
      transactions.push(payeeRefundTransaction);
      
      // 3. If there was a fee and it's being refunded, create a fee refund transaction
      if (payment.fee > 0) {
        const feeRefundAmount = (refundAmount / payment.amount) * payment.fee;
        
        if (feeRefundAmount > 0) {
          const feeRefundTransaction = await this.create({
            paymentId: payment.id,
            userId: payment.payeeId,
            type: TransactionType.REFUND,
            amount: feeRefundAmount,
            currency: payment.currency,
            description: `Fee refund for payment ${payment.id}`,
            metadata: {
              paymentId: payment.id,
              feeType: 'platform_fee_refund',
              originalFee: payment.fee
            }
          });
          
          transactions.push(feeRefundTransaction);
        }
      }
      
      await client.query('COMMIT');
      return transactions;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating refund transactions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Creates transaction records for escrow operations
   * 
   * @param payment - Payment object
   * @param type - Escrow transaction type (hold or release)
   * @returns Array of created escrow transaction records
   * @throws ValidationError if escrow validation fails
   */
  async createEscrowTransactions(
    payment: Payment, 
    type: TransactionType
  ): Promise<Transaction[]> {
    if (!payment.id || !payment.payerId || !payment.payeeId || payment.amount <= 0) {
      throw new ValidationError('Invalid escrow payment data');
    }

    if (type !== TransactionType.ESCROW_HOLD && type !== TransactionType.ESCROW_RELEASE) {
      throw new ValidationError('Invalid escrow transaction type');
    }

    // Use a transaction to ensure all operations are atomic
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const transactions: Transaction[] = [];
      
      if (type === TransactionType.ESCROW_HOLD) {
        // 1. Create escrow hold transaction for the payer (money leaving account)
        const payerTransaction = await this.create({
          paymentId: payment.id,
          userId: payment.payerId,
          type: TransactionType.ESCROW_HOLD,
          amount: payment.amount,
          currency: payment.currency,
          description: `Funds held in escrow for payment to ${payment.payeeId}`,
          metadata: {
            paymentId: payment.id,
            payeeId: payment.payeeId,
            escrowDate: new Date()
          }
        });
        
        transactions.push(payerTransaction);
        
        // Note: For escrow holds, no transaction is created for the payee yet
        // Funds are just removed from the payer and held in escrow
      } else if (type === TransactionType.ESCROW_RELEASE) {
        // 1. Create escrow release transaction for the payee (receiving funds)
        const payeeTransaction = await this.create({
          paymentId: payment.id,
          userId: payment.payeeId,
          type: TransactionType.ESCROW_RELEASE,
          amount: payment.amount,
          currency: payment.currency,
          description: `Escrow funds released from ${payment.payerId}`,
          metadata: {
            paymentId: payment.id,
            payerId: payment.payerId,
            escrowReleaseDate: new Date()
          }
        });
        
        transactions.push(payeeTransaction);
        
        // 2. If there's a fee, create a fee transaction
        if (payment.fee > 0) {
          const feeTransaction = await this.create({
            paymentId: payment.id,
            userId: payment.payeeId, // Fee is typically deducted from the payee
            type: TransactionType.FEE,
            amount: payment.fee,
            currency: payment.currency,
            description: `Fee for escrow payment ${payment.id}`,
            metadata: {
              paymentId: payment.id,
              feeType: 'platform_fee'
            }
          });
          
          transactions.push(feeTransaction);
        }
      }
      
      await client.query('COMMIT');
      return transactions;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating escrow transactions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Creates a transaction record for a user withdrawal
   * 
   * @param userId - User ID
   * @param amount - Withdrawal amount
   * @param currency - Currency code
   * @param metadata - Additional metadata
   * @returns Created withdrawal transaction record
   * @throws ValidationError if withdrawal validation fails
   */
  async createWithdrawalTransaction(
    userId: string, 
    amount: number, 
    currency: string = DEFAULT_CURRENCY,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    if (!validateUuid(userId)) {
      throw new ValidationError('Invalid user ID format');
    }

    if (amount <= 0) {
      throw new ValidationError('Withdrawal amount must be positive');
    }

    // Check if amount has more than 2 decimal places
    const amountStr = amount.toString();
    const decimalParts = amountStr.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      throw new ValidationError('Withdrawal amount cannot have more than 2 decimal places');
    }

    // Get current user balance
    const currentBalance = await this.getUserBalance(userId);
    
    // Check if user has sufficient funds
    if (currentBalance < amount) {
      throw new ValidationError(`Insufficient funds: balance ${currentBalance} is less than withdrawal amount ${amount}`);
    }

    // Create the withdrawal transaction
    const transaction = await this.create({
      userId,
      type: TransactionType.WITHDRAWAL,
      amount, // Using a positive amount
      currency,
      description: `Withdrawal of ${amount} ${currency}`,
      metadata: {
        withdrawalMethod: metadata.withdrawalMethod || 'bank_transfer',
        withdrawalReference: metadata.withdrawalReference || '',
        ...metadata
      }
    });

    return transaction;
  }

  /**
   * Creates a transaction record for a user deposit
   * 
   * @param userId - User ID
   * @param amount - Deposit amount
   * @param currency - Currency code
   * @param metadata - Additional metadata
   * @returns Created deposit transaction record
   * @throws ValidationError if deposit validation fails
   */
  async createDepositTransaction(
    userId: string, 
    amount: number, 
    currency: string = DEFAULT_CURRENCY,
    metadata: Record<string, any> = {}
  ): Promise<Transaction> {
    if (!validateUuid(userId)) {
      throw new ValidationError('Invalid user ID format');
    }

    if (amount <= 0) {
      throw new ValidationError('Deposit amount must be positive');
    }

    // Check if amount has more than 2 decimal places
    const amountStr = amount.toString();
    const decimalParts = amountStr.split('.');
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      throw new ValidationError('Deposit amount cannot have more than 2 decimal places');
    }

    // Create the deposit transaction
    const transaction = await this.create({
      userId,
      type: TransactionType.DEPOSIT,
      amount,
      currency,
      description: `Deposit of ${amount} ${currency}`,
      metadata: {
        depositMethod: metadata.depositMethod || 'bank_transfer',
        depositReference: metadata.depositReference || '',
        ...metadata
      }
    });

    return transaction;
  }
}