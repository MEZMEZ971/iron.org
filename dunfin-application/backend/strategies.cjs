const { randomInt } = require("crypto");

const INELIGIBLE_MESSAGE =
  "Ineligible Capital or Team Size requirements for this strategy level.";

const QUALIFICATION_DENIED_EN =
  "Execution Denied! You do not meet the qualification matrix. You need a minimum balance of {capital} USDT and {team} active team members to activate trading.";

const QUALIFICATION_DENIED_EN_ENTRY =
  "Execution Denied! You need a minimum balance of {capital} USDT to activate trading.";

const QUALIFICATION_DENIED_AR =
  "عذراً! لم تستوفِ شروط التفعيل. تحتاج إلى رأس مال لا يقل عن {capital} USDT وفريق نشط لا يقل عن {team} أعضاء لتنشيط هذه الاستراتيجية.";

const QUALIFICATION_DENIED_AR_ENTRY =
  "عذراً! لم تستوفِ شروط التفعيل. تحتاج إلى رأس مال لا يقل عن {capital} USDT لتنشيط التداول.";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TRADE_SESSION_MIN_MS = 5 * 60 * 1000;
const TRADE_SESSION_MAX_MS = 10 * 60 * 1000;

/** @type {readonly import("./strategies.cjs").StrategyDefinition[]} */
const STRATEGIES = Object.freeze([
  {
    id: 0,
    name: "Level 0 Baseline",
    minCapital: 100,
    maxCapital: 299,
    minTeam: 0,
    affiliationRequired: false,
  },
  {
    id: 1,
    name: "Level 1",
    minCapital: 300,
    maxCapital: 499,
    minTeam: 5,
    affiliationRequired: false,
  },
  {
    id: 2,
    name: "Strategy 2",
    minCapital: 500,
    maxCapital: 1000,
    minTeam: 10,
    affiliationRequired: false,
  },
  {
    id: 3,
    name: "Strategy 3",
    minCapital: 1000,
    maxCapital: 2000,
    minTeam: 30,
    affiliationRequired: false,
  },
  {
    id: 4,
    name: "Strategy 4",
    minCapital: 2000,
    maxCapital: 3500,
    minTeam: 100,
    affiliationRequired: false,
  },
  {
    id: 5,
    name: "Strategy 5",
    minCapital: 5000,
    maxCapital: 10000,
    minTeam: 200,
    affiliationRequired: false,
  },
  {
    id: 6,
    name: "Strategy 6",
    minCapital: 10000,
    maxCapital: 999999,
    minTeam: 400,
    affiliationRequired: false,
  },
]);

const ENTRY_STRATEGY = STRATEGIES[0];
const ABSOLUTE_MIN_BALANCE = ENTRY_STRATEGY.minCapital;

function formatQualificationDenied(capital, team) {
  const cap = String(capital);
  const teamSize = String(team);
  const useEntryCopy = Number(team) === 0;
  const errorEn = (useEntryCopy ? QUALIFICATION_DENIED_EN_ENTRY : QUALIFICATION_DENIED_EN)
    .replace("{capital}", cap)
    .replace("{team}", teamSize);
  const errorAr = (useEntryCopy ? QUALIFICATION_DENIED_AR_ENTRY : QUALIFICATION_DENIED_AR)
    .replace("{capital}", cap)
    .replace("{team}", teamSize);
  return {
    errorEn,
    errorAr,
    requiredCapital: capital,
    requiredTeam: team,
  };
}

/**
 * Highest eligible tier: evaluate from Strategy 6 down to Level 0.
 * Both walletBalance >= minCapital AND activeTeamCount >= minTeam must hold.
 * Absolute floor: balance >= 100 USDT qualifies for Level 0 with zero team.
 */
function autoResolveStrategy(walletBalance, activeTeamCount) {
  const balance = Number(walletBalance) || 0;
  const team = Number(activeTeamCount) || 0;

  if (balance < ABSOLUTE_MIN_BALANCE) {
    return {
      ok: false,
      code: "QUALIFICATION_DENIED",
      ...formatQualificationDenied(
        ENTRY_STRATEGY.minCapital,
        ENTRY_STRATEGY.minTeam
      ),
    };
  }

  for (let i = STRATEGIES.length - 1; i >= 0; i--) {
    const strategy = STRATEGIES[i];
    if (balance >= strategy.minCapital && team >= strategy.minTeam) {
      const capitalAmount = Math.min(balance, strategy.maxCapital);
      return { ok: true, strategy, capitalAmount };
    }
  }

  return {
    ok: false,
    code: "QUALIFICATION_DENIED",
    ...formatQualificationDenied(
      ENTRY_STRATEGY.minCapital,
      ENTRY_STRATEGY.minTeam
    ),
  };
}

/** @deprecated Use autoResolveStrategy — kept for legacy callers */
function resolveStrategy(capitalAmount, activeTeamCount) {
  return autoResolveStrategy(capitalAmount, activeTeamCount);
}

function getStrategyEligibility(walletBalance, activeTeamCount) {
  const balance = Number(walletBalance) || 0;
  const team = Number(activeTeamCount) || 0;

  return STRATEGIES.map((strategy) => {
    const capitalMet = balance >= strategy.minCapital;
    const teamMet = team >= strategy.minTeam;
    const unlocked = capitalMet && teamMet;

    return {
      ...strategy,
      unlocked,
      capitalInRange: capitalMet,
      teamMet,
      affiliationMet: true,
      teamShortfall: teamMet ? 0 : Math.max(0, strategy.minTeam - team),
      capitalShortfall: capitalMet
        ? 0
        : Math.max(0, strategy.minCapital - balance),
    };
  });
}

/** Random 5–10 minute active trading window per execution. */
function pickTradeSessionDurationMs() {
  return randomInt(TRADE_SESSION_MIN_MS, TRADE_SESSION_MAX_MS + 1);
}

function getTradeSessionState({
  lastTradeTime,
  tradeSessionEndsAt,
  lockedCapital,
} = {}) {
  const locked = Number(lockedCapital) || 0;
  if (locked <= 0) {
    return { active: false, remainingMs: 0, endsAt: null };
  }

  let endMs = tradeSessionEndsAt
    ? new Date(tradeSessionEndsAt).getTime()
    : NaN;

  if (Number.isNaN(endMs) && lastTradeTime) {
    const last = new Date(lastTradeTime).getTime();
    if (!Number.isNaN(last)) {
      endMs = last + TRADE_SESSION_MAX_MS;
    }
  }

  if (Number.isNaN(endMs)) {
    return { active: false, remainingMs: 0, endsAt: null };
  }

  const remainingMs = Math.max(0, endMs - Date.now());
  return {
    active: remainingMs > 0,
    remainingMs,
    endsAt: new Date(endMs).toISOString(),
  };
}

function getCooldownState(lastTradeTime) {
  if (!lastTradeTime) {
    return {
      onCooldown: false,
      remainingMs: 0,
      nextTradeAt: null,
    };
  }

  const last = new Date(lastTradeTime).getTime();
  if (Number.isNaN(last)) {
    return { onCooldown: false, remainingMs: 0, nextTradeAt: null };
  }

  const elapsed = Date.now() - last;
  if (elapsed >= TWENTY_FOUR_HOURS_MS) {
    return { onCooldown: false, remainingMs: 0, nextTradeAt: null };
  }

  const remainingMs = TWENTY_FOUR_HOURS_MS - elapsed;
  return {
    onCooldown: true,
    remainingMs,
    nextTradeAt: new Date(last + TWENTY_FOUR_HOURS_MS).toISOString(),
  };
}

module.exports = {
  STRATEGIES,
  ENTRY_STRATEGY,
  ABSOLUTE_MIN_BALANCE,
  INELIGIBLE_MESSAGE,
  QUALIFICATION_DENIED_EN,
  QUALIFICATION_DENIED_EN_ENTRY,
  QUALIFICATION_DENIED_AR,
  QUALIFICATION_DENIED_AR_ENTRY,
  TWENTY_FOUR_HOURS_MS,
  TRADE_SESSION_MIN_MS,
  TRADE_SESSION_MAX_MS,
  pickTradeSessionDurationMs,
  getTradeSessionState,
  autoResolveStrategy,
  resolveStrategy,
  getStrategyEligibility,
  formatQualificationDenied,
  getCooldownState,
};
