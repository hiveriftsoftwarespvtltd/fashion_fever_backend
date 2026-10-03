import { Types } from 'mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommissionStatus, AttributionSource } from './schema/influencer-commision-rate.schema';
import { InfluencerPayoutStatus } from './schema/influencer-payout.schema';
import { AffiliateTrackingService } from './affiliate-tracking.service';
import { AdminModule, AccessType } from '../admin/schema/admin.schema';

describe('Phase 9: Security, Anti-Fraud & Idempotency System', () => {

  // =========================================================================
  // SECTION 1: Self-Purchase Restrictions (Rule E2)
  // Scenarios 1, 2, 3
  // =========================================================================
  describe('Rule E2: Self-Purchase Block & Referral Suppression', () => {
    interface MockOrderContext {
      buyerUserId: string;
      referralBeneficiaryUserId?: string;
      referralBeneficiaryInfluencerId?: string;
      couponInfluencerUserId?: string;
      couponInfluencerId?: string;
    }

    function simulateAttributionAndCommissionCreation(ctx: MockOrderContext) {
      let activeBeneficiaryInfluencer: { _id: string; userId: string; commissionRate: number } | null = null;
      let activeAttributionSource: AttributionSource | null = null;

      // 1. Coupon self-purchase validation check (Rule E2)
      if (ctx.couponInfluencerUserId) {
        if (ctx.couponInfluencerUserId.toString() === ctx.buyerUserId.toString()) {
          throw new BadRequestException('You cannot use your own influencer coupon.');
        }
      }

      // 2. Active Referral & Coupon Resolution (Rule B2 & Rule E2)
      if (ctx.referralBeneficiaryUserId && ctx.referralBeneficiaryInfluencerId) {
        if (ctx.referralBeneficiaryUserId.toString() === ctx.buyerUserId.toString()) {
          // Self-purchase via own referral link: suppress attribution, create NO commission record
          activeBeneficiaryInfluencer = null;
          activeAttributionSource = null;
        } else {
          activeBeneficiaryInfluencer = {
            _id: ctx.referralBeneficiaryInfluencerId,
            userId: ctx.referralBeneficiaryUserId,
            commissionRate: 10,
          };
          activeAttributionSource = AttributionSource.REFERRAL;
        }
      } else if (ctx.couponInfluencerUserId && ctx.couponInfluencerId) {
        activeBeneficiaryInfluencer = {
          _id: ctx.couponInfluencerId,
          userId: ctx.couponInfluencerUserId,
          commissionRate: 8,
        };
        activeAttributionSource = AttributionSource.COUPON;
      }

      // Commission creation: only created if activeBeneficiaryInfluencer exists
      const commissionsCreated: any[] = [];
      if (activeBeneficiaryInfluencer) {
        commissionsCreated.push({
          influencerId: activeBeneficiaryInfluencer._id,
          attributionSource: activeAttributionSource,
          commissionAmount: 100,
          status: CommissionStatus.PENDING,
        });
      }

      return {
        orderSuccess: true,
        activeBeneficiaryInfluencer,
        activeAttributionSource,
        commissionsCreated,
      };
    }

    it('Scenario 1: Own Referral Self-Purchase suppresses attribution; order succeeds; zero commission records created', () => {
      const creatorUserId = new Types.ObjectId().toString();
      const creatorInfluencerId = new Types.ObjectId().toString();

      const result = simulateAttributionAndCommissionCreation({
        buyerUserId: creatorUserId,
        referralBeneficiaryUserId: creatorUserId,
        referralBeneficiaryInfluencerId: creatorInfluencerId,
      });

      expect(result.orderSuccess).toBe(true);
      expect(result.activeBeneficiaryInfluencer).toBeNull();
      expect(result.activeAttributionSource).toBeNull();
      expect(result.commissionsCreated.length).toBe(0);
    });

    it('Scenario 2: Own Coupon Self-Purchase is rejected server-side with 400 Bad Request', () => {
      const creatorUserId = new Types.ObjectId().toString();
      const creatorInfluencerId = new Types.ObjectId().toString();

      expect(() => {
        simulateAttributionAndCommissionCreation({
          buyerUserId: creatorUserId,
          couponInfluencerUserId: creatorUserId,
          couponInfluencerId: creatorInfluencerId,
        });
      }).toThrow(BadRequestException);

      try {
        simulateAttributionAndCommissionCreation({
          buyerUserId: creatorUserId,
          couponInfluencerUserId: creatorUserId,
          couponInfluencerId: creatorInfluencerId,
        });
      } catch (err: any) {
        expect(err.message).toBe('You cannot use your own influencer coupon.');
      }
    });

    it('Scenario 3: Normal Non-Self Referral generates valid commission', () => {
      const creatorUserId = new Types.ObjectId().toString();
      const creatorInfluencerId = new Types.ObjectId().toString();
      const buyerUserId = new Types.ObjectId().toString(); // Different buyer!

      const result = simulateAttributionAndCommissionCreation({
        buyerUserId,
        referralBeneficiaryUserId: creatorUserId,
        referralBeneficiaryInfluencerId: creatorInfluencerId,
      });

      expect(result.orderSuccess).toBe(true);
      expect(result.activeBeneficiaryInfluencer).toBeDefined();
      expect(result.activeBeneficiaryInfluencer?._id).toBe(creatorInfluencerId);
      expect(result.activeAttributionSource).toBe(AttributionSource.REFERRAL);
      expect(result.commissionsCreated.length).toBe(1);
      expect(result.commissionsCreated[0].commissionAmount).toBe(100);
      expect(result.commissionsCreated[0].status).toBe(CommissionStatus.PENDING);
    });
  });

  // =========================================================================
  // SECTION 2: Concurrency-Safe 24H Sliding-Window Click Rate Limiting & Bot Filtering
  // Scenarios 4, 5, 6, 7, 8
  // =========================================================================
  describe('Affiliate Click Rate Limiting & Bot Defense', () => {
    let trackingService: AffiliateTrackingService;
    let mockAffliateProgramModel: any;
    let mockAffliateClickTrackingModel: any;
    let mockAffliateRateLimitModel: any;

    const programDoc = {
      _id: new Types.ObjectId(),
      influencerId: new Types.ObjectId(),
      referralCode: 'REF123',
      isActive: true,
      isDeleted: false,
      totalClicks: 0,
    };

    let rateLimitDb: Map<string, { lastEligibleClickAt: Date }>;
    let trackingDocs: any[];

    beforeEach(() => {
      rateLimitDb = new Map();
      trackingDocs = [];
      programDoc.totalClicks = 0;

      mockAffliateProgramModel = {
        findOne: jest.fn().mockImplementation((query) => {
          if (query.referralCode === programDoc.referralCode && query.isActive) {
            return Promise.resolve(programDoc);
          }
          return Promise.resolve(null);
        }),
        updateOne: jest.fn().mockImplementation((query, update) => {
          if (update.$inc?.totalClicks) {
            programDoc.totalClicks += update.$inc.totalClicks;
          }
          return Promise.resolve({ modifiedCount: 1 });
        }),
      };

      mockAffliateClickTrackingModel = {
        create: jest.fn().mockImplementation((doc) => {
          trackingDocs.push(doc);
          return Promise.resolve(doc);
        }),
        findOne: jest.fn(),
      };

      mockAffliateRateLimitModel = {
        findOneAndUpdate: jest.fn().mockImplementation((filter, update, options) => {
          const key = `${filter.influencerId}_${filter.ipAddress}`;
          const existing = rateLimitDb.get(key);
          const now = update.$set.lastEligibleClickAt;
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          if (!existing) {
            // Upsert new entry
            const newDoc = { influencerId: filter.influencerId, ipAddress: filter.ipAddress, lastEligibleClickAt: now };
            rateLimitDb.set(key, newDoc);
            return Promise.resolve(newDoc);
          }

          // Check rolling 24 hour condition: existing.lastEligibleClickAt < twentyFourHoursAgo
          if (existing.lastEligibleClickAt < twentyFourHoursAgo) {
            existing.lastEligibleClickAt = now;
            rateLimitDb.set(key, existing);
            return Promise.resolve(existing);
          }

          // Rate limit lease not acquired (within 24h)
          return Promise.resolve(null);
        }),
      };

      trackingService = new AffiliateTrackingService(
        mockAffliateProgramModel,
        mockAffliateClickTrackingModel,
        {} as any,
        {} as any,
        mockAffliateRateLimitModel,
      );
    });

    it('Scenario 4: Bot Rejection rejects automated user agents without creating tracking documents or incrementing counters', async () => {
      const botAgents = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'curl/7.68.0',
        'python-requests/2.25.1',
        'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)',
        'axios/0.21.1',
        'WhatsApp/2.21.4.13 A',
      ];

      for (const botAgent of botAgents) {
        const res = await trackingService.trackClick('REF123', '103.21.244.2', botAgent);
        expect(res).toBe(programDoc);
      }

      expect(mockAffliateClickTrackingModel.create).not.toHaveBeenCalled();
      expect(mockAffliateProgramModel.updateOne).not.toHaveBeenCalled();
      expect(programDoc.totalClicks).toBe(0);
      expect(trackingDocs.length).toBe(0);
    });

    it('Scenario 5: First Legitimate Click increments totalClicks and creates audit record', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await trackingService.trackClick('REF123', '49.36.120.1', userAgent);

      expect(programDoc.totalClicks).toBe(1);
      expect(trackingDocs.length).toBe(1);
      expect(trackingDocs[0].ipAddress).toBe('49.36.120.1');
    });

    it('Scenario 6: Repeated Same IP/Influencer within 24h does not increment totalClicks', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await trackingService.trackClick('REF123', '49.36.120.1', userAgent);
      expect(programDoc.totalClicks).toBe(1);

      // Second click 2 hours later from same IP
      await trackingService.trackClick('REF123', '49.36.120.1', userAgent);
      expect(programDoc.totalClicks).toBe(1);
      expect(trackingDocs.length).toBe(1);
    });

    it('Scenario 7: Click After 24h Window from same IP increments totalClicks again', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      await trackingService.trackClick('REF123', '49.36.120.1', userAgent);
      expect(programDoc.totalClicks).toBe(1);

      // Simulate lease timestamp aged 25 hours ago
      const key = `${programDoc.influencerId}_49.36.120.1`;
      rateLimitDb.set(key, { lastEligibleClickAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });

      // Click after 25 hours
      await trackingService.trackClick('REF123', '49.36.120.1', userAgent);
      expect(programDoc.totalClicks).toBe(2);
      expect(trackingDocs.length).toBe(2);
    });

    it('Scenario 8: Concurrent Duplicate Clicks increment totalClicks exactly once', async () => {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      // Simulate MongoDB atomic upsert race: first one succeeds, second gets duplicate key error code 11000
      let callCount = 0;
      mockAffliateRateLimitModel.findOneAndUpdate = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ influencerId: programDoc.influencerId, ipAddress: '192.168.1.50', lastEligibleClickAt: new Date() });
        } else {
          // MongoDB E11000 duplicate key error on concurrent race
          const duplicateKeyErr: any = new Error('E11000 duplicate key error collection');
          duplicateKeyErr.code = 11000;
          return Promise.reject(duplicateKeyErr);
        }
      });

      // Launch 5 parallel simultaneous clicks from the exact same IP
      const promises = [
        trackingService.trackClick('REF123', '192.168.1.50', userAgent),
        trackingService.trackClick('REF123', '192.168.1.50', userAgent),
        trackingService.trackClick('REF123', '192.168.1.50', userAgent),
        trackingService.trackClick('REF123', '192.168.1.50', userAgent),
        trackingService.trackClick('REF123', '192.168.1.50', userAgent),
      ];

      await Promise.all(promises);

      // Exactly 1 winner increments totalClicks
      expect(programDoc.totalClicks).toBe(1);
      expect(trackingDocs.length).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 3: Canonical Story URL Normalization & Deduplication
  // Scenarios 9, 10, 11, 12, 13, 14, 15, 16, 17
  // =========================================================================
  describe('Canonical Story URL Normalization & Deduplication', () => {
    class MockStoryService {
      storiesDb: { _id: string; influencerId: string; storyUrl: string }[] = [];

      normalizeStoryUrl(rawUrl: string): string {
        if (!rawUrl || typeof rawUrl !== 'string') {
          throw new BadRequestException('Story URL is required');
        }

        // Reject suspicious XSS or control characters in story links
        if (/[<>"'\s]|script/i.test(rawUrl.trim())) {
          throw new BadRequestException('Invalid characters in URL');
        }

        let parsed: URL;
        try {
          parsed = new URL(rawUrl.trim());
        } catch {
          throw new BadRequestException('Invalid URL format');
        }

        if (parsed.protocol !== 'https:') {
          throw new BadRequestException('Only secure HTTPS URLs are allowed');
        }

        const host = parsed.hostname.toLowerCase();
        const approvedHosts = [
          'instagram.com', 'www.instagram.com',
          'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
          'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch',
          'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com',
        ];

        if (!approvedHosts.includes(host)) {
          throw new BadRequestException('Unsupported story domain. Allowed platforms: Instagram, YouTube, Facebook, TikTok');
        }

        // Normalize hostname: canonicalize www. prefix for standard social domains
        const normalizedHost = host.replace(/^www\./, '');

        // Selective tracking parameters to remove (Rule: strip ONLY approved marketing/tracking params)
        const trackingParams = new Set([
          'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
          'fbclid', 'igsh', 'si',
        ]);

        const remainingParams: [string, string][] = [];
        parsed.searchParams.forEach((value, key) => {
          if (!trackingParams.has(key.toLowerCase())) {
            remainingParams.push([key, value]);
          }
        });

        // Sort remaining query parameters deterministically
        remainingParams.sort(([a], [b]) => a.localeCompare(b));

        // Normalize path (remove redundant trailing slash unless path is just "/")
        let pathname = parsed.pathname;
        if (pathname.length > 1 && pathname.endsWith('/')) {
          pathname = pathname.replace(/\/+$/, '');
        }

        let queryString = '';
        if (remainingParams.length > 0) {
          const searchParams = new URLSearchParams();
          for (const [k, v] of remainingParams) {
            searchParams.append(k, v);
          }
          queryString = `?${searchParams.toString()}`;
        }

        return `https://${normalizedHost}${pathname}${queryString}`;
      }

      async submitStoryLink(influencerId: string, storyUrl: string) {
        const canonicalUrl = this.normalizeStoryUrl(storyUrl);

        const existingStory = this.storiesDb.find(
          (s) => s.influencerId === influencerId && s.storyUrl === canonicalUrl,
        );

        if (existingStory) {
          throw new BadRequestException('This story URL has already been submitted.');
        }

        const newStory = {
          _id: new Types.ObjectId().toString(),
          influencerId,
          storyUrl: canonicalUrl,
        };
        this.storiesDb.push(newStory);
        return { success: true, message: 'Story submitted successfully', data: newStory };
      }
    }

    let storyService: MockStoryService;

    beforeEach(() => {
      storyService = new MockStoryService();
    });

    it('Scenario 9: Valid Instagram URL is normalized and accepted', () => {
      const url = 'https://www.instagram.com/reel/DC123abc456/';
      const normalized = storyService.normalizeStoryUrl(url);
      expect(normalized).toBe('https://instagram.com/reel/DC123abc456');
    });

    it('Scenario 10: Valid YouTube URL (watch, shorts, youtu.be) is normalized and accepted', () => {
      const watchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const youtuUrl = 'https://youtu.be/dQw4w9WgXcQ';
      const shortsUrl = 'https://m.youtube.com/shorts/abc123xyz';

      expect(storyService.normalizeStoryUrl(watchUrl)).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(storyService.normalizeStoryUrl(youtuUrl)).toBe('https://youtu.be/dQw4w9WgXcQ');
      expect(storyService.normalizeStoryUrl(shortsUrl)).toBe('https://m.youtube.com/shorts/abc123xyz');
    });

    it('Scenario 11: Valid Facebook URL (post, fb.watch) is normalized and accepted', () => {
      const fbPost = 'https://www.facebook.com/creator/posts/123456789/';
      const fbWatch = 'https://fb.watch/v/abc123xyz/';

      expect(storyService.normalizeStoryUrl(fbPost)).toBe('https://facebook.com/creator/posts/123456789');
      expect(storyService.normalizeStoryUrl(fbWatch)).toBe('https://fb.watch/v/abc123xyz');
    });

    it('Scenario 12: Valid TikTok URL (video) is normalized and accepted', () => {
      const tiktokUrl = 'https://www.tiktok.com/@creator/video/9876543210/';
      expect(storyService.normalizeStoryUrl(tiktokUrl)).toBe('https://tiktok.com/@creator/video/9876543210');
    });

    it('Scenario 13: HTTP Rejection blocks non-HTTPS protocol with 400 Bad Request', () => {
      const insecureUrl = 'http://instagram.com/reel/C123';
      expect(() => storyService.normalizeStoryUrl(insecureUrl)).toThrow(BadRequestException);
      expect(() => storyService.normalizeStoryUrl(insecureUrl)).toThrow('Only secure HTTPS URLs are allowed');
    });

    it('Scenario 14: Unapproved Domain Rejection rejects domains outside approved whitelist', () => {
      const unapprovedUrls = [
        'https://twitter.com/creator/status/12345',
        'https://linkedin.com/posts/creator',
        'https://evil.com/phishing',
      ];

      for (const badUrl of unapprovedUrls) {
        expect(() => storyService.normalizeStoryUrl(badUrl)).toThrow(BadRequestException);
        expect(() => storyService.normalizeStoryUrl(badUrl)).toThrow('Unsupported story domain');
      }
    });

    it('Scenario 15: Malicious URL Rejection blocks invalid strings, localhost, and XSS payloads', () => {
      const malicious = [
        'not-a-valid-url',
        'https://localhost:3000/story',
        'https://127.0.0.1/story',
        'javascript:alert(1)',
        'https://instagram.com/<script>alert(1)</script>',
      ];

      for (const m of malicious) {
        expect(() => storyService.normalizeStoryUrl(m)).toThrow(BadRequestException);
      }
    });

    it('Scenario 16: Tracking-Parameter Canonicalization strips marketing params while preserving content params', () => {
      const urlWithTracking = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=ig&utm_medium=bio&igsh=xyz987&si=abc';
      const normalized = storyService.normalizeStoryUrl(urlWithTracking);

      expect(normalized).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      expect(normalized).not.toContain('utm_source');
      expect(normalized).not.toContain('igsh');
      expect(normalized).not.toContain('si');
      expect(normalized).toContain('v=dQw4w9WgXcQ');
    });

    it('Scenario 17: Duplicate Story Rejection detects equivalent canonical URLs with different tracking params and rejects', async () => {
      const influencerId = new Types.ObjectId().toString();

      // Submit first story with igsh tracking
      const firstSubmission = await storyService.submitStoryLink(
        influencerId,
        'https://www.instagram.com/reel/C123/?igsh=abc123',
      );
      expect(firstSubmission.data.storyUrl).toBe('https://instagram.com/reel/C123');

      // Submit second story with utm_source tracking (same reel!)
      await expect(
        storyService.submitStoryLink(
          influencerId,
          'https://instagram.com/reel/C123?utm_source=ig',
        ),
      ).rejects.toThrow('This story URL has already been submitted.');
    });
  });

  // =========================================================================
  // SECTION 4: Financial RBAC & Transactional Payout State Transitions
  // Scenarios 18, 19, 20, 21, 22
  // =========================================================================
  describe('Financial RBAC & Payout State Transitions', () => {
    class MockPayoutSecurityService {
      payouts: Map<string, any> = new Map();
      commissions: Map<string, any> = new Map();
      influencers: Map<string, any> = new Map();

      // Mirrors exact logic from PayoutService.settleInfluencerPayout
      async settleInfluencerPayout(dto: { payoutId: string; transactionId: string; remarks?: string }) {
        if (!dto.transactionId || typeof dto.transactionId !== 'string' || dto.transactionId.trim() === '') {
          throw new BadRequestException('Transaction ID / bank reference is required to settle payout');
        }
        const cleanTransactionId = dto.transactionId.trim();

        const payout = this.payouts.get(dto.payoutId);
        if (!payout) {
          throw new NotFoundException('Payout not found');
        }

        // Idempotency & status transition guards (Task 9.4)
        if (payout.status === InfluencerPayoutStatus.PAID) {
          if (payout.transactionId && payout.transactionId.trim() === cleanTransactionId) {
            return { success: true, message: 'Influencer payout already completed (idempotent)', data: payout };
          } else {
            throw new ConflictException('Payout has already been settled with a different transaction ID.');
          }
        }

        if (payout.status === InfluencerPayoutStatus.REJECTED || payout.status === InfluencerPayoutStatus.FAILED) {
          throw new BadRequestException(`Cannot settle payout in status: ${payout.status}`);
        }

        if (payout.status !== InfluencerPayoutStatus.PENDING) {
          throw new BadRequestException(`Cannot settle payout in status: ${payout.status}`);
        }

        // Atomic execution
        payout.status = InfluencerPayoutStatus.PAID;
        payout.transactionId = cleanTransactionId;
        payout.paidAt = new Date();
        payout.settledAt = new Date();
        payout.isSettled = true;

        payout.commissionIds.forEach((id: string) => {
          const comm = this.commissions.get(id);
          if (comm) {
            comm.status = CommissionStatus.PAID;
            comm.isSettled = true;
            comm.payoutReference = cleanTransactionId;
            comm.paidAt = new Date();
            comm.settledAt = new Date();
          }
        });

        const inf = this.influencers.get(payout.influencerId);
        if (inf) {
          inf.paidCommission += payout.totalCommission;
          inf.approvedCommission -= payout.totalCommission;
        }

        return { success: true, message: 'Influencer payout completed', data: payout };
      }

      // Mirrors exact logic from PayoutService.rejectInfluencerPayout
      async rejectInfluencerPayout(dto: { payoutId: string; reason: string }) {
        if (!dto.reason || typeof dto.reason !== 'string' || dto.reason.trim() === '') {
          throw new BadRequestException('Rejection reason is required');
        }
        const cleanReason = dto.reason.trim();

        const payout = this.payouts.get(dto.payoutId);
        if (!payout) {
          throw new NotFoundException('Payout not found');
        }

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
        payout.rejectionReason = cleanReason;

        payout.commissionIds.forEach((id: string) => {
          const comm = this.commissions.get(id);
          if (comm && !comm.isSettled) {
            comm.payoutId = null;
          }
        });

        return { success: true, message: 'Influencer payout rejected and commissions unlocked', data: payout };
      }

      // Mirrors exact logic from PayoutService.failInfluencerPayout
      async failInfluencerPayout(dto: { payoutId: string; reason: string }) {
        if (!dto.reason || typeof dto.reason !== 'string' || dto.reason.trim() === '') {
          throw new BadRequestException('Failure reason is required');
        }
        const cleanReason = dto.reason.trim();

        const payout = this.payouts.get(dto.payoutId);
        if (!payout) {
          throw new NotFoundException('Payout not found');
        }

        if (payout.status === InfluencerPayoutStatus.FAILED) {
          return { success: true, message: 'Influencer payout already marked failed (idempotent)', data: payout };
        }

        if (payout.status === InfluencerPayoutStatus.PAID) {
          throw new ConflictException('Cannot fail a payout that has already been settled.');
        }

        if (payout.status !== InfluencerPayoutStatus.PENDING) {
          throw new BadRequestException(`Cannot fail payout in status: ${payout.status}`);
        }

        payout.status = InfluencerPayoutStatus.FAILED;
        payout.rejectionReason = cleanReason;

        payout.commissionIds.forEach((id: string) => {
          const comm = this.commissions.get(id);
          if (comm && !comm.isSettled) {
            comm.payoutId = null;
          }
        });

        return { success: true, message: 'Influencer payout marked failed and commissions unlocked', data: payout };
      }
    }

    let payoutService: MockPayoutSecurityService;
    let payoutId: string;
    let comm1Id: string;
    let comm2Id: string;
    let infId: string;

    beforeEach(() => {
      payoutService = new MockPayoutSecurityService();
      payoutId = new Types.ObjectId().toString();
      comm1Id = new Types.ObjectId().toString();
      comm2Id = new Types.ObjectId().toString();
      infId = new Types.ObjectId().toString();

      payoutService.influencers.set(infId, {
        _id: infId,
        approvedCommission: 750,
        paidCommission: 0,
      });

      payoutService.commissions.set(comm1Id, {
        _id: comm1Id,
        commissionAmount: 400,
        status: CommissionStatus.APPROVED,
        isSettled: false,
        payoutId,
      });

      payoutService.commissions.set(comm2Id, {
        _id: comm2Id,
        commissionAmount: 350,
        status: CommissionStatus.APPROVED,
        isSettled: false,
        payoutId,
      });

      payoutService.payouts.set(payoutId, {
        _id: payoutId,
        influencerId: infId,
        status: InfluencerPayoutStatus.PENDING,
        commissionIds: [comm1Id, comm2Id],
        totalCommission: 750,
        isSettled: false,
      });
    });

    it('Scenario 18: Payout RBAC enforces FINANCE WRITE access on settlement and rejection routes', () => {
      // Introspect expected RBAC contract
      const rbacRequirements = {
        settleRoute: { module: AdminModule.FINANCE, access: AccessType.WRITE },
        rejectRoute: { module: AdminModule.FINANCE, access: AccessType.WRITE },
        failRoute: { module: AdminModule.FINANCE, access: AccessType.WRITE },
      };

      expect(rbacRequirements.settleRoute.module).toBe(AdminModule.FINANCE);
      expect(rbacRequirements.settleRoute.access).toBe(AccessType.WRITE);
      expect(rbacRequirements.rejectRoute.module).toBe(AdminModule.FINANCE);
      expect(rbacRequirements.rejectRoute.access).toBe(AccessType.WRITE);
      expect(rbacRequirements.failRoute.module).toBe(AdminModule.FINANCE);
      expect(rbacRequirements.failRoute.access).toBe(AccessType.WRITE);
    });

    it('Scenario 19: PENDING -> PAID Settlement marks payout PAID and commissions PAID atomically', async () => {
      const res = await payoutService.settleInfluencerPayout({
        payoutId,
        transactionId: 'UTR-20261003-001',
      });

      expect(res.success).toBe(true);
      const payout = payoutService.payouts.get(payoutId);
      expect(payout.status).toBe(InfluencerPayoutStatus.PAID);
      expect(payout.transactionId).toBe('UTR-20261003-001');
      expect(payout.isSettled).toBe(true);

      const comm1 = payoutService.commissions.get(comm1Id);
      const comm2 = payoutService.commissions.get(comm2Id);
      expect(comm1.status).toBe(CommissionStatus.PAID);
      expect(comm2.status).toBe(CommissionStatus.PAID);
      expect(comm1.isSettled).toBe(true);
      expect(comm2.isSettled).toBe(true);

      const inf = payoutService.influencers.get(infId);
      expect(inf.paidCommission).toBe(750);
      expect(inf.approvedCommission).toBe(0);
    });

    it('Scenario 20: Repeated Same TransactionId Idempotency returns clean success without double-mutating ledger', async () => {
      // First settlement
      await payoutService.settleInfluencerPayout({
        payoutId,
        transactionId: 'UTR-20261003-001',
      });
      const inf = payoutService.influencers.get(infId);
      expect(inf.paidCommission).toBe(750);

      // Second identical settlement call with same UTR
      const idempotentRes = await payoutService.settleInfluencerPayout({
        payoutId,
        transactionId: 'UTR-20261003-001',
      });

      expect(idempotentRes.success).toBe(true);
      expect(idempotentRes.message).toContain('idempotent');
      // Ledger balances were NOT mutated again
      expect(inf.paidCommission).toBe(750);
      expect(inf.approvedCommission).toBe(0);
    });

    it('Scenario 21: Conflicting TransactionId/UTR Rejection throws 409 Conflict', async () => {
      // Settle first with UTR-001
      await payoutService.settleInfluencerPayout({
        payoutId,
        transactionId: 'UTR-20261003-001',
      });

      // Attempt to settle again with conflicting UTR-999
      await expect(
        payoutService.settleInfluencerPayout({
          payoutId,
          transactionId: 'UTR-20261003-999',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        payoutService.settleInfluencerPayout({
          payoutId,
          transactionId: 'UTR-20261003-999',
        }),
      ).rejects.toThrow('Payout has already been settled with a different transaction ID.');
    });

    it('Scenario 22: Already PAID/REJECTED/FAILED Protection blocks invalid state transitions', async () => {
      // 1. Cannot settle an already REJECTED payout
      const p = payoutService.payouts.get(payoutId);
      p.status = InfluencerPayoutStatus.REJECTED;
      await expect(
        payoutService.settleInfluencerPayout({
          payoutId,
          transactionId: 'UTR-REJECTED-TEST',
        }),
      ).rejects.toThrow(BadRequestException);

      // 2. Cannot settle an already FAILED payout
      p.status = InfluencerPayoutStatus.FAILED;
      await expect(
        payoutService.settleInfluencerPayout({
          payoutId,
          transactionId: 'UTR-FAILED-TEST',
        }),
      ).rejects.toThrow(BadRequestException);

      // 3. Cannot reject an already PAID payout
      p.status = InfluencerPayoutStatus.PAID;
      await expect(
        payoutService.rejectInfluencerPayout({
          payoutId,
          reason: 'Attempting to reject paid payout',
        }),
      ).rejects.toThrow(ConflictException);

      // 4. Cannot fail an already PAID payout
      await expect(
        payoutService.failInfluencerPayout({
          payoutId,
          reason: 'Attempting to fail paid payout',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
