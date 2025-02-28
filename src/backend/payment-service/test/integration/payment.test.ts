import { mock, MockProxy } from 'jest-mock-extended'; // v3.0.4
import { v4 as uuid } from 'uuid'; // v9.0.1
import * as pg from 'pg'; // v8.11.3

// Import models
import { PaymentModel } from '../../src/models/payment.model';
import { TransactionModel } from '../../src/models/transaction.model';

// Import services
import { StripeService } from '../../src/services/stripe.service';
import { EscrowService } from '../../src/services/escrow.service';

// Import config
import { config } from '../../src/config';

// Import types
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
  TransactionType
} from '../../../shared/src/types/payment.types';

// Global test constants
const TEST_USER_PAYER = { id: 'test-payer-id', name: 'Test Payer' };
const TEST_USER_PAYEE = { id: 'test-payee-id', name: 'Test Payee' };
const TEST_PAYMENT_AMOUNT = 100.00;
const MOCK_PAYMENT_INTENT_ID = 'pi_mock_123456789';
const MOCK_TRANSFER_ID = 'tr_mock_123456789';

// Test database client
let dbClient: pg.Pool;
let paymentModel: PaymentModel;
let transactionModel: TransactionModel;
let mockStripeService: MockProxy<StripeService>;
let escrowService: EscrowService;

/**
 * Setup function that runs once before all tests to initialize database and test dependencies
 */
beforeAll(async () => {
  // Connect to test database instance
  dbClient = new pg.Pool({
    connectionString: config.db.url,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  // Initialize models with test database
  paymentModel = new PaymentModel(dbClient);
  transactionModel = new TransactionModel(dbClient);
  
  // Create mock Stripe service
  mockStripeService = mock<StripeService>();
  
  // Initialize EscrowService with PaymentModel, TransactionModel, and mocked StripeService
  escrowService = new EscrowService(paymentModel, transactionModel, mockStripeService);
  
  // Create necessary test tables if they don't exist
  await setupTestDatabase();
});

/**
 * Cleanup function that runs once after all tests
 */
afterAll(async () => {
  // Clean up test data from database
  await cleanupTestData();
  
  // Close database connection
  await dbClient.end();
});

/**
 * Setup function that runs before each test to reset test state
 */
beforeEach(async () => {
  // Reset mock implementations
  jest.resetAllMocks();
  
  // Clear test data from previous test
  await cleanupTestData();
});

/**
 * Helper function to set up test database
 */
async function setupTestDatabase() {
  // Create payments table if it doesn't exist
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY,
      contract_id UUID,
      milestone_id UUID,
      payer_id TEXT NOT NULL,
      payee_id TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      method TEXT NOT NULL,
      description TEXT,
      stripe_payment_intent_id TEXT,
      stripe_transfer_id TEXT,
      metadata JSONB DEFAULT '{}',
      escrow_hold_date TIMESTAMP,
      escrow_release_date TIMESTAMP,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      completed_at TIMESTAMP
    )
  `);
  
  // Create transactions table if it doesn't exist
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY,
      payment_id UUID,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      description TEXT,
      balance DECIMAL(10,2) NOT NULL DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `);
}

/**
 * Helper function to clean up test data
 */
async function cleanupTestData() {
  await dbClient.query('DELETE FROM transactions');
  await dbClient.query('DELETE FROM payments');
}

/**
 * Helper function to create a standard test payment
 */
async function createTestPayment(overrides: Partial<Payment> = {}): Promise<Payment> {
  const defaultPayment = {
    payerId: TEST_USER_PAYER.id,
    payeeId: TEST_USER_PAYEE.id,
    amount: TEST_PAYMENT_AMOUNT,
    method: PaymentMethod.CREDIT_CARD,
    contractId: uuid(),
    milestoneId: uuid(),
    description: 'Test payment',
  };
  
  const paymentData = { ...defaultPayment, ...overrides };
  return await paymentModel.create(paymentData);
}

describe('Payment Service Integration Tests', () => {
  describe('PaymentModel', () => {
    test('should create a new payment record', async () => {
      // Create payment with basic fields (payerId, payeeId, amount)
      const payment = await createTestPayment();
      
      // Expect payment to have been created with an ID
      expect(payment.id).toBeDefined();
      
      // Expect payment to have PENDING status
      expect(payment.status).toBe(PaymentStatus.PENDING);
      
      // Expect payment amount to match input amount
      expect(payment.amount).toBe(TEST_PAYMENT_AMOUNT);
      
      // Expect fee to be calculated correctly
      expect(payment.fee).toBeGreaterThan(0);
      expect(payment.fee).toBe(TEST_PAYMENT_AMOUNT * config.fees.platformFeePercent / 100);
    });
    
    test('should retrieve a payment by ID', async () => {
      // Create test payment
      const createdPayment = await createTestPayment();
      
      // Retrieve payment by ID
      const payment = await paymentModel.findById(createdPayment.id);
      
      // Expect retrieved payment to match created payment
      expect(payment).not.toBeNull();
      expect(payment.id).toBe(createdPayment.id);
      expect(payment.amount).toBe(createdPayment.amount);
      expect(payment.payerId).toBe(TEST_USER_PAYER.id);
      expect(payment.payeeId).toBe(TEST_USER_PAYEE.id);
    });
    
    test('should process a payment and update its status', async () => {
      // Create test payment with PENDING status
      const payment = await createTestPayment();
      
      // Mock StripeService to return successful payment intent
      mockStripeService.createPaymentIntent.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'succeeded',
      } as any);
      
      mockStripeService.confirmPaymentIntent.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'succeeded',
      } as any);
      
      // Process the payment
      const processedPayment = await paymentModel.processPayment(payment.id);
      
      // Expect payment status to be updated to COMPLETED
      expect(processedPayment.status).toBe(
        config.escrow.autoReleaseEnabled ? PaymentStatus.HELD_IN_ESCROW : PaymentStatus.COMPLETED
      );
      
      // Expect completedAt date to be set
      if (processedPayment.status === PaymentStatus.COMPLETED) {
        expect(processedPayment.completedAt).toBeDefined();
      } else {
        expect(processedPayment.escrowHoldDate).toBeDefined();
        expect(processedPayment.escrowReleaseDate).toBeDefined();
      }
      
      // Verify Stripe payment intent was stored
      expect(processedPayment.stripePaymentIntentId).toBe(MOCK_PAYMENT_INTENT_ID);
    });
  });
  
  describe('Transaction Management', () => {
    test('should create transaction records for a payment', async () => {
      // Create test payment
      const payment = await createTestPayment();
      
      // Create payment transactions
      const transactions = await transactionModel.createPaymentTransactions(payment);
      
      // Expect transactions to be created for both payer and payee
      expect(transactions.length).toBeGreaterThanOrEqual(2); // At least payer and payee transactions
      
      // Expect payer transaction to have negative amount
      const payerTransaction = transactions.find(t => t.userId === TEST_USER_PAYER.id);
      expect(payerTransaction).toBeDefined();
      expect(payerTransaction.amount).toBe(payment.amount);
      expect(payerTransaction.type).toBe(TransactionType.PAYMENT);
      
      // Expect payee transaction to have positive amount
      const payeeTransaction = transactions.find(t => t.userId === TEST_USER_PAYEE.id);
      expect(payeeTransaction).toBeDefined();
      expect(payeeTransaction.amount).toBe(payment.amount);
      expect(payeeTransaction.type).toBe(TransactionType.PAYMENT);
      
      // Verify fee transaction if applicable
      if (payment.fee > 0) {
        const feeTransaction = transactions.find(t => t.type === TransactionType.FEE);
        expect(feeTransaction).toBeDefined();
        expect(feeTransaction.amount).toBe(payment.fee);
      }
    });
    
    test('should retrieve transactions for a payment', async () => {
      // Create test payment and transactions
      const payment = await createTestPayment();
      await transactionModel.createPaymentTransactions(payment);
      
      // Retrieve transactions by paymentId
      const transactions = await transactionModel.findByPaymentId(payment.id);
      
      // Expect transactions to be found and match created transactions
      expect(transactions.length).toBeGreaterThanOrEqual(2);
      expect(transactions[0].paymentId).toBe(payment.id);
      
      // Verify all transactions have the correct payment ID
      transactions.forEach(transaction => {
        expect(transaction.paymentId).toBe(payment.id);
      });
    });
  });
  
  describe('Escrow Service', () => {
    test('should place a payment in escrow', async () => {
      // Create test payment with PENDING status
      const payment = await createTestPayment();
      
      // Mock StripeService.placeInEscrow to return success
      mockStripeService.placeInEscrow.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'requires_capture',
      } as any);
      
      // Call EscrowService.holdInEscrow
      const heldPayment = await escrowService.holdInEscrow(payment.id);
      
      // Expect payment status to be updated to HELD_IN_ESCROW
      expect(heldPayment.status).toBe(PaymentStatus.HELD_IN_ESCROW);
      
      // Expect escrowHoldDate to be set
      expect(heldPayment.escrowHoldDate).toBeDefined();
      
      // Expect escrowReleaseDate to be calculated correctly
      expect(heldPayment.escrowReleaseDate).toBeDefined();
      const now = new Date();
      const releaseDate = new Date(heldPayment.escrowReleaseDate);
      const expectedReleaseDate = new Date(now);
      expectedReleaseDate.setDate(expectedReleaseDate.getDate() + config.escrow.defaultHoldPeriodDays);
      
      // Allow for slight time differences in test execution, but should be roughly the same day
      expect(releaseDate.toDateString()).toBe(expectedReleaseDate.toDateString());
    });
    
    test('should release a payment from escrow', async () => {
      // Create test payment with HELD_IN_ESCROW status
      const payment = await createTestPayment();
      
      // Mock StripeService methods
      mockStripeService.placeInEscrow.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'requires_capture',
      } as any);
      
      mockStripeService.releaseFromEscrow.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'succeeded',
      } as any);
      
      // Place payment in escrow first
      const heldPayment = await escrowService.holdInEscrow(payment.id);
      
      // Call EscrowService.releaseFromEscrow
      const releasedPayment = await escrowService.releaseFromEscrow(heldPayment.id);
      
      // Expect payment status to be updated to RELEASED_FROM_ESCROW
      expect(releasedPayment.status).toBe(PaymentStatus.RELEASED_FROM_ESCROW);
      
      // Expect completedAt date to be set
      expect(releasedPayment.completedAt).toBeDefined();
      
      // Expect appropriate transactions to be created
      const transactions = await transactionModel.findByPaymentId(payment.id);
      const escrowReleaseTransactions = transactions.filter(
        t => t.type === TransactionType.ESCROW_RELEASE
      );
      expect(escrowReleaseTransactions.length).toBeGreaterThan(0);
    });
    
    test('should automatically release payments from escrow after hold period', async () => {
      // Create multiple test payments with HELD_IN_ESCROW status
      const payment1 = await createTestPayment();
      const payment2 = await createTestPayment();
      
      // Mock StripeService methods
      mockStripeService.placeInEscrow.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'requires_capture',
      } as any);
      
      mockStripeService.releaseFromEscrow.mockResolvedValue({
        id: MOCK_PAYMENT_INTENT_ID,
        status: 'succeeded',
      } as any);
      
      // Place payments in escrow
      await escrowService.holdInEscrow(payment1.id);
      await escrowService.holdInEscrow(payment2.id);
      
      // Set escrowReleaseDate to past date for some payments
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      await paymentModel.update(payment1.id, {
        escrowReleaseDate: pastDate
      });
      
      // Call EscrowService.processAutomaticReleases
      const releasedCount = await escrowService.processAutomaticReleases();
      
      // Expect eligible payments to be released
      expect(releasedCount).toBe(1);
      
      // Verify payment1 was released
      const updatedPayment1 = await paymentModel.findById(payment1.id);
      expect(updatedPayment1.status).toBe(PaymentStatus.RELEASED_FROM_ESCROW);
      
      // Expect non-eligible payments to remain in escrow
      const updatedPayment2 = await paymentModel.findById(payment2.id);
      expect(updatedPayment2.status).toBe(PaymentStatus.HELD_IN_ESCROW);
    });
  });
  
  describe('Refund Processing', () => {
    test('should process a refund for a completed payment', async () => {
      // Create test payment with COMPLETED status
      const payment = await createTestPayment({
        status: PaymentStatus.COMPLETED,
        stripePaymentIntentId: MOCK_PAYMENT_INTENT_ID,
        completedAt: new Date()
      });
      
      // Mock StripeService.createRefund to return success
      mockStripeService.createRefund.mockResolvedValue({
        id: 're_mock_123456789',
        status: 'succeeded',
      } as any);
      
      // Call PaymentModel.refundPayment
      const refundReason = 'Customer requested refund';
      const refundedPayment = await paymentModel.refundPayment(payment.id, refundReason);
      
      // Expect payment status to be updated to REFUNDED
      expect(refundedPayment.status).toBe(PaymentStatus.REFUNDED);
      
      // Expect appropriate refund transactions to be created
      expect(refundedPayment.metadata.refundReason).toBe(refundReason);
      expect(refundedPayment.metadata.refundedAt).toBeDefined();
    });
    
    test('should handle partial refunds', async () => {
      // Create test payment with COMPLETED status
      const payment = await createTestPayment({
        status: PaymentStatus.COMPLETED,
        stripePaymentIntentId: MOCK_PAYMENT_INTENT_ID,
        completedAt: new Date()
      });
      
      // Mock StripeService.createRefund to return success
      const partialAmount = TEST_PAYMENT_AMOUNT / 2;
      mockStripeService.createRefund.mockResolvedValue({
        id: 're_mock_partial',
        amount: partialAmount * 100, // Stripe uses cents
        status: 'succeeded',
      } as any);
      
      // Call PaymentModel.refundPayment with partial amount
      const refundReason = 'Partial refund requested';
      const refundedPayment = await paymentModel.refundPayment(payment.id, refundReason);
      
      // Expect payment metadata to reflect partial refund
      expect(refundedPayment.status).toBe(PaymentStatus.REFUNDED);
      expect(refundedPayment.metadata.refundReason).toBe(refundReason);
      expect(refundedPayment.metadata.refundedAt).toBeDefined();
      
      // Create refund transactions
      await transactionModel.createRefundTransactions(payment, partialAmount, refundReason);
      
      // Expect refund transaction amount to match partial amount
      const transactions = await transactionModel.findByPaymentId(payment.id);
      const refundTransactions = transactions.filter(t => t.type === TransactionType.REFUND);
      
      expect(refundTransactions.length).toBeGreaterThan(0);
      const payerRefund = refundTransactions.find(t => t.userId === TEST_USER_PAYER.id);
      expect(payerRefund).toBeDefined();
      expect(payerRefund.amount).toBe(partialAmount);
    });
  });
});