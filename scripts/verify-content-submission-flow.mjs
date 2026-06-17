#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const DEFAULT_BASE_URL = "https://camp-self.vercel.app";
const DEFAULT_FORMATS = ["markdown", "html"];

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = process.argv.slice(2);
const live = args.includes("--live");
const yes = args.includes("--yes");
const baseUrl = readArg("--base-url") || process.env.CAMP_BASE_URL || DEFAULT_BASE_URL;
const email = readArg("--email") || process.env.CAMP_EMAIL || process.env.ADMIN_EMAIL || "";
const password = readArg("--password") || process.env.CAMP_PASSWORD || process.env.ADMIN_PASSWORD || "";
const accessTokenArg = readArg("--access-token") || process.env.CAMP_ACCESS_TOKEN || "";
const formatArg = readArg("--format");
const formats = formatArg ? [formatArg] : DEFAULT_FORMATS;
const slugPrefix = readArg("--slug-prefix") || (live ? "codex-live-check" : "codex-dry-run");
const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14).toLowerCase();

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return;

  for (const rawLine of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;

    const [key, ...rest] = line.split("=");
    if (process.env[key]) continue;

    const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

function readArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "camp-content-submission-flow/1.0",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = json?.error || text || `${response.status} ${response.statusText}`;
    throw new Error(`${url} failed: ${error}`);
  }

  return json;
}

async function getAccessToken() {
  if (accessTokenArg) return accessTokenArg;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert(supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(publishableKey, "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  assert(email, "Missing CAMP_EMAIL or ADMIN_EMAIL");
  assert(password, "Missing CAMP_PASSWORD or ADMIN_PASSWORD");

  const auth = await requestJson(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey },
    body: JSON.stringify({ email, password }),
  });

  assert(auth.access_token, "Supabase login response did not include access_token");
  return auth.access_token;
}

function buildSubmission(format, index) {
  assert(["markdown", "html"].includes(format), `Unsupported --format value: ${format}`);

  const title = `Camp ${live ? "live" : "dry-run"} ${format} ${timestamp}`;
  const slug = `${slugPrefix}-${format}-${timestamp}${index ? `-${index}` : ""}`;

  if (format === "html") {
    return {
      title,
      slug,
      type: "teach",
      contentFormat: "html",
      category: "Verification",
      tags: ["camp", "verification", "html"],
      excerpt: "Automated Camp HTML submission flow verification.",
      html: `<!doctype html><html><head><title>${title}</title></head><body><main><h1>${title}</h1><p>Automated HTML submission verification.</p></main></body></html>`,
      status: "published",
    };
  }

  return {
    title,
    slug,
    type: "press",
    contentFormat: "markdown",
    category: "Verification",
    tags: ["camp", "verification"],
    excerpt: "Automated Camp Markdown submission flow verification.",
    markdown: `# ${title}\n\nAutomated Markdown submission verification.`,
    status: "published",
  };
}

function verifySubmissionResponse(format, payload, response) {
  assert(response.ok === true, "Submission response did not return ok=true");

  const expectedPath = format === "html" ? `content/teach/${payload.slug}.html` : `content/press/${payload.slug}.md`;
  assert(response.path === expectedPath, `Expected path ${expectedPath}, got ${response.path}`);

  if (!live) {
    assert(response.dryRun === true, "Dry-run response did not include dryRun=true");
    assert(typeof response.content === "string", "Dry-run response missing rendered content");
    assert(response.content.includes(`slug: \"${payload.slug}\"`), "Rendered content missing slug frontmatter");
    assert(response.content.includes(`contentFormat: \"${format}\"`), "Rendered content missing contentFormat frontmatter");
    return;
  }

  assert(response.branch, "Live response missing branch");
  assert(response.pullRequest?.url, "Live response missing pullRequest.url");
}

if (live && !yes) {
  console.error(JSON.stringify({
    ok: false,
    error: "Refusing live submission without --yes. Live mode creates a GitHub content PR.",
  }, null, 2));
  process.exit(1);
}

try {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const accessToken = await getAccessToken();
  const results = [];

  for (const [index, format] of formats.entries()) {
    const submission = buildSubmission(format, index);
    const response = await requestJson(`${normalizedBaseUrl}/api/content-submissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ dryRun: !live, submission }),
    });
    verifySubmissionResponse(format, submission, response);
    results.push({
      format,
      slug: submission.slug,
      path: response.path,
      dryRun: response.dryRun === true,
      branch: response.branch,
      pullRequestUrl: response.pullRequest?.url,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    mode: live ? "live" : "dry-run",
    baseUrl: normalizedBaseUrl,
    authenticatedAs: email || "access-token",
    results,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    mode: live ? "live" : "dry-run",
    baseUrl: baseUrl.replace(/\/$/, ""),
    error: error.message,
  }, null, 2));
  process.exitCode = 1;
}
