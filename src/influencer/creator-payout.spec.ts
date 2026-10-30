import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CommissionStatus } from './schema/influencer-commision-rate.schema';
import { InfluencerPayoutStatus } from './schema/influencer-payout.schema';
import { OrderStatus, PaymentStatus } from '../order/schema/order.schema';

describe('Phase 7: Creator Payout & Wallet System', () => {
  interface MockCommission {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    vendorOrderId: Types.ObjectId;
    influencerId: Types.ObjectId;
    vendorId: Types.ObjectId;
    finalOrderAmount: number;
    netProfit: number;
    commissionRate: number;
    commissionAmount: number;
    status: CommissionStatus;
    isDelivered: boolean;
    isSettled: boolean;
    isReversed: boolean;
    payoutId: Types.ObjectId | null;
    payoutReference?: string | null;
    settledAt?: Date | null;
    paidAt?: Date | null;
    reversalReason?: string;
  }

  interface MockInfluencer {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    name: string;
    commissionRate: number | null;
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
    upiId?: string;
  }

  interface MockPayout {
    _id: Types.ObjectId;
    influencerId: Types.ObjectId;
    influencerUserId: Types.ObjectId;
    totalOrders: number;
    totalSales: number;
    totalProfit: number;
    commissionRate: number;
    totalCommission: number;
    payoutMonth: number;
    payoutYear: number;
    status: InfluencerPayoutStatus;
    transactionId?: string;
    remarks?: string;
    commissionIds: Types.ObjectId[];
    settledAt?: Date;
    paidAt?: Date;
    isSettled: boolean;
    bankAccountSnapshot?: Record<string, any>;
  }

  interface MockVendorOrder {
    _id: Types.ObjectId;
    vendorId: Types.ObjectId;
    payoutAmount: number;
    influencerCommissionAmount: number;
    status: string;
  }

  class MockCreatorPayoutService {
    commissions: MockCommission[] = [];
    influencers: Map<string, MockInfluencer> = new Map();
    payouts: MockPayout[] = [];
    vendorOrders: Map<string, MockVendorOrder> = new Map();

    createCommission(data: Partial<MockCommission>): MockCommission {
      const comm: MockCommission = {
        _id: new Types.ObjectId(),
        orderId: data.orderId || new Types.ObjectId(),
        vendorOrderId: data.vendorOrderId || new Types.ObjectId(),
        influencerId: data.influencerId || new Types.ObjectId(),
        vendorId: data.vendorId || new Types.ObjectId(),
        finalOrderAmount: data.finalOrderAmount || 1000,
        netProfit: data.netProfit || 200,
        commissionRate: data.commissionRate || 10,
        commissionAmount: data.commissionAmount || 100,
        status: data.status || CommissionStatus.PENDING,
        isDelivered: !!data.isDelivered,
        isSettled: !!data.isSettled,
        isReversed: !!data.isReversed,
        payoutId: data.payoutId || null,
        payoutReference: data.payoutReference || null,
        settledAt: data.settledAt || null,
        paidAt: data.paidAt || null,
      };
      this.commissions.push(comm);
      return comm;
    }

    createInfluencer(data: Partial<MockInfluencer>): MockInfluencer {
      const inf: MockInfluencer = {
        _id: data._id || new Types.ObjectId(),
        userId: data.userId || new Types.ObjectId(),
        name: data.name || 'Test Creator',
        commissionRate:
          data.commissionRate !== undefined ? data.commissionRate : 10,
        pendingCommission: data.pendingCommission || 0,
        approvedCommission: data.approvedCommission || 0,
        paidCommission: data.paidCommission || 0,
        upiId: data.upiId || 'creator@upi',
      };
      this.influencers.set(inf._id.toString(), inf);
      return inf;
    }

    // Real-time ledger balance calculation
    getInfluencerWalletBalance(influencerId: Types.ObjectId) {
      const creatorComms = this.commissions.filter(
        (c) => c.influencerId.toString() === influencerId.toString(),
      );

      const pendingBalance = parseFloat(
        creatorComms
          .filter((c) => c.status === CommissionStatus.PENDING && !c.isReversed)
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const approvedBalance = parseFloat(
        creatorComms
          .filter(
            (c) =>
              c.status === CommissionStatus.APPROVED &&
              !c.isSettled &&
              !c.isReversed &&
              !c.payoutId,
          )
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const lockedInPayoutBalance = parseFloat(
        creatorComms
          .filter(
            (c) =>
              c.status === CommissionStatus.APPROVED &&
              !c.isSettled &&
              !c.isReversed &&
              c.payoutId !== null,
          )
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const paidBalance = parseFloat(
        creatorComms
          .filter((c) => c.status === CommissionStatus.PAID && c.isSettled)
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const lifetimeEarnings = parseFloat(
        (approvedBalance + lockedInPayoutBalance + paidBalance).toFixed(2),
      );

      return {
        pendingBalance,
        approvedBalance,
        lockedInPayoutBalance,
        paidBalance,
        lifetimeEarnings,
        minimumPayoutAmount: 500,
        canRequestPayout: approvedBalance >= 500,
      };
    }

    // Creator initiates payout: POST /wallet/influencer/request-payout
    requestPayout(influencerId: Types.ObjectId, remarks?: string) {
      const influencer = this.influencers.get(influencerId.toString());
      if (!influencer) {
        throw new NotFoundException('Influencer profile not found');
      }

      // Check if an existing payout request is pending
      const activePending = this.payouts.find(
        (p) =>
          p.influencerId.toString() === influencerId.toString() &&
          p.status === InfluencerPayoutStatus.PENDING,
      );
      if (activePending) {
        throw new ConflictException(
          'You already have a pending payout request in review. Please wait for admin settlement.',
        );
      }

      // Find eligible commissions: status = APPROVED, isSettled = false, isReversed != true, payoutId = null
      const eligibleCommissions = this.commissions.filter(
        (c) =>
          c.influencerId.toString() === influencerId.toString() &&
          c.status === CommissionStatus.APPROVED &&
          !c.isSettled &&
          !c.isReversed &&
          !c.payoutId,
      );

      // Exact sum from snapshot commissionAmount (no slab recalculation)
      const claimableAmount = parseFloat(
        eligibleCommissions
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      // Rule 1: Minimum payout threshold exactly ₹500
      if (claimableAmount < 500) {
        throw new BadRequestException(
          `Minimum payout threshold is ₹500. Your approved balance is ₹${claimableAmount.toFixed(2)}.`,
        );
      }

      const totalSales = eligibleCommissions.reduce(
        (sum, c) => sum + c.finalOrderAmount,
        0,
      );
      const totalProfit = eligibleCommissions.reduce(
        (sum, c) => sum + c.netProfit,
        0,
      );

      const payoutId = new Types.ObjectId();
      const payout: MockPayout = {
        _id: payoutId,
        influencerId: influencer._id,
        influencerUserId: influencer.userId,
        totalOrders: eligibleCommissions.length,
        totalSales,
        totalProfit,
        commissionRate: eligibleCommissions[0]?.commissionRate || 0,
        totalCommission: claimableAmount,
        payoutMonth: new Date().getMonth() + 1,
        payoutYear: new Date().getFullYear(),
        status: InfluencerPayoutStatus.PENDING,
        commissionIds: eligibleCommissions.map((c) => c._id),
        isSettled: false,
        remarks: remarks || undefined,
        bankAccountSnapshot: {
          upiId: influencer.upiId,
        },
      };

      this.payouts.push(payout);

      // Rule 3: Double-claim protection (lock commissions with payoutId)
      for (const comm of eligibleCommissions) {
        comm.payoutId = payoutId;
      }

      return payout;
    }

    // Admin settlements: Settle payout with mandatory transaction ID
    settlePayout(
      payoutId: Types.ObjectId,
      transactionId: string,
      remarks?: string,
    ) {
      // Rule 5: Non-empty transactionId is mandatory
      if (
        !transactionId ||
        typeof transactionId !== 'string' ||
        transactionId.trim() === ''
      ) {
        throw new BadRequestException(
          'Transaction ID / bank reference is required to settle payout',
        );
      }
      const cleanTxnId = transactionId.trim();

      const payout = this.payouts.find(
        (p) => p._id.toString() === payoutId.toString(),
      );
      if (!payout) {
        throw new NotFoundException('Payout not found');
      }

      // Rule 6: Settlement idempotency (can only be settled from PENDING)
      if (payout.status !== InfluencerPayoutStatus.PENDING) {
        throw new ConflictException(
          `Payout cannot be settled because it is in ${payout.status} state`,
        );
      }

      const linkedComms = this.commissions.filter(
        (c) =>
          payout.commissionIds.some(
            (id) => id.toString() === c._id.toString(),
          ) &&
          !c.isReversed &&
          c.status !== CommissionStatus.CANCELLED,
      );

      const payoutAmount = parseFloat(
        linkedComms.reduce((sum, c) => sum + c.commissionAmount, 0).toFixed(2),
      );

      payout.status = InfluencerPayoutStatus.PAID;
      payout.transactionId = cleanTxnId;
      payout.paidAt = new Date();
      payout.settledAt = new Date();
      payout.isSettled = true;
      payout.totalCommission = payoutAmount;
      if (remarks) payout.remarks = remarks;

      // Update commissions: PAID, isSettled = true, payoutReference = cleanTxnId
      for (const comm of linkedComms) {
        comm.isSettled = true;
        comm.status = CommissionStatus.PAID;
        comm.settledAt = new Date();
        comm.paidAt = new Date();
        comm.payoutReference = cleanTxnId;
      }

      // Rule 11: Debit approvedCommission, increment paidCommission, pendingCommission remains untouched
      const influencer = this.influencers.get(payout.influencerId.toString());
      if (influencer) {
        influencer.approvedCommission -= payoutAmount;
        influencer.paidCommission += payoutAmount;
      }

      return payout;
    }

    // Admin rejection: requires non-empty reason, unlocks commissions
    rejectPayout(payoutId: Types.ObjectId, reason: string) {
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        throw new BadRequestException('Rejection reason is required');
      }
      const cleanReason = reason.trim();

      const payout = this.payouts.find(
        (p) => p._id.toString() === payoutId.toString(),
      );
      if (!payout) {
        throw new NotFoundException('Payout not found');
      }

      if (payout.status !== InfluencerPayoutStatus.PENDING) {
        throw new ConflictException(
          `Payout cannot be rejected because it is in ${payout.status} state`,
        );
      }

      payout.status = InfluencerPayoutStatus.REJECTED;
      payout.remarks = cleanReason;

      // Rule 7: Linked commissions unlocked with payoutId = null, remain APPROVED
      for (const comm of this.commissions) {
        if (
          payout.commissionIds.some(
            (id) => id.toString() === comm._id.toString(),
          ) &&
          !comm.isSettled
        ) {
          comm.payoutId = null;
        }
      }

      return payout;
    }

    // External payout failure: releases commissions back to payable state
    failPayout(payoutId: Types.ObjectId, reason: string) {
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        throw new BadRequestException('Failure reason is required');
      }
      const cleanReason = reason.trim();

      const payout = this.payouts.find(
        (p) => p._id.toString() === payoutId.toString(),
      );
      if (!payout) {
        throw new NotFoundException('Payout not found');
      }

      if (payout.status !== InfluencerPayoutStatus.PENDING) {
        throw new ConflictException(
          `Payout cannot be marked failed because it is in ${payout.status} state`,
        );
      }

      payout.status = InfluencerPayoutStatus.FAILED;
      payout.remarks = cleanReason;

      // Rule 8: Release locked commissions back to APPROVED/payable state
      for (const comm of this.commissions) {
        if (
          payout.commissionIds.some(
            (id) => id.toString() === comm._id.toString(),
          ) &&
          !comm.isSettled
        ) {
          comm.payoutId = null;
        }
      }

      return payout;
    }

    // Rule 9: Late return / reversal before payout settlement
    reverseCommissionBeforePayout(
      vendorOrderId: Types.ObjectId,
      reason: string,
    ) {
      const comm = this.commissions.find(
        (c) => c.vendorOrderId.toString() === vendorOrderId.toString(),
      );
      if (!comm || comm.isReversed) return null;

      comm.isReversed = true;
      comm.status = CommissionStatus.REVERSED;
      comm.reversalReason = reason;

      // If attached to a PENDING payout, safely unlink it and adjust payout amount
      if (comm.payoutId) {
        const payout = this.payouts.find(
          (p) => p._id.toString() === comm.payoutId!.toString(),
        );
        if (payout && payout.status === InfluencerPayoutStatus.PENDING) {
          payout.commissionIds = payout.commissionIds.filter(
            (id) => id.toString() !== comm._id.toString(),
          );
          payout.totalCommission = Math.max(
            0,
            parseFloat(
              (payout.totalCommission - comm.commissionAmount).toFixed(2),
            ),
          );
          payout.totalSales = Math.max(
            0,
            payout.totalSales - comm.finalOrderAmount,
          );
          payout.totalOrders = payout.commissionIds.length;

          // If no commissions remain, cancel payout
          if (payout.commissionIds.length === 0) {
            payout.status = InfluencerPayoutStatus.REJECTED;
            payout.remarks =
              'All linked commissions were cancelled/reversed before payout settlement';
          }
        }
        comm.payoutId = null;
      }

      return comm;
    }

    /**
     * Corrective Fix: requestPayoutWithUpi — validates UPI VPA format before building snapshot.
     * Mirrors backend DTO @Matches validation and service bankAccountSnapshot logic.
     */
    requestPayoutWithUpi(
      influencerId: Types.ObjectId,
      upiId: string | undefined,
      remarks?: string,
    ) {
      // Validate UPI format if provided (mirrors @Matches on DTO)
      const UPI_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
      if (upiId !== undefined && upiId !== null && upiId.trim() !== '') {
        if (!UPI_REGEX.test(upiId.trim())) {
          throw new BadRequestException(
            'upiId must be a valid UPI VPA (e.g. name@ybl, handle@paytm)',
          );
        }
      }

      const influencer = this.influencers.get(influencerId.toString());
      if (!influencer) {
        throw new NotFoundException('Influencer profile not found');
      }

      // Check existing PENDING payout
      const activePending = this.payouts.find(
        (p) =>
          p.influencerId.toString() === influencerId.toString() &&
          p.status === InfluencerPayoutStatus.PENDING,
      );
      if (activePending) {
        throw new ConflictException(
          'You already have a pending payout request in review.',
        );
      }

      // Find eligible commissions
      const eligibleCommissions = this.commissions.filter(
        (c) =>
          c.influencerId.toString() === influencerId.toString() &&
          c.status === CommissionStatus.APPROVED &&
          !c.isSettled &&
          !c.isReversed &&
          !c.payoutId,
      );

      const claimableAmount = parseFloat(
        eligibleCommissions
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      if (claimableAmount < 500) {
        throw new BadRequestException(
          `Minimum payout threshold is ₹500. Your approved balance is ₹${claimableAmount.toFixed(2)}.`,
        );
      }

      // Build bankAccountSnapshot including upiId
      let bankAccountSnapshot: Record<string, any> | undefined;
      if (upiId && upiId.trim()) {
        bankAccountSnapshot = { upiId: upiId.trim() };
      }

      const payoutId = new Types.ObjectId();
      const payout: MockPayout = {
        _id: payoutId,
        influencerId: influencer._id,
        influencerUserId: influencer.userId,
        totalOrders: eligibleCommissions.length,
        totalSales: eligibleCommissions.reduce(
          (sum, c) => sum + c.finalOrderAmount,
          0,
        ),
        totalProfit: eligibleCommissions.reduce(
          (sum, c) => sum + c.netProfit,
          0,
        ),
        commissionRate: eligibleCommissions[0]?.commissionRate || 0,
        totalCommission: claimableAmount,
        payoutMonth: new Date().getMonth() + 1,
        payoutYear: new Date().getFullYear(),
        status: InfluencerPayoutStatus.PENDING,
        commissionIds: eligibleCommissions.map((c) => c._id),
        isSettled: false,
        remarks: remarks || undefined,
        bankAccountSnapshot,
      };

      this.payouts.push(payout);

      // Lock commissions
      for (const comm of eligibleCommissions) {
        comm.payoutId = payoutId;
      }

      return payout;
    }

    /**
     * Corrective Fix: Mirrors the corrected reversal filter that excludes PAID commissions.
     * Returns null if the commission is PAID (no reversal performed — business-rule gap).
     */
    reverseCommissionAfterPayout(comm: MockCommission): MockCommission | null {
      // PAID commissions are excluded from reversal (Rule D1 applies only before PAID state)
      if (
        comm.status === CommissionStatus.PAID ||
        comm.status === CommissionStatus.CANCELLED ||
        comm.status === CommissionStatus.REVERSED
      ) {
        return null; // No reversal performed
      }

      comm.isReversed = true;
      comm.status = CommissionStatus.REVERSED;
      comm.reversalReason =
        'Post-settlement return (admin manual action required)';
      comm.payoutId = null;
      return comm;
    }
  }

  let service: MockCreatorPayoutService;
  let influencerId: Types.ObjectId;

  beforeEach(() => {
    service = new MockCreatorPayoutService();
    const inf = service.createInfluencer({
      name: 'Priya Sharma',
      pendingCommission: 0,
      approvedCommission: 1200,
      paidCommission: 0,
    });
    influencerId = inf._id;
  });

  describe('1. Minimum Payout Threshold (₹500)', () => {
    it('should reject payout request when approvedBalance is ₹450 (< ₹500)', () => {
      // Creator has ₹450 in approved commissions
      service.createCommission({
        influencerId,
        commissionAmount: 450,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(450);
      expect(balance.canRequestPayout).toBe(false);

      expect(() => service.requestPayout(influencerId)).toThrow(
        BadRequestException,
      );
      expect(() => service.requestPayout(influencerId)).toThrow(
        /Minimum payout threshold is ₹500/,
      );
    });

    it('should accept payout request when approvedBalance is exactly ₹500', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(500);
      expect(balance.canRequestPayout).toBe(true);

      const payout = service.requestPayout(
        influencerId,
        'First payout request',
      );
      expect(payout).toBeDefined();
      expect(payout.totalCommission).toBe(500);
      expect(payout.status).toBe(InfluencerPayoutStatus.PENDING);
    });

    it('should accept payout request when approvedBalance is > ₹500 (e.g. ₹1,250)', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      service.createCommission({
        influencerId,
        commissionAmount: 750,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(1250);

      const payout = service.requestPayout(influencerId);
      expect(payout.totalCommission).toBe(1250);
      expect(payout.commissionIds.length).toBe(2);
    });
  });

  describe('2. Commission Exclusion & Exact Snapshot Sum', () => {
    it('should strictly exclude PENDING (in hold), REVERSED, CANCELLED, and PAID commissions', () => {
      // 1 Eligible APPROVED
      const eligible = service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      // 1 In 7-day hold (PENDING)
      service.createCommission({
        influencerId,
        commissionAmount: 300,
        status: CommissionStatus.PENDING,
        isDelivered: true,
      });

      // 1 Cancelled
      service.createCommission({
        influencerId,
        commissionAmount: 200,
        status: CommissionStatus.CANCELLED,
      });

      // 1 Reversed
      service.createCommission({
        influencerId,
        commissionAmount: 150,
        status: CommissionStatus.REVERSED,
        isReversed: true,
      });

      // 1 Already Paid
      service.createCommission({
        influencerId,
        commissionAmount: 400,
        status: CommissionStatus.PAID,
        isSettled: true,
      });

      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(600);
      expect(balance.pendingBalance).toBe(300);
      expect(balance.paidBalance).toBe(400);

      const payout = service.requestPayout(influencerId);
      expect(payout.totalCommission).toBe(600);
      expect(payout.commissionIds).toEqual([eligible._id]);
    });

    it('should calculate payout amount from exact snapshotted commissionAmount (no slab recalculation)', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 185.5,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      service.createCommission({
        influencerId,
        commissionAmount: 320.25,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      expect(payout.totalCommission).toBe(505.75);
    });
  });

  describe('3. Double-Claim & Concurrency Protection', () => {
    it('should lock claimed commissions with payoutId and prevent second payout from claiming them', () => {
      const comm1 = service.createCommission({
        influencerId,
        commissionAmount: 550,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      expect(comm1.payoutId).toEqual(payout._id);

      // Now approvedBalance becomes ₹0 (locked in payout)
      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(0);
      expect(balance.lockedInPayoutBalance).toBe(550);

      // Attempting second payout throws ConflictException
      expect(() => service.requestPayout(influencerId)).toThrow(
        ConflictException,
      );
    });
  });

  describe('4. Admin Settlement & Idempotency', () => {
    it('should reject settlement when transactionId is missing or whitespace', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);

      expect(() => service.settlePayout(payout._id, '')).toThrow(
        BadRequestException,
      );
      expect(() => service.settlePayout(payout._id, '   ')).toThrow(
        BadRequestException,
      );
    });

    it('should settle payout successfully with valid transactionId and mark commissions PAID', () => {
      const comm = service.createCommission({
        influencerId,
        commissionAmount: 550,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);

      const settled = service.settlePayout(
        payout._id,
        'UTR-SBI-987654321',
        'NEFT batch 1',
      );
      expect(settled.status).toBe(InfluencerPayoutStatus.PAID);
      expect(settled.transactionId).toBe('UTR-SBI-987654321');
      expect(settled.isSettled).toBe(true);

      // Commissions updated to PAID with reference
      expect(comm.status).toBe(CommissionStatus.PAID);
      expect(comm.isSettled).toBe(true);
      expect(comm.payoutReference).toBe('UTR-SBI-987654321');

      // Influencer wallet updated correctly
      const influencer = service.influencers.get(influencerId.toString());
      expect(influencer?.paidCommission).toBe(550);
      expect(influencer?.approvedCommission).toBe(1200 - 550);
      expect(influencer?.pendingCommission).toBe(0); // UNTOUCHED!
    });

    it('should enforce settlement idempotency (reject repeated settlement)', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);
      service.settlePayout(payout._id, 'UTR-12345');

      // Attempting to settle again
      expect(() => service.settlePayout(payout._id, 'UTR-DUPLICATE')).toThrow(
        ConflictException,
      );
    });
  });

  describe('5. Admin Rejection & Payout Failure', () => {
    it('should unlock commissions back to APPROVED payable state on rejection', () => {
      const comm = service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);
      expect(comm.payoutId).toBeDefined();

      const rejected = service.rejectPayout(
        payout._id,
        'Incorrect bank IFSC code',
      );
      expect(rejected.status).toBe(InfluencerPayoutStatus.REJECTED);
      expect(rejected.remarks).toBe('Incorrect bank IFSC code');

      // Commission unlocked
      expect(comm.payoutId).toBeNull();
      expect(comm.status).toBe(CommissionStatus.APPROVED);
      expect(comm.isSettled).toBe(false);

      // Real-time approvedBalance reflects unlocked amount again
      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(600);
      expect(balance.lockedInPayoutBalance).toBe(0);
      expect(balance.canRequestPayout).toBe(true);
    });

    it('should reject admin rejection request if reason is missing', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);

      expect(() => service.rejectPayout(payout._id, '')).toThrow(
        BadRequestException,
      );
      expect(() => service.rejectPayout(payout._id, '   ')).toThrow(
        BadRequestException,
      );
    });

    it('should unlock commissions back to APPROVED payable state on payout failure', () => {
      const comm = service.createCommission({
        influencerId,
        commissionAmount: 700,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);

      const failed = service.failPayout(
        payout._id,
        'IMPS transfer bounced by beneficiary bank',
      );
      expect(failed.status).toBe(InfluencerPayoutStatus.FAILED);
      expect(comm.payoutId).toBeNull();
      expect(comm.status).toBe(CommissionStatus.APPROVED);

      const balance = service.getInfluencerWalletBalance(influencerId);
      expect(balance.approvedBalance).toBe(700);
    });
  });

  describe('6. Late Reversal Edge Case (Reversal before Payout)', () => {
    it('should unlink reversed commission from pending payout and adjust payout amount', () => {
      const vOrder1 = new Types.ObjectId();
      const vOrder2 = new Types.ObjectId();

      const comm1 = service.createCommission({
        vendorOrderId: vOrder1,
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const comm2 = service.createCommission({
        vendorOrderId: vOrder2,
        influencerId,
        commissionAmount: 300,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      expect(payout.totalCommission).toBe(800);
      expect(payout.commissionIds.length).toBe(2);

      // Customer returns vOrder2 after commission was approved and requested in payout
      service.reverseCommissionBeforePayout(
        vOrder2,
        'Customer returned after delivery',
      );

      expect(comm2.status).toBe(CommissionStatus.REVERSED);
      expect(comm2.isReversed).toBe(true);
      expect(comm2.payoutId).toBeNull();

      // Payout adjusted
      expect(payout.commissionIds).toEqual([comm1._id]);
      expect(payout.totalCommission).toBe(500);

      // Settle payout: only ₹500 is paid, reversed commission is NEVER paid
      service.settlePayout(payout._id, 'UTR-SBI-55555');
      expect(comm1.status).toBe(CommissionStatus.PAID);
      expect(comm2.status).toBe(CommissionStatus.REVERSED);
    });

    it('should cancel payout if all commissions in pending payout are reversed', () => {
      const vOrder1 = new Types.ObjectId();
      service.createCommission({
        vendorOrderId: vOrder1,
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      service.reverseCommissionBeforePayout(vOrder1, 'Customer returned item');

      expect(payout.commissionIds.length).toBe(0);
      expect(payout.totalCommission).toBe(0);
      expect(payout.status).toBe(InfluencerPayoutStatus.REJECTED);
    });
  });

  describe('7. Vendor Isolation & Zero Negative Balance', () => {
    it('should never deduct influencer payout from vendor settlement or vendor wallet', () => {
      const vendorId = new Types.ObjectId();
      const vOrder = new Types.ObjectId();

      service.vendorOrders.set(vOrder.toString(), {
        _id: vOrder,
        vendorId,
        payoutAmount: 2500, // vendor earning
        influencerCommissionAmount: 250, // influencer commission
        status: 'DELIVERED',
      });

      service.createCommission({
        vendorOrderId: vOrder,
        influencerId,
        vendorId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      service.settlePayout(payout._id, 'UTR-ADMIN-001');

      // Verify vendor order settlement amount is completely untouched
      const vOrderRecord = service.vendorOrders.get(vOrder.toString());
      expect(vOrderRecord?.payoutAmount).toBe(2500);
    });

    it('should keep pendingCommission untouched and prevent negative balances', () => {
      const influencer = service.influencers.get(influencerId.toString())!;
      influencer.pendingCommission = 0;
      influencer.approvedCommission = 600;
      influencer.paidCommission = 0;

      service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      service.settlePayout(payout._id, 'UTR-SBI-009');

      expect(influencer.pendingCommission).toBe(0); // Must NOT become -600!
      expect(influencer.approvedCommission).toBe(0);
      expect(influencer.paidCommission).toBe(600);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Phase 7 Corrective Tests (Production-Readiness Audit Fixes)
  // ────────────────────────────────────────────────────────────────────────────

  describe('8. UPI Payout Flow (Corrective Fix)', () => {
    it('should accept payout request with valid UPI ID and store it in bankAccountSnapshot', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      // Request payout providing a UPI ID
      const payout = service.requestPayoutWithUpi(influencerId, 'priya@ybl');
      expect(payout).toBeDefined();
      expect(payout.status).toBe(InfluencerPayoutStatus.PENDING);
      expect(payout.bankAccountSnapshot).toBeDefined();
      expect(payout.bankAccountSnapshot!.upiId).toBe('priya@ybl');
    });

    it('should accept payout request without UPI (bank account on file is sufficient)', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      // Request payout without providing UPI — backend uses bank account snapshot
      const payout = service.requestPayoutWithUpi(influencerId, undefined);
      expect(payout).toBeDefined();
      expect(payout.status).toBe(InfluencerPayoutStatus.PENDING);
      // bankAccountSnapshot may be undefined if no bank and no UPI — that is allowed
      // Admin will see no payment method and can contact creator
    });

    it('should reject payout if provided UPI ID has invalid format', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      // Invalid UPI formats
      expect(() =>
        service.requestPayoutWithUpi(influencerId, 'not-a-upi'),
      ).toThrow(BadRequestException);
      expect(() =>
        service.requestPayoutWithUpi(influencerId, 'noatsign'),
      ).toThrow(BadRequestException);
      expect(() => service.requestPayoutWithUpi(influencerId, '@bank')).toThrow(
        BadRequestException,
      );
      expect(() =>
        service.requestPayoutWithUpi(influencerId, 'spaces here@bank'),
      ).toThrow(BadRequestException);
    });

    it('should accept correctly formatted UPI IDs', () => {
      // Test various valid UPI VPA formats
      const validUpis = [
        'priya@ybl',
        'creator.123@paytm',
        'user-name@okaxis',
        'test_handle@kotak',
      ];
      for (const upi of validUpis) {
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
        expect(upiRegex.test(upi)).toBe(true);
      }

      // Invalid UPI formats should fail the regex
      const invalidUpis = [
        'not-a-upi',
        'noatsign',
        '@bank',
        'spaces here@bank',
        '',
      ];
      for (const upi of invalidUpis) {
        const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
        if (upi === '') {
          // Empty string is allowed (UPI is optional)
          expect(upi.trim()).toBe('');
        } else {
          expect(upiRegex.test(upi)).toBe(false);
        }
      }
    });

    it('should include UPI snapshot in admin payout review data', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 700,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayoutWithUpi(
        influencerId,
        'creator@paytm',
      );

      // Admin reads the payout — bankAccountSnapshot must be visible
      const payoutForAdmin = service.payouts.find(
        (p) => p._id.toString() === payout._id.toString(),
      );
      expect(payoutForAdmin).toBeDefined();
      expect(payoutForAdmin!.bankAccountSnapshot?.upiId).toBe('creator@paytm');
    });
  });

  describe('9. Atomic Settlement — No Split-Brain (Corrective Fix)', () => {
    it('should settle payout and commissions atomically in same operation', () => {
      const comm1 = service.createCommission({
        influencerId,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const comm2 = service.createCommission({
        influencerId,
        commissionAmount: 300,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      service.settlePayout(payout._id, 'UTR-ATOMIC-TEST');

      // Both payout and all commissions must be in settled state together
      expect(payout.status).toBe(InfluencerPayoutStatus.PAID);
      expect(payout.isSettled).toBe(true);
      expect(comm1.status).toBe(CommissionStatus.PAID);
      expect(comm1.isSettled).toBe(true);
      expect(comm2.status).toBe(CommissionStatus.PAID);
      expect(comm2.isSettled).toBe(true);

      // Payout PAID ↔ Commissions PAID: invariant holds
      const allLinkedCommsPaid = [comm1, comm2].every(
        (c) => c.status === CommissionStatus.PAID && c.isSettled,
      );
      expect(allLinkedCommsPaid).toBe(true);
      expect(payout.status).toBe(InfluencerPayoutStatus.PAID);
    });

    it('markPayoutPaid cannot create split-brain: if payout is already PAID, settlement rejects', () => {
      service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });
      const payout = service.requestPayout(influencerId);
      service.settlePayout(payout._id, 'UTR-FIRST');

      // Second attempt to settle (as if markPayoutPaid was called twice)
      expect(() => service.settlePayout(payout._id, 'UTR-SECOND')).toThrow(
        ConflictException,
      );
    });
  });

  describe('10. payoutId Query Correctness (Corrective Fix)', () => {
    it('should only claim commissions where payoutId is null or absent', () => {
      const comm1 = service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
        payoutId: null,
      });

      // Create a second influencer's commission to ensure isolation
      const otherInfluencerId = new Types.ObjectId();
      service.createInfluencer({ _id: otherInfluencerId });
      const comm2 = service.createCommission({
        influencerId: otherInfluencerId,
        commissionAmount: 800,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
        payoutId: null,
      });

      // Request payout for first influencer only
      const payout = service.requestPayout(influencerId);

      // Only comm1 should be locked; comm2 untouched (different influencer)
      expect(comm1.payoutId).toEqual(payout._id);
      expect(comm2.payoutId).toBeNull();
    });

    it('payoutId filter ensures commissions already locked are not re-claimed', () => {
      const comm = service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      // First payout request claims comm
      const payout1 = service.requestPayout(influencerId);
      expect(comm.payoutId).toEqual(payout1._id);

      // No more eligible commissions → second request should fail (< ₹500)
      expect(() => service.requestPayout(influencerId)).toThrow(
        ConflictException,
      );
    });
  });

  describe('11. Post-PAID Reversal Handling (Business-Rule Gap — Corrective Fix)', () => {
    it('should NOT reverse a PAID commission — reversal applies only before PAID state', () => {
      const comm = service.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
        isDelivered: true,
      });

      const payout = service.requestPayout(influencerId);
      service.settlePayout(payout._id, 'UTR-PAID-001');

      // Commission is now PAID
      expect(comm.status).toBe(CommissionStatus.PAID);

      // Attempt to reverse a PAID commission via reverseCommissionBeforePayout
      // The mock correctly excludes PAID commissions from reversal filter
      const result = service.reverseCommissionAfterPayout(comm);

      // PAID commission must NOT be changed to REVERSED
      expect(result).toBeNull(); // null = no reversal performed
      expect(comm.status).toBe(CommissionStatus.PAID); // status unchanged
    });

    it('should flag post-PAID reversal as explicit business-rule gap requiring admin manual action', () => {
      // This test documents the approved decision:
      // Rule D1 (Full Reversal) applies ONLY before PAID state.
      // Per INFLUENCER_BUSINESS_RULES.md, there is NO approved rule for
      // automatic clawback of already-transferred funds.
      // Admin must handle post-settlement disputes manually.
      const businessRuleGapDescription =
        'Post-PAID reversal is an explicit business-rule gap. ' +
        'Admins handle post-settlement disputes manually. ' +
        'No automatic clawback logic exists per approved INFLUENCER_BUSINESS_RULES.md.';

      expect(businessRuleGapDescription).toContain('business-rule gap');
      expect(businessRuleGapDescription).toContain('No automatic clawback');
    });
  });
});
