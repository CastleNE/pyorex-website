// Conservative RSS/Atom + HTML news-link extraction for monitored company sources.
// Extraction creates candidates only; it does NOT verify or publish news.
export function decodeText(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi, m => ({
      "&amp;": "&", "&quot;": '"', "&apos;": "'",
      "&lt;": "<", "&gt;": ">", "&nbsp;": " "
    }[m.toLowerCase()] || m))
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function xmlTag(xml, name) {
  const m = xml.match(new RegExp("<(?:[a-z0-9_-]+:)?" + name +
    "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-z0-9_-]+:)?" + name + ">", "i"));
  return m ? decodeText(m[1]) : "";
}
function canonical(raw, base, sameHost = false) {
  try {
    if (!String(raw || "").trim()) return "";
    const url = new URL(raw, base), origin = new URL(base);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    if (/^(?:localhost|.*\\.localhost|.*\\.internal|.*\\.local)$/i.test(url.hostname) || /^(?:127\\.|10\\.|192\\.168\\.|169\\.254\\.|0\\.)/.test(url.hostname) || url.hostname.includes(":")) return "";
    const baseHost = origin.hostname.toLowerCase().replace(/^www\./, "");
    const targetHost = url.hostname.toLowerCase().replace(/^www\./, "");
    if (sameHost && targetHost !== baseHost &&
      !targetHost.endsWith("." + baseHost)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch { return ""; }
}
function attr(markup, name) {
  const m = markup.match(new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return decodeText(m?.[1] || m?.[2] || m?.[3] || "");
}
export function extractFeedEntries(xml, base, limit = 20) {
  const result = [], seen = new Set();
  const nodes = xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi);
  for (const [, , item] of nodes) {
    const title = xmlTag(item, "title");
    let href = xmlTag(item, "link");
    if (!href) {
      const links = [...item.matchAll(/<link\b[^>]*>/gi)].map(x => x[0]);
      const alternate = links.find(x => attr(x, "rel") === "alternate");
      if (alternate || links.length) href = attr(alternate || links[0], "href");
    }
    if (!href) { const guid = xmlTag(item, "guid"); if (/^https?:\/\//i.test(guid)) href = guid; }
    const url = canonical(href, base);
    if (!url || !title || title.length < 8 || seen.has(url)) continue;
    seen.add(url);
    const rawDate = xmlTag(item, "pubDate") || xmlTag(item, "published") || xmlTag(item, "updated");
    const parsed = Date.parse(rawDate);
    const date = Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
    result.push({ url, title: title.slice(0, 350), date, kind: "feed_article" });
    if (result.length >= limit) break;
  }
  return result;
}
export function discoverFeedUrl(html, base) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const link of links.slice(0, 250)) {
    const rel = attr(link, "rel"), type = attr(link, "type");
    if (!/\balternate\b/i.test(rel) || !/(?:rss|atom|xml)/i.test(type)) continue;
    const url = canonical(attr(link, "href"), base, true);
    if (url) return url;
  }
  return "";
}
export function extractNewsLinks(html, base, limit = 12) {
  const result = [], seen = new Set();
  const anchors = html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
  for (const [, attrs, inner] of anchors) {
    const title = decodeText(inner);
    if (title.length < 28 || title.length > 260 || title.split(/\s+/).length < 4) continue;
    if (/^(?:read more|learn more|view all|news|press releases|announcements|media center)/i.test(title)) continue;
    const url = canonical(attr(attrs, "href"), base, true);
    if (!url || seen.has(url)) continue;
    const path = new URL(url).pathname.toLowerCase();
    // Requiring a deep news/article path avoids selecting nav links and generic category pages.
    const story = /\/(?:news|press[-_]?releases?|news[-_]?releases?|media[-_]?releases?|announcements?|releases?|updates?)\/(?:20\d{2}\/)?[^/]{12,}\/?$/i.test(path) ||
      /\/20\d{2}\/\d{1,2}\/\d{1,2}\/[^/]{12,}\/?$/i.test(path);
    if (!story) continue;
    seen.add(url);
    result.push({ url, title: title.slice(0, 350), date: "", kind: "html_news_link" });
    if (result.length >= limit) break;
  }
  return result;
}
