/**
 * Stripe Payment Service
 * 
 * This service handles all Stripe-related payment processing functionality
 * for the AI Talent Marketplace. It provides methods for creating payment intents,
 * handling escrow operations, refunds, and webhook events.
 * 
 * @version 1.0.0
 */

import Stripe from 'stripe'; // v12.0.0
import logger from 'pino'; // v8.14.1
import { stripe as stripeConfig, fees, escrow } from '../config';
import { Payment, PaymentStatus } from '../../../shared/src/types/payment.types';
import { PaymentError, ResourceNotFoundError } from '../../../shared/src/utils/errors';

// Global constants
const DEFAULT_CURRENCY = 'USD';

/**
 * Validates that Stripe configuration is properly set up
 * @returns True if Stripe is properly configured
 * @throws PaymentError if configuration is invalid
 */
export function validateStripeConfig(): boolean {
  if (!stripeConfig.apiKey) {
    throw new PaymentError('Stripe API key is not configured');
  }
  
  if (!stripeConfig.webhookSecret) {
    throw new PaymentError('Stripe webhook secret is not configured');
  }
  
  return true;
}

/**
 * Converts dollar amount to cents for Stripe API
 * @param amount Amount in dollars
 * @returns Amount in cents
 */
export function convertToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Converts cent amount from Stripe API to dollars
 * @param amountInCents Amount in cents
 * @returns Amount in dollars
 */
export function convertFromCents(amountInCents: number): number {
  return Math.round(amountInCents) / 100;
}

/**
 * Service class for interacting with Stripe API to process payments
 */
export class StripeService {
  private stripeClient: Stripe;
  private config: typeof stripeConfig;
  private logger: logger.Logger;
  
  /**
   * Initializes the Stripe service with API credentials
   */
  constructor() {
    validateStripeConfig();
    this.config = stripeConfig;
    this.stripeClient = new Stripe(this.config.apiKey, {
      apiVersion: '2023-10-16',
      timeout: this.config.timeout,
      maxNetworkRetries: 3,
    });
    this.logger = logger({
      name: 'stripe-service',
      level: process.env.LOG_LEVEL || 'info'
    });
  }
  
  /**
   * Creates a payment intent in Stripe to initiate payment processing
   * @param payment Payment object with details
   * @param paymentMethodId ID of the payment method to use
   * @returns The created Stripe payment intent
   */
  async createPaymentIntent(payment: Payment, paymentMethodId: string): Promise<Stripe.PaymentIntent> {
    if (!payment.amount || !payment.payerId || !payment.payeeId) {
      throw new PaymentError('Invalid payment data. Missing required fields.', payment.id);
    }
    
    const amountInCents = convertToCents(payment.amount);
    
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: payment.currency || DEFAULT_CURRENCY,
      payment_method: paymentMethodId,
      confirm: false,
      metadata: {
        paymentId: payment.id,
        platformReference: 'ai-talent-marketplace',
        payerId: payment.payerId,
        payeeId: payment.payeeId
      }
    };
    
    // Calculate application fee if applicable
    if (fees.platformFeePercent > 0) {
      const feeAmount = Math.round(amountInCents * (fees.platformFeePercent / 100));
      paymentIntentParams.application_fee_amount = feeAmount;
    }
    
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.create(paymentIntentParams);
      
      this.logger.info({
        msg: 'Created payment intent',
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        amount: payment.amount,
        currency: payment.currency || DEFAULT_CURRENCY
      });
      
      return paymentIntent;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create payment intent',
        error: error instanceof Error ? error.message : String(error),
        paymentId: payment.id
      });
      
      throw new PaymentError(
        'Failed to create payment intent',
        payment.id,
        { originalError: error }
      );
    }
  }
  
  /**
   * Confirms a payment intent to complete payment processing
   * @param paymentIntentId ID of the payment intent to confirm
   * @param confirmOptions Additional confirmation options
   * @returns The confirmed payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    confirmOptions: Partial<Stripe.PaymentIntentConfirmParams> = {}
  ): Promise<Stripe.PaymentIntent> {
    if (!paymentIntentId) {
      throw new PaymentError('Payment intent ID is required');
    }
    
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.confirm(
        paymentIntentId,
        confirmOptions
      );
      
      this.logger.info({
        msg: 'Confirmed payment intent',
        paymentIntentId,
        status: paymentIntent.status
      });
      
      return paymentIntent;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to confirm payment intent',
        error: error instanceof Error ? error.message : String(error),
        paymentIntentId
      });
      
      throw new PaymentError(
        'Failed to confirm payment intent',
        undefined,
        { paymentIntentId, originalError: error }
      );
    }
  }
  
  /**
   * Retrieves a payment intent from Stripe by ID
   * @param paymentIntentId ID of the payment intent to retrieve
   * @returns The retrieved payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!paymentIntentId) {
      throw new ResourceNotFoundError('Payment intent ID is required');
    }
    
    try {
      return await this.stripeClient.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to retrieve payment intent',
        error: error instanceof Error ? error.message : String(error),
        paymentIntentId
      });
      
      if ((error as any)?.type === 'StripeInvalidRequestError') {
        throw new ResourceNotFoundError('Payment intent not found', 'paymentIntent', paymentIntentId);
      }
      
      throw new PaymentError(
        'Failed to retrieve payment intent',
        undefined,
        { paymentIntentId, originalError: error }
      );
    }
  }
  
  /**
   * Cancels a payment intent in Stripe
   * @param paymentIntentId ID of the payment intent to cancel
   * @param cancelReason Reason for cancellation
   * @returns The canceled payment intent
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
    cancelReason?: string
  ): Promise<Stripe.PaymentIntent> {
    if (!paymentIntentId) {
      throw new ResourceNotFoundError('Payment intent ID is required');
    }
    
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.cancel(
        paymentIntentId,
        { cancellation_reason: cancelReason as Stripe.PaymentIntentCancelParams.CancellationReason }
      );
      
      this.logger.info({
        msg: 'Canceled payment intent',
        paymentIntentId,
        reason: cancelReason || 'Not specified'
      });
      
      return paymentIntent;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to cancel payment intent',
        error: error instanceof Error ? error.message : String(error),
        paymentIntentId
      });
      
      throw new PaymentError(
        'Failed to cancel payment intent',
        undefined,
        { paymentIntentId, originalError: error }
      );
    }
  }
  
  /**
   * Creates a refund for a previously processed payment
   * @param paymentIntentId ID of the payment intent to refund
   * @param amount Amount to refund (if not provided, full amount is refunded)
   * @param reason Reason for the refund
   * @returns The created refund object
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    if (!paymentIntentId) {
      throw new ResourceNotFoundError('Payment intent ID is required');
    }
    
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata: {
        reason: reason || 'Requested by client',
        platformReference: 'ai-talent-marketplace'
      }
    };
    
    if (amount) {
      refundParams.amount = convertToCents(amount);
    }
    
    if (reason) {
      refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
    }
    
    try {
      const refund = await this.stripeClient.refunds.create(refundParams);
      
      this.logger.info({
        msg: 'Created refund',
        paymentIntentId,
        refundId: refund.id,
        amount: amount ? amount : 'full amount'
      });
      
      return refund;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create refund',
        error: error instanceof Error ? error.message : String(error),
        paymentIntentId
      });
      
      throw new PaymentError(
        'Failed to create refund',
        undefined,
        { paymentIntentId, originalError: error }
      );
    }
  }
  
  /**
   * Retrieves a refund from Stripe by ID
   * @param refundId ID of the refund to retrieve
   * @returns The retrieved refund
   */
  async retrieveRefund(refundId: string): Promise<Stripe.Refund> {
    if (!refundId) {
      throw new ResourceNotFoundError('Refund ID is required');
    }
    
    try {
      return await this.stripeClient.refunds.retrieve(refundId);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to retrieve refund',
        error: error instanceof Error ? error.message : String(error),
        refundId
      });
      
      if ((error as any)?.type === 'StripeInvalidRequestError') {
        throw new ResourceNotFoundError('Refund not found', 'refund', refundId);
      }
      
      throw new PaymentError(
        'Failed to retrieve refund',
        undefined,
        { refundId, originalError: error }
      );
    }
  }
  
  /**
   * Holds funds in escrow by marking the payment intent for delayed capture
   * @param payment Payment object with details
   * @returns The updated payment intent with escrow status
   */
  async placeInEscrow(payment: Payment): Promise<Stripe.PaymentIntent> {
    if (!payment.amount || !payment.payerId || !payment.payeeId) {
      throw new PaymentError('Invalid payment data. Missing required fields.', payment.id);
    }
    
    try {
      let paymentIntent: Stripe.PaymentIntent;
      
      // If payment already has a Stripe payment intent ID, retrieve it
      if (payment.stripePaymentIntentId) {
        paymentIntent = await this.retrievePaymentIntent(payment.stripePaymentIntentId);
        
        // We can only place in escrow payments that haven't been captured yet
        if (paymentIntent.status === 'succeeded' && paymentIntent.amount_received > 0) {
          throw new PaymentError(
            'Cannot place payment in escrow as it has already been processed',
            payment.id
          );
        }
      } else {
        // Create a new payment intent with capture method set to manual
        const amountInCents = convertToCents(payment.amount);
        
        paymentIntent = await this.stripeClient.paymentIntents.create({
          amount: amountInCents,
          currency: payment.currency || DEFAULT_CURRENCY,
          capture_method: 'manual', // Important: this is what holds funds without charging
          metadata: {
            paymentId: payment.id,
            platformReference: 'ai-talent-marketplace',
            payerId: payment.payerId,
            payeeId: payment.payeeId,
            escrow: 'true',
            escrowReleaseDate: new Date(Date.now() + (escrow.defaultHoldPeriodDays * 86400000)).toISOString()
          }
        });
      }
      
      this.logger.info({
        msg: 'Placed payment in escrow',
        paymentId: payment.id,
        paymentIntentId: paymentIntent.id,
        amount: payment.amount,
        releaseDate: new Date(Date.now() + (escrow.defaultHoldPeriodDays * 86400000)).toISOString()
      });
      
      return paymentIntent;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to place payment in escrow',
        error: error instanceof Error ? error.message : String(error),
        paymentId: payment.id
      });
      
      throw new PaymentError(
        'Failed to place payment in escrow',
        payment.id,
        { originalError: error }
      );
    }
  }
  
  /**
   * Releases funds from escrow by capturing the payment intent
   * @param payment Payment object with details
   * @returns The captured payment intent
   */
  async releaseFromEscrow(payment: Payment): Promise<Stripe.PaymentIntent> {
    if (!payment.stripePaymentIntentId) {
      throw new PaymentError('Payment has no associated Stripe payment intent', payment.id);
    }
    
    try {
      // Retrieve the payment intent to ensure it's uncaptured
      const paymentIntent = await this.retrievePaymentIntent(payment.stripePaymentIntentId);
      
      if (paymentIntent.status !== 'requires_capture') {
        throw new PaymentError(
          `Cannot release payment from escrow as it has status: ${paymentIntent.status}`,
          payment.id
        );
      }
      
      // Capture the payment, effectively releasing from escrow
      const amountInCents = convertToCents(payment.amount);
      const capturedPaymentIntent = await this.stripeClient.paymentIntents.capture(
        payment.stripePaymentIntentId,
        { amount_to_capture: amountInCents }
      );
      
      // Update metadata to reflect escrow release
      await this.stripeClient.paymentIntents.update(payment.stripePaymentIntentId, {
        metadata: {
          ...paymentIntent.metadata,
          escrow: 'released',
          escrowReleaseActualDate: new Date().toISOString()
        }
      });
      
      this.logger.info({
        msg: 'Released payment from escrow',
        paymentId: payment.id,
        paymentIntentId: payment.stripePaymentIntentId,
        amount: payment.amount,
        releaseDate: new Date().toISOString()
      });
      
      return capturedPaymentIntent;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to release payment from escrow',
        error: error instanceof Error ? error.message : String(error),
        paymentId: payment.id,
        paymentIntentId: payment.stripePaymentIntentId
      });
      
      throw new PaymentError(
        'Failed to release payment from escrow',
        payment.id,
        { originalError: error }
      );
    }
  }
  
  /**
   * Creates a transfer to pay a freelancer their earnings
   * @param destinationAccountId ID of the Stripe Connect account to transfer to
   * @param amount Amount to transfer
   * @param currency Currency code
   * @param metadata Additional metadata for the transfer
   * @returns The created transfer object
   */
  async createTransfer(
    destinationAccountId: string,
    amount: number,
    currency: string = DEFAULT_CURRENCY,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Transfer> {
    if (!destinationAccountId) {
      throw new PaymentError('Destination account ID is required');
    }
    
    const amountInCents = convertToCents(amount);
    
    try {
      const transfer = await this.stripeClient.transfers.create({
        amount: amountInCents,
        currency,
        destination: destinationAccountId,
        metadata: {
          platformReference: 'ai-talent-marketplace',
          ...metadata
        }
      });
      
      this.logger.info({
        msg: 'Created transfer',
        destinationAccountId,
        transferId: transfer.id,
        amount,
        currency
      });
      
      return transfer;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create transfer',
        error: error instanceof Error ? error.message : String(error),
        destinationAccountId,
        amount,
        currency
      });
      
      throw new PaymentError(
        'Failed to create transfer',
        undefined,
        { 
          destinationAccountId, 
          amount, 
          currency, 
          originalError: error 
        }
      );
    }
  }
  
  /**
   * Creates a connected account for a freelancer to receive payments
   * @param userId Platform user ID
   * @param email User's email
   * @param accountInfo Additional account information
   * @returns The created connected account
   */
  async createConnectAccount(
    userId: string,
    email: string,
    accountInfo: Partial<Stripe.AccountCreateParams> = {}
  ): Promise<Stripe.Account> {
    try {
      const account = await this.stripeClient.accounts.create({
        type: 'express', // Use express for simplest onboarding
        country: this.config.accountCountry,
        email,
        metadata: {
          userId,
          platformReference: 'ai-talent-marketplace'
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        ...accountInfo
      });
      
      this.logger.info({
        msg: 'Created Stripe Connect account',
        userId,
        accountId: account.id
      });
      
      return account;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create Connect account',
        error: error instanceof Error ? error.message : String(error),
        userId,
        email
      });
      
      throw new PaymentError(
        'Failed to create Connect account',
        undefined,
        { userId, originalError: error }
      );
    }
  }
  
  /**
   * Retrieves a connected account from Stripe by ID
   * @param accountId ID of the connected account to retrieve
   * @returns The retrieved connected account
   */
  async retrieveConnectAccount(accountId: string): Promise<Stripe.Account> {
    if (!accountId) {
      throw new ResourceNotFoundError('Account ID is required');
    }
    
    try {
      return await this.stripeClient.accounts.retrieve(accountId);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to retrieve Connect account',
        error: error instanceof Error ? error.message : String(error),
        accountId
      });
      
      if ((error as any)?.type === 'StripeInvalidRequestError') {
        throw new ResourceNotFoundError('Connect account not found', 'account', accountId);
      }
      
      throw new PaymentError(
        'Failed to retrieve Connect account',
        undefined,
        { accountId, originalError: error }
      );
    }
  }
  
  /**
   * Updates a connected account with new information
   * @param accountId ID of the connected account to update
   * @param updateData Updated account information
   * @returns The updated connected account
   */
  async updateConnectAccount(
    accountId: string,
    updateData: Partial<Stripe.AccountUpdateParams>
  ): Promise<Stripe.Account> {
    if (!accountId) {
      throw new ResourceNotFoundError('Account ID is required');
    }
    
    try {
      const account = await this.stripeClient.accounts.update(accountId, updateData);
      
      this.logger.info({
        msg: 'Updated Connect account',
        accountId
      });
      
      return account;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to update Connect account',
        error: error instanceof Error ? error.message : String(error),
        accountId
      });
      
      throw new PaymentError(
        'Failed to update Connect account',
        undefined,
        { accountId, originalError: error }
      );
    }
  }
  
  /**
   * Creates an onboarding link for a connected account
   * @param accountId ID of the connected account
   * @param refreshUrl URL to redirect on refresh/timeout
   * @param returnUrl URL to redirect on completion
   * @returns The onboarding URL
   */
  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<string> {
    if (!accountId) {
      throw new ResourceNotFoundError('Account ID is required');
    }
    
    try {
      const accountLink = await this.stripeClient.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });
      
      return accountLink.url;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create account link',
        error: error instanceof Error ? error.message : String(error),
        accountId
      });
      
      throw new PaymentError(
        'Failed to create account link',
        undefined,
        { accountId, originalError: error }
      );
    }
  }
  
  /**
   * Processes webhook events from Stripe
   * @param body Raw request body
   * @param signature Stripe signature header
   * @returns Parsed webhook event
   */
  async handleWebhookEvent(
    body: string,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      const event = this.stripeClient.webhooks.constructEvent(
        body,
        signature,
        this.config.webhookSecret
      );
      
      this.logger.info({
        msg: 'Received webhook event',
        eventId: event.id,
        eventType: event.type
      });
      
      return event;
    } catch (error) {
      this.logger.error({
        msg: 'Invalid webhook signature',
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new PaymentError(
        'Invalid webhook signature',
        undefined,
        { originalError: error }
      );
    }
  }
  
  /**
   * Processes specific types of webhook events
   * @param event Webhook event to process
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.info({
            msg: 'Payment succeeded',
            paymentIntentId: paymentIntent.id,
            amount: convertFromCents(paymentIntent.amount)
          });
          // Here we would update our payment record with status COMPLETED
          // This would typically call another service method
          break;
          
        case 'payment_intent.payment_failed':
          // Handle failed payment
          const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
          this.logger.warn({
            msg: 'Payment failed',
            paymentIntentId: failedPaymentIntent.id,
            error: failedPaymentIntent.last_payment_error?.message
          });
          // Here we would update our payment record with status FAILED
          break;
          
        case 'charge.refunded':
          // Handle refund
          const charge = event.data.object as Stripe.Charge;
          this.logger.info({
            msg: 'Charge refunded',
            chargeId: charge.id,
            amount: convertFromCents(charge.amount_refunded)
          });
          // Here we would update our payment record with status REFUNDED
          break;
          
        case 'account.updated':
          // Handle connected account updates
          const account = event.data.object as Stripe.Account;
          this.logger.info({
            msg: 'Connect account updated',
            accountId: account.id,
            requirements: account.requirements
          });
          // Here we would update our account record with new status
          break;
          
        default:
          // Log unhandled event types
          this.logger.debug({
            msg: 'Unhandled webhook event type',
            eventType: event.type,
            eventId: event.id
          });
      }
    } catch (error) {
      this.logger.error({
        msg: 'Error processing webhook event',
        error: error instanceof Error ? error.message : String(error),
        eventId: event.id,
        eventType: event.type
      });
      
      throw new PaymentError(
        'Error processing webhook event',
        undefined,
        { eventId: event.id, eventType: event.type, originalError: error }
      );
    }
  }
  
  /**
   * Creates a payment method for future payments
   * @param type Type of payment method (card, bank_account, etc.)
   * @param paymentMethodDetails Details specific to the payment method type
   * @param billingDetails Billing address and other information
   * @returns The created payment method
   */
  async createPaymentMethod(
    type: string,
    paymentMethodDetails: Record<string, any>,
    billingDetails: Stripe.PaymentMethodCreateParams.BillingDetails
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripeClient.paymentMethods.create({
        type: type as Stripe.PaymentMethodCreateParams.Type,
        [type]: paymentMethodDetails,
        billing_details: billingDetails
      });
      
      this.logger.info({
        msg: 'Created payment method',
        paymentMethodId: paymentMethod.id,
        type
      });
      
      return paymentMethod;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to create payment method',
        error: error instanceof Error ? error.message : String(error),
        type
      });
      
      throw new PaymentError(
        'Failed to create payment method',
        undefined,
        { type, originalError: error }
      );
    }
  }
  
  /**
   * Attaches a payment method to a customer for future use
   * @param paymentMethodId ID of the payment method to attach
   * @param customerId ID of the customer to attach to
   * @returns The attached payment method
   */
  async attachPaymentMethodToCustomer(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    if (!paymentMethodId || !customerId) {
      throw new PaymentError('Payment method ID and customer ID are required');
    }
    
    try {
      const paymentMethod = await this.stripeClient.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );
      
      this.logger.info({
        msg: 'Attached payment method to customer',
        paymentMethodId,
        customerId
      });
      
      return paymentMethod;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to attach payment method to customer',
        error: error instanceof Error ? error.message : String(error),
        paymentMethodId,
        customerId
      });
      
      throw new PaymentError(
        'Failed to attach payment method to customer',
        undefined,
        { paymentMethodId, customerId, originalError: error }
      );
    }
  }
  
  /**
   * Lists all payment methods attached to a customer
   * @param customerId ID of the customer
   * @param type Type of payment methods to list
   * @returns List of payment methods
   */
  async listCustomerPaymentMethods(
    customerId: string,
    type: string = 'card'
  ): Promise<Stripe.PaymentMethod[]> {
    if (!customerId) {
      throw new ResourceNotFoundError('Customer ID is required');
    }
    
    try {
      const paymentMethods = await this.stripeClient.paymentMethods.list({
        customer: customerId,
        type: type as Stripe.PaymentMethodListParams.Type
      });
      
      return paymentMethods.data;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to list customer payment methods',
        error: error instanceof Error ? error.message : String(error),
        customerId,
        type
      });
      
      throw new PaymentError(
        'Failed to list customer payment methods',
        undefined,
        { customerId, type, originalError: error }
      );
    }
  }
  
  /**
   * Detaches a payment method from a customer
   * @param paymentMethodId ID of the payment method to detach
   * @returns The detached payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    if (!paymentMethodId) {
      throw new ResourceNotFoundError('Payment method ID is required');
    }
    
    try {
      const paymentMethod = await this.stripeClient.paymentMethods.detach(paymentMethodId);
      
      this.logger.info({
        msg: 'Detached payment method',
        paymentMethodId
      });
      
      return paymentMethod;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to detach payment method',
        error: error instanceof Error ? error.message : String(error),
        paymentMethodId
      });
      
      throw new PaymentError(
        'Failed to detach payment method',
        undefined,
        { paymentMethodId, originalError: error }
      );
    }
  }
}