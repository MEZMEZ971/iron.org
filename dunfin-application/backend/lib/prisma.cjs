const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

const DEFAULT_QUERY_TIMEOUT_MS =
  Number(process.env.PRISMA_QUERY_TIMEOUT_MS) > 0
    ? Number(process.env.PRISMA_QUERY_TIMEOUT_MS)
    : 12_000;

function createQueryTimeoutError(ms) {
  const err = new Error(`The platform is busy. Please try again in a few seconds.`);
  err.code = "SERVICE_BUSY";
  err.httpStatus = 503;
  return err;
}

function withQueryTimeout(promise, timeoutMs = DEFAULT_QUERY_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createQueryTimeoutError(timeoutMs)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  const timeoutMs = DEFAULT_QUERY_TIMEOUT_MS;

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return withQueryTimeout(query(args), timeoutMs);
        },
      },
    },
  });
}

const prisma = globalForPrisma.__dunfinPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__dunfinPrisma = prisma;
}

module.exports = {
  prisma,
  withQueryTimeout,
  DEFAULT_QUERY_TIMEOUT_MS,
};
