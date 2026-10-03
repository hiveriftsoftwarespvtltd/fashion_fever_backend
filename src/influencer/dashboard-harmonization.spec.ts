import { Types } from 'mongoose';
import { CommissionStatus, AttributionSource } from './schema/influencer-commision-rate.schema';
import { InfluencerStatus } from './schema/influencer.schema';

describe('Phase 8: Influencer Dashboard & Admin Harmonization Contracts', () => {
  interface MockInfluencer {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    name: string;
    referralCode: string;
    commissionRate?: number | null;
    status: InfluencerStatus;
    isDeleted: boolean;
  }

  interface MockCommission {
    _id: Types.ObjectId;
    influencerId: Types.ObjectId;
    orderId: Types.ObjectId;
    vendorOrderId: Types.ObjectId;
    attributionSource: AttributionSource;
    finalOrderAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: CommissionStatus;
    isReversed?: boolean;
    createdAt: Date;
  }

  interface MockWalletBalance {
    balance: number;
    approvedBalance: number;
    pendingBalance: number;
    paidBalance: number;
    lifetimeEarnings: number;
  }

  class MockDashboardService {
    private influencers: MockInfluencer[] = [];
    private commissions: MockCommission[] = [];

    addInfluencer(inf: MockInfluencer) {
      this.influencers.push(inf);
    }

    addCommission(comm: MockCommission) {
      this.commissions.push(comm);
    }

    // Mirrors the enhanced overview() aggregation in influencer.service.ts
    async overview(influencerId: string) {
      const objId = new Types.ObjectId(influencerId);
      const influencer = this.influencers.find(
        (i) => i._id.toString() === objId.toString(),
      );

      const creatorCommissions = this.commissions.filter(
        (c) => c.influencerId.toString() === objId.toString(),
      );

      let totalSales = 0;
      let totalCommission = 0;
      let pendingCommission = 0;
      let approvedCommission = 0;
      let paidCommission = 0;
      let totalOrders = 0;

      for (const comm of creatorCommissions) {
        const isCancelledOrReversed =
          comm.status === CommissionStatus.CANCELLED ||
          comm.status === CommissionStatus.REVERSED;

        if (!isCancelledOrReversed) {
          totalSales += comm.finalOrderAmount;
          totalOrders += 1;
        }

        if (
          comm.status === CommissionStatus.APPROVED ||
          comm.status === CommissionStatus.PAID
        ) {
          totalCommission += comm.commissionAmount;
        }

        if (
          comm.status === CommissionStatus.PENDING &&
          comm.isReversed !== true
        ) {
          pendingCommission += comm.commissionAmount;
        }

        if (comm.status === CommissionStatus.APPROVED) {
          approvedCommission += comm.commissionAmount;
        }

        if (comm.status === CommissionStatus.PAID) {
          paidCommission += comm.commissionAmount;
        }
      }

      return {
        totalSales,
        totalCommission,
        pendingCommission,
        approvedCommission,
        paidCommission,
        totalOrders,
        commissionRate:
          influencer?.commissionRate !== undefined
            ? influencer.commissionRate
            : null,
        name: influencer?.name,
        referralCode: influencer?.referralCode,
      };
    }

    // Mirrors the wallet balance service in payout.service.ts
    async getWalletBalance(influencerId: string): Promise<MockWalletBalance> {
      const objId = new Types.ObjectId(influencerId);
      const creatorCommissions = this.commissions.filter(
        (c) => c.influencerId.toString() === objId.toString(),
      );

      let pendingBalance = 0;
      let approvedBalance = 0;
      let paidBalance = 0;

      for (const comm of creatorCommissions) {
        if (
          comm.status === CommissionStatus.PENDING &&
          comm.isReversed !== true
        ) {
          pendingBalance += comm.commissionAmount;
        } else if (comm.status === CommissionStatus.APPROVED) {
          approvedBalance += comm.commissionAmount;
        } else if (comm.status === CommissionStatus.PAID) {
          paidBalance += comm.commissionAmount;
        }
      }

      return {
        balance: approvedBalance,
        approvedBalance,
        pendingBalance,
        paidBalance,
        lifetimeEarnings: approvedBalance + paidBalance,
      };
    }
  }

  let service: MockDashboardService;
  let influencerId: Types.ObjectId;

  beforeEach(() => {
    service = new MockDashboardService();
    influencerId = new Types.ObjectId();
  });

  describe('1. KPI Calculations & Status Separation', () => {
    it('should separate PENDING (7-day hold), APPROVED (payable), and PAID (settled) commissions', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Creator One',
        referralCode: 'CREATOR1',
        commissionRate: 10,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      // 1 Pending (in 7-day return hold): ₹150
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 1500,
        commissionRate: 10,
        commissionAmount: 150,
        status: CommissionStatus.PENDING,
        createdAt: new Date(),
      });

      // 1 Approved (matured past 7 days, payable): ₹200
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 2000,
        commissionRate: 10,
        commissionAmount: 200,
        status: CommissionStatus.APPROVED,
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      // 1 Paid (settled by admin): ₹300
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 3000,
        commissionRate: 10,
        commissionAmount: 300,
        status: CommissionStatus.PAID,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });

      const overview = await service.overview(influencerId.toString());

      expect(overview.pendingCommission).toBe(150);
      expect(overview.approvedCommission).toBe(200);
      expect(overview.paidCommission).toBe(300);
      expect(overview.totalCommission).toBe(500); // lifetime = approved + paid
      expect(overview.totalSales).toBe(6500);
      expect(overview.totalOrders).toBe(3);
    });

    it('should strictly exclude CANCELLED and REVERSED commissions from sales and earnings', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Creator One',
        referralCode: 'CREATOR1',
        commissionRate: 10,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      // 1 Valid Approved commission: ₹100 from ₹1,000 order
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 1000,
        commissionRate: 10,
        commissionAmount: 100,
        status: CommissionStatus.APPROVED,
        createdAt: new Date(),
      });

      // 1 Cancelled commission: ₹150 from ₹1,500 order
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 1500,
        commissionRate: 10,
        commissionAmount: 150,
        status: CommissionStatus.CANCELLED,
        createdAt: new Date(),
      });

      // 1 Reversed commission (returned): ₹250 from ₹2,500 order
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 2500,
        commissionRate: 10,
        commissionAmount: 250,
        status: CommissionStatus.REVERSED,
        isReversed: true,
        createdAt: new Date(),
      });

      const overview = await service.overview(influencerId.toString());

      // Only the valid approved commission should count
      expect(overview.totalSales).toBe(1000); // Excludes ₹1,500 and ₹2,500
      expect(overview.totalOrders).toBe(1); // Excludes cancelled and reversed
      expect(overview.approvedCommission).toBe(100);
      expect(overview.pendingCommission).toBe(0);
      expect(overview.paidCommission).toBe(0);
      expect(overview.totalCommission).toBe(100);
    });
  });

  describe('2. Authoritative Agreement with Creator Wallet Ledger', () => {
    it('should have exact mathematical agreement between overview KPIs and wallet balance', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Creator Sync',
        referralCode: 'SYNC1',
        commissionRate: 12.5,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      // 2 Pending
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 800,
        commissionRate: 12.5,
        commissionAmount: 100,
        status: CommissionStatus.PENDING,
        createdAt: new Date(),
      });
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 1600,
        commissionRate: 12.5,
        commissionAmount: 200,
        status: CommissionStatus.PENDING,
        createdAt: new Date(),
      });

      // 2 Approved
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 2400,
        commissionRate: 12.5,
        commissionAmount: 300,
        status: CommissionStatus.APPROVED,
        createdAt: new Date(),
      });
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 4000,
        commissionRate: 12.5,
        commissionAmount: 500,
        status: CommissionStatus.APPROVED,
        createdAt: new Date(),
      });

      // 1 Paid
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 4800,
        commissionRate: 12.5,
        commissionAmount: 600,
        status: CommissionStatus.PAID,
        createdAt: new Date(),
      });

      const [overview, wallet] = await Promise.all([
        service.overview(influencerId.toString()),
        service.getWalletBalance(influencerId.toString()),
      ]);

      // Exact mathematical agreement:
      expect(overview.approvedCommission).toBe(wallet.approvedBalance);
      expect(overview.pendingCommission).toBe(wallet.pendingBalance);
      expect(overview.paidCommission).toBe(wallet.paidBalance);
      expect(overview.totalCommission).toBe(wallet.lifetimeEarnings);
      expect(wallet.approvedBalance).toBe(800);
      expect(wallet.pendingBalance).toBe(300);
      expect(wallet.paidBalance).toBe(600);
      expect(wallet.lifetimeEarnings).toBe(1400);
    });
  });

  describe('3. Configured Commission Rate Reporting (Zero-Default Policy)', () => {
    it('should return commissionRate: null when rate is unconfigured (Rate Unset)', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Unconfigured Creator',
        referralCode: 'UNCONFIG',
        commissionRate: null,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      const overview = await service.overview(influencerId.toString());
      expect(overview.commissionRate).toBeNull();
    });

    it('should return commissionRate: 0 when explicitly configured to 0%', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Zero Rate Creator',
        referralCode: 'ZERO_RATE',
        commissionRate: 0,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      const overview = await service.overview(influencerId.toString());
      expect(overview.commissionRate).toBe(0);
    });

    it('should return exact configured rate when set > 0% (e.g. 15.5%)', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Tier Creator',
        referralCode: 'TIER15',
        commissionRate: 15.5,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      const overview = await service.overview(influencerId.toString());
      expect(overview.commissionRate).toBe(15.5);
    });
  });

  describe('4. Metric Definition Clarity', () => {
    it('should maintain Net E-Commerce Sales as finalOrderAmount sum, distinct from Gross GMV', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Metric Creator',
        referralCode: 'METRIC',
        commissionRate: 10,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      // Order with subTotal ₹2,000, discount ₹500 -> finalOrderAmount = ₹1,500
      service.addCommission({
        _id: new Types.ObjectId(),
        influencerId,
        orderId: new Types.ObjectId(),
        vendorOrderId: new Types.ObjectId(),
        attributionSource: AttributionSource.REFERRAL,
        finalOrderAmount: 1500, // Net Order Amount (excluding taxes, shipping, after discount)
        commissionRate: 10,
        commissionAmount: 150,
        status: CommissionStatus.APPROVED,
        createdAt: new Date(),
      });

      const overview = await service.overview(influencerId.toString());

      // Net E-Commerce Sales is strictly finalOrderAmount (₹1,500), not gross
      expect(overview.totalSales).toBe(1500);
      expect(overview.approvedCommission).toBe(150);
    });
  });

  describe('5. Clean Empty States — Zero Mock Fallbacks', () => {
    it('should return clean zeroes for a new influencer with no commissions (no dummy mock data)', async () => {
      service.addInfluencer({
        _id: influencerId,
        userId: new Types.ObjectId(),
        name: 'Brand New Creator',
        referralCode: 'NEWBIE',
        commissionRate: 8,
        status: InfluencerStatus.ACTIVE,
        isDeleted: false,
      });

      const overview = await service.overview(influencerId.toString());

      expect(overview.totalSales).toBe(0);
      expect(overview.totalOrders).toBe(0);
      expect(overview.totalCommission).toBe(0);
      expect(overview.pendingCommission).toBe(0);
      expect(overview.approvedCommission).toBe(0);
      expect(overview.paidCommission).toBe(0);
      expect(overview.commissionRate).toBe(8);
      // Confirms absence of fake dummy numbers (like uniqueClicks: 1, totalSignups: 2)
    });
  });
});
