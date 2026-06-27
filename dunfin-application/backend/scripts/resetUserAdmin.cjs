/**
 * Admin CLI — reset a user's login password by email.
 *
 * Uses bcrypt (same as authService.cjs) to hash before persisting to User.passwordHash.
 *
 * Usage:
 *   node scripts/resetUserAdmin.cjs --email=user@example.com --password='TempPass123!'
 *   node scripts/resetUserAdmin.cjs --email=user@example.com
 *     (auto-generates a secure temporary password when --password is omitted)
 *   node scripts/resetUserAdmin.cjs --email=user@example.com --dry-run
 */
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { prisma } = require("../lib/prisma.cjs");

const BCRYPT_ROUNDS = 10;

function parseArgs(argv) {
  const out = { email: "", password: "", dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg.startsWith("--email=")) out.email = arg.slice("--email=".length).trim();
    else if (arg.startsWith("--password=")) out.password = arg.slice("--password=".length);
    else if (!arg.startsWith("--") && !out.email) out.email = arg.trim();
    else if (!arg.startsWith("--") && !out.password) out.password = arg;
  }
  return out;
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function generateTemporaryPassword() {
  const token = crypto.randomBytes(9).toString("base64url");
  return `Iron-${token}!`;
}

async function main() {
  const { email: rawEmail, password: providedPassword, dryRun } = parseArgs(
    process.argv.slice(2)
  );
  const email = normalizeEmail(rawEmail);

  if (!email) {
    console.error(
      "Usage: node scripts/resetUserAdmin.cjs --email=user@example.com [--password='TempPass123!'] [--dry-run]"
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      uid: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      accountActive: true,
    },
  });

  if (!user) {
    console.error(`✗ No user found for email: ${email}`);
    process.exit(1);
  }

  const temporaryPassword = providedPassword || generateTemporaryPassword();

  if (temporaryPassword.length < 8) {
    console.error("✗ Password must be at least 8 characters.");
    process.exit(1);
  }

  console.log("=== IRON Admin Password Reset ===");
  console.log(`Target email : ${user.email}`);
  console.log(`User ID      : ${user.id}`);
  console.log(`Public UID   : ${user.uid}`);
  console.log(`Display name : ${user.displayName || user.username || "(none)"}`);
  console.log(`Role         : ${user.role}`);
  console.log(`Account      : ${user.accountActive ? "Active" : "Suspended"}`);
  console.log(`Mode         : ${dryRun ? "DRY-RUN (no database write)" : "EXECUTE"}`);

  if (dryRun) {
    console.log("\nDry-run complete. Re-run without --dry-run to apply the reset.");
    return;
  }

  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log("\n✓ Password reset successful.");
  console.log("────────────────────────────────────────");
  console.log(`Temporary password: ${temporaryPassword}`);
  console.log("────────────────────────────────────────");
  console.log("Share this password securely with the user.");
  console.log("Ask them to sign in and change it from Settings immediately.");
}

main()
  .catch((err) => {
    console.error("✗ Password reset failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
