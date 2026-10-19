#!/usr/bin/env node
/**
 * Read what the live portal actually serves, and fail if a shipped feature is not in it.
 *
 * This exists because of a deploy that lied. Netlify reported `state: ready` for commit
 * 5e586f26 with a 29 second deploy time and the summary "All files already uploaded by a
 * previous deploy with the same commits" - and published the PREVIOUS build's files. Three
 * merged PRs (#35, #36, #37) were live according to git, according to the PR list and
 * according to Netlify, and were absent from the bundle a browser downloaded. The only way
 * to see it was to fetch the bundle and look.
 *
 * So: no "merged" and no green deploy counts as shipped for this app. This does.
 *
 *     npm run verify:published
 *     npm run verify:published -- https://deploy-preview-42--ailinc-super-admin.netlify.app
 *
 * Adding a user-visible feature? Add a MARKER for it. A string from the built bundle that
 * exists ONLY when that feature is compiled in - a piece of its copy, or the API path it
 * calls. Keep them literal: anything assembled at runtime from template parts will not
 * survive minification as one string, and the check would pass on a build without it.
 */

const DEFAULT_BASE = "https://ailinc-super-admin.netlify.app";

const MARKERS = [
  { feature: "Fleet insights table (dashboard)", needle: "Who is active, and who is costing" },
  { feature: "Fleet insights API call", needle: "/superadmin/api/insights/clients/" },
  { feature: "Per-client insights panel (client page)", needle: "Who is here, and what it costs" },
  { feature: "Per-client insights section label", needle: "Engagement & spend" },
];

async function main() {
  const base = (process.argv[2] || DEFAULT_BASE).replace(/\/+$/, "");
  process.stdout.write(`verifying ${base}\n`);

  const indexRes = await fetch(`${base}/`, { redirect: "follow" });
  if (!indexRes.ok) {
    fail(`GET ${base}/ returned ${indexRes.status}`);
  }
  const html = await indexRes.text();

  const assets = [...new Set(html.match(/\/assets\/[A-Za-z0-9_.-]+\.js/g) || [])];
  if (assets.length === 0) {
    // An index.html with no script tag is a broken publish, not a passing check.
    fail("index.html references no /assets/*.js - nothing was published, or the HTML is stale");
  }

  let bundle = "";
  for (const a of assets) {
    const res = await fetch(`${base}${a}`);
    if (!res.ok) fail(`GET ${base}${a} returned ${res.status}`);
    bundle += await res.text();
  }
  process.stdout.write(`  ${assets.length} bundle(s), ${bundle.length} chars\n`);

  const missing = MARKERS.filter((m) => !bundle.includes(m.needle));
  for (const m of MARKERS) {
    process.stdout.write(`  ${missing.includes(m) ? "MISSING" : "ok     "}  ${m.feature}\n`);
  }

  if (missing.length) {
    fail(
      `${missing.length} of ${MARKERS.length} features are not in the published bundle.\n` +
        "The deploy may have republished an older build. Trigger a rebuild with the cache\n" +
        "cleared (Netlify: Deploys -> Trigger deploy -> Clear cache and deploy site) and run\n" +
        "this again."
    );
  }
  process.stdout.write("\nAll markers present.\n");
}

function fail(message) {
  process.stderr.write(`\nverify:published FAILED\n${message}\n`);
  process.exit(1);
}

main().catch((err) => fail(err && err.stack ? err.stack : String(err)));
