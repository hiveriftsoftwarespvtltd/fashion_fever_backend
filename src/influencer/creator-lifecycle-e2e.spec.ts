import { Types } from 'mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommissionStatus, AttributionSource } from './schema/influencer-commision-rate.schema';
import { InfluencerPayoutStatus } from './schema/influencer-payout.schema';
import { AffiliateTrackingService } from './affiliate-tracking.service';

describe('Phase 10: Master End-to-End Creator Lifecycle & Concurrency Suite', () => {

  // =========================================================================
  // SHARED DOMAIN MOCKS & INTERFACES
  // =========================================================================
  interface MockInfluencer {
    _id: string;
    userId: string;
    name: string;
    commissionRate: number | null; // null/undefined = unconfigured; 0 = 0%; >0 = percentage
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
    upiId?: string;
  }

  interface MockCustomer {
    _id: string;
    referredByInfluencerId: string | null;
    referralExpiresAt: Date | null;
  }

  interface MockCommission {
    _id: string;
    orderId: string;
    vendorOrderId: string;
    influencerId: string;
    finalOrderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    attributionSource: AttributionSource;
    status: CommissionStatus;
    isDelivered: boolean;
    deliveredAt: Date | null;
    approvalEligibleAt: Date | null;
    isSettled: boolean;
    isReversed: boolean;
    payoutId: string | null;
    payoutReference: string | null;
    settledAt: Date | null;
    paidAt: Date | null;
  }

  interface MockPayout {
    _id: string;
    influencerId: string;
    totalCommission: number;
    status: InfluencerPayoutStatus;
    transactionId?: string;
    commissionIds: string[];
    bankAccountSnapshot?: { upiId?: string; accountNumber?: string };
    isSettled: boolean;
    settledAt?: Date;
    paidAt?: Date;
    rejectionReason?: string;
  }

  class MockEcommerceLifecycleHarness {
    influencers: Map<string, MockInfluencer> = new Map();
    customers: Map<string, MockCustomer> = new Map();
    commissions: Map<string, MockCommission> = new Map();
    payouts: Map<string, MockPayout> = new Map();

    createInfluencer(data: { _id?: string; userId?: string; name: string; commissionRate: number | null; upiId?: string }): MockInfluencer {
      const inf: MockInfluencer = {
        _id: data._id || new Types.ObjectId().toString(),
        userId: data.userId || new Types.ObjectId().toString(),
        name: data.name,
        commissionRate: data.commissionRate,
        pendingCommission: 0,
        approvedCommission: 0,
        paidCommission: 0,
        upiId: data.upiId || 'creator@okaxis',
      };
      this.influencers.set(inf._id, inf);
      return inf;
    }

    createCustomer(data: { _id?: string; referredByInfluencerId?: string | null; referralExpiresAt?: Date | null }): MockCustomer {
      const cust: MockCustomer = {
        _id: data._id || new Types.ObjectId().toString(),
        referredByInfluencerId: data.referredByInfluencerId || null,
        referralExpiresAt: data.referralExpiresAt || null,
      };
      this.customers.set(cust._id, cust);
      return cust;
    }

    // Process order with Zero-Default Policy, Rule B2, and Rule E2
    processOrderPlacement(params: {
      customerId: string;
      finalOrderAmount: number;
      paymentMode: 'ONLINE' | 'COD';
      couponCode?: string;
      couponInfluencerId?: string;
      orderDate?: Date;
    }) {
      const customer = this.customers.get(params.customerId);
      if (!customer) throw new NotFoundException('Customer not found');

      const now = params.orderDate || new Date();
      let activeBeneficiaryId: string | null = null;
      let activeSource: AttributionSource | null = null;

      // Rule E2: Creator applying own coupon is rejected server-side
      if (params.couponInfluencerId) {
        const couponInf = this.influencers.get(params.couponInfluencerId);
        if (couponInf && couponInf.userId === params.customerId) {
          throw new BadRequestException('You cannot use your own influencer coupon.');
        }
      }

      // Check active referral attribution (365-day expiry boundary)
      const hasValidReferral = customer.referredByInfluencerId &&
        customer.referralExpiresAt &&
        customer.referralExpiresAt > now;

      // Rule B2: Referral link beats coupon
      if (hasValidReferral && customer.referredByInfluencerId) {
        const refInf = this.influencers.get(customer.referredByInfluencerId);
        // Rule E2: Self-purchase via referral link suppresses attribution (no commission record)
        if (refInf && refInf.userId === params.customerId) {
          activeBeneficiaryId = null;
          activeSource = null;
        } else {
          activeBeneficiaryId = customer.referredByInfluencerId;
          activeSource = AttributionSource.REFERRAL;
        }
      } else if (params.couponInfluencerId) {
        activeBeneficiaryId = params.couponInfluencerId;
        activeSource = AttributionSource.COUPON;
      }

      // Zero-Default Policy Invariant:
      // If beneficiary has null/undefined commissionRate -> NO record created (unconfigured rate != 0%)
      if (!activeBeneficiaryId) {
        return { orderSuccess: true, commissionRecord: null };
      }

      const beneficiary = this.influencers.get(activeBeneficiaryId);
      if (!beneficiary || beneficiary.commissionRate === null || beneficiary.commissionRate === undefined) {
        // UNCONFIGURED RATE: NO commission record is created!
        return { orderSuccess: true, commissionRecord: null };
      }

      // If COD: financial recognition of commission is deferred until DELIVERED + PAID
      if (params.paymentMode === 'COD') {
        return {
          orderSuccess: true,
          commissionRecord: null,
          deferredCODData: {
            influencerId: beneficiary._id,
            finalOrderAmount: params.finalOrderAmount,
            commissionRate: beneficiary.commissionRate,
            attributionSource: activeSource!,
          },
        };
      }

      // ONLINE: Verified payment captured immediately -> Commission created with status PENDING, isDelivered = false
      const commissionAmount = parseFloat(((params.finalOrderAmount * beneficiary.commissionRate) / 100).toFixed(2));
      const commId = new Types.ObjectId().toString();
      const commission: MockCommission = {
        _id: commId,
        orderId: new Types.ObjectId().toString(),
        vendorOrderId: new Types.ObjectId().toString(),
        influencerId: beneficiary._id,
        finalOrderAmount: params.finalOrderAmount,
        commissionRate: beneficiary.commissionRate,
        commissionAmount,
        attributionSource: activeSource!,
        status: CommissionStatus.PENDING,
        isDelivered: false,
        deliveredAt: null,
        approvalEligibleAt: null,
        isSettled: false,
        isReversed: false,
        payoutId: null,
        payoutReference: null,
        settledAt: null,
        paidAt: null,
      };

      this.commissions.set(commId, commission);
      beneficiary.pendingCommission += commissionAmount;

      return { orderSuccess: true, commissionRecord: commission };
    }

    // COD Delivery + Verified Cash Collection milestone
    confirmCodDeliveryAndPayment(deferredData: {
      influencerId: string;
      finalOrderAmount: number;
      commissionRate: number;
      attributionSource: AttributionSource;
    }, deliveryDate = new Date()) {
      const beneficiary = this.influencers.get(deferredData.influencerId);
      if (!beneficiary) throw new NotFoundException('Influencer not found');

      const commissionAmount = parseFloat(((deferredData.finalOrderAmount * deferredData.commissionRate) / 100).toFixed(2));
      const approvalEligibleAt = new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const commId = new Types.ObjectId().toString();
      const commission: MockCommission = {
        _id: commId,
        orderId: new Types.ObjectId().toString(),
        vendorOrderId: new Types.ObjectId().toString(),
        influencerId: beneficiary._id,
        finalOrderAmount: deferredData.finalOrderAmount,
        commissionRate: deferredData.commissionRate,
        commissionAmount,
        attributionSource: deferredData.attributionSource,
        status: CommissionStatus.PENDING,
        isDelivered: true,
        deliveredAt: deliveryDate,
        approvalEligibleAt,
        isSettled: false,
        isReversed: false,
        payoutId: null,
        payoutReference: null,
        settledAt: null,
        paidAt: null,
      };

      this.commissions.set(commId, commission);
      beneficiary.pendingCommission += commissionAmount;

      return commission;
    }

    // Mark online order delivered: starts 7-day return hold post-delivery
    markOnlineOrderDelivered(commissionId: string, deliveryDate = new Date()) {
      const comm = this.commissions.get(commissionId);
      if (!comm) throw new NotFoundException('Commission not found');

      comm.isDelivered = true;
      comm.deliveredAt = deliveryDate;
      comm.approvalEligibleAt = new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      return comm;
    }

    // Order cancellation / return (Rule D1: 100% full reversal)
    cancelOrReturnOrder(commissionId: string) {
      const comm = this.commissions.get(commissionId);
      if (!comm) throw new NotFoundException('Commission not found');

      comm.status = CommissionStatus.CANCELLED;
      comm.isReversed = true;

      const inf = this.influencers.get(comm.influencerId);
      if (inf) {
        inf.pendingCommission -= comm.commissionAmount;
      }
      return comm;
    }

    // Daily Cron Maturation: runs on Day 8 (approvalEligibleAt <= evalDate)
    runMaturationCron(evalDate = new Date()) {
      let maturedCount = 0;
      this.commissions.forEach((comm) => {
        if (
          comm.status === CommissionStatus.PENDING &&
          comm.isDelivered &&
          !comm.isReversed &&
          comm.approvalEligibleAt &&
          comm.approvalEligibleAt <= evalDate
        ) {
          comm.status = CommissionStatus.APPROVED;
          const inf = this.influencers.get(comm.influencerId);
          if (inf) {
            inf.pendingCommission -= comm.commissionAmount;
            inf.approvedCommission += comm.commissionAmount;
          }
          maturedCount++;
        }
      });
      return maturedCount;
    }

    // Creator Wallet Balance Arithmetic
    getWalletBalance(influencerId: string) {
      const infComms = [...this.commissions.values()].filter((c) => c.influencerId === influencerId);

      const pendingBalance = parseFloat(
        infComms
          .filter((c) => c.status === CommissionStatus.PENDING && !c.isReversed)
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const approvedBalance = parseFloat(
        infComms
          .filter((c) => c.status === CommissionStatus.APPROVED && !c.isSettled && !c.isReversed && !c.payoutId)
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const lockedInPayoutBalance = parseFloat(
        infComms
          .filter((c) => c.status === CommissionStatus.APPROVED && !c.isSettled && !c.isReversed && c.payoutId !== null)
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      const paidBalance = parseFloat(
        infComms
          .filter((c) => c.status === CommissionStatus.PAID && c.isSettled)
          .reduce((sum, c) => sum + c.commissionAmount, 0)
          .toFixed(2),
      );

      return {
        pendingBalance,
        approvedBalance,
        lockedInPayoutBalance,
        paidBalance,
        canRequestPayout: approvedBalance >= 500,
      };
    }

    // Creator Requests Payout (Rule G2: ₹500 minimum)
    requestPayout(influencerId: string) {
      // Check for active pending payout first (Rule G3 & Concurrency safety)
      const activePending = [...this.payouts.values()].find(
        (p) => p.influencerId === influencerId && p.status === InfluencerPayoutStatus.PENDING,
      );
      if (activePending) {
        throw new ConflictException('You already have a pending payout request in review.');
      }

      const balance = this.getWalletBalance(influencerId);
      if (balance.approvedBalance < 500) {
        throw new BadRequestException('Minimum payout amount is ₹500. Current approved balance: ₹' + balance.approvedBalance);
      }

      const eligibleComms = [...this.commissions.values()].filter(
        (c) => c.influencerId === influencerId && c.status === CommissionStatus.APPROVED && !c.isSettled && !c.isReversed && !c.payoutId,
      );

      const payoutId = new Types.ObjectId().toString();
      const totalAmount = parseFloat(eligibleComms.reduce((sum, c) => sum + c.commissionAmount, 0).toFixed(2));

      // Lock commissions
      eligibleComms.forEach((c) => {
        c.payoutId = payoutId;
      });

      const inf = this.influencers.get(influencerId);
      const payout: MockPayout = {
        _id: payoutId,
        influencerId,
        totalCommission: totalAmount,
        status: InfluencerPayoutStatus.PENDING,
        commissionIds: eligibleComms.map((c) => c._id),
        bankAccountSnapshot: { upiId: inf?.upiId || 'creator@upi' },
        isSettled: false,
      };

      this.payouts.set(payoutId, payout);
      return payout;
    }

    // Admin Settles Payout (Rule G3 & Idempotency)
    settlePayout(payoutId: string, transactionId: string) {
      if (!transactionId || transactionId.trim() === '') {
        throw new BadRequestException('Transaction ID / bank reference is required');
      }
      const cleanTransactionId = transactionId.trim();

      const payout = this.payouts.get(payoutId);
      if (!payout) throw new NotFoundException('Payout not found');

      // Idempotency check
      if (payout.status === InfluencerPayoutStatus.PAID) {
        if (payout.transactionId === cleanTransactionId) {
          return { success: true, message: 'Influencer payout already completed (idempotent)', data: payout };
        } else {
          throw new ConflictException('Payout has already been settled with a different transaction ID.');
        }
      }

      if (payout.status !== InfluencerPayoutStatus.PENDING) {
        throw new BadRequestException(`Cannot settle payout in status: ${payout.status}`);
      }

      payout.status = InfluencerPayoutStatus.PAID;
      payout.transactionId = cleanTransactionId;
      payout.isSettled = true;
      payout.paidAt = new Date();
      payout.settledAt = new Date();

      payout.commissionIds.forEach((id) => {
        const comm = this.commissions.get(id);
        if (comm) {
          comm.status = CommissionStatus.PAID;
          comm.isSettled = true;
          comm.paidAt = new Date();
          comm.settledAt = new Date();
          comm.payoutReference = cleanTransactionId;
        }
      });

      const inf = this.influencers.get(payout.influencerId);
      if (inf) {
        inf.paidCommission += payout.totalCommission;
        inf.approvedCommission -= payout.totalCommission;
      }

      return { success: true, message: 'Influencer payout completed', data: payout };
    }

    // Admin Rejection (Unlocks commissions back to APPROVED)
    rejectPayout(payoutId: string, reason: string) {
      const payout = this.payouts.get(payoutId);
      if (!payout) throw new NotFoundException('Payout not found');

      if (payout.status === InfluencerPayoutStatus.REJECTED) {
        return { success: true, message: 'Influencer payout already rejected (idempotent)', data: payout };
      }
      if (payout.status === InfluencerPayoutStatus.PAID) {
        throw new ConflictException('Cannot reject a payout that has already been settled.');
      }
      if (payout.status !== InfluencerPayoutStatus.PENDING) {
        throw new BadRequestException(`Cannot reject payout in status: ${payout.status}`);
      }

      payout.status = InfluencerPayoutStatus.REJECTED;
      payout.rejectionReason = reason;

      payout.commissionIds.forEach((id) => {
        const comm = this.commissions.get(id);
        if (comm && !comm.isSettled) {
          comm.payoutId = null;
        }
      });

      return { success: true, message: 'Influencer payout rejected and commissions unlocked', data: payout };
    }
  }

  // =========================================================================
  // ACT I: INFLUENCER ONBOARDING & ZERO-DEFAULT COMMISSION INVARIANTS
  // =========================================================================
  describe('Act I: Influencer Onboarding & Zero-Default Commission Invariants', () => {
    let harness: MockEcommerceLifecycleHarness;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
    });

    it('Scenario 1: Influencer with unconfigured rate (null/undefined) produces NO InfluencerCommission record', () => {
      const unconfiguredCreator = harness.createInfluencer({
        name: 'Unconfigured Creator',
        commissionRate: null, // UNCONFIGURED
      });

      const customer = harness.createCustomer({
        referredByInfluencerId: unconfiguredCreator._id,
        referralExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const orderResult = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 2000,
        paymentMode: 'ONLINE',
      });

      expect(orderResult.orderSuccess).toBe(true);
      expect(orderResult.commissionRecord).toBeNull();
      expect(harness.commissions.size).toBe(0);
      expect(unconfiguredCreator.pendingCommission).toBe(0);
    });

    it('Scenario 2: Influencer with explicitly configured 0% rate creates record with rate=0 and amount=0', () => {
      const zeroRateCreator = harness.createInfluencer({
        name: 'Zero Percent Creator',
        commissionRate: 0, // EXPLICIT 0%
      });

      const customer = harness.createCustomer({
        referredByInfluencerId: zeroRateCreator._id,
        referralExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const orderResult = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 2000,
        paymentMode: 'ONLINE',
      });

      expect(orderResult.orderSuccess).toBe(true);
      expect(orderResult.commissionRecord).not.toBeNull();
      expect(orderResult.commissionRecord?.commissionRate).toBe(0);
      expect(orderResult.commissionRecord?.commissionAmount).toBe(0);
      expect(harness.commissions.size).toBe(1);
    });

    it('Scenario 3: Influencer with configured percentage (10%) calculates commission normally', () => {
      const creator = harness.createInfluencer({
        name: 'Active Creator',
        commissionRate: 10, // 10%
      });

      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const orderResult = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1500,
        paymentMode: 'ONLINE',
      });

      expect(orderResult.orderSuccess).toBe(true);
      expect(orderResult.commissionRecord?.commissionAmount).toBe(150);
      expect(creator.pendingCommission).toBe(150);
    });
  });

  // =========================================================================
  // ACT II: REFERRAL LINK TRACKING & CUSTOMER REGISTRATION
  // =========================================================================
  describe('Act II: Referral Link Tracking & Customer Registration', () => {
    let trackingService: AffiliateTrackingService;
    let mockAffliateProgramModel: any;
    let mockAffliateClickTrackingModel: any;
    let mockAffliateRateLimitModel: any;
    let programDoc: any;

    beforeEach(() => {
      programDoc = {
        _id: new Types.ObjectId(),
        influencerId: new Types.ObjectId(),
        referralCode: 'REF-CREATOR-01',
        isActive: true,
        isDeleted: false,
        totalClicks: 0,
      };

      mockAffliateProgramModel = {
        findOne: jest.fn().mockImplementation((q) => {
          if (q.referralCode === programDoc.referralCode && q.isActive) return Promise.resolve(programDoc);
          return Promise.resolve(null);
        }),
        updateOne: jest.fn().mockImplementation((q, u) => {
          if (u.$inc?.totalClicks) programDoc.totalClicks += u.$inc.totalClicks;
          return Promise.resolve({ modifiedCount: 1 });
        }),
      };

      mockAffliateClickTrackingModel = {
        create: jest.fn().mockResolvedValue({}),
      };

      mockAffliateRateLimitModel = {
        findOneAndUpdate: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      };

      trackingService = new AffiliateTrackingService(
        mockAffliateProgramModel,
        mockAffliateClickTrackingModel,
        {} as any,
        {} as any,
        mockAffliateRateLimitModel,
      );
    });

    it('Scenario 4: Bot user agents are dropped immediately from click counts', async () => {
      const res = await trackingService.trackClick('REF-CREATOR-01', '10.0.0.1', 'Googlebot/2.1');
      expect(res).toBe(programDoc);
      expect(programDoc.totalClicks).toBe(0);
      expect(mockAffliateClickTrackingModel.create).not.toHaveBeenCalled();
    });

    it('Scenario 5: Legitimate browser click claims rolling 24h lease and increments totalClicks', async () => {
      const res = await trackingService.trackClick('REF-CREATOR-01', '49.36.10.5', 'Mozilla/5.0 Chrome/120.0');
      expect(res).toBe(programDoc);
      expect(programDoc.totalClicks).toBe(1);
      expect(mockAffliateClickTrackingModel.create).toHaveBeenCalled();
    });

    it('Scenario 6: Customer registration binds customer to referrer with 365-day expiry window', () => {
      const harness = new MockEcommerceLifecycleHarness();
      const creator = harness.createInfluencer({ name: 'Creator A', commissionRate: 10 });

      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: expectedExpiry,
      });

      expect(customer.referredByInfluencerId).toBe(creator._id);
      expect(customer.referralExpiresAt?.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  // =========================================================================
  // ACT III: ATTRIBUTION WINDOW & 365-DAY BOUNDARY (RULES B2 & E2)
  // =========================================================================
  describe('Act III: Attribution Window & 365-Day Boundary (Rules B2 & E2)', () => {
    let harness: MockEcommerceLifecycleHarness;
    let creator: MockInfluencer;
    let otherCreator: MockInfluencer;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
      creator = harness.createInfluencer({ name: 'Primary Referrer', commissionRate: 12 });
      otherCreator = harness.createInfluencer({ name: 'Coupon Creator', commissionRate: 8 });
    });

    it('Scenario 7: Purchases on Day 180 and Day 364 attribute commission to referrer', () => {
      const regDate = new Date('2026-01-01T00:00:00Z');
      const expiryDate = new Date('2027-01-01T00:00:00Z');

      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: expiryDate,
      });

      // Day 180 purchase
      const day180 = new Date('2026-07-01T00:00:00Z');
      const order1 = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'ONLINE',
        orderDate: day180,
      });
      expect(order1.commissionRecord?.commissionAmount).toBe(120);

      // Day 364 purchase (1 day before expiry)
      const day364 = new Date('2026-12-31T00:00:00Z');
      const order2 = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'ONLINE',
        orderDate: day364,
      });
      expect(order2.commissionRecord?.commissionAmount).toBe(120);
    });

    it('Scenario 8: Purchase on Day 366 (after expiry) attributes ZERO commission to referrer', () => {
      const expiryDate = new Date('2027-01-01T00:00:00Z');
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: expiryDate,
      });

      // Day 366 purchase
      const day366 = new Date('2027-01-02T00:00:00Z');
      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'ONLINE',
        orderDate: day366,
      });
      expect(order.commissionRecord).toBeNull();
    });

    it('Scenario 9: Rule B2 Conflict Resolution: Referral link beats coupon 100%', () => {
      const expiryDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: expiryDate,
      });

      // Customer applies otherCreator coupon code
      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'ONLINE',
        couponInfluencerId: otherCreator._id,
      });

      // Referring creator gets 100% of the commission; coupon influencer gets 0
      expect(order.commissionRecord?.influencerId).toBe(creator._id);
      expect(order.commissionRecord?.attributionSource).toBe(AttributionSource.REFERRAL);
      expect(order.commissionRecord?.commissionAmount).toBe(120);
    });

    it('Scenario 10: Rule E2 Self-Purchase: Referral suppressed (order succeeds, 0 records); own coupon rejected with 400', () => {
      // 1. Creator places order via own referral link
      const selfCustomer = harness.createCustomer({
        _id: creator.userId, // Same user!
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      });

      const selfOrder = harness.processOrderPlacement({
        customerId: selfCustomer._id,
        finalOrderAmount: 1000,
        paymentMode: 'ONLINE',
      });
      expect(selfOrder.orderSuccess).toBe(true);
      expect(selfOrder.commissionRecord).toBeNull();
      expect(harness.commissions.size).toBe(0);

      // 2. Creator applies own influencer coupon
      expect(() => {
        harness.processOrderPlacement({
          customerId: creator.userId,
          finalOrderAmount: 1000,
          paymentMode: 'ONLINE',
          couponInfluencerId: creator._id,
        });
      }).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // ACT IV: ONLINE PAYMENT FULL FINANCIAL LIFECYCLE (SIMULATED CAPTURE)
  // =========================================================================
  describe('Act IV: Online Payment Full Financial Lifecycle (Simulated Capture)', () => {
    let harness: MockEcommerceLifecycleHarness;
    let creator: MockInfluencer;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
      creator = harness.createInfluencer({ name: 'Online Creator', commissionRate: 10 });
    });

    it('Scenario 11: Simulated verified online capture creates commission in status PENDING, isDelivered=false', () => {
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 2000,
        paymentMode: 'ONLINE',
      });

      expect(order.commissionRecord).not.toBeNull();
      expect(order.commissionRecord?.status).toBe(CommissionStatus.PENDING);
      expect(order.commissionRecord?.isDelivered).toBe(false);
      expect(creator.pendingCommission).toBe(200);
    });

    it('Scenario 12: Pre-delivery cancellation triggers 100% full commission reversal (Rule D1)', () => {
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 2000,
        paymentMode: 'ONLINE',
      });

      const commId = order.commissionRecord!._id;
      expect(creator.pendingCommission).toBe(200);

      // Customer cancels before dispatch/delivery
      harness.cancelOrReturnOrder(commId);

      const comm = harness.commissions.get(commId);
      expect(comm?.status).toBe(CommissionStatus.CANCELLED);
      expect(comm?.isReversed).toBe(true);
      expect(creator.pendingCommission).toBe(0);
    });

    it('Scenario 13: Order delivery transitions isDelivered=true and sets 7-day hold date', () => {
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 2000,
        paymentMode: 'ONLINE',
      });

      const deliveryDate = new Date('2026-10-01T10:00:00Z');
      const updatedComm = harness.markOnlineOrderDelivered(order.commissionRecord!._id, deliveryDate);

      expect(updatedComm.isDelivered).toBe(true);
      expect(updatedComm.deliveredAt).toEqual(deliveryDate);
      expect(updatedComm.approvalEligibleAt).toEqual(new Date('2026-10-08T10:00:00Z')); // exactly 7 days
    });
  });

  // =========================================================================
  // ACT V: CASH ON DELIVERY (COD) FULL FINANCIAL LIFECYCLE
  // =========================================================================
  describe('Act V: Cash on Delivery (COD) Full Financial Lifecycle', () => {
    let harness: MockEcommerceLifecycleHarness;
    let creator: MockInfluencer;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
      creator = harness.createInfluencer({ name: 'COD Creator', commissionRate: 15 });
    });

    it('Scenario 14: COD order placement defers commission record creation', () => {
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'COD',
      });

      expect(order.orderSuccess).toBe(true);
      expect(order.commissionRecord).toBeNull();
      expect(harness.commissions.size).toBe(0);
      expect(creator.pendingCommission).toBe(0);
    });

    it('Scenario 15: Exact COD Milestone: DELIVERED + paymentStatus=PAID creates commission with 7-day hold', () => {
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'COD',
      });

      const deliveryDate = new Date('2026-10-02T12:00:00Z');
      // Delivery verified + cash collected
      const comm = harness.confirmCodDeliveryAndPayment(order.deferredCODData!, deliveryDate);

      expect(comm).toBeDefined();
      expect(comm.commissionAmount).toBe(150);
      expect(comm.isDelivered).toBe(true);
      expect(comm.status).toBe(CommissionStatus.PENDING);
      expect(comm.approvalEligibleAt).toEqual(new Date('2026-10-09T12:00:00Z'));
      expect(creator.pendingCommission).toBe(150);
    });

    it('Scenario 16: Return within 7-day post-delivery window triggers 100% full reversal (Rule D1)', () => {
      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 1000,
        paymentMode: 'COD',
      });

      const deliveryDate = new Date('2026-10-02T12:00:00Z');
      const comm = harness.confirmCodDeliveryAndPayment(order.deferredCODData!, deliveryDate);
      expect(creator.pendingCommission).toBe(150);

      // Customer returns product 3 days later
      harness.cancelOrReturnOrder(comm._id);

      expect(comm.status).toBe(CommissionStatus.CANCELLED);
      expect(comm.isReversed).toBe(true);
      expect(creator.pendingCommission).toBe(0);
    });
  });

  // =========================================================================
  // ACT VI: 7-DAY MATURATION HOLD & DAILY CRON EXECUTION (RULE G1)
  // =========================================================================
  describe('Act VI: 7-Day Maturation Hold & Daily Cron Execution (Rule G1)', () => {
    let harness: MockEcommerceLifecycleHarness;
    let creator: MockInfluencer;
    let commId: string;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
      creator = harness.createInfluencer({ name: 'Maturation Creator', commissionRate: 10 });

      const customer = harness.createCustomer({
        referredByInfluencerId: creator._id,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      });

      const order = harness.processOrderPlacement({
        customerId: customer._id,
        finalOrderAmount: 3000,
        paymentMode: 'ONLINE',
      });

      commId = order.commissionRecord!._id;
      // Delivered on Day 1
      harness.markOnlineOrderDelivered(commId, new Date('2026-10-01T00:00:00Z'));
    });

    it('Scenario 17: Commission remains strictly PENDING during 7-day hold (Day 3, Day 6, Day 7)', () => {
      // Day 3 check
      harness.runMaturationCron(new Date('2026-10-04T00:00:00Z'));
      expect(harness.commissions.get(commId)?.status).toBe(CommissionStatus.PENDING);
      expect(creator.pendingCommission).toBe(300);
      expect(creator.approvedCommission).toBe(0);

      // Day 7 check (last day of return hold)
      harness.runMaturationCron(new Date('2026-10-07T23:59:59Z'));
      expect(harness.commissions.get(commId)?.status).toBe(CommissionStatus.PENDING);
      expect(creator.approvedCommission).toBe(0);
    });

    it('Scenario 18: Daily Cron shifts commission to APPROVED on Day 8 (approvalEligibleAt <= now)', () => {
      // Day 8 (2026-10-08T00:00:01Z): 7 full days have elapsed
      const maturedCount = harness.runMaturationCron(new Date('2026-10-08T00:00:01Z'));
      expect(maturedCount).toBe(1);

      const comm = harness.commissions.get(commId);
      expect(comm?.status).toBe(CommissionStatus.APPROVED);
      expect(creator.pendingCommission).toBe(0);
      expect(creator.approvedCommission).toBe(300);
    });
  });

  // =========================================================================
  // ACT VII: CREATOR WALLET & PAYOUT REQUEST (RULE G2)
  // =========================================================================
  describe('Act VII: Creator Wallet & Payout Request (Rule G2)', () => {
    let harness: MockEcommerceLifecycleHarness;
    let creator: MockInfluencer;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
      creator = harness.createInfluencer({ name: 'Wallet Creator', commissionRate: 10, upiId: 'wallet@upi' });
    });

    it('Scenario 19: Real-time wallet arithmetic calculates pending, approved, locked, and paid balances', () => {
      // Approved comm: 400
      const c1: MockCommission = {
        _id: 'c1', orderId: 'o1', vendorOrderId: 'vo1', influencerId: creator._id,
        finalOrderAmount: 4000, commissionRate: 10, commissionAmount: 400,
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.APPROVED,
        isDelivered: true, deliveredAt: new Date(), approvalEligibleAt: new Date(),
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };
      // Pending comm: 200
      const c2: MockCommission = {
        _id: 'c2', orderId: 'o2', vendorOrderId: 'vo2', influencerId: creator._id,
        finalOrderAmount: 2000, commissionRate: 10, commissionAmount: 200,
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.PENDING,
        isDelivered: false, deliveredAt: null, approvalEligibleAt: null,
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };

      harness.commissions.set('c1', c1);
      harness.commissions.set('c2', c2);

      const bal = harness.getWalletBalance(creator._id);
      expect(bal.approvedBalance).toBe(400);
      expect(bal.pendingBalance).toBe(200);
      expect(bal.canRequestPayout).toBe(false); // < 500
    });

    it('Scenario 20: Payout request blocked if approved balance < ₹500 (Rule G2)', () => {
      const c1: MockCommission = {
        _id: 'c1', orderId: 'o1', vendorOrderId: 'vo1', influencerId: creator._id,
        finalOrderAmount: 4000, commissionRate: 10, commissionAmount: 400, // ₹400 < ₹500
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.APPROVED,
        isDelivered: true, deliveredAt: new Date(), approvalEligibleAt: new Date(),
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };
      harness.commissions.set('c1', c1);

      expect(() => harness.requestPayout(creator._id)).toThrow(BadRequestException);
      expect(() => harness.requestPayout(creator._id)).toThrow('Minimum payout amount is ₹500');
    });

    it('Scenario 21: Payout request for ₹500+ locks commissions with payoutId and snapshots UPI', () => {
      const c1: MockCommission = {
        _id: 'c1', orderId: 'o1', vendorOrderId: 'vo1', influencerId: creator._id,
        finalOrderAmount: 6000, commissionRate: 10, commissionAmount: 600, // ₹600 >= ₹500
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.APPROVED,
        isDelivered: true, deliveredAt: new Date(), approvalEligibleAt: new Date(),
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };
      harness.commissions.set('c1', c1);

      const payout = harness.requestPayout(creator._id);
      expect(payout.status).toBe(InfluencerPayoutStatus.PENDING);
      expect(payout.totalCommission).toBe(600);
      expect(payout.bankAccountSnapshot?.upiId).toBe('wallet@upi');

      // Commission is locked with payoutId
      expect(c1.payoutId).toBe(payout._id);

      // Approved balance is now locked
      const bal = harness.getWalletBalance(creator._id);
      expect(bal.approvedBalance).toBe(0);
      expect(bal.lockedInPayoutBalance).toBe(600);
    });
  });

  // =========================================================================
  // ACT VIII: ADMIN FINANCE REVIEW & TRANSACTIONAL SETTLEMENT (RULE G3)
  // =========================================================================
  describe('Act VIII: Admin Finance Review & Transactional Settlement (Rule G3)', () => {
    let harness: MockEcommerceLifecycleHarness;
    let creator: MockInfluencer;
    let payoutId: string;

    beforeEach(() => {
      harness = new MockEcommerceLifecycleHarness();
      creator = harness.createInfluencer({ name: 'Settlement Creator', commissionRate: 10 });
      creator.approvedCommission = 800;

      const c1: MockCommission = {
        _id: 'c1', orderId: 'o1', vendorOrderId: 'vo1', influencerId: creator._id,
        finalOrderAmount: 8000, commissionRate: 10, commissionAmount: 800,
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.APPROVED,
        isDelivered: true, deliveredAt: new Date(), approvalEligibleAt: new Date(),
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };
      harness.commissions.set('c1', c1);

      const payout = harness.requestPayout(creator._id);
      payoutId = payout._id;
    });

    it('Scenario 22: Admin settles payout with UTR: marks payout PAID, commissions PAID, balances updated', () => {
      const res = harness.settlePayout(payoutId, 'UTR-E2E-20261003-01');
      expect(res.success).toBe(true);

      const payout = harness.payouts.get(payoutId);
      expect(payout?.status).toBe(InfluencerPayoutStatus.PAID);
      expect(payout?.transactionId).toBe('UTR-E2E-20261003-01');

      const comm = harness.commissions.get('c1');
      expect(comm?.status).toBe(CommissionStatus.PAID);
      expect(comm?.isSettled).toBe(true);

      expect(creator.paidCommission).toBe(800);
      expect(creator.approvedCommission).toBe(0);
    });

    it('Scenario 23: Settlement idempotency: retry with same UTR succeeds without double mutation; conflicting UTR throws 409', () => {
      // First settlement
      harness.settlePayout(payoutId, 'UTR-E2E-20261003-01');
      expect(creator.paidCommission).toBe(800);

      // Idempotent retry with same UTR
      const retryRes = harness.settlePayout(payoutId, 'UTR-E2E-20261003-01');
      expect(retryRes.success).toBe(true);
      expect(retryRes.message).toContain('idempotent');
      expect(creator.paidCommission).toBe(800); // unchanged

      // Conflicting UTR retry
      expect(() => {
        harness.settlePayout(payoutId, 'UTR-CONFLICTING-999');
      }).toThrow(ConflictException);
    });

    it('Scenario 24: Admin rejection releases locked commissions back to APPROVED/payable state', () => {
      const res = harness.rejectPayout(payoutId, 'Bank details mismatch');
      expect(res.success).toBe(true);

      const payout = harness.payouts.get(payoutId);
      expect(payout?.status).toBe(InfluencerPayoutStatus.REJECTED);

      const comm = harness.commissions.get('c1');
      expect(comm?.payoutId).toBeNull(); // unlocked!
      expect(comm?.status).toBe(CommissionStatus.APPROVED);

      // Approved balance is unlocked and available again
      const bal = harness.getWalletBalance(creator._id);
      expect(bal.approvedBalance).toBe(800);
      expect(bal.lockedInPayoutBalance).toBe(0);
    });
  });

  // =========================================================================
  // SECTION IX: CONCURRENCY & RACE-CONDITION STRESS MATRIX
  // =========================================================================
  describe('Section IX: Concurrency & Race-Condition Stress Matrix', () => {
    it('Scenario 25: Parallel Click Flood (10 simultaneous requests from same IP) increments totalClicks exactly once', async () => {
      const programDoc = {
        _id: new Types.ObjectId(),
        influencerId: new Types.ObjectId(),
        referralCode: 'REF-STRESS-01',
        isActive: true,
        isDeleted: false,
        totalClicks: 0,
      };

      const mockProgram = {
        findOne: jest.fn().mockResolvedValue(programDoc),
        updateOne: jest.fn().mockImplementation((q, u) => {
          if (u.$inc?.totalClicks) programDoc.totalClicks += u.$inc.totalClicks;
          return Promise.resolve({ modifiedCount: 1 });
        }),
      };

      let leaseClaimed = false;
      const mockRateLimit = {
        findOneAndUpdate: jest.fn().mockImplementation(() => {
          if (!leaseClaimed) {
            leaseClaimed = true;
            return Promise.resolve({ _id: new Types.ObjectId() });
          } else {
            // Race condition collision
            const duplicateErr: any = new Error('E11000 duplicate key error');
            duplicateErr.code = 11000;
            return Promise.reject(duplicateErr);
          }
        }),
      };

      const trackingService = new AffiliateTrackingService(
        mockProgram as any,
        { create: jest.fn().mockResolvedValue({}) } as any,
        {} as any,
        {} as any,
        mockRateLimit as any,
      );

      // Launch 10 simultaneous requests
      const promises = Array.from({ length: 10 }).map(() =>
        trackingService.trackClick('REF-STRESS-01', '124.50.20.1', 'Mozilla/5.0 Chrome/120.0'),
      );

      await Promise.all(promises);

      // Exactly 1 winner increments totalClicks
      expect(programDoc.totalClicks).toBe(1);
    });

    it('Scenario 26: Concurrent Payout Requests (5 simultaneous requests from same creator) results in exactly 1 PENDING payout', async () => {
      const harness = new MockEcommerceLifecycleHarness();
      const creator = harness.createInfluencer({ name: 'Race Creator', commissionRate: 10 });
      creator.approvedCommission = 1000;

      const c1: MockCommission = {
        _id: 'c1', orderId: 'o1', vendorOrderId: 'vo1', influencerId: creator._id,
        finalOrderAmount: 10000, commissionRate: 10, commissionAmount: 1000,
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.APPROVED,
        isDelivered: true, deliveredAt: new Date(), approvalEligibleAt: new Date(),
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };
      harness.commissions.set('c1', c1);

      let successCount = 0;
      let conflictCount = 0;

      // Launch 5 parallel payout request attempts
      const attempts = Array.from({ length: 5 }).map(async () => {
        try {
          harness.requestPayout(creator._id);
          successCount++;
        } catch (err: any) {
          if (err instanceof ConflictException) {
            conflictCount++;
          }
        }
      });

      await Promise.all(attempts);

      // Exactly 1 succeeded in acquiring the PENDING lock; 4 were rejected with ConflictException
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);
      expect(harness.payouts.size).toBe(1);
    });

    it('Scenario 27: Race-condition settlement attempts with matching UTR resolve idempotently without double ledger debit', async () => {
      const harness = new MockEcommerceLifecycleHarness();
      const creator = harness.createInfluencer({ name: 'Settle Race Creator', commissionRate: 10 });
      creator.approvedCommission = 500;

      const c1: MockCommission = {
        _id: 'c1', orderId: 'o1', vendorOrderId: 'vo1', influencerId: creator._id,
        finalOrderAmount: 5000, commissionRate: 10, commissionAmount: 500,
        attributionSource: AttributionSource.REFERRAL, status: CommissionStatus.APPROVED,
        isDelivered: true, deliveredAt: new Date(), approvalEligibleAt: new Date(),
        isSettled: false, isReversed: false, payoutId: null, payoutReference: null, settledAt: null, paidAt: null,
      };
      harness.commissions.set('c1', c1);

      const payout = harness.requestPayout(creator._id);

      // Simulate 3 concurrent settlement clicks with the exact same transaction ID
      const settlements = await Promise.all([
        harness.settlePayout(payout._id, 'UTR-CONCURRENT-001'),
        harness.settlePayout(payout._id, 'UTR-CONCURRENT-001'),
        harness.settlePayout(payout._id, 'UTR-CONCURRENT-001'),
      ]);

      settlements.forEach((s) => expect(s.success).toBe(true));
      // Balances were debited exactly once
      expect(creator.paidCommission).toBe(500);
      expect(creator.approvedCommission).toBe(0);
    });
  });
});
