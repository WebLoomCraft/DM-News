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

/** Sanitizes free-form HTML from settings (ad slots, analytics snippets). */
export function sanitizeTrustedHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    ...shared,
    allowedTags: [
      ...(shared.allowedTags || []),
      "script",
      "noscript",
      "source",
      "picture",
      "video",
      "ins",
      "svg",
      "path",
    ].filter((tag) => tag !== "iframe"),
    allowedAttributes: {
      "*": ["class", "id", "style", "data-*"],
      script: ["src", "async", "defer", "type", "crossorigin"],
      img: ["src", "srcset", "alt", "width", "height", "loading"],
      a: ["href", "target", "rel"],
      iframe: ["src", "width", "height", "frameborder", "allow", "allowfullscreen", "loading", "title"],
      source: ["srcset", "type", "media"],
      video: ["src", "controls", "poster", "width", "height", "muted", "loop", "playsinline"],
      svg: ["viewBox", "width", "height", "fill", "xmlns"],
      path: ["d", "fill"],
    },
    allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
  });
}

/** Plain text only – used for descriptions, names and other fields. */
export function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return "";
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
