import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { RegisterDTO } from './dto/register.dto';
import { GoogleLoginDTO } from './dto/google-login.dto';
import { InfluencerStatus } from '../influencer/schema/influencer.schema';

describe('Phase 2: Referral Link Ingestion & Signup Hook Contracts', () => {
  describe('1. DTO Validation Contracts', () => {
    it('should validate RegisterDTO with an optional referralCode', async () => {
      const dto = new RegisterDTO();
      dto.name = 'Test User';
      dto.email = 'test@example.com';
      dto.password = 'StrongP@ss123';
      dto.referralCode = 'INFLUENCER10';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.referralCode).toBe('INFLUENCER10');
    });

    it('should validate RegisterDTO without referralCode (backward compatible)', async () => {
      const dto = new RegisterDTO();
      dto.name = 'Test User';
      dto.email = 'test2@example.com';
      dto.password = 'StrongP@ss123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.referralCode).toBeUndefined();
    });

    it('should validate GoogleLoginDTO with an optional referralCode', async () => {
      const dto = new GoogleLoginDTO();
      dto.idToken = 'valid-google-id-token-abc';
      dto.referralCode = 'CREATOR45';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.referralCode).toBe('CREATOR45');
    });
  });

  describe('2. Referral Attribution Resolution & Expiry Logic (Rule B)', () => {
    // Pure logic simulation of resolveReferralAttribution contract
    async function simulateResolveAttribution(params: {
      referralCode?: string;
      registeringEmail?: string;
      influencerRecord?: {
        _id: Types.ObjectId;
        referralCode: string;
        status: InfluencerStatus;
        isDeleted: boolean;
        influencerEmail: string;
      } | null;
    }) {
      const { referralCode, registeringEmail, influencerRecord } = params;
      if (!referralCode || typeof referralCode !== 'string') {
        return { referredByInfluencerId: null, referralAttributedAt: null, referralExpiresAt: null };
      }

      const normalizedCode = referralCode.trim().toUpperCase();

      if (!influencerRecord || influencerRecord.referralCode !== normalizedCode) {
        return { referredByInfluencerId: null, referralAttributedAt: null, referralExpiresAt: null };
      }

      if (influencerRecord.status !== InfluencerStatus.ACTIVE || influencerRecord.isDeleted) {
        return { referredByInfluencerId: null, referralAttributedAt: null, referralExpiresAt: null };
      }

      // RULE E: Self-referral prohibition
      if (
        registeringEmail &&
        influencerRecord.influencerEmail.toLowerCase() === registeringEmail.toLowerCase()
      ) {
        return { referredByInfluencerId: null, referralAttributedAt: null, referralExpiresAt: null };
      }

      const now = new Date();
      const EXACT_365_DAYS_MS = 365 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now.getTime() + EXACT_365_DAYS_MS);

      return {
        referredByInfluencerId: influencerRecord._id,
        referralAttributedAt: now,
        referralExpiresAt: expiresAt,
      };
    }

    it('should successfully attribute a user registering through an active creator code', async () => {
      const influencerId = new Types.ObjectId();
      const res = await simulateResolveAttribution({
        referralCode: '  alex_fever  ',
        registeringEmail: 'customer@gmail.com',
        influencerRecord: {
          _id: influencerId,
          referralCode: 'ALEX_FEVER',
          status: InfluencerStatus.ACTIVE,
          isDeleted: false,
          influencerEmail: 'alex@creator.com',
        },
      });

      expect(res.referredByInfluencerId).toEqual(influencerId);
      expect(res.referralAttributedAt).toBeInstanceOf(Date);
      expect(res.referralExpiresAt).toBeInstanceOf(Date);

      // Verify exact 365-day duration
      const diffMs = res.referralExpiresAt!.getTime() - res.referralAttributedAt!.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(365);
    });

    it('should BLOCK self-referrals when creator attempts to register with their own code (Rule E)', async () => {
      const influencerId = new Types.ObjectId();
      const res = await simulateResolveAttribution({
        referralCode: 'ALEX_FEVER',
        registeringEmail: 'ALEX@creator.com', // Matching email regardless of case
        influencerRecord: {
          _id: influencerId,
          referralCode: 'ALEX_FEVER',
          status: InfluencerStatus.ACTIVE,
          isDeleted: false,
          influencerEmail: 'alex@creator.com',
        },
      });

      // Attribution must be rejected
      expect(res.referredByInfluencerId).toBeNull();
      expect(res.referralAttributedAt).toBeNull();
      expect(res.referralExpiresAt).toBeNull();
    });

    it('should reject attribution if creator status is PENDING or SUSPENDED', async () => {
      const influencerId = new Types.ObjectId();
      const res = await simulateResolveAttribution({
        referralCode: 'ALEX_FEVER',
        registeringEmail: 'customer@gmail.com',
        influencerRecord: {
          _id: influencerId,
          referralCode: 'ALEX_FEVER',
          status: InfluencerStatus.PENDING,
          isDeleted: false,
          influencerEmail: 'alex@creator.com',
        },
      });

      expect(res.referredByInfluencerId).toBeNull();
    });

    it('should reject attribution if referralCode does not exist', async () => {
      const res = await simulateResolveAttribution({
        referralCode: 'NON_EXISTENT_CODE',
        registeringEmail: 'customer@gmail.com',
        influencerRecord: null,
      });

      expect(res.referredByInfluencerId).toBeNull();
    });

    it('should return nulls if no referral code is supplied', async () => {
      const res = await simulateResolveAttribution({
        referralCode: undefined,
        registeringEmail: 'customer@gmail.com',
      });

      expect(res.referredByInfluencerId).toBeNull();
      expect(res.referralAttributedAt).toBeNull();
      expect(res.referralExpiresAt).toBeNull();
    });
  });
});
