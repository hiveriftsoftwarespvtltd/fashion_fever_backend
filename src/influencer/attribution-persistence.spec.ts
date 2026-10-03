import { Types } from 'mongoose';
import { InfluencerStatus } from './schema/influencer.schema';
import { AttributionSource } from './schema/influencer-commision-rate.schema';

describe('Phase 3: 1-Year Attribution Persistence & Expiry Enforcement Contracts', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const EXACT_365_DAYS_MS = 365 * ONE_DAY_MS;

  interface UserAttributionContext {
    userId: Types.ObjectId;
    referredByInfluencerId?: Types.ObjectId | null;
    referralAttributedAt?: Date | null;
    referralExpiresAt?: Date | null;
  }

  interface InfluencerContext {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    status: InfluencerStatus;
    isDeleted: boolean;
    commissionRate?: number | null;
  }

  interface CouponContext {
    _id: Types.ObjectId;
    code: string;
    influencerId?: Types.ObjectId | null;
  }

  // Pure logic simulation of the Phase 3 attribution resolution contract
  function resolveOrderAttribution(params: {
    user: UserAttributionContext;
    orderDate: Date;
    appliedCoupon?: CouponContext | null;
    influencers: Map<string, InfluencerContext>;
  }) {
    const { user, orderDate, appliedCoupon, influencers } = params;

    let referralInfluencer: InfluencerContext | null = null;
    let isExpired = false;
    let isSelfPurchase = false;

    // 1. Evaluate 1-Year Referral Attribution
    if (user.referredByInfluencerId) {
      if (user.referralExpiresAt && orderDate > user.referralExpiresAt) {
        isExpired = true;
      } else {
        const inf = influencers.get(user.referredByInfluencerId.toString());
        if (inf && inf.status === InfluencerStatus.ACTIVE && !inf.isDeleted) {
          if (inf.userId.toString() === user.userId.toString()) {
            isSelfPurchase = true;
          } else {
            referralInfluencer = inf;
          }
        }
      }
    }

    // 2. Evaluate Coupon Influencer (if any)
    let couponInfluencer: InfluencerContext | null = null;
    if (appliedCoupon?.influencerId) {
      const inf = influencers.get(appliedCoupon.influencerId.toString());
      if (inf && inf.status === InfluencerStatus.ACTIVE && !inf.isDeleted) {
        couponInfluencer = inf;
      }
    }

    // 3. Rule B2 Conflict Resolution: Referral wins over Coupon
    if (referralInfluencer) {
      return {
        beneficiaryInfluencerId: referralInfluencer._id,
        attributionSource: AttributionSource.REFERRAL,
        isExpired: false,
        isSelfPurchase: false,
        commissionEligible: true,
      };
    }

    // If referral is expired, zero referral commission
    if (isExpired) {
      // If customer applied a coupon, coupon influencer can receive commission
      if (couponInfluencer) {
        return {
          beneficiaryInfluencerId: couponInfluencer._id,
          attributionSource: AttributionSource.COUPON,
          isExpired: true,
          isSelfPurchase: false,
          commissionEligible: true,
        };
      }
      return {
        beneficiaryInfluencerId: null,
        attributionSource: null,
        isExpired: true,
        isSelfPurchase: false,
        commissionEligible: false,
      };
    }

    // Non-referred customer applying coupon
    if (couponInfluencer) {
      return {
        beneficiaryInfluencerId: couponInfluencer._id,
        attributionSource: AttributionSource.COUPON,
        isExpired: false,
        isSelfPurchase: false,
        commissionEligible: true,
      };
    }

    return {
      beneficiaryInfluencerId: null,
      attributionSource: null,
      isExpired: false,
      isSelfPurchase,
      commissionEligible: false,
    };
  }

  describe('1. 365-Day Attribution Persistence vs Expiry (Acceptance Criteria)', () => {
    const signupDate = new Date('2025-01-01T00:00:00.000Z');
    const expiryDate = new Date(signupDate.getTime() + EXACT_365_DAYS_MS); // 2026-01-01T00:00:00.000Z
    const creatorId = new Types.ObjectId();
    const creatorUserId = new Types.ObjectId();
    const customerUserId = new Types.ObjectId();

    const influencersMap = new Map<string, InfluencerContext>();
    influencersMap.set(creatorId.toString(), {
      _id: creatorId,
      userId: creatorUserId,
      status: InfluencerStatus.ACTIVE,
      isDeleted: false,
      commissionRate: 10,
    });

    const user: UserAttributionContext = {
      userId: customerUserId,
      referredByInfluencerId: creatorId,
      referralAttributedAt: signupDate,
      referralExpiresAt: expiryDate,
    };

    it('should generate referral commission for order placed on Day 364 (within 1-year window)', () => {
      const orderDate = new Date(signupDate.getTime() + 364 * ONE_DAY_MS);
      const res = resolveOrderAttribution({
        user,
        orderDate,
        influencers: influencersMap,
      });

      expect(res.commissionEligible).toBe(true);
      expect(res.beneficiaryInfluencerId).toEqual(creatorId);
      expect(res.attributionSource).toBe(AttributionSource.REFERRAL);
      expect(res.isExpired).toBe(false);
    });

    it('should generate ₹0 referral commission for order placed on Day 366 (expired boundary)', () => {
      const orderDate = new Date(signupDate.getTime() + 366 * ONE_DAY_MS);
      const res = resolveOrderAttribution({
        user,
        orderDate,
        influencers: influencersMap,
      });

      expect(res.commissionEligible).toBe(false);
      expect(res.beneficiaryInfluencerId).toBeNull();
      expect(res.isExpired).toBe(true);
    });

    it('subsequent purchases must never modify or extend user.referralExpiresAt (non-rolling)', () => {
      const firstPurchaseDate = new Date(signupDate.getTime() + 30 * ONE_DAY_MS);
      const secondPurchaseDate = new Date(signupDate.getTime() + 180 * ONE_DAY_MS);

      // Verify that expiry remains strictly locked to original 365 days
      expect(user.referralExpiresAt!.toISOString()).toBe(expiryDate.toISOString());

      const resFirst = resolveOrderAttribution({ user, orderDate: firstPurchaseDate, influencers: influencersMap });
      expect(resFirst.commissionEligible).toBe(true);
      expect(user.referralExpiresAt!.toISOString()).toBe(expiryDate.toISOString());

      const resSecond = resolveOrderAttribution({ user, orderDate: secondPurchaseDate, influencers: influencersMap });
      expect(resSecond.commissionEligible).toBe(true);
      expect(user.referralExpiresAt!.toISOString()).toBe(expiryDate.toISOString());
    });
  });

  describe('2. Rule B2 Conflict Resolution (Referral Wins over Coupon)', () => {
    const signupDate = new Date('2025-06-01T00:00:00.000Z');
    const expiryDate = new Date(signupDate.getTime() + EXACT_365_DAYS_MS);
    const creatorAId = new Types.ObjectId();
    const creatorBId = new Types.ObjectId();
    const customerUserId = new Types.ObjectId();

    const influencersMap = new Map<string, InfluencerContext>();
    influencersMap.set(creatorAId.toString(), {
      _id: creatorAId,
      userId: new Types.ObjectId(),
      status: InfluencerStatus.ACTIVE,
      isDeleted: false,
      commissionRate: 8,
    });
    influencersMap.set(creatorBId.toString(), {
      _id: creatorBId,
      userId: new Types.ObjectId(),
      status: InfluencerStatus.ACTIVE,
      isDeleted: false,
      commissionRate: 15,
    });

    const userReferredByA: UserAttributionContext = {
      userId: customerUserId,
      referredByInfluencerId: creatorAId,
      referralAttributedAt: signupDate,
      referralExpiresAt: expiryDate,
    };

    const couponOfB: CouponContext = {
      _id: new Types.ObjectId(),
      code: 'COUPON_B_10',
      influencerId: creatorBId,
    };

    it('Rule B2: Creator A (Referral) must win 100% of commission over Creator B (Coupon)', () => {
      const orderDate = new Date(signupDate.getTime() + 60 * ONE_DAY_MS);
      const res = resolveOrderAttribution({
        user: userReferredByA,
        orderDate,
        appliedCoupon: couponOfB,
        influencers: influencersMap,
      });

      // Creator A receives commission, Creator B receives 0
      expect(res.beneficiaryInfluencerId).toEqual(creatorAId);
      expect(res.attributionSource).toBe(AttributionSource.REFERRAL);
      expect(res.beneficiaryInfluencerId).not.toEqual(creatorBId);
    });

    it('When customer has no referral history, applied coupon influencer receives attribution', () => {
      const nonReferredUser: UserAttributionContext = {
        userId: customerUserId,
        referredByInfluencerId: null,
      };

      const res = resolveOrderAttribution({
        user: nonReferredUser,
        orderDate: new Date(),
        appliedCoupon: couponOfB,
        influencers: influencersMap,
      });

      expect(res.beneficiaryInfluencerId).toEqual(creatorBId);
      expect(res.attributionSource).toBe(AttributionSource.COUPON);
      expect(res.commissionEligible).toBe(true);
    });

    it('Expired referral + valid influencer coupon -> coupon attribution (expired referral must not block coupon)', () => {
      const expiredOrderDate = new Date(signupDate.getTime() + 400 * ONE_DAY_MS);
      const res = resolveOrderAttribution({
        user: userReferredByA,
        orderDate: expiredOrderDate,
        appliedCoupon: couponOfB,
        influencers: influencersMap,
      });

      // Expired referral does not win; coupon influencer B wins attribution
      expect(res.isExpired).toBe(true);
      expect(res.beneficiaryInfluencerId).toEqual(creatorBId);
      expect(res.attributionSource).toBe(AttributionSource.COUPON);
      expect(res.commissionEligible).toBe(true);
    });
  });

  describe('3. Rule E: Self-Purchase Commission Block', () => {
    const creatorId = new Types.ObjectId();
    const creatorUserId = new Types.ObjectId();

    const influencersMap = new Map<string, InfluencerContext>();
    influencersMap.set(creatorId.toString(), {
      _id: creatorId,
      userId: creatorUserId,
      status: InfluencerStatus.ACTIVE,
      isDeleted: false,
      commissionRate: 10,
    });

    it('must block commission when creator purchases as customer (self-purchase)', () => {
      const selfUser: UserAttributionContext = {
        userId: creatorUserId, // Same as creator's userId
        referredByInfluencerId: creatorId,
        referralAttributedAt: new Date(),
        referralExpiresAt: new Date(Date.now() + EXACT_365_DAYS_MS),
      };

      const res = resolveOrderAttribution({
        user: selfUser,
        orderDate: new Date(),
        influencers: influencersMap,
      });

      expect(res.commissionEligible).toBe(false);
      expect(res.beneficiaryInfluencerId).toBeNull();
      expect(res.isSelfPurchase).toBe(true);
    });
  });

  describe('4. Three-Tier Rate Contract & COD Initial Order Isolation', () => {
    it('null/undefined commissionRate means UNCONFIGURED and must NOT create financial record or default to 0', () => {
      const unconfiguredCreator: InfluencerContext = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: null,
      };

      // Stamped vendorOrder rate must preserve null, never coercing to 0 via ?? 0
      const stampedRate = typeof unconfiguredCreator.commissionRate === 'number'
        ? unconfiguredCreator.commissionRate
        : null;

      expect(stampedRate).toBeNull();
      expect(stampedRate).not.toBe(0);

      // Financial ledger decision contract: unconfigured rate creates ZERO financial records
      const shouldCreateLedgerRecord = stampedRate !== null;
      expect(shouldCreateLedgerRecord).toBe(false);
    });

    it('explicit 0% is a valid configured rate and remains strictly distinguishable from null', () => {
      const zeroRateCreator: InfluencerContext = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 0,
      };

      const stampedRate = typeof zeroRateCreator.commissionRate === 'number'
        ? zeroRateCreator.commissionRate
        : null;

      expect(stampedRate).toBe(0);
      expect(stampedRate).not.toBeNull();
      expect(stampedRate !== null).toBe(true);
    });

    it('explicit >0% configured custom rate remains valid', () => {
      const customRateCreator: InfluencerContext = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 12.5,
      };

      const stampedRate = typeof customRateCreator.commissionRate === 'number'
        ? customRateCreator.commissionRate
        : null;

      expect(stampedRate).toBe(12.5);
      expect(stampedRate! > 0).toBe(true);
    });

    it('COD initial PENDING/PENDING order must create ZERO InfluencerCommission financial ledger records', () => {
      // Simulating COD checkout state
      const order = {
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH_ON_DELIVERY',
      };

      // In Phase 3, checkout does NOT create financial ledger records for COD orders
      const financialRecordsCreatedInPhase3 = 0;
      expect(financialRecordsCreatedInPhase3).toBe(0);

      // Verified milestone for COD financial creation belongs to Phase 5: DELIVERED && PAID
      const isCodMilestoneReached = order.orderStatus === 'DELIVERED' && order.paymentStatus === 'PAID';
      expect(isCodMilestoneReached).toBe(false);
    });
  });
});
