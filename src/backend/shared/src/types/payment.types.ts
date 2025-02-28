/**
 * TypeScript type definitions for payment-related entities in the AI Talent Marketplace platform.
 * This file defines enumerations, interfaces, and types for payments, transactions, contracts,
 * milestones, and related data transfer objects that are shared across backend services.
 */

import { User } from './user.types';
import { Job } from './job.types';

/**
 * Enumeration of possible payment statuses throughout its lifecycle
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  HELD_IN_ESCROW = 'held_in_escrow',
  RELEASED_FROM_ESCROW = 'released_from_escrow'
}

/**
 * Enumeration of supported payment methods
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  PLATFORM_CREDIT = 'platform_credit'
}

/**
 * Enumeration of transaction types for financial tracking
 */
export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  FEE = 'fee',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  ESCROW_HOLD = 'escrow_hold',
  ESCROW_RELEASE = 'escrow_release'
}

/**
 * Enumeration of possible contract statuses
 */
export enum ContractStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed'
}

/**
 * Enumeration of possible milestone statuses
 */
export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid'
}

/**
 * Interface representing a payment in the AI Talent Marketplace
 */
export interface Payment {
  id: string;
  contractId: string;
  milestoneId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  fee: number;
  status: PaymentStatus;
  method: PaymentMethod;
  description: string;
  stripePaymentIntentId: string;
  stripeTransferId: string;
  metadata: Record<string, any>;
  escrowHoldDate: Date;
  escrowReleaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date;
}

/**
 * Interface representing a financial transaction record
 */
export interface Transaction {
  id: string;
  paymentId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  balance: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a contract between client and freelancer
 */
export interface Contract {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  title: string;
  description: string;
  totalAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  status: ContractStatus;
  terms: string;
  attachments: string[];
  clientSignedAt: Date;
  freelancerSignedAt: Date;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a contract milestone
 */
export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: MilestoneStatus;
  order: number;
  completionProof: string[];
  paymentId: string;
  submittedAt: Date;
  approvedAt: Date;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a user's balance
 */
export interface UserBalance {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a saved payment method
 * Note: To avoid TypeScript naming conflicts with the PaymentMethod enum,
 * this is named PaymentMethodInfo while preserving the required structure.
 */
export interface PaymentMethodInfo {
  id: string;
  userId: string;
  type: PaymentMethod;
  isDefault: boolean;
  name: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  stripePaymentMethodId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export as PaymentMethod interface
export type PaymentMethod = PaymentMethodInfo;

/**
 * Data Transfer Object for creating a new payment
 */
export interface PaymentDTO {
  contractId: string;
  milestoneId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  description: string;
  paymentMethodId: string;
}

/**
 * Data Transfer Object for creating a new contract
 */
export interface ContractCreateDTO {
  jobId: string;
  freelancerId: string;
  title: string;
  description: string;
  totalAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  terms: string;
  attachments: string[];
  milestones: MilestoneCreateDTO[];
}

/**
 * Data Transfer Object for creating a new milestone
 */
export interface MilestoneCreateDTO {
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  order: number;
}

/**
 * Data Transfer Object for submitting a completed milestone
 */
export interface MilestoneSubmitDTO {
  completionProof: string[];
  comments: string;
}

/**
 * Data Transfer Object for reviewing a milestone submission
 */
export interface MilestoneReviewDTO {
  approved: boolean;
  comments: string;
}

/**
 * Data Transfer Object for creating a new payment method
 */
export interface PaymentMethodCreateDTO {
  type: PaymentMethod;
  name: string;
  stripePaymentMethodId: string;
  isDefault: boolean;
}

/**
 * Interface defining parameters for payment search and filtering
 */
export interface PaymentSearchParams {
  userId: string;
  contractId: string;
  milestoneId: string;
  payerId: string;
  payeeId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  minAmount: number;
  maxAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

/**
 * Interface defining parameters for transaction search and filtering
 */
export interface TransactionSearchParams {
  userId: string;
  paymentId: string;
  type: TransactionType;
  minAmount: number;
  maxAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

/**
 * Interface representing payment statistics for a user
 */
export interface PaymentStatistics {
  totalEarnings: number;
  totalSpent: number;
  pendingPayments: number;
  amountInEscrow: number;
  paymentsMade: number;
  paymentsReceived: number;
  totalFeesPaid: number;
}

/**
 * Interface representing escrow settings for the platform
 */
export interface EscrowSettings {
  enabled: boolean;
  releaseDelay: number;
  disputeWindow: number;
  automaticRelease: boolean;
}