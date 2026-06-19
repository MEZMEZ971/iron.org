#!/usr/bin/env node
/**
 * One-time legacy referral collision repair.
 *
 * Fixes users whose referredById was incorrectly bound to an ADMIN account
 * due to the pre-fix ambiguous short-code resolver.
 *
 * Usage:
 *   node scripts/backfillLegacyReferrals.cjs              # dry-run (default)
 *   node scripts/backfillLegacyReferrals.cjs --apply      # commit changes
 *   node scripts/backfillLegacyReferrals.cjs --apply --mapping-file ./mappings.json
 *   node scripts/backfillLegacyReferrals.cjs --apply --fix-invite-tax-flags
 *
 * Optional env:
 *   LEGACY_COLLISION_ADMIN_ID=user_xxx   Force primary admin id
 *   LEGITIMATE_ADMIN_REFERRAL_UIDS=uid1,uid2  Skip nullify for these member uids
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const { prisma } = require("../lib/prisma.cjs");
const { findReferrerByInviteCode } = require("../lib/referralCodeGenerator.cjs");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FIX_INVITE_TAX = args.includes("--fix-invite-tax-flags");
const mappingIdx = args.indexOf("--mapping-file");
const MAPPING_FILE =
  mappingIdx >= 0 ? path.resolve(args[mappingIdx + 1] || "") : null;

function parseLegitimateUids() {
  return new Set(
    String(process.env.LEGITIMATE_ADMIN_REFERRAL_UIDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

async function resolveAdminIds() {
  if (process.env.LEGACY_COLLISION_ADMIN_ID) {
    return [process.env.LEGACY_COLLISION_ADMIN_ID];
  }
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, uid: true, username: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (!admins.length) {
    throw new Error("No ADMIN users found. Set LEGACY_COLLISION_ADMIN_ID.");
  }
  return admins.map((a) => a.id);
}

function loadMappings(filePath) {
  if (!filePath) return [];
  if (!fs.existsSync(filePath)) {
    throw new Error(`Mapping file not found: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("Mapping file must be a JSON array.");
  }
  return raw;
}

async function lookupUserByToken(token) {
  const value = String(token || "").trim();
  if (!value) return null;
  return prisma.user.findFirst({
    where: {
      OR: [
        { id: value },
        { uid: value },
        { username: value.toLowerCase() },
        { email: value.toLowerCase() },
      ],
    },
    select: { id: true, uid: true, username: true, email: true, role: true },
  });
}

async function resolveMappingTarget(entry) {
  const user =
    (entry.userId && (await lookupUserByToken(entry.userId))) ||
    (entry.username && (await lookupUserByToken(entry.username))) ||
    (entry.uid && (await lookupUserByToken(entry.uid)));

  if (!user) return { user: null, referrerId: null, reason: "USER_NOT_FOUND" };

  let referrerId = null;
  if (entry.referredById) {
    referrerId = entry.referredById;
  } else if (entry.referredByUsername || entry.referredByUid) {
    const ref = await lookupUserByToken(
      entry.referredByUsername || entry.referredByUid
    );
    referrerId = ref?.id ?? null;
  } else if (entry.intendedInviteCode) {
    referrerId = await findReferrerByInviteCode(entry.intendedInviteCode);
  }

  if (!referrerId) {
    return { user, referrerId: null, reason: "REFERRER_UNRESOLVED" };
  }

  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { id: true, uid: true, username: true, role: true },
  });

  if (!referrer) {
    return { user, referrerId: null, reason: "REFERRER_NOT_FOUND" };
  }
  if (referrer.role === "ADMIN" && referrer.id !== user.id) {
    return { user, referrerId: null, reason: "REFERRER_IS_ADMIN" };
  }
  if (referrer.id === user.id) {
    return { user, referrerId: null, reason: "SELF_REFERRAL" };
  }

  return { user, referrerId: referrer.id, referrer, reason: "MAPPING_OK" };
}

async function findAdminReferralCandidates(adminIds, skipUids) {
  return prisma.user.findMany({
    where: {
      referredById: { in: adminIds },
      id: { notIn: adminIds },
    },
    select: {
      id: true,
      uid: true,
      username: true,
      email: true,
      referredById: true,
      isInvited: true,
      taxFreeUntil: true,
      hasActivatedBonusStrategy: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function findMissingInviteTaxFlags(adminIds) {
  return prisma.user.findMany({
    where: {
      referredById: { not: null, notIn: adminIds },
      OR: [{ isInvited: false }, { taxFreeUntil: null }],
    },
    select: {
      id: true,
      uid: true,
      username: true,
      referredById: true,
      isInvited: true,
      taxFreeUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

async function applyReferrerFix(userId, referredById) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      referredById,
      isInvited: true,
    },
  });
}

async function nullifyBadAdminReferral(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      referredById: null,
      isInvited: false,
      taxFreeUntil: null,
    },
  });
}

async function main() {
  console.log(`[backfill] mode=${APPLY ? "APPLY" : "DRY-RUN"}`);
  const adminIds = await resolveAdminIds();
  const skipUids = parseLegitimateUids();
  const mappings = loadMappings(MAPPING_FILE);

  const stats = {
    mapped: 0,
    nullified: 0,
    skippedLegitimate: 0,
    inviteTaxFixed: 0,
    unresolved: 0,
  };

  const mappedUserIds = new Set();

  for (const entry of mappings) {
    const result = await resolveMappingTarget(entry);
    if (!result.user) {
      console.warn("[backfill] mapping skip:", entry, result.reason);
      stats.unresolved += 1;
      continue;
    }
    if (!result.referrerId) {
      console.warn(
        `[backfill] mapping unresolved for ${result.user.username || result.user.uid}:`,
        result.reason
      );
      stats.unresolved += 1;
      continue;
    }

    mappedUserIds.add(result.user.id);
    console.log(
      `[backfill] map ${result.user.username || result.user.uid} -> referrer ${result.referrer.username || result.referrer.uid}`
    );
    stats.mapped += 1;
    if (APPLY) {
      await applyReferrerFix(result.user.id, result.referrerId);
    }
  }

  const candidates = await findAdminReferralCandidates(adminIds, skipUids);
  console.log(`[backfill] admin-referral candidates: ${candidates.length}`);

  for (const user of candidates) {
    if (mappedUserIds.has(user.id)) continue;
    if (skipUids.has(user.uid)) {
      console.log(`[backfill] skip legitimate admin referral: ${user.uid}`);
      stats.skippedLegitimate += 1;
      continue;
    }

    console.log(
      `[backfill] nullify admin collision: ${user.username || user.uid} (${user.id})`
    );
    stats.nullified += 1;
    if (APPLY) {
      await nullifyBadAdminReferral(user.id);
    }
  }

  if (FIX_INVITE_TAX) {
    const missingTax = await findMissingInviteTaxFlags(adminIds);
    console.log(`[backfill] missing invite flags: ${missingTax.length}`);
    for (const user of missingTax) {
      console.log(
        `[backfill] set isInvited for ${user.username || user.uid}`
      );
      stats.inviteTaxFixed += 1;
      if (APPLY) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isInvited: true },
        });
      }
    }
  }

  console.log("[backfill] summary:", stats);
  if (!APPLY) {
    console.log("[backfill] Dry run only. Re-run with --apply to persist changes.");
  }
}

main()
  .catch((err) => {
    console.error("[backfill] fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
