/**
 * Audit en/ar/it translation alignment and English fallbacks.
 * Run: node scripts/auditTranslations.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { translations } = await import("../src/i18n/translations.ts");
const { itTable } = await import("../src/i18n/italian/itTable.ts");

const en = translations.en;
const ar = translations.ar;
const it = itTable;

const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();
const itKeys = Object.keys(it).sort();

const missingInAr = enKeys.filter((k) => !(k in ar));
const missingInIt = enKeys.filter((k) => !(k in it));
const extraInAr = arKeys.filter((k) => !(k in en));
const extraInIt = itKeys.filter((k) => !(k in en));

const arSameAsEn = enKeys.filter((k) => ar[k] === en[k]);
const itSameAsEn = enKeys.filter((k) => it[k] === en[k]);

console.log("=== KEY COUNTS ===");
console.log(`en: ${enKeys.length}, ar: ${arKeys.length}, it: ${itKeys.length}`);
console.log(`missing in ar: ${missingInAr.length}`);
console.log(`missing in it: ${missingInIt.length}`);
console.log(`extra in ar: ${extraInAr.length}`);
console.log(`extra in it: ${extraInIt.length}`);
console.log(`ar identical to en: ${arSameAsEn.length}`);
console.log(`it identical to en: ${itSameAsEn.length}`);

if (missingInAr.length) console.log("\nMissing in AR:", missingInAr.slice(0, 30));
if (missingInIt.length) console.log("\nMissing in IT:", missingInIt.slice(0, 30));

// Interpolation token check: keys with {var} in en must have same tokens in ar/it
const tokenRe = /\{(\w+)\}/g;
const tokenMismatches = [];
for (const key of enKeys) {
  const enTokens = [...en[key].matchAll(tokenRe)].map((m) => m[1]).sort().join(",");
  for (const [loc, table] of [["ar", ar], ["it", it]]) {
    const val = table[key];
    if (!val) continue;
    const locTokens = [...val.matchAll(tokenRe)].map((m) => m[1]).sort().join(",");
    if (enTokens !== locTokens) {
      tokenMismatches.push({ key, locale: loc, en: enTokens, got: locTokens });
    }
  }
}
console.log(`\n=== INTERPOLATION MISMATCHES: ${tokenMismatches.length} ===`);
tokenMismatches.slice(0, 20).forEach((m) =>
  console.log(`  ${m.key} [${m.locale}] en:{${m.en}} got:{${m.got}}`)
);

const report = {
  counts: { en: enKeys.length, ar: arKeys.length, it: itKeys.length },
  missingInAr,
  missingInIt,
  arSameAsEn,
  itSameAsEn,
  tokenMismatches,
};
writeFileSync(join(__dirname, "audit-report.json"), JSON.stringify(report, null, 2));
console.log("\nWrote scripts/audit-report.json");
