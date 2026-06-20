import { readFileSync, writeFileSync } from "fs";

/** Complete Italian strings for core locale keys (297 entries). */
const IT = JSON.parse(readFileSync("scripts/italian-core.json", "utf8"));
const en = JSON.parse(readFileSync("scripts/core-en.json", "utf8"));

const missing = Object.keys(en).filter((k) => !IT[k]);
if (missing.length) {
  console.error("Missing Italian core keys:", missing.slice(0, 10), missing.length);
  process.exit(1);
}

const lines = Object.keys(en)
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(IT[k])},`)
  .join("\n");

writeFileSync(
  "src/i18n/italian/coreIt.ts",
  `export const coreIt = {\n${lines}\n} as const;\n`,
  "utf8"
);
console.log("Wrote coreIt.ts with", Object.keys(en).length, "keys");
