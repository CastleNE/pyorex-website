import test from "node:test";
import assert from "node:assert/strict";
import { screenHeadline } from "../src/lib/hub-materiality.js";
import { onRequestPost as collect } from "../functions/api/hub/collect.js";
import { extractFeedEntries, discoverFeedUrl, extractNewsLinks } from "../src/lib/hub-source-links.js";

test("headline-based materiality triage differentiates technical and routine signals", () => {
  const samples = [
    ["Cangallo: 150 metres at 1.4% Cu from diamond drilling", "drilling_results", "high"],
    ["Company announces increased mineral resource estimate", "resource_update", "high"],
    ["Company enters joint venture for Curibaya", "project_transaction", "high"],
    ["New high-sulphidation target identified from geochemistry", "discovery_target", "high"],
    ["Company announces commencement of drilling campaign", "drilling_program", "review"],
    ["Peruvian Metals Announces $3 Million Private Placement", "financing", "low"],
    ["CEO presents at annual mining conference", "corporate_routine", "low"],
    ["Resultados de perforación: 82 m con 1.5 g/t Au", "drilling_results", "high"]
  ];
  for (const [headline, kind, priority] of samples) {
    const result = screenHeadline(headline);
    assert.equal(result.classification, kind, headline);
    assert.equal(result.priority, priority, headline);
    assert.ok(result.materiality_score >= 0 && result.materiality_score <= 100);
    assert.match(result.rationale, /headline only/i);
  }
  assert.equal(screenHeadline("").classification, "needs_review");
});
test("RSS entries are extracted, canonicalized and date normalized", () => {
  const xml = "<rss><channel><item><title><![CDATA[Drilling intersects 120 m at 1.2% Cu]]></title>" +
    "<link>https://junior.example/news/2026/copper-drilling?utm_source=mail</link>" +
    "<pubDate>Mon, 19 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>";
  const out = extractFeedEntries(xml, "https://junior.example");
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Drilling intersects 120 m at 1.2% Cu");
  assert.equal(out[0].url, "https://junior.example/news/2026/copper-drilling");
  assert.equal(out[0].date, "2026-10-19");
});
test("Atom entry link href is supported", () => {
  const xml = '<feed><entry><title>New Joint Venture Agreement for Copper Project</title>' +
    '<link rel="alternate" href="https://junior.example/news/joint-venture"/>' +
    "<updated>2026-10-20T10:00:00Z</updated></entry></feed>";
  assert.equal(extractFeedEntries(xml, "https://junior.example")[0]?.kind, "feed_article");
});
test("feed autodiscovery accepts same-host feeds, rejects offsite targets", () => {
  const base = "https://junior.example";
  assert.equal(discoverFeedUrl('<link rel="alternate" type="application/rss+xml" href="/feed.xml">',base), "https://junior.example/feed.xml");
  assert.equal(discoverFeedUrl('<link rel="alternate" type="application/rss+xml" href="http://localhost/admin">',base), "");
});
test("HTML discovery requires a substantive deep news link", () => {
  const html = '<a href="/news">News</a>' +
    '<a href="/news/2026/diamond-drilling-results-at-copper-project">Company reports new diamond drilling results from copper project</a>' +
    '<a href="/contact">Contact us</a>';
  const news = extractNewsLinks(html, "https://junior.example");
  assert.equal(news.length, 1);
  assert.equal(news[0].kind, "html_news_link");
});

test("collector discovers feed, scores candidate and never auto-publishes", async () => {
  const source = {
    id: 1, name: "Example Junior", url: "https://junior.example",
    feed_url: null, source_kind: "company_news", priority: 95,
    last_checked_at: null, last_error: null, company: "Example Junior",
    project: "Cangallo"
  };
  const statements = [];
  const db = {
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes("INSERT INTO hub_scan_runs")) return { id: 7 };
          return null;
        },
        async all() {
          if (sql.includes("FROM hub_sources s")) return { results: [source] };
          if (sql.includes("classification='feed_article'")) return { results: [] };
          throw Error("Unexpected query: " + sql);
        },
        async run() {
          statements.push({ sql, args: this.args });
          return { meta: { changes: 1 } };
        }
      };
      return statement;
    }
  };
  const page = '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head></html>';
  const rss = "<rss><channel><item><title>Cangallo intersects 140 metres at 1.2% Cu in drilling</title>" +
    "<link>https://junior.example/news/2026/results</link>" +
    "<pubDate>Mon, 19 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>";
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      if (url === "https://junior.example") return new Response(page, { status: 200 });
      if (url === "https://junior.example/feed.xml") return new Response(rss, { status: 200 });
      throw Error("Unexpected fetch: " + url);
    };
    const request = new Request("https://pyorex.com/api/hub/collect", {
      method: "POST", headers: { Authorization: "Bearer fixture-secret" }
    });
    const response = await collect({ request, env: { PYOREX_DB: db, HUB_INGEST_TOKEN: "fixture-secret" } });
    const report = await response.json();
    assert.equal(report.sources_checked, 1);
    assert.equal(report.new_candidates, 1);
    assert.equal(report.published_events, 0);
    const inserted = statements.find(x => x.sql.includes("INSERT OR IGNORE INTO hub_candidates"));
    assert.ok(inserted, "candidate must be persisted");
    assert.equal(inserted.args[7], "drilling_results");
    assert.ok(inserted.args[8] >= 75);
    assert.ok(statements.some(x => x.sql.includes("SET feed_url=?")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
