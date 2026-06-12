const { prisma } = require("./prisma.cjs");

function normalizeEvmAddress(address) {
  return String(address || "").trim().toLowerCase();
}

/**
 * Resolve a user from any permanent deposit destination stored in PostgreSQL.
 * Checks NetworkDepositAddress first (TRC20 / BEP20 / ERC20 rows), then User.depositAddress.
 */
async function findUserByDepositDestination(rawAddress) {
  const address = String(rawAddress || "").trim();
  if (!address) return null;

  const exactRow = await prisma.networkDepositAddress.findFirst({
    where: { address },
    select: {
      userId: true,
      network: true,
      address: true,
      tron: true,
    },
  });
  if (exactRow) return exactRow;

  if (address.startsWith("0x")) {
    const evmRow = await prisma.networkDepositAddress.findFirst({
      where: { address: { equals: address, mode: "insensitive" } },
      select: {
        userId: true,
        network: true,
        address: true,
        tron: true,
      },
    });
    if (evmRow) return evmRow;
  }

  const userRow = await prisma.user.findFirst({
    where: {
      OR: [
        { depositAddress: address },
        ...(address.startsWith("0x")
          ? [{ depositAddress: { equals: address, mode: "insensitive" } }]
          : []),
      ],
    },
    select: {
      id: true,
      depositAddress: true,
    },
  });

  if (!userRow?.depositAddress) return null;

  return {
    userId: userRow.id,
    network: "ERC20",
    address: userRow.depositAddress,
    tron: false,
  };
}

/** All unique permanent deposit destinations currently assigned to users. */
async function listMonitoredDepositDestinations() {
  const networkRows = await prisma.networkDepositAddress.findMany({
    select: {
      userId: true,
      network: true,
      address: true,
      tron: true,
    },
  });

  const users = await prisma.user.findMany({
    where: { depositAddress: { not: null } },
    select: { id: true, depositAddress: true },
  });

  const byKey = new Map();

  for (const row of networkRows) {
    const key = row.tron ? row.address : normalizeEvmAddress(row.address);
    byKey.set(key, row);
  }

  for (const user of users) {
    const key = normalizeEvmAddress(user.depositAddress);
    if (!byKey.has(key)) {
      byKey.set(key, {
        userId: user.id,
        network: "ERC20",
        address: user.depositAddress,
        tron: false,
      });
    }
  }

  return [...byKey.values()];
}

module.exports = {
  findUserByDepositDestination,
  listMonitoredDepositDestinations,
  normalizeEvmAddress,
};
