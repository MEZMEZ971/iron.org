const db = require("./db.cjs");
const { getAffiliateNetwork } = require("./affiliate.cjs");
const {
  getInviteRewardMatrix,
  buildInviteLink,
  shortInviteCode,
} = require("./invite.cjs");

async function getInviteInfo(userId) {
  const user = await db.getOrCreateUser(userId);
  const allUsers = await db.getAllUsers();
  const network = getAffiliateNetwork(allUsers, userId);

  const referralCode = user.referralCode;
  const inviteCode = shortInviteCode(referralCode);
  const inviteLink = buildInviteLink(referralCode);

  return {
    userId,
    memberId: user.uid,
    referralCode,
    inviteCode,
    inviteLink,
    affiliate: {
      totalActiveMembers: network.totalActiveMembers,
      totalMembers: network.totalMembers,
      gen1Count: network.generations.gen1.memberCount,
      gen2Count: network.generations.gen2.memberCount,
      gen3Count: network.generations.gen3.memberCount,
      gen1Active: network.generations.gen1.activeCount,
      gen2Active: network.generations.gen2.activeCount,
      gen3Active: network.generations.gen3.activeCount,
    },
    rewardMatrix: getInviteRewardMatrix(),
  };
}

module.exports = { getInviteInfo };
