#!/usr/bin/env node
/**
 * Generates development mock download assets so /downloads/* never 404 locally.
 * Skips existing production builds unless --force is passed.
 *
 * Usage: node scripts/generate-mock-apps.cjs [--force]
 */

const { mkdirSync, writeFileSync, existsSync, statSync } = require("fs");
const { join } = require("path");
const { randomUUID } = require("crypto");

const ROOT = join(__dirname, "..");
const DOWNLOADS_DIR = join(ROOT, "public", "downloads");
const WEB_APP_URL = "https://iron-org.vercel.app";
const ICON_URL = `${WEB_APP_URL}/iron-logo.png`;

const force = process.argv.includes("--force");

function shouldWrite(filePath) {
  if (force || !existsSync(filePath)) return true;
  const size = statSync(filePath).size;
  // Regenerate tiny placeholder stubs; preserve real production builds (> 64 KiB).
  return size < 64 * 1024;
}

function writeIfNeeded(filePath, content, encoding = "utf8") {
  if (!shouldWrite(filePath)) {
    console.log(`[generate-mock-apps] skip (exists): ${filePath}`);
    return;
  }
  writeFileSync(filePath, content, encoding);
  console.log(`[generate-mock-apps] wrote: ${filePath}`);
}

function createMockApkBuffer() {
  const payload = Buffer.from(
    [
      "IRON Platform — development mock APK package.",
      "Replace public/downloads/iron-platform.apk with your signed production build.",
      `Web origin: ${WEB_APP_URL}`,
      "",
    ].join("\n"),
    "utf8",
  );

  // ZIP local file header (store, no compression) so the file resembles an APK container.
  const filename = Buffer.from("IRON-MOCK.txt", "ascii");
  const header = Buffer.alloc(30 + filename.length);
  header.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14); // crc32 placeholder
  header.writeUInt32LE(payload.length, 18);
  header.writeUInt32LE(payload.length, 22);
  header.writeUInt16LE(filename.length, 26);
  header.writeUInt16LE(0, 28);
  filename.copy(header, 30);

  return Buffer.concat([header, payload, filename]);
}

function createMobileConfigXml() {
  const webClipUuid = randomUUID();
  const profileUuid = randomUUID();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <true/>
      <key>Icon</key>
      <data></data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>IRON</string>
      <key>PayloadDescription</key>
      <string>Install IRON on your Home Screen for a native app-like experience.</string>
      <key>PayloadDisplayName</key>
      <string>IRON Web App</string>
      <key>PayloadIdentifier</key>
      <string>com.iron.platform.webclip</string>
      <key>PayloadOrganization</key>
      <string>IRON</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>${webClipUuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${WEB_APP_URL}</string>
      <key>IgnoreManifestScope</key>
      <true/>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Configures IRON as a home-screen web application.</string>
  <key>PayloadDisplayName</key>
  <string>IRON Platform</string>
  <key>PayloadIdentifier</key>
  <string>com.iron.platform.profile</string>
  <key>PayloadOrganization</key>
  <string>IRON</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${profileUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
}

mkdirSync(DOWNLOADS_DIR, { recursive: true });

const apkPath = join(DOWNLOADS_DIR, "iron-platform.apk");
const mobileConfigPath = join(DOWNLOADS_DIR, "iron-platform.mobileconfig");

writeIfNeeded(apkPath, createMockApkBuffer());
writeIfNeeded(mobileConfigPath, createMobileConfigXml());

console.log(`[generate-mock-apps] icon reference: ${ICON_URL}`);
