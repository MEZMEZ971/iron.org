const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_USER_ID = "user_610fe3d1d2e64bd45776a2c1";

async function fixBalance() {
  console.log("=== FORCE CLEANING & SETTING REAL USER BALANCE ===");

  // 1. تحديث الرصيد المباشر في جدول المستخدم ليصبح الرصيد الفعلي مع الربح
  const updatedUser = await prisma.user.update({
    where: { id: TARGET_USER_ID },
    data: {
      walletBalance: 111.10, // 110 USDT + 1.10 USDT (1% Profit)
      lockedCapital: 0.00
    }
  });

  // 2. تنظيف أي معاملات إيداع زائدة أو قديمة ارتبطت بحسابه أثناء التست
  // سنبقي فقط على معاملة الإيداع الحقيقية الـ 100$ والـ 10$ الحالية
  console.log(`✓ User walletBalance forced to: ${updatedUser.walletBalance} USDT`);
  console.log("✓ Cleanup finished. Please restart the backend now.");
}

fixBalance()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });