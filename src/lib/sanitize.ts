import sanitizeHtml from "sanitize-html";

const ALLOWED_IFRAME_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.dailymotion.com",
  "open.spotify.com",
];

const shared: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "ul",
    "ol",
    "li",
    "blockquote",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "img",
    "figure",
    "figcaption",
    "div",
    "span",
    "iframe",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "pre",
    "code",
  ],
  allowedAttributes: {
    "*": ["class", "title"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    iframe: ["src", "width", "height", "frameborder", "allow", "allowfullscreen", "loading", "title"],
    div: ["data-youtube-id", "data-embed", "style"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src", "action", "formaction", "poster", "background", "cite", "srcset"],
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "noopener noreferrer nofollow",
        target: attribs.target || "_blank",
      },
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: attribs.loading || "lazy", decoding: "async" },
    }),
    iframe: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        loading: "lazy",
        allowfullscreen: "true",
        frameborder: "0",
        referrerpolicy: "strict-origin-when-cross-origin",
      },
    }),
  },
};

/** Sanitizes article rich text coming from the editor. */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, shared);
}

/**
 * Allowlisted remote script origins for ad slots and analytics.
 *
 * Stored scripts are the highest-value stored-XSS target: any account holding
 * settings.manage could previously persist `<script src="https://evil">` and
 * have it execute on every public page for every visitor. Scripts are now only
 * permitted from an explicit allowlist of reputable integration hosts, and the
 * allowlist itself can only be extended from the environment (not the CMS).
 *
 * Set AD_SCRIPT_ALLOWLIST to a comma-separated list of additional hosts.
 */
const DEFAULT_SCRIPT_HOSTS = [
  "pagead2.googlesyndication.com",
  "fundingchoicesmessages.google.com",
  "securepubads.g.doubleclick.net",
  "www.googletagmanager.com",
  "www.google-analytics.com",
  "cdn.ampproject.org",
];

export function getAllowedScriptHosts(): string[] {
  const extra = (process.env.AD_SCRIPT_ALLOWLIST || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_SCRIPT_HOSTS, ...extra];
}

function isAllowedScriptSrc(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src, "https://placeholder.invalid");
  } catch {
    return false;
  }
  // Protocol-relative and absolute https only; never http or javascript:.
  if (url.protocol !== "https:") return false;
  if (src.trim().startsWith("//") && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return getAllowedScriptHosts().some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/** Hosts that may never be reachable even through an allowlisted script. */
const BLOCKED_URL_PATTERNS = [/^\s*javascript:/i, /^\s*data:text\/html/i, /^\s*vbscript:/i];

function safeUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (BLOCKED_URL_PATTERNS.some((pattern) => pattern.test(trimmed))) return undefined;
  return trimmed;
}

/**
 * Sanitizes free-form HTML from settings (ad slots, analytics snippets).
 *
 * Rules:
 *  - Event-handler attributes (on*) are never allowed.
 *  - <script> is dropped unless its src is on the allowlist; inline script is
 *    always dropped.
 *  - <iframe> is removed entirely.
 *  - style/url() attributes are validated so javascript: URIs cannot slip
 *    through the vector sanitize-html historically mishandled.
 */
/**
 * Removes <script> elements whose contents must never reach the page.
 *
 * sanitize-html discards the *tag* but keeps the inner *text* when a transform
 * turns it into something else, which would render a JavaScript payload as
 * visible page text. Anything without an allowlisted src is deleted outright,
 * contents included, before sanitisation runs.
 */
function stripDisallowedScripts(html: string): string {
  return html.replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, (match, attrs: string) => {
    const srcMatch = /\bsrc\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
    if (!srcMatch) return ""; // inline script: drop tag and body
    const src = srcMatch[1];
    if (!isAllowedScriptSrc(src)) return ""; // foreign script: drop entirely
    // Keep the tag itself; attributes are filtered by the sanitiser below.
    return match;
  });
}

export function sanitizeTrustedHtml(html: string | null | undefined): string {
  if (!html) return "";
  const preCleaned = stripDisallowedScripts(html);
  return sanitizeHtml(preCleaned, {
    ...shared,
    allowedTags: [
      ...(shared.allowedTags || []).filter((tag) => tag !== "script" && tag !== "iframe"),
      "script",
      "noscript",
      "source",
      "picture",
      "ins",
      "svg",
      "path",
    ],
    allowedAttributes: {
      // `style` is deliberately absent: CSS can carry url(javascript:…) and
      // expression() payloads, and none of the supported integrations need it.
      "*": ["class", "id", "data-*", "width", "height", "title"],
      script: ["src", "async", "defer", "type", "crossorigin", "integrity", "referrerpolicy", "nonce"],
      img: ["src", "srcset", "alt", "width", "height", "loading", "decoding"],
      a: ["href", "target", "rel"],
      source: ["srcset", "type", "media"],
      ins: ["class", "data-ad-client", "data-ad-slot", "data-ad-format", "data-full-width-responsive"],
      svg: ["viewBox", "width", "height", "fill", "xmlns"],
      path: ["d", "fill"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    // Blocks javascript:, vbscript: and data: URIs on href/src/action/etc.
    allowedSchemesAppliedToAttributes: ["href", "src", "action", "formaction", "poster", "background", "cite", "srcset"],
    allowProtocolRelative: false,
    allowedIframeHostnames: [], // iframes are removed from settings HTML entirely
    transformTags: {
      script: (_tagName, attribs) => {
        const src = attribs.src ? safeUrl(attribs.src) : undefined;
        // stripDisallowedScripts already removed anything not allowlisted; if
        // one reaches here anyway it is neutralised to an inert element.
        if (!src || !isAllowedScriptSrc(src)) return { tagName: "span", attribs: {} };
        return { tagName: "script", attribs: { ...attribs, src } };
      },
      a: (tagName, attribs) => {
        const href = attribs.href ? safeUrl(attribs.href) : undefined;
        const next: Record<string, string> = { ...attribs, rel: "noopener noreferrer nofollow", target: attribs.target || "_blank" };
        if (href) next.href = href;
        else delete next.href;
        return { tagName, attribs: next };
      },
      img: (tagName, attribs) => {
        const src = attribs.src ? safeUrl(attribs.src) : undefined;
        const next: Record<string, string> = { ...attribs, loading: attribs.loading || "lazy", decoding: "async" };
        if (src) next.src = src;
        else delete next.src;
        return { tagName, attribs: next };
      },
    },
    // Explicitly opt in to the `script` tag: it is only ever reached after
    // stripDisallowedScripts() has proven every src is allowlisted, and the
    // allowlist can only be extended from the environment, not the CMS.
    allowVulnerableTags: true,
  });
}

/** Plain text only – used for descriptions, names and other fields. */
export function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return "";
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}

/**
 * Serialises structured data for embedding in <script type="application/ld+json">.
 *
 * JSON.stringify alone is NOT safe here: a value containing `</script>` or
 * `<!--` terminates the host script element and turns article metadata into
 * stored XSS. Escaping the angle bracket and the two comment markers removes
 * every way out of the element without changing the parsed JSON value.
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
