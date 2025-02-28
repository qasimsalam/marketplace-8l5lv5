/**
 * Unit tests for the Stripe service
 *
 * This test suite verifies the functionality of the StripeService class that handles
 * payment processing, escrow management, and Stripe API interactions for the
 * AI Talent Marketplace.
 */

import { mock } from 'jest-mock-extended'; // v3.0.4
import Stripe from 'stripe'; // v12.1.1
import { 
  StripeService, 
  convertToCents, 
  convertFromCents 
} from '../../src/services/stripe.service';
import { config } from '../../src/config';
import { 
  Payment, 
  PaymentStatus 
} from '../../../shared/src/types/payment.types';
import { PaymentError } from '../../../shared/src/utils/errors';

// Global mocks
let mockStripeClient: jest.Mocked<Stripe>;
let mockPaymentIntent: Partial<Stripe.PaymentIntent>;
let mockPayment: Payment;
let stripeService: StripeService;

// Setup before each test
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Create mock Stripe client
  mockStripeClient = mock<Stripe>();
  
  // Create mock payment intent
  mockPaymentIntent = {
    id: 'pi_mock123',
    status: 'succeeded',
    amount: 10000 // $100.00 in cents
  };
  
  // Create mock payment
  mockPayment = {
    id: 'pay_123',
    amount: 100, // $100.00
    currency: 'USD',
    payerId: 'user1',
    payeeId: 'user2',
    status: PaymentStatus.PENDING
  } as Payment;
  
  // Initialize service with mocked Stripe client
  stripeService = new StripeService();
  (stripeService as any).stripeClient = mockStripeClient;
});

// Cleanup after each test
afterEach(() => {
  jest.resetAllMocks();
});

// Test cases
describe('StripeService', () => {
  // Test initialization
  test('should be defined', () => {
    expect(stripeService).toBeDefined();
  });
  
  test('should initialize with Stripe client', () => {
    expect((stripeService as any).stripeClient).toBeDefined();
  });

  // Test utility functions
  describe('convertToCents', () => {
    test('should convert dollar amount to cents', () => {
      expect(convertToCents(10.25)).toBe(1025);
      expect(convertToCents(0.99)).toBe(99);
      expect(convertToCents(100)).toBe(10000);
    });
    
    test('should handle floating point precision issues', () => {
      expect(convertToCents(10.95)).toBe(1095);
      expect(convertToCents(0.1 + 0.2)).toBe(30); // 0.1 + 0.2 = 0.30000000000000004 in JS
    });
  });

  describe('convertFromCents', () => {
    test('should convert cents to dollar amount', () => {
      expect(convertFromCents(1025)).toBe(10.25);
      expect(convertFromCents(99)).toBe(0.99);
      expect(convertFromCents(10000)).toBe(100);
    });
  });

  // Test payment intent methods
  describe('createPaymentIntent', () => {
    test('should create a payment intent in Stripe', async () => {
      // Mock the Stripe paymentIntents.create method
      mockStripeClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      
      // Call the method
      const result = await stripeService.createPaymentIntent(mockPayment, 'pm_card_visa');
      
      // Verify it was called with correct params
      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
        amount: 10000, // Amount in cents
        currency: 'USD',
        payment_method: 'pm_card_visa',
        metadata: expect.objectContaining({
          paymentId: mockPayment.id,
          payerId: mockPayment.payerId,
          payeeId: mockPayment.payeeId
        })
      }));
      
      // Verify the result
      expect(result).toEqual(mockPaymentIntent);
    });
    
    test('should convert amount to cents', async () => {
      mockStripeClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      
      mockPayment.amount = 99.99;
      await stripeService.createPaymentIntent(mockPayment, 'pm_card_visa');
      
      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9999 // 99.99 converted to cents
        })
      );
    });
    
    test('should include application fee if applicable', async () => {
      mockStripeClient.paymentIntents.create.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      
      // Ensure fee percentage is set
      const originalFeePercent = config.fees.platformFeePercent;
      (config.fees as any).platformFeePercent = 15;
      
      await stripeService.createPaymentIntent(mockPayment, 'pm_card_visa');
      
      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          application_fee_amount: 1500 // 15% of $100 in cents
        })
      );
      
      // Restore original value
      (config.fees as any).platformFeePercent = originalFeePercent;
    });
    
    test('should throw PaymentError on Stripe API error', async () => {
      mockStripeClient.paymentIntents.create.mockRejectedValue(new Error('Stripe API error'));
      
      await expect(stripeService.createPaymentIntent(mockPayment, 'pm_card_visa'))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('confirmPaymentIntent', () => {
    test('should confirm a payment intent in Stripe', async () => {
      mockStripeClient.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      
      const result = await stripeService.confirmPaymentIntent('pi_mock123', { payment_method: 'pm_card_visa' });
      
      expect(mockStripeClient.paymentIntents.confirm).toHaveBeenCalledWith(
        'pi_mock123',
        { payment_method: 'pm_card_visa' }
      );
      
      expect(result).toEqual(mockPaymentIntent);
    });
    
    test('should throw PaymentError on Stripe API error', async () => {
      mockStripeClient.paymentIntents.confirm.mockRejectedValue(new Error('Stripe API error'));
      
      await expect(stripeService.confirmPaymentIntent('pi_mock123'))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('retrievePaymentIntent', () => {
    test('should retrieve a payment intent from Stripe by ID', async () => {
      mockStripeClient.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      
      const result = await stripeService.retrievePaymentIntent('pi_mock123');
      
      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_mock123');
      expect(result).toEqual(mockPaymentIntent);
    });
    
    test('should throw ResourceNotFoundError if payment intent does not exist', async () => {
      const error = new Error('No such payment intent');
      (error as any).type = 'StripeInvalidRequestError';
      mockStripeClient.paymentIntents.retrieve.mockRejectedValue(error);
      
      await expect(stripeService.retrievePaymentIntent('pi_nonexistent'))
        .rejects
        .toThrow('Payment intent not found');
    });
  });

  describe('cancelPaymentIntent', () => {
    test('should cancel a payment intent in Stripe', async () => {
      mockStripeClient.paymentIntents.cancel.mockResolvedValue(mockPaymentIntent as Stripe.PaymentIntent);
      
      const result = await stripeService.cancelPaymentIntent('pi_mock123', 'requested_by_customer');
      
      expect(mockStripeClient.paymentIntents.cancel).toHaveBeenCalledWith(
        'pi_mock123',
        { cancellation_reason: 'requested_by_customer' }
      );
      
      expect(result).toEqual(mockPaymentIntent);
    });
    
    test('should throw PaymentError on Stripe API error', async () => {
      mockStripeClient.paymentIntents.cancel.mockRejectedValue(new Error('Stripe API error'));
      
      await expect(stripeService.cancelPaymentIntent('pi_mock123'))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('createRefund', () => {
    test('should create a refund for a payment intent', async () => {
      const mockRefund = { id: 're_mock123', status: 'succeeded' };
      mockStripeClient.refunds.create.mockResolvedValue(mockRefund as Stripe.Refund);
      
      const result = await stripeService.createRefund('pi_mock123', 50, 'requested_by_customer');
      
      expect(mockStripeClient.refunds.create).toHaveBeenCalledWith(expect.objectContaining({
        payment_intent: 'pi_mock123',
        amount: 5000, // 50 dollars in cents
        reason: 'requested_by_customer'
      }));
      
      expect(result).toEqual(mockRefund);
    });
    
    test('should create a full refund when amount is not provided', async () => {
      const mockRefund = { id: 're_mock123', status: 'succeeded' };
      mockStripeClient.refunds.create.mockResolvedValue(mockRefund as Stripe.Refund);
      
      await stripeService.createRefund('pi_mock123');
      
      expect(mockStripeClient.refunds.create).toHaveBeenCalledWith(expect.objectContaining({
        payment_intent: 'pi_mock123',
        // Should not include amount parameter
      }));
      
      // Verify amount is not in the call
      const createArgs = mockStripeClient.refunds.create.mock.calls[0][0];
      expect(createArgs).not.toHaveProperty('amount');
    });
    
    test('should throw PaymentError on Stripe API error', async () => {
      mockStripeClient.refunds.create.mockRejectedValue(new Error('Stripe API error'));
      
      await expect(stripeService.createRefund('pi_mock123'))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('placeInEscrow', () => {
    test('should create a payment intent with manual capture mode', async () => {
      mockStripeClient.paymentIntents.create.mockResolvedValue({
        ...mockPaymentIntent,
        capture_method: 'manual',
        metadata: { escrow: 'true' }
      } as Stripe.PaymentIntent);
      
      const result = await stripeService.placeInEscrow(mockPayment);
      
      expect(mockStripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
        capture_method: 'manual',
        metadata: expect.objectContaining({
          escrow: 'true'
        })
      }));
      
      expect(result.capture_method).toBe('manual');
      expect(result.metadata?.escrow).toBe('true');
    });
    
    test('should update payment intent for existing intent ID', async () => {
      // Create payment with existing payment intent ID
      const paymentWithIntent = {
        ...mockPayment,
        stripePaymentIntentId: 'pi_existing123'
      };
      
      // Mock retrieval of existing payment intent
      mockStripeClient.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_existing123',
        status: 'requires_payment_method',
        amount: 10000
      } as Stripe.PaymentIntent);
      
      // Mock update of payment intent
      mockStripeClient.paymentIntents.update.mockResolvedValue({
        id: 'pi_existing123',
        status: 'requires_payment_method',
        amount: 10000,
        metadata: { escrow: 'true' }
      } as Stripe.PaymentIntent);
      
      await stripeService.placeInEscrow(paymentWithIntent);
      
      // Verify retrieve was called
      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_existing123');
      
      // Verify update was called with escrow metadata
      expect(mockStripeClient.paymentIntents.update).toHaveBeenCalledWith(
        'pi_existing123',
        expect.objectContaining({
          metadata: expect.objectContaining({
            escrow: 'true'
          })
        })
      );
    });
  });

  describe('releaseFromEscrow', () => {
    test('should capture a payment intent held in escrow', async () => {
      // Create payment with payment intent ID and held in escrow status
      const paymentInEscrow = {
        ...mockPayment,
        stripePaymentIntentId: 'pi_escrow123',
        status: PaymentStatus.HELD_IN_ESCROW
      };
      
      // Mock retrieval of existing payment intent in requires_capture state
      mockStripeClient.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_escrow123',
        status: 'requires_capture',
        amount: 10000,
        metadata: { escrow: 'true' }
      } as Stripe.PaymentIntent);
      
      // Mock capture call
      mockStripeClient.paymentIntents.capture.mockResolvedValue({
        id: 'pi_escrow123',
        status: 'succeeded',
        amount: 10000
      } as Stripe.PaymentIntent);
      
      // Mock update to change metadata
      mockStripeClient.paymentIntents.update.mockResolvedValue({
        id: 'pi_escrow123',
        status: 'succeeded',
        amount: 10000,
        metadata: { escrow: 'released' }
      } as Stripe.PaymentIntent);
      
      const result = await stripeService.releaseFromEscrow(paymentInEscrow);
      
      // Verify payment intent was retrieved
      expect(mockStripeClient.paymentIntents.retrieve).toHaveBeenCalledWith('pi_escrow123');
      
      // Verify capture was called with correct amount
      expect(mockStripeClient.paymentIntents.capture).toHaveBeenCalledWith(
        'pi_escrow123',
        { amount_to_capture: 10000 }
      );
      
      // Verify metadata was updated
      expect(mockStripeClient.paymentIntents.update).toHaveBeenCalledWith(
        'pi_escrow123',
        expect.objectContaining({
          metadata: expect.objectContaining({
            escrow: 'released'
          })
        })
      );
      
      expect(result.status).toBe('succeeded');
    });
    
    test('should throw error if payment has no Stripe payment intent ID', async () => {
      // Create payment without payment intent ID
      const paymentWithoutIntent = {
        ...mockPayment,
        stripePaymentIntentId: undefined
      };
      
      await expect(stripeService.releaseFromEscrow(paymentWithoutIntent))
        .rejects
        .toThrow(PaymentError);
    });
  });

  describe('handleWebhookEvent', () => {
    test('should verify webhook signature and construct event', async () => {
      const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded', data: { object: {} } };
      mockStripeClient.webhooks.constructEvent.mockReturnValue(mockEvent as unknown as Stripe.Event);
      
      const payload = '{"id":"evt_123"}';
      const signature = 'signature123';
      
      const result = await stripeService.handleWebhookEvent(payload, signature);
      
      expect(mockStripeClient.webhooks.constructEvent).toHaveBeenCalledWith(
        payload,
        signature,
        config.stripe.webhookSecret
      );
      
      expect(result).toEqual(mockEvent);
    });
    
    test('should throw PaymentError on signature verification failure', async () => {
      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });
      
      const payload = '{"id":"evt_123"}';
      const signature = 'invalid_signature';
      
      await expect(stripeService.handleWebhookEvent(payload, signature))
        .rejects
        .toThrow(PaymentError);
    });
  });
});