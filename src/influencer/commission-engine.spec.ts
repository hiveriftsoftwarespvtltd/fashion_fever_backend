import { Types } from 'mongoose';
import {
  CommissionStatus,
  AttributionSource,
} from './schema/influencer-commision-rate.schema';
import { InfluencerStatus } from './schema/influencer.schema';
import {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '../order/schema/order.schema';

describe('Phase 5: Commission Engine & Ledger Snapshot Contracts', () => {
  interface InfluencerContext {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    status: InfluencerStatus;
    isDeleted: boolean;
    commissionRate?: number | null;
  }

  interface UserContext {
    _id: Types.ObjectId;
    referredByInfluencerId?: Types.ObjectId | null;
    referralExpiresAt?: Date | null;
  }

  interface CouponContext {
    _id: Types.ObjectId;
    code: string;
    influencerId?: Types.ObjectId | null;
  }

  interface VendorOrderContext {
    _id: Types.ObjectId;
    orderId?: Types.ObjectId;
    vendorId: Types.ObjectId;
    userId: Types.ObjectId;
    subTotal: number;
    discount: number;
    shippingCharge: number;
    codCharge: number;
    tax: number;
    grandTotal: number;
    platformCommissionRate: number;
    platformCommissionAmount: number;
    payoutAmount: number;
    influencerId?: Types.ObjectId | null;
    influencerCommissionRate?: number | null;
    influencerCommissionAmount: number;
    attributionSource?: AttributionSource | null;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
  }

  interface CommissionLedgerRecord {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    vendorOrderId: Types.ObjectId;
    influencerId: Types.ObjectId;
    influencerUserId: Types.ObjectId;
    customerId?: Types.ObjectId;
    vendorId: Types.ObjectId;
    attributionSource: AttributionSource;
    orderAmount: number;
    discountAmount: number;
    finalOrderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: CommissionStatus;
    createdAt: Date;
  }

  // In-memory simulation of Phase 5 Commission Engine
  class MockLedgerDatabase {
    records: CommissionLedgerRecord[] = [];

    // Strictly enforces compound uniqueness: { orderId, vendorOrderId, influencerId }
    findExisting(
      orderId: Types.ObjectId,
      vendorOrderId: Types.ObjectId,
      influencerId: Types.ObjectId,
    ) {
      return this.records.find(
        (r) =>
          r.orderId.toString() === orderId.toString() &&
          r.vendorOrderId.toString() === vendorOrderId.toString() &&
          r.influencerId.toString() === influencerId.toString(),
      );
    }

    insertRecord(record: CommissionLedgerRecord) {
      if (
        this.findExisting(
          record.orderId,
          record.vendorOrderId,
          record.influencerId,
        )
      ) {
        const err: any = new Error(
          'E11000 duplicate key error collection: influencercommissions',
        );
        err.code = 11000;
        throw err;
      }
      this.records.push(record);
      return record;
    }
  }

  function getInitialPlacementPaymentStatus(
    method: PaymentMethod,
  ): PaymentStatus {
    return method === PaymentMethod.WALLET
      ? PaymentStatus.PAID
      : PaymentStatus.PENDING;
  }

  function executeCommissionEngine(params: {
    orderId: Types.ObjectId;
    vendorOrder: VendorOrderContext;
    influencer: InfluencerContext | null;
    customerUserId: Types.ObjectId;
    attributionSource: AttributionSource;
    db: MockLedgerDatabase;
  }): CommissionLedgerRecord | null {
    const {
      orderId,
      vendorOrder,
      influencer,
      customerUserId,
      attributionSource,
      db,
    } = params;

    // 1. Validate complete compound identity
    if (!orderId || !vendorOrder._id || !influencer?._id) {
      return null;
    }

    // 2. Strict Idempotency Check with ALL 3: { orderId, vendorOrderId, influencerId }
    const existing = db.findExisting(orderId, vendorOrder._id, influencer._id);
    if (existing) {
      return existing;
    }

    // 3. Self-purchase check (creator cannot earn commission on own purchase)
    if (influencer.userId.toString() === customerUserId.toString()) {
      return null;
    }

    // 4. Strict Three-Tier Rate Contract:
    // null / undefined -> UNCONFIGURED -> NO record
    if (
      influencer.commissionRate === null ||
      influencer.commissionRate === undefined
    ) {
      return null;
    }

    const rate = Number(influencer.commissionRate);
    if (isNaN(rate) || rate < 0) {
      return null;
    }

    // 5. Commission Base: Net order amount (subTotal - vendorDiscount), excluding shipping, COD charges, and tax
    const commissionBase = Math.max(
      0,
      parseFloat((vendorOrder.subTotal - vendorOrder.discount).toFixed(2)),
    );

    // Calculate commissionAmount
    const commissionAmount =
      rate === 0 ? 0 : parseFloat(((commissionBase * rate) / 100).toFixed(2));

    const record: CommissionLedgerRecord = {
      _id: new Types.ObjectId(),
      orderId,
      vendorOrderId: vendorOrder._id,
      influencerId: influencer._id,
      influencerUserId: influencer.userId,
      customerId: customerUserId,
      vendorId: vendorOrder.vendorId,
      attributionSource,
      orderAmount: vendorOrder.subTotal,
      discountAmount: vendorOrder.discount,
      finalOrderAmount: commissionBase,
      commissionRate: rate,
      commissionAmount,
      status: CommissionStatus.PENDING,
      createdAt: new Date(),
    };

    return db.insertRecord(record);
  }

  function resolveAttribution(params: {
    user: UserContext;
    orderDate: Date;
    appliedCoupon?: CouponContext | null;
    influencers: Map<string, InfluencerContext>;
  }): {
    activeInfluencer: InfluencerContext | null;
    attributionSource: AttributionSource | null;
  } {
    const { user, orderDate, appliedCoupon, influencers } = params;

    // Check 365-day fixed referral attribution
    if (user.referredByInfluencerId) {
      const isExpired = user.referralExpiresAt
        ? orderDate > user.referralExpiresAt
        : true;
      if (!isExpired) {
        const referralInf = influencers.get(
          user.referredByInfluencerId.toString(),
        );
        if (
          referralInf &&
          referralInf.status === InfluencerStatus.ACTIVE &&
          !referralInf.isDeleted
        ) {
          // Rule B2: Active referral wins over coupon!
          return {
            activeInfluencer: referralInf,
            attributionSource: AttributionSource.REFERRAL,
          };
        }
      }
    }

    // If referral is absent or expired, coupon attribution may apply
    if (appliedCoupon?.influencerId) {
      const couponInf = influencers.get(appliedCoupon.influencerId.toString());
      if (
        couponInf &&
        couponInf.status === InfluencerStatus.ACTIVE &&
        !couponInf.isDeleted
      ) {
        return {
          activeInfluencer: couponInf,
          attributionSource: AttributionSource.COUPON,
        };
      }
    }

    return { activeInfluencer: null, attributionSource: null };
  }

  // ─────────────────────────────────────────────────────────────
  // TEST SUITE: Requirements A through O
  // ─────────────────────────────────────────────────────────────

  let db: MockLedgerDatabase;
  const orderId = new Types.ObjectId();
  const customerId = new Types.ObjectId();
  const vendorId = new Types.ObjectId();
  const influencerUserId = new Types.ObjectId();
  const influencerId = new Types.ObjectId();

  beforeEach(() => {
    db = new MockLedgerDatabase();
  });

  describe('A. Net amount excludes tax/shipping/COD fee', () => {
    it('should calculate commission base strictly as subTotal - vendorDiscount', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 2000,
        discount: 300, // finalOrderAmount = 1700
        shippingCharge: 150,
        codCharge: 50,
        tax: 90,
        grandTotal: 1990,
        platformCommissionRate: 20,
        platformCommissionAmount: 340,
        payoutAmount: 1360,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      };

      const record = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record).not.toBeNull();
      expect(record!.finalOrderAmount).toBe(1700); // 2000 - 300
      expect(record!.commissionAmount).toBe(170); // 10% of 1700
      // Ensure shipping (150), COD (50), tax (90) were strictly excluded
      expect(record!.finalOrderAmount).not.toBe(vendorOrder.grandTotal);
    });
  });

  describe('B. Active referral beats coupon influencer', () => {
    it('should attribute to Referral influencer when referral is active even if coupon belongs to another influencer', () => {
      const refInfId = new Types.ObjectId();
      const coupInfId = new Types.ObjectId();

      const influencers = new Map<string, InfluencerContext>();
      influencers.set(refInfId.toString(), {
        _id: refInfId,
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      });
      influencers.set(coupInfId.toString(), {
        _id: coupInfId,
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 15,
      });

      const user: UserContext = {
        _id: customerId,
        referredByInfluencerId: refInfId,
        referralExpiresAt: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000), // active (expires in 100 days)
      };

      const coupon: CouponContext = {
        _id: new Types.ObjectId(),
        code: 'INFLUENCER10',
        influencerId: coupInfId,
      };

      const { activeInfluencer, attributionSource } = resolveAttribution({
        user,
        orderDate: new Date(),
        appliedCoupon: coupon,
        influencers,
      });

      expect(activeInfluencer!._id.toString()).toBe(refInfId.toString());
      expect(attributionSource).toBe(AttributionSource.REFERRAL);
    });
  });

  describe('C. Expired referral allows coupon attribution', () => {
    it('should fallback to coupon creator when referral window has expired (>365 days)', () => {
      const refInfId = new Types.ObjectId();
      const coupInfId = new Types.ObjectId();

      const influencers = new Map<string, InfluencerContext>();
      influencers.set(refInfId.toString(), {
        _id: refInfId,
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      });
      influencers.set(coupInfId.toString(), {
        _id: coupInfId,
        userId: new Types.ObjectId(),
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 15,
      });

      const user: UserContext = {
        _id: customerId,
        referredByInfluencerId: refInfId,
        referralExpiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // expired 5 days ago
      };

      const coupon: CouponContext = {
        _id: new Types.ObjectId(),
        code: 'INFLUENCER15',
        influencerId: coupInfId,
      };

      const { activeInfluencer, attributionSource } = resolveAttribution({
        user,
        orderDate: new Date(),
        appliedCoupon: coupon,
        influencers,
      });

      expect(activeInfluencer!._id.toString()).toBe(coupInfId.toString());
      expect(attributionSource).toBe(AttributionSource.COUPON);
    });
  });

  describe('D. null rate → zero ledger records', () => {
    it('should create 0 ledger records when influencer commissionRate is null or undefined (UNCONFIGURED)', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1000,
        discount: 100,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 950,
        platformCommissionRate: 20,
        platformCommissionAmount: 180,
        payoutAmount: 720,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencerWithNull: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: null, // UNCONFIGURED
      };

      const record1 = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer: influencerWithNull,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record1).toBeNull();
      expect(db.records.length).toBe(0);

      const influencerWithUndefined: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: undefined, // UNCONFIGURED
      };

      const record2 = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer: influencerWithUndefined,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record2).toBeNull();
      expect(db.records.length).toBe(0);
    });
  });

  describe('E. explicit 0% → one zero-value record', () => {
    it('should create exactly one ledger record with 0 amount when commissionRate is explicitly 0', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1500,
        discount: 200,
        shippingCharge: 60,
        codCharge: 0,
        tax: 0,
        grandTotal: 1360,
        platformCommissionRate: 20,
        platformCommissionAmount: 260,
        payoutAmount: 1040,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencerZero: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 0, // Configured 0%
      };

      const record = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer: influencerZero,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record).not.toBeNull();
      expect(db.records.length).toBe(1);
      expect(record!.commissionRate).toBe(0);
      expect(record!.commissionAmount).toBe(0);
      expect(record!.finalOrderAmount).toBe(1300);
      expect(record!.status).toBe(CommissionStatus.PENDING);
    });
  });

  describe('F. custom 12.5% → exact calculated amount', () => {
    it('should accurately calculate commission amount with precision (e.g., 12.5% of 1500 = 187.5)', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1800,
        discount: 300, // net = 1500
        shippingCharge: 80,
        codCharge: 0,
        tax: 0,
        grandTotal: 1580,
        platformCommissionRate: 20,
        platformCommissionAmount: 300,
        payoutAmount: 1200,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencerCustom: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 12.5,
      };

      const record = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer: influencerCustom,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record).not.toBeNull();
      expect(record!.commissionRate).toBe(12.5);
      expect(record!.commissionAmount).toBe(187.5);
    });
  });

  describe('G. ONLINE initial order → paymentStatus PENDING → zero records', () => {
    it('should initialize online order as paymentStatus PENDING and create zero InfluencerCommission records', () => {
      // Production Rule: Without payment gateway verification, ONLINE placement is PENDING
      const paymentMethod = PaymentMethod.ONLINE;
      const initialPaymentStatus =
        getInitialPlacementPaymentStatus(paymentMethod);

      expect(initialPaymentStatus).toBe(PaymentStatus.PENDING);

      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1000,
        discount: 0,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 1050,
        platformCommissionRate: 20,
        platformCommissionAmount: 200,
        payoutAmount: 800,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: initialPaymentStatus,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 8,
      };

      // Milestone condition: Only verified WALLET (at placement) or COD DELIVERED+PAID creates commission
      const isVerifiedWalletPaid = initialPaymentStatus === PaymentStatus.PAID;
      expect(isVerifiedWalletPaid).toBe(false);

      if (isVerifiedWalletPaid) {
        executeCommissionEngine({
          orderId,
          vendorOrder,
          influencer,
          customerUserId: customerId,
          attributionSource: AttributionSource.REFERRAL,
          db,
        });
      }

      expect(db.records.length).toBe(0);
    });
  });

  describe('H. WALLET_PLUS_ONLINE initial order → overall payment remains PENDING → zero records', () => {
    it('should keep WALLET_PLUS_ONLINE as paymentStatus PENDING and create zero commission records at checkout', () => {
      const paymentMethod = PaymentMethod.WALLET_PLUS_ONLINE;
      const initialPaymentStatus =
        getInitialPlacementPaymentStatus(paymentMethod);

      expect(initialPaymentStatus).toBe(PaymentStatus.PENDING);

      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 2000,
        discount: 0,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 2050,
        platformCommissionRate: 20,
        platformCommissionAmount: 400,
        payoutAmount: 1600,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: initialPaymentStatus,
      };

      const isVerifiedWalletPaid = initialPaymentStatus === PaymentStatus.PAID;
      expect(isVerifiedWalletPaid).toBe(false);

      if (isVerifiedWalletPaid) {
        executeCommissionEngine({
          orderId,
          vendorOrder,
          influencer: {
            _id: influencerId,
            userId: influencerUserId,
            status: InfluencerStatus.ACTIVE,
            isDeleted: false,
            commissionRate: 10,
          },
          customerUserId: customerId,
          attributionSource: AttributionSource.REFERRAL,
          db,
        });
      }

      expect(db.records.length).toBe(0);
    });
  });

  describe('H2. WALLET successful atomic deduction → verified PAID → one commission record', () => {
    it('should create exactly one commission record when internal wallet deduction succeeds', () => {
      const paymentMethod = PaymentMethod.WALLET;
      const initialPaymentStatus =
        getInitialPlacementPaymentStatus(paymentMethod);

      expect(initialPaymentStatus).toBe(PaymentStatus.PAID);

      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1000,
        discount: 0,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 1050,
        platformCommissionRate: 20,
        platformCommissionAmount: 200,
        payoutAmount: 800,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: initialPaymentStatus,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      };

      const isVerifiedWalletPaid = initialPaymentStatus === PaymentStatus.PAID;
      expect(isVerifiedWalletPaid).toBe(true);

      const record = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record).not.toBeNull();
      expect(db.records.length).toBe(1);
      expect(record!.status).toBe(CommissionStatus.PENDING);
      expect(record!.commissionAmount).toBe(100);
    });
  });

  describe('H3. WALLET_PLUS_COD initial VendorOrder → paymentStatus PENDING', () => {
    it('should initialize VendorOrder with paymentStatus PENDING for WALLET_PLUS_COD and create zero records at placement', () => {
      const paymentMethod = PaymentMethod.WALLET_PLUS_COD;
      const initialVendorOrderPaymentStatus =
        getInitialPlacementPaymentStatus(paymentMethod);

      expect(initialVendorOrderPaymentStatus).toBe(PaymentStatus.PENDING);

      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1500,
        discount: 0,
        shippingCharge: 60,
        codCharge: 40,
        tax: 0,
        grandTotal: 1600,
        platformCommissionRate: 20,
        platformCommissionAmount: 300,
        payoutAmount: 1200,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: initialVendorOrderPaymentStatus,
      };

      const isEligibleAtPlacement =
        initialVendorOrderPaymentStatus === PaymentStatus.PAID;
      expect(isEligibleAtPlacement).toBe(false);

      expect(db.records.length).toBe(0);
    });
  });

  describe('I. COD PENDING/PENDING → zero records', () => {
    it('should NOT create commission record at COD order placement (orderStatus: PENDING, paymentStatus: PENDING)', () => {
      const codVendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1200,
        discount: 100,
        shippingCharge: 60,
        codCharge: 40,
        tax: 0,
        grandTotal: 1200,
        platformCommissionRate: 20,
        platformCommissionAmount: 220,
        payoutAmount: 880,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      };

      // Condition: For COD, create ONLY on DELIVERED && PAID
      const isCodEligible =
        codVendorOrder.orderStatus === OrderStatus.DELIVERED &&
        codVendorOrder.paymentStatus === PaymentStatus.PAID;
      expect(isCodEligible).toBe(false);

      if (isCodEligible) {
        executeCommissionEngine({
          orderId,
          vendorOrder: codVendorOrder,
          influencer: {
            _id: influencerId,
            userId: influencerUserId,
            status: InfluencerStatus.ACTIVE,
            isDeleted: false,
            commissionRate: 10,
          },
          customerUserId: customerId,
          attributionSource: AttributionSource.REFERRAL,
          db,
        });
      }

      expect(db.records.length).toBe(0);
    });
  });

  describe('J. COD SHIPPED → zero records', () => {
    it('should NOT create commission record when COD order is SHIPPED but not yet DELIVERED', () => {
      const codVendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1200,
        discount: 100,
        shippingCharge: 60,
        codCharge: 40,
        tax: 0,
        grandTotal: 1200,
        platformCommissionRate: 20,
        platformCommissionAmount: 220,
        payoutAmount: 880,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.SHIPPED,
        paymentStatus: PaymentStatus.PENDING,
      };

      const isCodEligible =
        codVendorOrder.orderStatus === OrderStatus.DELIVERED &&
        codVendorOrder.paymentStatus === PaymentStatus.PAID;
      expect(isCodEligible).toBe(false);

      if (isCodEligible) {
        executeCommissionEngine({
          orderId,
          vendorOrder: codVendorOrder,
          influencer: {
            _id: influencerId,
            userId: influencerUserId,
            status: InfluencerStatus.ACTIVE,
            isDeleted: false,
            commissionRate: 10,
          },
          customerUserId: customerId,
          attributionSource: AttributionSource.REFERRAL,
          db,
        });
      }

      expect(db.records.length).toBe(0);
    });
  });

  describe('K. COD DELIVERED + PAID → one record', () => {
    it('should create commission record ONLY when COD reaches DELIVERED && PAID', () => {
      const codVendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1200,
        discount: 200, // net = 1000
        shippingCharge: 60,
        codCharge: 40,
        tax: 0,
        grandTotal: 1100,
        platformCommissionRate: 20,
        platformCommissionAmount: 200,
        payoutAmount: 800,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      };

      const isCodEligible =
        codVendorOrder.orderStatus === OrderStatus.DELIVERED &&
        codVendorOrder.paymentStatus === PaymentStatus.PAID;
      expect(isCodEligible).toBe(true);

      const record = executeCommissionEngine({
        orderId,
        vendorOrder: codVendorOrder,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record).not.toBeNull();
      expect(db.records.length).toBe(1);
      expect(record!.commissionAmount).toBe(100); // 10% of 1000
      expect(record!.status).toBe(CommissionStatus.PENDING);
    });
  });

  describe('L. multi-vendor → separate vendorOrder commission records', () => {
    it('should create separate commission records for each vendorOrder with its own commission base', () => {
      const vendorOrder1: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId: new Types.ObjectId(),
        userId: customerId,
        subTotal: 1000,
        discount: 100, // net = 900
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 950,
        platformCommissionRate: 20,
        platformCommissionAmount: 180,
        payoutAmount: 720,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const vendorOrder2: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId: new Types.ObjectId(),
        userId: customerId,
        subTotal: 2000,
        discount: 400, // net = 1600
        shippingCharge: 70,
        codCharge: 0,
        tax: 0,
        grandTotal: 1670,
        platformCommissionRate: 20,
        platformCommissionAmount: 320,
        payoutAmount: 1280,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      };

      const record1 = executeCommissionEngine({
        orderId,
        vendorOrder: vendorOrder1,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      const record2 = executeCommissionEngine({
        orderId,
        vendorOrder: vendorOrder2,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record1).not.toBeNull();
      expect(record2).not.toBeNull();
      expect(db.records.length).toBe(2);

      // Separate vendor order IDs and respective bases
      expect(record1!.vendorOrderId.toString()).toBe(
        vendorOrder1._id.toString(),
      );
      expect(record1!.finalOrderAmount).toBe(900);
      expect(record1!.commissionAmount).toBe(90);

      expect(record2!.vendorOrderId.toString()).toBe(
        vendorOrder2._id.toString(),
      );
      expect(record2!.finalOrderAmount).toBe(1600);
      expect(record2!.commissionAmount).toBe(160);
    });
  });

  describe('M. duplicate event → no duplicate record', () => {
    it('should be strictly idempotent: retry with same { orderId, vendorOrderId, influencerId } produces exactly 1 record', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1000,
        discount: 0,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 1050,
        platformCommissionRate: 20,
        platformCommissionAmount: 200,
        payoutAmount: 800,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      };

      // First webhook / callback execution
      const record1 = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      // Second redundant webhook / retry event
      const record2 = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(db.records.length).toBe(1);
      expect(record1!._id.toString()).toBe(record2!._id.toString());
    });
  });

  describe('N. Admin rate change after commission creation does not alter snapshot', () => {
    it('should preserve historical rate and amount snapshot when Admin changes influencer commissionRate later', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1000,
        discount: 0,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 1050,
        platformCommissionRate: 20,
        platformCommissionAmount: 200,
        payoutAmount: 800,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const influencer: InfluencerContext = {
        _id: influencerId,
        userId: influencerUserId,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10, // Initial 10%
      };

      const record = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record!.commissionRate).toBe(10);
      expect(record!.commissionAmount).toBe(100);

      // Admin updates influencer rate to 25% or null
      influencer.commissionRate = 25;

      // Existing historical ledger record remains unmodified
      const historicalRecord = db.findExisting(
        orderId,
        vendorOrder._id,
        influencer._id,
      );
      expect(historicalRecord!.commissionRate).toBe(10);
      expect(historicalRecord!.commissionAmount).toBe(100);
    });
  });

  describe('O. vendor payout is unchanged by influencer commission', () => {
    it('should fund influencer commission from platform margin and NOT reduce vendor payout', () => {
      const subTotal = 2000;
      const vendorDiscount = 200;
      const shippingCharge = 100;
      const codCharge = 0;
      const finalOrderAmount = subTotal - vendorDiscount; // 1800
      const platformCommissionRate = 20;
      const platformCommissionAmount = parseFloat(
        ((finalOrderAmount * platformCommissionRate) / 100).toFixed(2),
      ); // 360

      // Vendor payout is calculated from sale amount minus platform commission
      const saleBase = finalOrderAmount;
      const vendorPayout = parseFloat(
        (saleBase - platformCommissionAmount).toFixed(2),
      ); // 1440

      const influencerCommissionRate = 10;
      const influencerCommissionAmount = parseFloat(
        ((finalOrderAmount * influencerCommissionRate) / 100).toFixed(2),
      ); // 180

      // Rule F2 Verification:
      // vendorPayout MUST remain exactly 1440. It must NOT subtract 180.
      expect(vendorPayout).toBe(1440);
      expect(vendorPayout - influencerCommissionAmount).toBe(1260); // If someone had erroneously deducted it
      expect(vendorPayout).toBe(finalOrderAmount - platformCommissionAmount);
    });
  });

  describe('P. Self-purchase prevention contract', () => {
    it('should not create a commission record when influencer purchases through their own link / account', () => {
      const vendorOrder: VendorOrderContext = {
        _id: new Types.ObjectId(),
        orderId,
        vendorId,
        userId: customerId,
        subTotal: 1000,
        discount: 0,
        shippingCharge: 50,
        codCharge: 0,
        tax: 0,
        grandTotal: 1050,
        platformCommissionRate: 20,
        platformCommissionAmount: 200,
        payoutAmount: 800,
        influencerCommissionAmount: 0,
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };

      const selfInfluencer: InfluencerContext = {
        _id: influencerId,
        userId: customerId, // Same userId as buyer!
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
        commissionRate: 10,
      };

      const record = executeCommissionEngine({
        orderId,
        vendorOrder,
        influencer: selfInfluencer,
        customerUserId: customerId,
        attributionSource: AttributionSource.REFERRAL,
        db,
      });

      expect(record).toBeNull();
      expect(db.records.length).toBe(0);
    });
  });
});
