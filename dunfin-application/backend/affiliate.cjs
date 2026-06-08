/**
 * Multi-generational affiliate tree (Gen 1–3) relative to a root user.
 */

function isActiveMember(user) {
  if (!user) return false;
  const hasDeposited = Boolean(user.hasDeposited);
  const hasActiveTier =
    Number(user.tradingCapital) > 0 || Number(user.lockedCapital) > 0;
  return hasDeposited && hasActiveTier;
}

function getDirectReferrals(allUsers, rootUserId) {
  return Object.entries(allUsers)
    .filter(([, u]) => u.referredBy === rootUserId)
    .map(([id]) => id);
}

function expandGeneration(allUsers, parentIds) {
  const set = new Set(parentIds);
  return Object.entries(allUsers)
    .filter(([, u]) => u.referredBy && set.has(u.referredBy))
    .map(([id]) => id);
}

/**
 * Returns Gen 1/2/3 user ids and aggregate active member counts for a root user.
 */
function getAffiliateNetwork(allUsers, rootUserId) {
  const gen1 = getDirectReferrals(allUsers, rootUserId);
  const gen2 = expandGeneration(allUsers, gen1);
  const gen3 = expandGeneration(allUsers, gen2);

  const countActive = (ids) =>
    ids.filter((id) => isActiveMember(allUsers[id])).length;

  const gen1Active = countActive(gen1);
  const gen2Active = countActive(gen2);
  const gen3Active = countActive(gen3);

  return {
    generations: {
      gen1: { ids: gen1, activeCount: gen1Active },
      gen2: { ids: gen2, activeCount: gen2Active },
      gen3: { ids: gen3, activeCount: gen3Active },
    },
    totalActiveMembers: gen1Active + gen2Active + gen3Active,
    totalMembers: gen1.length + gen2.length + gen3.length,
  };
}

module.exports = {
  isActiveMember,
  getAffiliateNetwork,
  getDirectReferrals,
};
