import fs from "fs";
import path from "path";

const dePath = path.join(
  process.cwd(),
  "src/i18n/localeCatalog/helpLocales/de.ts"
);
const outDir = path.join(process.cwd(), "src/i18n/localeCatalog/helpLocales");
const de = fs.readFileSync(dePath, "utf8");

const titles = {
  fr: "Centre d'aide",
  pt: "Central de ajuda",
  es: "Centro de ayuda",
  ja: "ヘルプセンター",
  ko: "고객센터",
  vi: "Trung tâm trợ giúp",
  fa: "مرکز راهنما",
  id: "Pusat bantuan",
  bn: "সহায়তা কেন্দ্র",
  gn: "Centro de ayuda",
  ay: "Yanapt'iri centro",
  mi: "Pokapū āwhina",
  mn: "Тусламжийн төв",
};

for (const [code, title] of Object.entries(titles)) {
  const exportName = `HELP_${code.toUpperCase()}`;
  let body = de.replace("HELP_DE", exportName);
  body = body.replace("Hilfezentrum", title);
  fs.writeFileSync(path.join(outDir, `${code}.ts`), body, "utf8");
  console.log(`wrote ${code}.ts`);
}
