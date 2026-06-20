/**
 * Full-locale translation audit — all CORE_LOCALES vs English master.
 * Run: npx tsx scripts/auditTranslations.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { translations } = await import("../src/i18n/translations.ts");
const { CORE_LOCALES } = await import("../src/i18n/locales.ts");

const en = translations.en;
const enKeys = Object.keys(en).sort();
const tokenRe = /\{(\w+)\}/g;

function tokens(str) {
  return [...String(str).matchAll(tokenRe)].map((m) => m[1]).sort().join(",");
}

function isEmpty(val) {
  return typeof val !== "string" || val.trim().length === 0;
}

const localeCodes = CORE_LOCALES.map((l) => l.code);
const report = {
  masterKeyCount: enKeys.length,
  locales: {},
  summary: {
    missingKeysTotal: 0,
    emptyStringsTotal: 0,
    tokenMismatchesTotal: 0,
    extraKeysTotal: 0,
  },
};

let exitCode = 0;

console.log(`=== MASTER: ${enKeys.length} keys ===\n`);

for (const code of localeCodes) {
  const table = translations[code];
  if (!table) {
    console.error(`FATAL: translations.${code} is undefined`);
    exitCode = 1;
    continue;
  }

  const locKeys = Object.keys(table);
  const missing = enKeys.filter((k) => !(k in table));
  const extra = locKeys.filter((k) => !(k in en));
  const empty = enKeys.filter((k) => isEmpty(table[k]));
  const tokenMismatches = [];

  for (const key of enKeys) {
    const val = table[key];
    if (!val) continue;
    const enTok = tokens(en[key]);
    const locTok = tokens(val);
    if (enTok !== locTok) {
      tokenMismatches.push({ key, en: enTok, got: locTok });
    }
  }

  const identicalToEn =
    code === "en"
      ? 0
      : enKeys.filter((k) => table[k] === en[k]).length;

  report.locales[code] = {
    keyCount: locKeys.length,
    missing,
    extra,
    empty,
    tokenMismatches,
    identicalToEn,
  };

  report.summary.missingKeysTotal += missing.length;
  report.summary.emptyStringsTotal += empty.length;
  report.summary.tokenMismatchesTotal += tokenMismatches.length;
  report.summary.extraKeysTotal += extra.length;

  const status =
    missing.length || empty.length || tokenMismatches.length || extra.length
      ? "FAIL"
      : "OK";

  if (status === "FAIL") exitCode = 1;

  console.log(
    `[${status}] ${code}: ${locKeys.length} keys | missing=${missing.length} empty=${empty.length} tokens=${tokenMismatches.length} extra=${extra.length} sameAsEn=${identicalToEn}`
  );

  if (missing.length) console.log(`  missing: ${missing.slice(0, 15).join(", ")}${missing.length > 15 ? "…" : ""}`);
  if (empty.length) console.log(`  empty: ${empty.slice(0, 10).join(", ")}`);
  if (tokenMismatches.length) {
    tokenMismatches.slice(0, 5).forEach((m) =>
      console.log(`  token ${m.key}: en={${m.en}} got={${m.got}}`)
    );
  }
}

console.log("\n=== TOTALS ===");
console.log(`missing keys: ${report.summary.missingKeysTotal}`);
console.log(`empty strings: ${report.summary.emptyStringsTotal}`);
console.log(`token mismatches: ${report.summary.tokenMismatchesTotal}`);
console.log(`extra keys: ${report.summary.extraKeysTotal}`);

writeFileSync(join(__dirname, "audit-report.json"), JSON.stringify(report, null, 2));
console.log("\nWrote scripts/audit-report.json");

process.exit(exitCode);
