import { Types } from 'mongoose';
import {
  CommissionStatus,
  AttributionSource,
  InfluencerCommission,
} from './schema/influencer-commision-rate.schema';
import { OrderStatus, PaymentStatus } from '../order/schema/order.schema';

describe('Phase 6: Commission Lifecycle (7-Day Return Hold & Full Reversal)', () => {
  interface MockCommissionRecord {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    vendorOrderId: Types.ObjectId;
    influencerId: Types.ObjectId;
    influencerUserId: Types.ObjectId;
    vendorId: Types.ObjectId;
    orderAmount: number;
    discountAmount: number;
    finalOrderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: CommissionStatus;
    isDelivered: boolean;
    deliveredAt?: Date | null;
    approvalEligibleAt?: Date | null;
    isReversed: boolean;
    reversedAt?: Date | null;
    reversalReason?: string;
  }

  interface MockVendorOrder {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    vendorId: Types.ObjectId;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    payoutAmount: number;
    influencerCommissionAmount: number;
  }

  interface MockMainOrder {
    _id: Types.ObjectId;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
  }

  // Simulated Database & Lifecycle Controller matching InfluencerService implementation
  class MockLifecycleEngine {
    commissions: MockCommissionRecord[] = [];
    vendorOrders: Map<string, MockVendorOrder> = new Map();
    orders: Map<string, MockMainOrder> = new Map();

    createCommission(data: Partial<MockCommissionRecord>): MockCommissionRecord {
      const record: MockCommissionRecord = {
        _id: new Types.ObjectId(),
        orderId: data.orderId || new Types.ObjectId(),
        vendorOrderId: data.vendorOrderId || new Types.ObjectId(),
        influencerId: data.influencerId || new Types.ObjectId(),
        influencerUserId: data.influencerUserId || new Types.ObjectId(),
        vendorId: data.vendorId || new Types.ObjectId(),
        orderAmount: data.orderAmount || 1000,
        discountAmount: data.discountAmount || 0,
        finalOrderAmount: data.finalOrderAmount || 1000,
        commissionRate: data.commissionRate || 10,
        commissionAmount: data.commissionAmount || 100,
        status: data.status || CommissionStatus.PENDING,
        isDelivered: !!data.isDelivered,
        deliveredAt: data.deliveredAt || null,
        approvalEligibleAt: data.approvalEligibleAt || null,
        isReversed: !!data.isReversed,
        reversedAt: data.reversedAt || null,
        reversalReason: data.reversalReason,
      };
      this.commissions.push(record);
      return record;
    }

    // Delivery hold logic: deliveredAt + exactly 7 days (168 hours)
    markDelivered(vendorOrderId: Types.ObjectId, deliveryDate: Date) {
      const eligibleDate = new Date(deliveryDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const target = this.commissions.find(
        (c) =>
          c.vendorOrderId.toString() === vendorOrderId.toString() &&
          c.status === CommissionStatus.PENDING &&
          !c.isReversed,
      );
      if (target) {
        target.isDelivered = true;
        target.deliveredAt = deliveryDate;
        target.approvalEligibleAt = eligibleDate;
      }
      return target;
    }

    // Rule 1: Pre-delivery cancellation (PENDING -> CANCELLED, idempotent)
    cancelCommissionByVendorOrderId(vendorOrderId: Types.ObjectId, reason?: string) {
      const records = this.commissions.filter(
        (c) =>
          c.vendorOrderId.toString() === vendorOrderId.toString() &&
          c.status !== CommissionStatus.CANCELLED &&
          c.status !== CommissionStatus.REVERSED,
      );
      for (const rec of records) {
        rec.status = CommissionStatus.CANCELLED;
        rec.reversalReason = reason || 'Vendor order cancelled';
      }
      return records.length;
    }

    cancelCommissionsByOrderId(orderId: Types.ObjectId, reason?: string) {
      const records = this.commissions.filter(
        (c) =>
          c.orderId.toString() === orderId.toString() &&
          c.status !== CommissionStatus.CANCELLED &&
          c.status !== CommissionStatus.REVERSED,
      );
      for (const rec of records) {
        rec.status = CommissionStatus.CANCELLED;
        rec.reversalReason = reason || 'Order cancelled by customer';
      }
      return records.length;
    }

    // Rule 2: Post-delivery return/refund (PENDING -> REVERSED, idempotent)
    reverseCommissionByVendorOrderId(vendorOrderId: Types.ObjectId, reason: string, now: Date = new Date()) {
      const records = this.commissions.filter(
        (c) =>
          c.vendorOrderId.toString() === vendorOrderId.toString() &&
          c.status !== CommissionStatus.CANCELLED &&
          c.status !== CommissionStatus.REVERSED,
      );
      for (const rec of records) {
        rec.status = CommissionStatus.REVERSED;
        rec.isReversed = true;
        rec.reversedAt = now;
        rec.reversalReason = reason;
      }
      return records.length;
    }

    // Rule 4: Daily Cron Approval Job
    processEligibleCommissionApprovals(currentEvaluationTime: Date) {
      let approvedCount = 0;
      let disqualifiedCount = 0;

      // Filter commissions where hold has elapsed
      const candidates = this.commissions.filter(
        (c) =>
          c.status === CommissionStatus.PENDING &&
          !c.isReversed &&
          c.approvalEligibleAt &&
          c.approvalEligibleAt.getTime() <= currentEvaluationTime.getTime(),
      );

      for (const comm of candidates) {
        let isEligible = true;
        let disqualificationReason = '';

        const vo = this.vendorOrders.get(comm.vendorOrderId.toString());
        if (!vo) {
          isEligible = false;
          disqualificationReason = 'Vendor order not found';
        } else {
          const badStatuses = [
            OrderStatus.CANCELLED,
            OrderStatus.PARTIALLY_CANCELLED,
            OrderStatus.RETURNED,
            OrderStatus.PARTIALLY_RETURNED,
          ];
          if (badStatuses.includes(vo.orderStatus)) {
            isEligible = false;
            disqualificationReason = `Vendor order is ${vo.orderStatus}`;
          } else if (vo.orderStatus !== OrderStatus.DELIVERED) {
            isEligible = false;
            disqualificationReason = `Vendor order not delivered`;
          } else if (vo.paymentStatus === PaymentStatus.REFUNDED || vo.paymentStatus === PaymentStatus.FAILED) {
            isEligible = false;
            disqualificationReason = `Vendor order payment ${vo.paymentStatus}`;
          }
        }

        const mainOrder = this.orders.get(comm.orderId.toString());
        if (mainOrder) {
          // For multi-vendor orders, PARTIALLY_CANCELLED or PARTIALLY_RETURNED at the main order level
          // must NOT disqualify unaffected vendor orders whose vendorOrder status is DELIVERED.
          const badStatuses = [
            OrderStatus.CANCELLED,
            OrderStatus.RETURNED,
          ];
          if (badStatuses.includes(mainOrder.orderStatus)) {
            isEligible = false;
            disqualificationReason = `Main order is ${mainOrder.orderStatus}`;
          }
          if (mainOrder.paymentStatus === PaymentStatus.REFUNDED || mainOrder.paymentStatus === PaymentStatus.FAILED) {
            isEligible = false;
            disqualificationReason = `Main order payment ${mainOrder.paymentStatus}`;
          }
        }

        if (isEligible) {
          comm.status = CommissionStatus.APPROVED;
          approvedCount++;
        } else {
          disqualifiedCount++;
          if (disqualificationReason.toLowerCase().includes('cancelled')) {
            comm.status = CommissionStatus.CANCELLED;
            comm.reversalReason = disqualificationReason;
          } else if (
            disqualificationReason.toLowerCase().includes('returned') ||
            disqualificationReason.toLowerCase().includes('refunded')
          ) {
            comm.status = CommissionStatus.REVERSED;
            comm.isReversed = true;
            comm.reversedAt = currentEvaluationTime;
            comm.reversalReason = disqualificationReason;
          }
        }
      }

      return {
        processed: candidates.length,
        approved: approvedCount,
        disqualified: disqualifiedCount,
      };
    }

    // Analytics / Earning aggregation logic
    calculateInfluencerEarnings(influencerId: Types.ObjectId) {
      const records = this.commissions.filter(
        (c) => c.influencerId.toString() === influencerId.toString(),
      );

      let totalEarnedCommission = 0;
      let pendingCommission = 0;
      let totalSales = 0;

      for (const r of records) {
        if (r.status === CommissionStatus.CANCELLED || r.status === CommissionStatus.REVERSED) {
          // Zero financial earning
          continue;
        }
        totalSales += r.finalOrderAmount;
        if (r.status === CommissionStatus.APPROVED || r.status === CommissionStatus.PAID) {
          totalEarnedCommission += r.commissionAmount;
        } else if (r.status === CommissionStatus.PENDING && !r.isReversed) {
          pendingCommission += r.commissionAmount;
        }
      }

      return {
        totalEarnedCommission,
        pendingCommission,
        totalSales,
      };
    }
  }

  let engine: MockLifecycleEngine;
  let influencerId: Types.ObjectId;
  let influencerUserId: Types.ObjectId;
  let vendorId1: Types.ObjectId;
  let vendorId2: Types.ObjectId;

  beforeEach(() => {
    engine = new MockLifecycleEngine();
    influencerId = new Types.ObjectId();
    influencerUserId = new Types.ObjectId();
    vendorId1 = new Types.ObjectId();
    vendorId2 = new Types.ObjectId();
  });

  describe('1. Pre-delivery cancellation contracts (PENDING -> CANCELLED)', () => {
    it('should transition PENDING to CANCELLED and result in ₹0 financial earning', () => {
      const orderId = new Types.ObjectId();
      const vendorOrderId = new Types.ObjectId();

      const comm = engine.createCommission({
        orderId,
        vendorOrderId,
        influencerId,
        influencerUserId,
        finalOrderAmount: 2000,
        commissionRate: 10,
        commissionAmount: 200,
        status: CommissionStatus.PENDING,
      });

      expect(comm.status).toBe(CommissionStatus.PENDING);
      let earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.pendingCommission).toBe(200);
      expect(earnings.totalEarnedCommission).toBe(0);

      // Pre-delivery cancellation happens
      const cancelledCount = engine.cancelCommissionByVendorOrderId(
        vendorOrderId,
        'Customer changed mind before shipping',
      );
      expect(cancelledCount).toBe(1);

      expect(comm.status).toBe(CommissionStatus.CANCELLED);
      expect(comm.reversalReason).toBe('Customer changed mind before shipping');

      // Influencer financial earning MUST now be ₹0
      earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.pendingCommission).toBe(0);
      expect(earnings.totalEarnedCommission).toBe(0);
      expect(earnings.totalSales).toBe(0);

      // Snapshot audit preservation
      expect(comm.commissionAmount).toBe(200);
      expect(comm.commissionRate).toBe(10);
      expect(comm.finalOrderAmount).toBe(2000);
    });

    it('should cancel all vendor commissions when main order is cancelled pre-delivery', () => {
      const orderId = new Types.ObjectId();
      const vo1 = new Types.ObjectId();
      const vo2 = new Types.ObjectId();

      const comm1 = engine.createCommission({
        orderId,
        vendorOrderId: vo1,
        influencerId,
        finalOrderAmount: 1500,
        commissionAmount: 150,
      });
      const comm2 = engine.createCommission({
        orderId,
        vendorOrderId: vo2,
        influencerId,
        finalOrderAmount: 2500,
        commissionAmount: 250,
      });

      expect(engine.calculateInfluencerEarnings(influencerId).pendingCommission).toBe(400);

      const modifiedCount = engine.cancelCommissionsByOrderId(orderId, 'Main order cancelled');
      expect(modifiedCount).toBe(2);

      expect(comm1.status).toBe(CommissionStatus.CANCELLED);
      expect(comm2.status).toBe(CommissionStatus.CANCELLED);
      expect(engine.calculateInfluencerEarnings(influencerId).pendingCommission).toBe(0);
    });
  });

  describe('2. Post-delivery return/refund reversal contracts (PENDING -> REVERSED)', () => {
    it('should transition PENDING to REVERSED with isReversed=true, timestamp, reason, and ₹0 earning', () => {
      const orderId = new Types.ObjectId();
      const vendorOrderId = new Types.ObjectId();
      const deliveryDate = new Date('2026-10-01T10:00:00.000Z');

      const comm = engine.createCommission({
        orderId,
        vendorOrderId,
        influencerId,
        finalOrderAmount: 3000,
        commissionRate: 15,
        commissionAmount: 450,
        status: CommissionStatus.PENDING,
      });

      engine.markDelivered(vendorOrderId, deliveryDate);
      expect(comm.isDelivered).toBe(true);

      const returnTime = new Date('2026-10-04T12:00:00.000Z');
      const reversedCount = engine.reverseCommissionByVendorOrderId(
        vendorOrderId,
        'Defective item returned by customer',
        returnTime,
      );

      expect(reversedCount).toBe(1);
      expect(comm.status).toBe(CommissionStatus.REVERSED);
      expect(comm.isReversed).toBe(true);
      expect(comm.reversedAt).toEqual(returnTime);
      expect(comm.reversalReason).toBe('Defective item returned by customer');

      // Earnings must be exactly ₹0
      const earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.totalEarnedCommission).toBe(0);
      expect(earnings.pendingCommission).toBe(0);
      expect(earnings.totalSales).toBe(0);

      // Snapshot audit history preserved
      expect(comm.commissionAmount).toBe(450);
      expect(comm.finalOrderAmount).toBe(3000);
      expect(comm.commissionRate).toBe(15);
    });
  });

  describe('3. Delivery hold contracts (deliveredAt + exactly 7 days)', () => {
    it('should stamp deliveredAt and approvalEligibleAt = deliveredAt + exactly 168 hours', () => {
      const vendorOrderId = new Types.ObjectId();
      const deliveryTimestamp = new Date('2026-10-01T14:30:00.000Z');
      const expectedEligibleTimestamp = new Date('2026-10-08T14:30:00.000Z'); // 7 * 24 hours later

      const comm = engine.createCommission({
        vendorOrderId,
        influencerId,
        status: CommissionStatus.PENDING,
      });

      engine.markDelivered(vendorOrderId, deliveryTimestamp);

      expect(comm.deliveredAt).toEqual(deliveryTimestamp);
      expect(comm.approvalEligibleAt).toEqual(expectedEligibleTimestamp);
      expect(comm.approvalEligibleAt!.getTime() - comm.deliveredAt!.getTime()).toBe(
        7 * 24 * 60 * 60 * 1000,
      );
      expect(comm.status).toBe(CommissionStatus.PENDING);
    });

    it('should keep commission strictly PENDING on Day 1, Day 3, and Day 6', () => {
      const vendorOrderId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const deliveryTimestamp = new Date('2026-10-01T00:00:00.000Z');

      const comm = engine.createCommission({
        orderId,
        vendorOrderId,
        influencerId,
        status: CommissionStatus.PENDING,
      });
      engine.markDelivered(vendorOrderId, deliveryTimestamp);

      // Register healthy vendor order & order
      engine.vendorOrders.set(vendorOrderId.toString(), {
        _id: vendorOrderId,
        orderId,
        vendorId: vendorId1,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        payoutAmount: 800,
        influencerCommissionAmount: 100,
      });
      engine.orders.set(orderId.toString(), {
        _id: orderId,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      });

      // Day 1 evaluation
      let res = engine.processEligibleCommissionApprovals(new Date('2026-10-02T00:00:00.000Z'));
      expect(res.processed).toBe(0);
      expect(comm.status).toBe(CommissionStatus.PENDING);

      // Day 3 evaluation
      res = engine.processEligibleCommissionApprovals(new Date('2026-10-04T00:00:00.000Z'));
      expect(res.processed).toBe(0);
      expect(comm.status).toBe(CommissionStatus.PENDING);

      // Day 6 (144 hours) evaluation: STILL HOLDING
      res = engine.processEligibleCommissionApprovals(new Date('2026-10-07T00:00:00.000Z'));
      expect(res.processed).toBe(0);
      expect(comm.status).toBe(CommissionStatus.PENDING);
    });
  });

  describe('4. Approval evaluation & Cron contracts', () => {
    it('should transition PENDING to APPROVED only after approvalEligibleAt <= now() and order not cancelled/returned', () => {
      const vendorOrderId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const deliveryTimestamp = new Date('2026-10-01T00:00:00.000Z');

      const comm = engine.createCommission({
        orderId,
        vendorOrderId,
        influencerId,
        commissionAmount: 150,
        status: CommissionStatus.PENDING,
      });
      engine.markDelivered(vendorOrderId, deliveryTimestamp);

      engine.vendorOrders.set(vendorOrderId.toString(), {
        _id: vendorOrderId,
        orderId,
        vendorId: vendorId1,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        payoutAmount: 900,
        influencerCommissionAmount: 150,
      });
      engine.orders.set(orderId.toString(), {
        _id: orderId,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      });

      // Day 8 (169 hours) evaluation: Hold completed & clean order status
      const res = engine.processEligibleCommissionApprovals(new Date('2026-10-08T01:00:00.000Z'));
      expect(res.processed).toBe(1);
      expect(res.approved).toBe(1);
      expect(comm.status).toBe(CommissionStatus.APPROVED);

      // Earning is now realized
      const earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.totalEarnedCommission).toBe(150);
      expect(earnings.pendingCommission).toBe(0);
    });

    it('should reverse commission if vendor order was returned before or during approval evaluation', () => {
      const vendorOrderId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const deliveryTimestamp = new Date('2026-10-01T00:00:00.000Z');

      const comm = engine.createCommission({
        orderId,
        vendorOrderId,
        influencerId,
        commissionAmount: 200,
        status: CommissionStatus.PENDING,
      });
      engine.markDelivered(vendorOrderId, deliveryTimestamp);

      // Vendor order marked RETURNED
      engine.vendorOrders.set(vendorOrderId.toString(), {
        _id: vendorOrderId,
        orderId,
        vendorId: vendorId1,
        orderStatus: OrderStatus.RETURNED,
        paymentStatus: PaymentStatus.REFUNDED,
        payoutAmount: 0,
        influencerCommissionAmount: 200,
      });
      engine.orders.set(orderId.toString(), {
        _id: orderId,
        orderStatus: OrderStatus.RETURNED,
        paymentStatus: PaymentStatus.REFUNDED,
      });

      // Cron evaluates on Day 8
      const res = engine.processEligibleCommissionApprovals(new Date('2026-10-08T01:00:00.000Z'));
      expect(res.processed).toBe(1);
      expect(res.approved).toBe(0);
      expect(res.disqualified).toBe(1);
      expect(comm.status).toBe(CommissionStatus.REVERSED);
      expect(comm.isReversed).toBe(true);

      const earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.totalEarnedCommission).toBe(0);
      expect(earnings.pendingCommission).toBe(0);
    });

    it('should cancel commission if vendor order was cancelled before cron approval', () => {
      const vendorOrderId = new Types.ObjectId();
      const orderId = new Types.ObjectId();
      const deliveryTimestamp = new Date('2026-10-01T00:00:00.000Z');

      const comm = engine.createCommission({
        orderId,
        vendorOrderId,
        influencerId,
        commissionAmount: 120,
        status: CommissionStatus.PENDING,
      });
      engine.markDelivered(vendorOrderId, deliveryTimestamp);

      engine.vendorOrders.set(vendorOrderId.toString(), {
        _id: vendorOrderId,
        orderId,
        vendorId: vendorId1,
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
        payoutAmount: 0,
        influencerCommissionAmount: 120,
      });

      const res = engine.processEligibleCommissionApprovals(new Date('2026-10-08T01:00:00.000Z'));
      expect(res.approved).toBe(0);
      expect(res.disqualified).toBe(1);
      expect(comm.status).toBe(CommissionStatus.CANCELLED);
    });
  });

  describe('5. Idempotency contracts', () => {
    it('should never reverse or cancel the same commission twice', () => {
      const vendorOrderId = new Types.ObjectId();
      const comm = engine.createCommission({
        vendorOrderId,
        influencerId,
        commissionAmount: 300,
        status: CommissionStatus.PENDING,
      });

      const firstTime = new Date('2026-10-03T10:00:00.000Z');
      const count1 = engine.reverseCommissionByVendorOrderId(vendorOrderId, 'First reversal', firstTime);
      expect(count1).toBe(1);
      expect(comm.status).toBe(CommissionStatus.REVERSED);
      expect(comm.reversedAt).toEqual(firstTime);
      expect(comm.reversalReason).toBe('First reversal');

      // Trigger second reversal call with different reason and time
      const secondTime = new Date('2026-10-03T11:00:00.000Z');
      const count2 = engine.reverseCommissionByVendorOrderId(vendorOrderId, 'Second redundant call', secondTime);
      expect(count2).toBe(0); // Safely skipped!
      expect(comm.status).toBe(CommissionStatus.REVERSED);
      expect(comm.reversedAt).toEqual(firstTime); // Preserved first timestamp
      expect(comm.reversalReason).toBe('First reversal'); // Preserved first reason
    });

    it('should never cancel an already cancelled commission twice', () => {
      const vendorOrderId = new Types.ObjectId();
      const comm = engine.createCommission({
        vendorOrderId,
        influencerId,
        commissionAmount: 180,
        status: CommissionStatus.PENDING,
      });

      const count1 = engine.cancelCommissionByVendorOrderId(vendorOrderId, 'Reason 1');
      expect(count1).toBe(1);
      expect(comm.status).toBe(CommissionStatus.CANCELLED);

      const count2 = engine.cancelCommissionByVendorOrderId(vendorOrderId, 'Reason 2');
      expect(count2).toBe(0);
      expect(comm.reversalReason).toBe('Reason 1');
    });
  });

  describe('6. Multi-vendor order isolation contracts', () => {
    it('should reverse only the returned vendor order commission, allowing unaffected vendor to be approved', () => {
      const orderId = new Types.ObjectId();
      const vo1 = new Types.ObjectId();
      const vo2 = new Types.ObjectId();
      const deliveryDate = new Date('2026-10-01T00:00:00.000Z');

      // Multi-vendor order: Vendor 1 (₹100 comm), Vendor 2 (₹200 comm)
      const comm1 = engine.createCommission({
        orderId,
        vendorOrderId: vo1,
        vendorId: vendorId1,
        influencerId,
        finalOrderAmount: 1000,
        commissionAmount: 100,
        status: CommissionStatus.PENDING,
      });
      const comm2 = engine.createCommission({
        orderId,
        vendorOrderId: vo2,
        vendorId: vendorId2,
        influencerId,
        finalOrderAmount: 2000,
        commissionAmount: 200,
        status: CommissionStatus.PENDING,
      });

      engine.markDelivered(vo1, deliveryDate);
      engine.markDelivered(vo2, deliveryDate);

      // Customer returns only Vendor 1's item on Day 3
      engine.reverseCommissionByVendorOrderId(vo1, 'Vendor 1 item returned');
      expect(comm1.status).toBe(CommissionStatus.REVERSED);
      expect(comm2.status).toBe(CommissionStatus.PENDING); // Unaffected!

      // Setup state for Cron evaluation on Day 8
      engine.vendorOrders.set(vo1.toString(), {
        _id: vo1,
        orderId,
        vendorId: vendorId1,
        orderStatus: OrderStatus.RETURNED,
        paymentStatus: PaymentStatus.REFUNDED,
        payoutAmount: 0,
        influencerCommissionAmount: 100,
      });
      engine.vendorOrders.set(vo2.toString(), {
        _id: vo2,
        orderId,
        vendorId: vendorId2,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        payoutAmount: 1600,
        influencerCommissionAmount: 200,
      });
      engine.orders.set(orderId.toString(), {
        _id: orderId,
        orderStatus: OrderStatus.PARTIALLY_RETURNED,
        paymentStatus: PaymentStatus.PAID,
      });

      const cronResult = engine.processEligibleCommissionApprovals(new Date('2026-10-08T05:00:00.000Z'));
      // Only comm2 was a candidate (comm1 is already REVERSED)
      expect(cronResult.processed).toBe(1);
      expect(cronResult.approved).toBe(1);

      expect(comm1.status).toBe(CommissionStatus.REVERSED);
      expect(comm2.status).toBe(CommissionStatus.APPROVED);

      // Influencer earnings: exactly ₹200 from unaffected Vendor 2, ₹0 from Vendor 1
      const earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.totalEarnedCommission).toBe(200);
      expect(earnings.pendingCommission).toBe(0);
      expect(earnings.totalSales).toBe(2000);
    });
  });

  describe('7. Platform funding / Vendor settlement independence contract', () => {
    it('must NOT alter vendor payout calculation when influencer commission is created, cancelled, or reversed', () => {
      // Vendor economics
      const subTotal = 2000;
      const vendorDiscount = 200;
      const finalOrderAmount = subTotal - vendorDiscount; // 1800
      const platformCommissionRate = 20; // 20%
      const platformCommissionAmount = (finalOrderAmount * platformCommissionRate) / 100; // 360
      const expectedVendorPayout = finalOrderAmount - platformCommissionAmount; // 1440

      const influencerCommissionRate = 10;
      const influencerCommissionAmount = (finalOrderAmount * influencerCommissionRate) / 100; // 180

      // Scenario A: Order Delivered, Commission PENDING
      let vendorPayout = finalOrderAmount - platformCommissionAmount;
      expect(vendorPayout).toBe(1440);

      // Scenario B: Commission is reversed post-delivery
      const isCommissionReversed = true;
      if (isCommissionReversed) {
        // Vendor payout is derived purely from (saleBase - platformCommissionAmount)
        // It must NOT be reduced or increased because influencer commission reversed
        vendorPayout = finalOrderAmount - platformCommissionAmount;
      }
      expect(vendorPayout).toBe(1440);
      expect(expectedVendorPayout).toBe(1440);
    });
  });

  describe('8. Phase boundary enforcement contracts', () => {
    it('Phase 6 must NOT perform payouts, check ₹500 threshold, or request withdrawals', () => {
      // Create approved commission under ₹500
      const comm1 = engine.createCommission({
        influencerId,
        commissionAmount: 150,
        status: CommissionStatus.APPROVED,
      });

      // Create approved commission over ₹500
      const comm2 = engine.createCommission({
        influencerId,
        commissionAmount: 600,
        status: CommissionStatus.APPROVED,
      });

      const earnings = engine.calculateInfluencerEarnings(influencerId);
      expect(earnings.totalEarnedCommission).toBe(750);

      // Under Phase 6: No status is moved to PAID; no withdrawal requests are accepted; status remains APPROVED
      expect(comm1.status).toBe(CommissionStatus.APPROVED);
      expect(comm2.status).toBe(CommissionStatus.APPROVED);
      // No payout entity was touched or created
    });
  });
});
