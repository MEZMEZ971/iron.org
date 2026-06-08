const assert = require("assert");
const {
  generateUidCandidate,
  isValidPublicUid,
  UID_MIN,
  UID_MAX,
} = require("./lib/uidGenerator.cjs");

for (let i = 0; i < 200; i += 1) {
  const uid = generateUidCandidate();
  assert.ok(isValidPublicUid(uid), `invalid uid shape: ${uid}`);
  const n = Number(uid);
  assert.ok(n >= UID_MIN && n <= UID_MAX, `uid out of range: ${uid}`);
}

const seen = new Set();
for (let i = 0; i < 500; i += 1) {
  seen.add(generateUidCandidate());
}
assert.ok(seen.size > 450, "UID generator should produce high entropy");

console.log("All UID generator checks passed.");
