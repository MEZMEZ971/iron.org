/**
 * Generates src/i18n/italian/itTable.ts from English keys + Italian modules.
 * Run: npx tsx scripts/generateItalianTable.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { translations } from "../src/i18n/translations.ts";
import { coreIt } from "../src/i18n/italian/coreIt.ts";
import { helpIt } from "../src/i18n/italian/helpIt.ts";
import { withdrawalIt } from "../src/i18n/italian/withdrawalIt.ts";
import { adminIt } from "../src/i18n/italian/adminIt.ts";
import { earningsIt } from "../src/i18n/italian/earningsIt.ts";
import { h5It } from "../src/i18n/italian/h5It.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../src/i18n/italian/itTable.ts");

const itPartial = {
  ...coreIt,
  ...helpIt,
  ...withdrawalIt,
  ...adminIt,
  ...earningsIt,
  ...h5It,
};

const en = translations.en;
const missing: string[] = [];
const it: Record<string, string> = {};

for (const key of Object.keys(en)) {
  const value = (itPartial as Record<string, string>)[key];
  if (!value) {
    missing.push(key);
    it[key] = en[key];
  } else {
    it[key] = value;
  }
}

if (missing.length > 0) {
  console.warn(`Warning: ${missing.length} keys missing Italian translation (fallback to EN):`);
  console.warn(missing.slice(0, 20).join(", "), missing.length > 20 ? "..." : "");
}

const lines = Object.entries(it)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `/** Auto-generated Italian locale table — do not edit by hand. */\nexport const itTable = {\n${lines}\n} as const;\n`,
  "utf8"
);

console.log(`Wrote ${Object.keys(it).length} keys to ${outPath}`);
