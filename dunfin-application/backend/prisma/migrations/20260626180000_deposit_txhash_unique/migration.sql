-- Enforce one ledger credit per on-chain transaction hash (NULL hashes remain allowed).
CREATE UNIQUE INDEX IF NOT EXISTS "Deposit_txHash_key" ON "Deposit"("txHash");
