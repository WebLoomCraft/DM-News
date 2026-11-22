import bcrypt from "bcryptjs";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articleTags,
  articles,
  authors,
  categories,
  homepageSections,
  siteSettings,
  tags,
  users,
  videos,
} from "@/db/schema";
import { DEFAULT_FOOTER_COLUMNS, DEFAULT_NAV, getSettings, invalidateSettingsCache } from "./settings";
import { slugify } from "./utils";

const IMG = {
  faisal: "https://images.pexels.com/photos/27698081/pexels-photo-27698081.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  badshahi: "https://images.pexels.com/photos/34619221/pexels-photo-34619221.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  gujranwala: "https://images.pexels.com/photos/5403798/pexels-photo-5403798.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  karachi: "https://images.pexels.com/photos/14411521/pexels-photo-14411521.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  wah: "https://images.pexels.com/photos/30581150/pexels-photo-30581150.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  islamabadFog: "https://images.pexels.com/photos/10701855/pexels-photo-10701855.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  lahoreSunset: "https://images.pexels.com/photos/12912453/pexels-photo-12912453.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  faisalBlue: "https://images.pexels.com/photos/5258953/pexels-photo-5258953.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  chamber: "https://images.pexels.com/photos/32266769/pexels-photo-32266769.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  desks: "https://images.pexels.com/photos/32266781/pexels-photo-32266781.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  speech: "https://images.pexels.com/photos/6950205/pexels-photo-6950205.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  podium: "https://images.pexels.com/photos/6950212/pexels-photo-6950212.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  roundTable: "https://images.pexels.com/photos/19867355/pexels-photo-19867355.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  ankara: "https://images.pexels.com/photos/33124287/pexels-photo-33124287.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  oslo: "https://images.pexels.com/photos/32991337/pexels-photo-32991337.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  istanbul: "https://images.pexels.com/photos/31003275/pexels-photo-31003275.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  conference: "https://images.pexels.com/photos/6950224/pexels-photo-6950224.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  cricket: "https://images.pexels.com/photos/36230651/pexels-photo-36230651.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  football: "https://images.pexels.com/photos/33977836/pexels-photo-33977836.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  stadiumNight: "https://images.pexels.com/photos/15362148/pexels-photo-15362148.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  arena: "https://images.pexels.com/photos/35120678/pexels-photo-35120678.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  concert: "https://images.pexels.com/photos/761543/pexels-photo-761543.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  warsaw: "https://images.pexels.com/photos/20642043/pexels-photo-20642043.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
};

const CATEGORY_SEED = [
  { name: "Pakistan", slug: "pakistan", color: "#D81F2A", description: "National news, policy and public affairs from across Pakistan.", image: IMG.faisal },
  { name: "World", slug: "world", color: "#12457A", description: "International affairs, diplomacy and global economies.", image: IMG.istanbul },
  { name: "Politics", slug: "politics", color: "#6B21A8", description: "Parliament, elections, governance and political analysis.", image: IMG.chamber },
  { name: "Business", slug: "business", color: "#0F766E", description: "Markets, energy, industry and the economy explained.", image: IMG.conference },
  { name: "Technology", slug: "technology", color: "#1D4ED8", description: "Startups, digital policy, science and consumer technology.", image: IMG.wah },
  { name: "Sports", slug: "sports", color: "#B45309", description: "Cricket, football and every arena in between.", image: IMG.cricket },
  { name: "Entertainment", slug: "entertainment", color: "#BE185D", description: "Film, television, music, streaming and culture.", image: IMG.concert },
];

const AUTHOR_SEED = [
  { name: "DM News Desk", slug: "dm-news-desk", designation: "National Desk", bio: "The DM News Network national desk files verified reports from across Pakistan around the clock." },
  { name: "World Desk", slug: "world-desk", designation: "International Desk", bio: "Covering diplomacy, conflict and global economies with context readers can trust." },
  { name: "Politics Desk", slug: "politics-desk", designation: "Political Affairs", bio: "Parliamentary reporting, election coverage and policy analysis." },
  { name: "Business Desk", slug: "business-desk", designation: "Economy & Markets", bio: "Markets, energy, industry and personal finance reporting." },
  { name: "Sports Desk", slug: "sports-desk", designation: "Sports", bio: "Match reports, schedules and analysis from our sports team." },
  { name: "Culture Desk", slug: "culture-desk", designation: "Entertainment & Culture", bio: "Film, television, music and the stories behind the screen." },
];

const TAG_SEED = [
  "Pakistan",
  "Economy",
  "Parliament",
  "Climate",
  "Cricket",
  "Startups",
  "Global Markets",
  "Diplomacy",
  "Education",
  "Health",
  "Streaming",
  "Energy",
];

type SeedArticle = {
  title: string;
  category: string;
  author: string;
  image: string;
  excerpt: string;
  body: string[];
  bullets?: string[];
  quote?: string;
  tags: string[];
  hoursAgo: number;
  breaking?: boolean;
  featured?: boolean;
  featuredRank?: number;
  draft?: boolean;
};

const ARTICLE_SEEDS: SeedArticle[] = [
  {
    title: "DM News Network opens its 24/7 digital newsroom for readers nationwide",
    category: "pakistan",
    author: "dm-news-desk",
    image: IMG.faisal,
    excerpt:
      "The network has switched on a continuous publishing desk covering national affairs, business, sport and culture — with every story verified before it goes live.",
    body: [
      "DM News Network is now publishing around the clock from a single digital newsroom, combining national reporting with dedicated desks for world affairs, politics, business, technology, sport and entertainment.",
      "Every story that appears on this site passes through the same verification checklist: sourcing, right-of-reply where applicable, caption accuracy and a final read by the duty editor before publication.",
      "Readers can follow the desk on Facebook and TikTok, watch video reports in the Videos section, and subscribe to the evening briefing newsletter for a single daily digest.",
    ],
    bullets: [
      "Continuous publishing across seven sections",
      "Editor-verified sourcing on every story",
      "Video reports and live stream support built in",
    ],
    quote: "Speed matters, but accuracy matters more. We publish when we are sure.",
    tags: ["Pakistan", "Education"],
    hoursAgo: 2,
    breaking: true,
    featured: true,
    featuredRank: 1,
  },
  {
    title: "What readers should watch in the federal budget cycle this year",
    category: "business",
    author: "business-desk",
    image: IMG.conference,
    excerpt:
      "From tax proposals to development spending, a plain-language guide to the documents that shape household budgets.",
    body: [
      "The annual budget cycle is the single most consequential economic event for households and businesses alike. Yet the documents themselves are dense, and the headlines that follow are often incomplete.",
      "Our business desk breaks the cycle into four stages: the pre-budget consultation, the finance bill, the appropriation of development spending, and the post-budget implementation rules that determine what actually changes on the ground.",
      "Readers should watch three numbers in particular — the fiscal deficit target, the projected inflation assumption, and the share of development spending that survives to implementation.",
    ],
    bullets: [
      "Stage one: pre-budget consultation papers",
      "Stage two: the finance bill and its amendments",
      "Stage three: development spending allocations",
      "Stage four: implementation rules and notifications",
    ],
    tags: ["Economy", "Global Markets"],
    hoursAgo: 6,
    featured: true,
    featuredRank: 2,
  },
  {
    title: "How a bill becomes law: the parliamentary process explained",
    category: "politics",
    author: "politics-desk",
    image: IMG.desks,
    excerpt:
      "Committees, readings, votes and assent — a step-by-step explainer on the journey from draft to statute.",
    body: [
      "Legislation moves slowly for a reason: each stage exists to test a draft against evidence, expert opinion and public interest.",
      "A bill is typically introduced, referred to a standing committee, debated on the floor in successive readings, voted on, and then sent for assent before it appears in the gazette.",
      "Committee stage is where most substantive change happens — and it is the stage most often missed by casual observers of parliament.",
    ],
    quote: "Committee rooms, not the chamber floor, are where most laws are rewritten.",
    tags: ["Parliament"],
    hoursAgo: 10,
    featured: true,
    featuredRank: 3,
  },
  {
    title: "Diplomats turn to economic corridors as regional trade talks resume",
    category: "world",
    author: "world-desk",
    image: IMG.ankara,
    excerpt:
      "Trade routes, energy links and visa regimes are increasingly the substance of modern diplomacy, officials and analysts say.",
    body: [
      "Regional diplomacy has shifted from ceremony to logistics. The questions now on the table are practical: which corridors open, which tariffs fall, and which transit agreements get signed.",
      "Analysts note that economic integration remains the most durable form of regional stability, because it creates constituencies with a stake in continuity.",
      "Our world desk will follow the negotiating text as it develops, publishing summaries when concrete positions are tabled.",
    ],
    tags: ["Diplomacy", "Global Markets"],
    hoursAgo: 14,
    featured: true,
    featuredRank: 4,
  },
  {
    title: "Karachi to Khyber: mapping the country's news deserts",
    category: "pakistan",
    author: "dm-news-desk",
    image: IMG.karachi,
    excerpt:
      "Large districts have no resident reporters at all. Our data team maps where local accountability journalism is missing.",
    body: [
      "Local reporting is the earliest warning system a country has. Where it disappears, corruption, service failure and disaster risk go unrecorded until they become crises.",
      "Using publicly available registration data and newsroom staffing records, our team identified districts with no resident correspondents covering municipal government.",
      "The findings will inform where DM News Network assigns its next cohort of regional contributors.",
    ],
    bullets: [
      "Districts with no resident municipal reporter",
      "Regions where court reporting is unstaffed",
      "Priority areas for the next contributor cohort",
    ],
    tags: ["Pakistan", "Education"],
    hoursAgo: 20,
  },
  {
    title: "Energy imports and the rupee: why the trade bill matters to your grocery run",
    category: "business",
    author: "business-desk",
    image: IMG.roundTable,
    excerpt:
      "Imported fuel costs travel through the economy faster than most indicators. Here is the transmission chain in five steps.",
    body: [
      "When import costs rise, the effect does not stay at the port. It moves through freight, wholesale prices, retail margins and finally household budgets.",
      "Economists describe the chain as fast but asymmetric: prices rise quickly and fall slowly.",
      "Understanding that lag helps readers separate genuine inflation pressure from seasonal noise.",
    ],
    tags: ["Energy", "Economy"],
    hoursAgo: 26,
  },
  {
    title: "Inside the startup ecosystem: founders on raising without relocating",
    category: "technology",
    author: "dm-news-desk",
    image: IMG.wah,
    excerpt:
      "Remote-first investors and regional accelerators are changing where a company has to sit to raise capital.",
    body: [
      "A decade ago, founders believed they had to move to a single metropolitan hub to raise a seed round. That assumption is weakening.",
      "Remote diligence, standardised terms and regional accelerators have made it possible to build from anywhere with reliable connectivity.",
      "The remaining bottleneck is not capital — it is distribution, payments infrastructure and senior hiring.",
    ],
    quote: "Capital found us. Talent and payments are still the hard part.",
    tags: ["Startups"],
    hoursAgo: 32,
  },
  {
    title: "Climate adaptation is now a municipal budget line, not a policy slogan",
    category: "pakistan",
    author: "dm-news-desk",
    image: IMG.gujranwala,
    excerpt:
      "Drainage, heat shelters and early-warning systems are appearing in city development plans across the country.",
    body: [
      "Adaptation spending has moved from national strategy documents into the operational budgets of city governments.",
      "The most common line items are urban drainage, reflective roofing programmes for public buildings, and heat-health early warning systems.",
      "Independent monitoring of these budgets remains thin — a gap our desk intends to cover.",
    ],
    tags: ["Climate"],
    hoursAgo: 40,
  },
  {
    title: "Cricket calendar: the series and tournaments to mark this season",
    category: "sports",
    author: "sports-desk",
    image: IMG.cricket,
    excerpt:
      "Bilateral series, franchise leagues and qualification windows — the full season at a glance.",
    body: [
      "The international calendar has never been denser, and franchise leagues now overlap with bilateral commitments.",
      "For supporters, the practical consequence is a season with almost no empty weeks — and for boards, an ongoing negotiation about player workload.",
      "Our sports desk will publish match reports, standings and schedule changes as they are confirmed.",
    ],
    bullets: ["Bilateral home season", "Franchise league windows", "Qualification and ranking implications"],
    tags: ["Cricket"],
    hoursAgo: 48,
  },
  {
    title: "Stadium economics: what a sold-out night actually costs to stage",
    category: "sports",
    author: "sports-desk",
    image: IMG.stadiumNight,
    excerpt:
      "Broadcast rights, match-day staffing, security and turf maintenance make up the majority of a fixture's cost base.",
    body: [
      "A full stadium looks like pure profit. The ledger tells a more complicated story.",
      "Match-day costs include security contracting, medical cover, stewarding, broadcasting operations and significant turf maintenance across a season.",
      "Clubs increasingly rely on hospitality tiers and non-match-day events to smooth revenue.",
    ],
    tags: ["Cricket"],
    hoursAgo: 56,
  },
  {
    title: "Streaming in South Asia: the shift towards local originals",
    category: "entertainment",
    author: "culture-desk",
    image: IMG.concert,
    excerpt:
      "Platforms are discovering that regional stories outperform imported catalogues on completion rates.",
    body: [
      "Completion rate — the share of viewers who finish a series — has become the metric that drives commissioning decisions.",
      "Regional originals consistently outperform imported catalogue titles on that measure, which is reshaping production budgets across South Asia.",
      "For local writers and crews, the shift means more work, tighter deadlines and a growing appetite for non-fiction formats.",
    ],
    quote: "Completion rate is the number that quietly decides what gets made next.",
    tags: ["Streaming"],
    hoursAgo: 64,
  },
  {
    title: "Football's grassroots problem: pitches, referees and registration",
    category: "sports",
    author: "sports-desk",
    image: IMG.football,
    excerpt:
      "Youth participation is rising while the officiating pipeline shrinks — a gap that threatens league quality.",
    body: [
      "Registration numbers for youth football continue to climb, but the number of certified referees has not kept pace.",
      "Without officials, leagues shorten seasons or cancel fixtures — a quiet erosion of competitive opportunity.",
      "Federation programmes that pay referees a living match fee have shown the clearest recovery in comparable systems.",
    ],
    tags: ["Education"],
    hoursAgo: 72,
  },
  {
    title: "Parliamentary committees: the oversight tool readers should demand",
    category: "politics",
    author: "politics-desk",
    image: IMG.speech,
    excerpt:
      "Committee hearings produce the documentary record that later reporting depends on. Many are still not published.",
    body: [
      "Committee proceedings generate evidence — testimony, departmental records, audit findings — that becomes the backbone of accountability journalism.",
      "Where transcripts are not published, that record effectively disappears.",
      "Our politics desk tracks which committees publish proceedings and which do not, and names both.",
    ],
    tags: ["Parliament", "Education"],
    hoursAgo: 80,
  },
  {
    title: "Public health data: why district-level reporting still lags",
    category: "pakistan",
    author: "dm-news-desk",
    image: IMG.islamabadFog,
    excerpt:
      "National aggregates are published monthly; district figures — the ones that matter for clinics — often arrive late or never.",
    body: [
      "Health reporting is only actionable when it is local. District-level data informs staffing, vaccine distribution and outbreak response.",
      "Publication delays mean decisions are taken on stale numbers.",
      "We are building a tracker that records which districts publish, and how current their figures are.",
    ],
    tags: ["Health"],
    hoursAgo: 92,
  },
  {
    title: "Cities after dark: how municipalities are rethinking night economies",
    category: "world",
    author: "world-desk",
    image: IMG.istanbul,
    excerpt:
      "Transport, licensing and safety planning for night workers is becoming a distinct policy field in major cities.",
    body: [
      "Night economies are no longer treated as an extension of daytime commerce. They have their own transport, safety and licensing requirements.",
      "Cities that appoint night-time coordinators report better outcomes for transport workers, hospitality staff and public safety alike.",
      "The policy field is young, and evidence is still being gathered across regions.",
    ],
    tags: ["Diplomacy"],
    hoursAgo: 104,
  },
  {
    title: "Classroom connectivity: what a school actually needs to go online",
    category: "technology",
    author: "dm-news-desk",
    image: IMG.faisalBlue,
    excerpt:
      "Devices arrive first and training arrives last. Educators describe the gap between hardware donations and usable digital classrooms.",
    body: [
      "A laptop trolley without teacher training, filtering, maintenance and reliable power is inventory, not infrastructure.",
      "Schools that succeed share a common sequence: connectivity, then training, then devices, then curriculum integration.",
      "Our technology desk is collecting case studies from schools that completed the sequence.",
    ],
    tags: ["Education", "Startups"],
    hoursAgo: 116,
  },
  {
    title: "Draft: editorial standards and corrections policy for review",
    category: "pakistan",
    author: "politics-desk",
    image: IMG.lahoreSunset,
    excerpt:
      "Internal draft outlining the verification checklist, correction format and right-of-reply procedure.",
    body: [
      "This is an unpublished working draft used to demonstrate the draft status in the content management system.",
      "Editors can keep work in progress here, schedule it for later release, or publish it immediately from the admin dashboard.",
    ],
    tags: ["Pakistan"],
    hoursAgo: 5,
    draft: true,
  },
];

const VIDEO_SEED = [
  {
    title: "Evening commute: traffic patterns across the capital",
    url: "https://videos.pexels.com/video-files/12138808/12138808-hd_1920_1080_30fps.mp4",
    thumb: "https://images.pexels.com/videos/12138808/pexels-photo-12138808.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    kind: "report",
    description: "Our transport desk tracks how peak-hour flow has changed across major arterial roads.",
  },
  {
    title: "On the ground: pedestrian crossings and city footfall",
    url: "https://videos.pexels.com/video-files/39174355/16669579_1920_1080_25fps.mp4",
    thumb: "https://images.pexels.com/videos/39174355/auckland-bustling-city-busy-city-city-39174355.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    kind: "clip",
    description: "Short clip from our urban safety report on pedestrian infrastructure.",
  },
  {
    title: "World watch: the busiest intersections, explained",
    url: "https://videos.pexels.com/video-files/35488300/15034376_3840_2160_60fps.mp4",
    thumb: "https://images.pexels.com/videos/35488300/crossing-japan-people-crowd-time-lapse-35488300.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    kind: "report",
    description: "How traffic engineers measure flow at high-volume crossings.",
  },
  {
    title: "Interview: what newsroom verification looks like in practice",
    url: "https://videos.pexels.com/video-files/39174360/16669575_1920_1080_25fps.mp4",
    thumb: "https://images.pexels.com/videos/39174360/auckland-bustling-city-busy-city-city-39174360.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200",
    kind: "interview",
    description: "A conversation with our duty editor about sourcing, captions and corrections.",
  },
];

function buildBody(seed: SeedArticle): string {
  const parts: string[] = [];
  parts.push(`<p>${seed.body[0]}</p>`);
  if (seed.body[1]) parts.push(`<p>${seed.body[1]}</p>`);
  if (seed.quote) parts.push(`<blockquote><p>${seed.quote}</p></blockquote>`);
  if (seed.bullets?.length) {
    parts.push("<h2>Key points</h2>");
    parts.push(`<ul>${seed.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`);
  }
  if (seed.body[2]) parts.push(`<p>${seed.body[2]}</p>`);
  parts.push(
    "<h2>Why it matters</h2>",
    `<p>DM News Network verifies every report before publication and updates stories as new information is confirmed. Corrections are published at the foot of the article with a timestamp.</p>`,
  );
  return parts.join("\n");
}

function hoursAgoDate(hours: number) {
  return new Date(Date.now() - hours * 3600 * 1000);
}

export async function ensureSeeded(): Promise<{ seeded: boolean; reason?: string }> {
  const existingUsers = await db.select({ value: count() }).from(users);
  const existingArticles = await db.select({ value: count() }).from(articles);

  // Always guarantee the settings row and homepage sections exist.
  await getSettings();
  await ensureSections();

  if ((existingUsers[0]?.value ?? 0) > 0 && (existingArticles[0]?.value ?? 0) > 0) {
    return { seeded: false, reason: "database already contains content" };
  }

  const [settings] = await db.select({ id: siteSettings.id }).from(siteSettings).limit(1);
  if (settings) {
    await db
      .update(siteSettings)
      .set({
        facebookUrl: "https://www.facebook.com/share/1FaNf7Nj6t/",
        tiktokUrl: "https://www.tiktok.com/@dmnewsnetwork?_r=1&_t=ZS-9BcDLFbjrUr",
        youtubeUrl: "",
        navItems: DEFAULT_NAV,
        footerColumns: DEFAULT_FOOTER_COLUMNS,
        aboutContent: `<p>DM News Network is an independent digital newsroom covering Pakistan and the world. We publish verified reporting across national affairs, politics, business, technology, sport and culture.</p><h2>How we work</h2><p>Every story is sourced, checked and read by a duty editor before publication. Where we get something wrong we correct it openly, at the foot of the article, with a timestamp.</p><h2>Contact the newsroom</h2><p>Use the contact form to reach the desk. Details for the editorial team can be published here from the admin panel.</p>`,
        privacyContent: `<h2>1. What we collect</h2><p>We store the information you give us: newsletter email addresses, contact form messages, and account details for newsroom staff.</p><h2>2. How we use it</h2><p>Newsletter addresses are used only to send the briefing you subscribed to. We do not sell personal data or send marketing mail without consent.</p><h2>3. Cookies</h2><p>We use a strictly necessary session cookie for signed-in newsroom staff, and an anonymous first-party counter for readership statistics.</p><h2>4. Your rights</h2><p>You can ask us to delete your newsletter subscription or contact message at any time using the contact form.</p>`,
        termsContent: `<h2>1. Use of content</h2><p>Articles published on DM News Network may be read and shared freely. Republication in full requires written permission and clear attribution with a link to the original story.</p><h2>2. Accuracy</h2><p>We correct errors promptly. If you believe a story is inaccurate, contact the newsroom and we will review it.</p><h2>3. Comments and submissions</h2><p>Material submitted to the newsroom may be edited for clarity. We do not publish unverified claims.</p><h2>4. Liability</h2><p>External links are provided for reference; we are not responsible for the content of third-party sites.</p>`,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.id, settings.id));
    invalidateSettingsCache();
  }

  // Users
  const userSeed = [
    { name: "Network Owner", email: "admin@dmnewsnetwork.com", password: "DMnews@2026", role: "super_admin", canPublish: true },
    { name: "Newsroom Admin", email: "newsroom@dmnewsnetwork.com", password: "Newsroom@2026", role: "admin", canPublish: true },
    { name: "Duty Editor", email: "editor@dmnewsnetwork.com", password: "Editor@2026", role: "editor", canPublish: true },
    { name: "Staff Reporter", email: "reporter@dmnewsnetwork.com", password: "Reporter@2026", role: "author", canPublish: false },
  ];
  const createdUsers: Record<string, number> = {};
  for (const u of userSeed) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const [row] = await db
      .insert(users)
      .values({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        canPublish: u.canPublish,
        bio: `${u.name} — ${u.role.replace("_", " ")} at DM News Network.`,
      })
      .returning();
    createdUsers[u.email] = row!.id;
  }

  // Authors (desks, not invented individuals)
  const authorIds: Record<string, number> = {};
  for (const a of AUTHOR_SEED) {
    const [row] = await db.insert(authors).values(a).returning();
    authorIds[a.slug] = row!.id;
  }

  // Categories
  const categoryIds: Record<string, number> = {};
  for (let i = 0; i < CATEGORY_SEED.length; i++) {
    const c = CATEGORY_SEED[i]!;
    const [row] = await db
      .insert(categories)
      .values({
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.image,
        color: c.color,
        orderIndex: i,
      })
      .returning();
    categoryIds[c.slug] = row!.id;
  }

  // Tags
  const tagIds: Record<string, number> = {};
  for (const name of TAG_SEED) {
    const [row] = await db.insert(tags).values({ name, slug: slugify(name) }).returning();
    tagIds[name] = row!.id;
  }

  // Articles
  for (const seed of ARTICLE_SEEDS) {
    const publishedAt = hoursAgoDate(seed.hoursAgo);
    const [article] = await db
      .insert(articles)
      .values({
        title: seed.title,
        slug: slugify(seed.title),
        excerpt: seed.excerpt,
        content: buildBody(seed),
        featuredImageUrl: seed.image,
        imageAlt: seed.title,
        imageCaption: `Archive photograph used for illustration — ${seed.title}`,
        categoryId: categoryIds[seed.category] ?? null,
        authorId: authorIds[seed.author] ?? null,
        createdById: createdUsers["editor@dmnewsnetwork.com"] ?? null,
        status: seed.draft ? "draft" : "published",
        isBreaking: Boolean(seed.breaking),
        isFeatured: Boolean(seed.featured),
        featuredRank: seed.featuredRank ?? 0,
        seoTitle: seed.title,
        seoDescription: seed.excerpt,
        views: Math.floor(Math.random() * 900) + 40,
        publishedAt: seed.draft ? null : publishedAt,
        createdAt: publishedAt,
        updatedAt: publishedAt,
      })
      .returning();
    if (!article) continue;
    const linkRows = seed.tags
      .filter((t) => tagIds[t])
      .map((t) => ({ articleId: article.id, tagId: tagIds[t]! }));
    if (linkRows.length) await db.insert(articleTags).values(linkRows);
  }

  // Videos
  for (let i = 0; i < VIDEO_SEED.length; i++) {
    const v = VIDEO_SEED[i]!;
    await db.insert(videos).values({
      title: v.title,
      youtubeUrl: v.url,
      youtubeId: null,
      thumbnailUrl: v.thumb,
      description: v.description,
      kind: v.kind,
      orderIndex: i,
      publishedAt: hoursAgoDate(i * 7 + 3),
    });
  }

  return { seeded: true };
}

export const DEFAULT_SECTIONS = [
  { key: "featured", title: "Top Stories", orderIndex: 1, layout: "hero", limit: 4 },
  { key: "latest", title: "Latest News", orderIndex: 2, layout: "grid", limit: 9 },
  { key: "category:pakistan", title: "Pakistan News", orderIndex: 3, layout: "row", limit: 4, category: "pakistan" },
  { key: "category:world", title: "World News", orderIndex: 4, layout: "row", limit: 4, category: "world" },
  { key: "category:politics", title: "Politics", orderIndex: 5, layout: "row", limit: 4, category: "politics" },
  { key: "category:business", title: "Business", orderIndex: 6, layout: "row", limit: 4, category: "business" },
  { key: "category:technology", title: "Technology", orderIndex: 7, layout: "row", limit: 4, category: "technology" },
  { key: "category:sports", title: "Sports", orderIndex: 8, layout: "row", limit: 4, category: "sports" },
  { key: "category:entertainment", title: "Entertainment", orderIndex: 9, layout: "row", limit: 4, category: "entertainment" },
  { key: "videos", title: "Video Reports", orderIndex: 10, layout: "videos", limit: 4 },
  { key: "live", title: "Watch Live", orderIndex: 11, layout: "live", limit: 1 },
  { key: "social", title: "Follow DM News Network", orderIndex: 12, layout: "social", limit: 3 },
  { key: "newsletter", title: "The DM Evening Briefing", orderIndex: 13, layout: "newsletter", limit: 1 },
];

async function ensureSections() {
  const existing = await db.select({ key: homepageSections.key }).from(homepageSections);
  const have = new Set(existing.map((e) => e.key));
  const missing = DEFAULT_SECTIONS.filter((s) => !have.has(s.key));
  if (!missing.length) return;

  const categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const bySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  await db.insert(homepageSections).values(
    missing.map((section) => ({
      key: section.key,
      title: section.title,
      orderIndex: section.orderIndex,
      layout: section.layout,
      limit: section.limit,
      categoryId: section.category ? (bySlug.get(section.category) ?? null) : null,
      enabled: true,
    })),
  );
}

export async function runSeedSafely() {
  try {
    await db.execute(sql`select 1`);
    const result = await ensureSeeded();
    console.log("[dm-news] seed:", result.seeded ? "installed starter newsroom content" : `skipped (${result.reason})`);
  } catch (error) {
    console.error("[dm-news] seed skipped:", (error as Error).message);
  }
}
