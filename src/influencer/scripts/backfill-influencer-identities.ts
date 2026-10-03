/**
 * Safe, Idempotent Backfill Script for Influencer Referral Identities
 * 
 * Rules enforced:
 * 1. Generates/copies unique uppercase referralCode for every active influencer lacking one.
 * 2. STRICT ZERO-DEFAULT POLICY: Leaves missing commissionRate as null/unset.
 * 3. Does NOT assign 5% or any invented default rate.
 * 4. Preserves any existing explicitly configured commissionRate.
 * 5. Flags unconfigured creators for Admin rate assignment.
 * 6. Completely idempotent: safe to run multiple times without duplicating or corrupting data.
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/fashionfever';

async function generateCandidateCode(name: string, influencerColl: any, affiliateColl: any): Promise<string> {
  const cleanName = (name || 'CREATOR')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6) || 'FF';

  let isUnique = false;
  let candidate = '';
  let attempts = 0;

  while (!isUnique && attempts < 25) {
    attempts++;
    const randomHex = randomBytes(2).toString('hex').toUpperCase();
    candidate = `${cleanName}${randomHex}`;

    const [infExists, progExists] = await Promise.all([
      influencerColl.findOne({ referralCode: candidate }),
      affiliateColl.findOne({ referralCode: candidate }),
    ]);

    if (!infExists && !progExists) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    candidate = `FF${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  return candidate;
}

export async function runBackfill() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected successfully to MongoDB.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection failed');
  }

  const influencerColl = db.collection('influencers');
  const affiliateColl = db.collection('affliateprograms');

  const influencers = await influencerColl.find({ isDeleted: false }).toArray();
  console.log(`Found ${influencers.length} total active influencers.`);

  let provisionedCodes = 0;
  let alreadyHadCode = 0;
  let configuredRates = 0;
  const unconfiguredCreators: string[] = [];

  for (const inf of influencers) {
    let updatedFields: Record<string, any> = {};

    // 1. Referral Code Check
    if (!inf.referralCode) {
      // Check existing affiliate program
      const existingProg = await affiliateColl.findOne({
        influencerId: inf._id,
        isActive: true,
      });

      let assignedCode = '';
      if (existingProg && existingProg.referralCode) {
        assignedCode = existingProg.referralCode.trim().toUpperCase();
      } else {
        assignedCode = await generateCandidateCode(inf.name, influencerColl, affiliateColl);
      }

      updatedFields.referralCode = assignedCode;
      provisionedCodes++;

      // Harmonize with AffliateProgram
      if (!existingProg) {
        await affiliateColl.insertOne({
          influencerId: inf._id,
          referralCode: assignedCode,
          isActive: true,
          isDeleted: false,
          totalClicks: 0,
          totalSignups: 0,
          totalSales: 0,
          totalCommission: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (existingProg.referralCode !== assignedCode) {
        await affiliateColl.updateOne(
          { _id: existingProg._id },
          { $set: { referralCode: assignedCode, updatedAt: new Date() } }
        );
      }
    } else {
      alreadyHadCode++;
    }

    // 2. Commission Rate Check (STRICT ZERO-DEFAULT POLICY)
    if (inf.commissionRate === null || inf.commissionRate === undefined) {
      // KEEP AS NULL - NEVER ASSIGN 5% OR INVENTED RATE
      unconfiguredCreators.push(`${inf.name || 'Unnamed'} (ID: ${inf._id})`);
    } else {
      configuredRates++;
    }

    // Ensure approvedCommission field exists with default 0
    if (inf.approvedCommission === undefined) {
      updatedFields.approvedCommission = 0;
    }

    // Ensure totalSignups field exists with default 0
    if (inf.totalSignups === undefined) {
      updatedFields.totalSignups = 0;
    }

    if (Object.keys(updatedFields).length > 0) {
      await influencerColl.updateOne(
        { _id: inf._id },
        { $set: { ...updatedFields, updatedAt: new Date() } }
      );
    }
  }

  console.log('\n==================================================');
  console.log('       INFLUENCER IDENTITY BACKFILL SUMMARY       ');
  console.log('==================================================');
  console.log(`Total Influencers Evaluated : ${influencers.length}`);
  console.log(`Referral Codes Provisioned   : ${provisionedCodes}`);
  console.log(`Referral Codes Already Set   : ${alreadyHadCode}`);
  console.log(`Explicitly Configured Rates : ${configuredRates}`);
  console.log(`Unconfigured Creators (Null): ${unconfiguredCreators.length}`);
  console.log('==================================================');

  if (unconfiguredCreators.length > 0) {
    console.log('\n[NOTICE] The following creators have unconfigured commissionRate (null).');
    console.log('In accordance with finalized business rules, NO commission records will be created');
    console.log('for these creators until an Admin explicitly assigns a custom rate via Admin Panel:');
    unconfiguredCreators.forEach((c, idx) => console.log(`  ${idx + 1}. ${c}`));
  }

  await mongoose.disconnect();
  console.log('\nBackfill completed successfully. Database connection closed.');
}

if (require.main === module) {
  runBackfill().catch((err) => {
    console.error('Backfill error:', err);
    process.exit(1);
  });
}
