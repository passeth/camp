#!/usr/bin/env node
import process from "node:process";
import { Buffer } from "node:buffer";

const DEFAULT_BASE_URL = "https://camp-self.vercel.app";
const REQUIRED_ZIP_ENTRIES = [
  "camp-publisher/main.js",
  "camp-publisher/manifest.json",
  "camp-publisher/styles.css",
];

const args = process.argv.slice(2);
const baseUrl = readArg("--base-url") || process.env.CAMP_BASE_URL || DEFAULT_BASE_URL;
const requirePrReady = args.includes("--require-pr-ready") || process.env.CAMP_REQUIRE_PR_READY === "1";

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

async function get(url, responseType = "text") {
  const response = await fetch(url, {
    headers: { "User-Agent": "camp-publishing-readiness/1.0" },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  if (responseType === "json") return response.json();
  if (responseType === "arrayBuffer") return response.arrayBuffer();
  return response.text();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasZipEntry(zipBytes, entryName) {
  // ZIP central-directory records store file names in plain bytes. This avoids
  // adding a dependency just to verify the small public plugin package shape.
  return Buffer.from(zipBytes).includes(Buffer.from(entryName));
}

const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
const apiUrl = `${normalizedBaseUrl}/api/content-submissions`;
const pluginPageUrl = `${normalizedBaseUrl}/plugins/camp-publisher`;
const pluginZipUrl = `${normalizedBaseUrl}/downloads/camp-publisher.zip`;

try {
  const api = await get(apiUrl, "json");
  assert(api.ok === true, "API readiness did not return ok=true");
  assert(api.contract === "camp.contentSubmission.v1", "Unexpected content submission contract");
  assert(Array.isArray(api.supportedContentFormats), "API readiness missing supportedContentFormats");
  assert(api.supportedContentFormats.includes("markdown"), "API readiness missing markdown support");
  assert(api.supportedContentFormats.includes("html"), "API readiness missing html support");
  assert(api.github && typeof api.github.prReady === "boolean", "API readiness missing github.prReady");

  if (requirePrReady && !api.github.prReady) {
    const missing = Array.isArray(api.github.missingEnv) ? api.github.missingEnv.join(", ") : "GitHub PR configuration";
    throw new Error(`GitHub PR creation is not ready. Missing: ${missing}`);
  }

  const page = await get(pluginPageUrl);
  assert(page.includes("/downloads/camp-publisher.zip"), "Plugin page does not link to the plugin zip");

  const zipBytes = await get(pluginZipUrl, "arrayBuffer");
  for (const entry of REQUIRED_ZIP_ENTRIES) {
    assert(hasZipEntry(zipBytes, entry), `Plugin zip missing ${entry}`);
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl: normalizedBaseUrl,
    contract: api.contract,
    supportedContentFormats: api.supportedContentFormats,
    github: api.github,
    pluginPage: pluginPageUrl,
    pluginZip: {
      url: pluginZipUrl,
      bytes: zipBytes.byteLength,
      requiredEntries: REQUIRED_ZIP_ENTRIES,
    },
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    baseUrl: normalizedBaseUrl,
    error: error.message,
  }, null, 2));
  process.exitCode = 1;
}
