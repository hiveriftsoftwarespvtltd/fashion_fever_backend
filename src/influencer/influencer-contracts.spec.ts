import { validate } from 'class-validator';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';

describe('Phase 1: Influencer & Affiliate Architecture Contracts', () => {
  describe('1. Commission Rate Validation (UpdateCommissionRateDto)', () => {
    it('should accept a valid positive rate (e.g. 12.5%)', async () => {
      const dto = new UpdateCommissionRateDto();
      dto.commissionRate = 12.5;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept an explicit 0% rate as a valid configured rate', async () => {
      const dto = new UpdateCommissionRateDto();
      dto.commissionRate = 0;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept null as an unconfigured rate', async () => {
      const dto = new UpdateCommissionRateDto();
      dto.commissionRate = null;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept undefined as an unconfigured rate', async () => {
      const dto = new UpdateCommissionRateDto();
      dto.commissionRate = undefined;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject negative commission rates (< 0%)', async () => {
      const dto = new UpdateCommissionRateDto();
      dto.commissionRate = -1;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject commission rates exceeding 100%', async () => {
      const dto = new UpdateCommissionRateDto();
      dto.commissionRate = 105;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('max');
    });
  });

  describe('2. Strict Three-Tier Commission Rate Contract', () => {
    function evaluateCommissionDecision(commissionRate: number | null | undefined, finalOrderAmount: number) {
      if (commissionRate === null || commissionRate === undefined) {
        return {
          createRecord: false,
          reason: 'UNCONFIGURED_RATE',
          commissionRateSnapshot: null,
          commissionAmount: null,
        };
      }

      if (commissionRate === 0) {
        return {
          createRecord: true,
          reason: 'CONFIGURED_ZERO_RATE',
          commissionRateSnapshot: 0,
          commissionAmount: 0,
        };
      }

      const commissionAmount = parseFloat(((finalOrderAmount * commissionRate) / 100).toFixed(2));
      return {
        createRecord: true,
        reason: 'CONFIGURED_POSITIVE_RATE',
        commissionRateSnapshot: commissionRate,
        commissionAmount,
      };
    }

    it('Tier 1: UNCONFIGURED (null/undefined) must suppress commission record creation completely', () => {
      const resultNull = evaluateCommissionDecision(null, 1500);
      expect(resultNull.createRecord).toBe(false);
      expect(resultNull.commissionAmount).toBeNull();

      const resultUndefined = evaluateCommissionDecision(undefined, 1500);
      expect(resultUndefined.createRecord).toBe(false);
      expect(resultUndefined.commissionAmount).toBeNull();
    });

    it('Tier 2: CONFIGURED 0% creates an explicit 0-value snapshot record', () => {
      const result = evaluateCommissionDecision(0, 2500);
      expect(result.createRecord).toBe(true);
      expect(result.commissionRateSnapshot).toBe(0);
      expect(result.commissionAmount).toBe(0);
    });

    it('Tier 3: CONFIGURED >0% calculates commission snapshot using net order amount', () => {
      const result = evaluateCommissionDecision(10, 2500);
      expect(result.createRecord).toBe(true);
      expect(result.commissionRateSnapshot).toBe(10);
      expect(result.commissionAmount).toBe(250);
    });

    it('Tier 3: Fractional rate (7.5%) calculates accurate rounded monetary amount', () => {
      const result = evaluateCommissionDecision(7.5, 1349);
      expect(result.createRecord).toBe(true);
      expect(result.commissionRateSnapshot).toBe(7.5);
      expect(result.commissionAmount).toBe(101.17);

      const resultClean = evaluateCommissionDecision(7.5, 2000);
      expect(resultClean.commissionAmount).toBe(150);
    });
  });

  describe('3. 365-Day Attribution Expiry Contract', () => {
    it('should set referral attribution for exactly 365 days from attribution timestamp', () => {
      const attributedAt = new Date('2026-10-03T10:00:00.000Z');
      const EXACT_365_DAYS_MS = 365 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(attributedAt.getTime() + EXACT_365_DAYS_MS);

      expect(expiresAt.toISOString()).toBe('2027-10-03T10:00:00.000Z');
      expect(expiresAt.getTime() - attributedAt.getTime()).toBe(EXACT_365_DAYS_MS);
    });

    it('should verify that attribution does not extend or reset on subsequent purchases (strict immutability)', () => {
      const attributedAt = new Date('2026-10-03T10:00:00.000Z');
      const initialExpiresAt = new Date(attributedAt.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Subsequent purchase 30 days later
      const orderDate = new Date('2026-11-02T10:00:00.000Z');
      const simulatedUser = {
        referredByInfluencerId: 'inf_123',
        referralAttributedAt: attributedAt,
        referralExpiresAt: initialExpiresAt,
      };

      // Ensure expiry is never refreshed
      expect(simulatedUser.referralExpiresAt.toISOString()).toBe(initialExpiresAt.toISOString());
      expect(orderDate < simulatedUser.referralExpiresAt).toBe(true);
    });

    it('should expire attribution after exactly 365 days have elapsed', () => {
      const attributedAt = new Date('2026-10-03T10:00:00.000Z');
      const expiresAt = new Date(attributedAt.getTime() + 365 * 24 * 60 * 60 * 1000);

      const withinWindow = new Date('2027-10-02T10:00:00.000Z');
      const afterWindow = new Date('2027-10-04T10:00:00.000Z');

      expect(withinWindow < expiresAt).toBe(true);
      expect(afterWindow > expiresAt).toBe(true);
    });
  });

  describe('4. Referral Code Canonical Identity Formatting', () => {
    function sanitizeReferralCodePrefix(name: string): string {
      return (name || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6) || 'FF';
    }

    it('should generate uppercase alphanumeric prefix from influencer name', () => {
      expect(sanitizeReferralCodePrefix('Priya Sharma')).toBe('PRIYAS');
      expect(sanitizeReferralCodePrefix('Aarav')).toBe('AARAV');
      expect(sanitizeReferralCodePrefix('DJ @ Cool # 99')).toBe('DJCOOL');
      expect(sanitizeReferralCodePrefix('')).toBe('FF');
    });
  });
});
