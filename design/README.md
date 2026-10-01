# Handoff: CEOMaker redesign (app flow + six site templates)

## Overview
A redesign of CEOMaker, the AI personal-site builder for executives. It covers two areas:

1. **The product app** (`CEOMaker Start.dc.html`): marketing landing, guided questions, sign-in gate, template picker, "generating" screen, editor (content / brand / template tabs + publish dialog), dashboard, and the public "site not live / paused" page.
2. **The published sites** (`PortfolioTemplate.dc.html`): six templates (Meridian, Aurora, Obsidian, Monument, Bento, Chronicle) that all render the same content model. `Templates.dc.html` is an overview board showing all six side by side.

Target codebase: the `ceomaker` monorepo (Next.js app in `apps/web`, Zod schema in `packages/schema`, site renderers in `packages/templates`, Tailwind).

## About the design files
The files in this bundle are **design references built in HTML**. They show the intended look and behaviour; they are not production code to copy. Rebuild them in the existing codebase using its patterns: React server/client components, Tailwind, `@ceomaker/schema` types, and the `TemplateDefinition` registry.

The `.dc.html` files open directly in a browser. Keep `support.js` and `_ds/` next to them. Markup is inline-styled. `{{ }}` holes and `<sc-if>`/`<sc-for>` are template bindings; the logic lives in the `<script data-dc-script>` block at the bottom of each file. That block is the best source for data, copy and state.

The bottom-left **Screens** bar in `CEOMaker Start.dc.html` is a prototype-only navigator. Do not ship it.

## Fidelity
**High fidelity.** Colours, type, spacing, copy and interactions are final. Recreate them pixel-accurately with the codebase's tooling.

---

## Part A — Product app (`apps/web/src/app/(app)`)

### App design language (Industry system)
The app chrome uses the "Industry" wireframe language. Its tokens are in `_ds/industry-…/styles.css`; port them into `globals.css` as Tailwind theme variables.

- **Type:** headings use Barlow Condensed 600, UPPERCASE, line-height 1. Body uses Barlow 400, 17px/1.5. Load both via `next/font` in `apps/web/src/app/fonts.ts`.
- **Colour:**
  - `--color-bg` #f2f2f3
  - `--color-surface` #e9e9ea
  - `--color-text` #1d1f20
  - `--color-accent` #5980a6
  - `--color-divider` = #1d1f20 at 16%
  - Neutral ramp, 100→900: #f5f5f8 #e7e7ea #d4d4d7 #b7b7ba #98989b #7a7a7d #5d5d60 #424244 #2b2b2d
  - Accent ramp, 100→900: #eef6ff #d6ebff #b5d9fd #94bce3 #749dc4 #597ea3 #416180 #2c455d #1d2d3d
  - Use accent-700 (#416180) for small accent text. The base accent is only 3:1 against the ground.
- **Radius:** `--radius-md` 4px on chips and inputs. Cards, figures and buttons are square.
- **Shadows:**
  - sm: `0 1px 2px #2b2b2d24`
  - md: `0 3px 10px #2b2b2d29`
  - lg: `0 12px 32px #2b2b2d38`
- **Blueprint frame:** cards, preview frames, dialogs and the primary CTA card use a 1px `--color-divider` border with a small "+" registration mark at each corner. The markup is `.blueprint` + `<i class="corner tl|tr|bl|br">`. See `styles.css`. Build a `<Blueprint>` wrapper component for it.
- **Buttons:** `.btn-primary` is a solid accent fill, square, with the label flush-left and a trailing arrow icon. `.btn-secondary` is outlined. `.btn-ghost` is text only.
- **Kicker labels:** 13px, letter-spacing 0.1–0.12em, uppercase, accent-700.
- **Icons:** Lucide, stroke-width 1.5.
- **Page padding:** `clamp(20px,4vw,40px)`. Max width is 1200px (1320px for the builder).
- **Motion:** elements with `data-reveal` fade and rise on scroll. Hover lift is `translateY(-2/-3px)`, using `cubic-bezier(.2,.7,.2,1)` over 250–300ms. Respect `prefers-reduced-motion`.

### A1. Landing (`(app)/page.tsx`, replaces the current page)
Sections, top to bottom:

1. **Sticky header** (68px, bg at 88% with blur 10px, bottom divider).
   - Wordmark: "CEO" plus "Maker" in accent.
   - Links: How it works, Pricing, FAQ. Then Sign in (ghost) and Start free (primary).
2. **Hero** (radial accent-100 glow at the top). Centred content:
   - Social-proof pill: three overlapping initial avatars + "Private beta · for founders, executives and investors".
   - H1, `clamp(56px,8vw,104px)`, with words revealed one by one.
   - Intro paragraph, 20px.
   - An **inline first question card** (blueprint, max 820px):
     - Header row: "Step 1 of 5 · Let's start" and "About 2 minutes".
     - Title: "I am a…".
     - Role chips. Clicking one enters the flow with that role pre-selected.
     - Footer ticks: "Mostly taps, very little typing", "Free to preview", "No card until you publish".
3. **"Built for" marquee** of audiences (between dividers, edges masked).
4. **Problem section:** kicker "Before every meeting, they look you up", then an H2, then three numbered blueprint cards (`realities` array in the logic).
5. **How it works** (surface bg): three blueprint cards (01/02/03), each with a mini UI illustration (chips / drafting preview / live address with a "Live" tag). The copy matches the current `steps` array.
6. **Against the alternatives:** three comparison cards (`compare` array: name, time, cost, tick/cross rows).
7. **Testimonials:** three quote cards with initial avatars.
8. **Pricing:**
   - Monthly/Annual segmented control.
   - One blueprint card showing the price (72px heading), a note, the `included` ticks, and a "Start building" primary button.
9. **FAQ:** accordion with a +/− marker in accent.
10. **Closing band** (accent-900 field, bg-coloured text): "Be the first thing people find." plus the role chips again.
11. **Footer.**

The full copy is in the template and in the `realities`, `compare`, `quotes`, `plans`, `included` and `faq` arrays in the logic block.

### A2. Guided questions (new route, e.g. `/start`)
Layout is a two-column grid: questions on the left, a live preview on the right (surface bg). It stacks below about 1040px.

**Left column:**
- Top: wordmark and a "Save and exit" ghost button.
- Progress: "Step N of 5", the step name, and a 3px bar.
- The question area animates in on each step change (translateX 26px→0, 460ms).
- Step 1 **Role**: chips.
- Step 2 **Industry**: chips.
- Step 3 **Organisation stage**: chips.
- Step 4 **Goals**: multi-select chips with ✓.
- Step 5 **Voice and details**:
  - Voice cards (Measured / Warm / Bold), each with a sample line.
  - Full name and Organisation (optional) inputs.
  - Optional source chips (CV / LinkedIn / website).
- Footer: Back (secondary), Next (primary, min-width 220px, disabled until the step is answered), and Skip on optional steps.

**Right column:** the "Your site, taking shape" preview. It renders Meridian in **draft mode** (`draft`), scaled to fit, with **only what the person has chosen or typed**. Nothing is made up and no demo data is shown:
- Title line = the chosen role (except "Something else") + the typed organisation.
- Name and initials = the typed name.
- Contact form topics = the chosen goals (Speaking, Board and advisory, Investors, Press, Careers) + "Something else".
- Everything else (statement, About, contact line) is soft grey placeholder lines (text 9% into background). Fixed labels such as About, Contact and the form labels stay real.
- When a value first appears, it fades in (opacity, 8px rise, 3px blur → 0, 600ms).
- On the goals step, the preview glides down to the contact form (0.9s ease) so the topics are visible; on other steps it sits at the top.
- The address is a slug of the first name, or "yourname".
- States: board frames 1w (step 1, nothing yet), 1x (step 4), 1y (step 5).

**Chip states:**
- Default: divider border, bg `--color-bg`.
- Selected: accent border, accent-100 bg.
- Hover: accent border, lift 2px.

**Data:** the `ROLES`, `INDUSTRIES`, `STAGES`, `GOALS`, `VOICES` and `STEP_NAMES` constants.

### A3. Sign-in gate (update `sign-in` / `sign-up` + `auth-shell.tsx`)
A centred blueprint card, max 440px, on a radial accent-100 glow.
- Title and subtitle change depending on where the user came from ("save your answers" vs a plain sign in).
- Buttons: "Continue with Google" (secondary), an "or" divider, a work email field, and "Email me a sign-in link" (primary).
- Success state: an accent-100 box reading "Check your inbox".
- Footnote: "No password needed…".

The flow is passwordless: magic link or Google.

### A4. Builder: choose template
- Header: wordmark / `address.ceomaker.com` / a "Draft" tag / avatar.
- H1: "How should you be presented?"
- A grid of template cards, `auto-fill minmax(380px,1fr)`. Each card shows a live 0.3× preview of that template with **the user's content**, plus the name, description and a radio dot. Selected state: accent ring.
- Fixed bottom bar: "Selected: X" and a "Write my site" primary button.

### A5. Generating
Two columns.
- **Left:**
  - Kicker "{Template} template · {Voice} voice"
  - H1 "Writing your first draft"
  - Progress bar
  - Five checklist rows (`GEN`): pending circle → spinner → accent check that pops in (scale .3→1.12→1)
  - Note: "Usually under a minute…"
- **Right:** a blueprint browser frame. The real template is revealed top-down by a skeleton overlay, whose `top` animates with progress. A glowing 2px accent scan line sits on the edge. The step cadence is about 900ms each in the prototype; drive it from real generation events.

### A6. Editor (new route, e.g. `/dashboard/sites/[id]/edit`)
The layout is a full-height grid: 60px header, then a 360px sidebar and a canvas.

**Header:**
- Wordmark / address
- Status tag: Draft, Live, or Unpublished changes
- Save indicator: "Saving…" with a grey dot → "All changes saved" with an accent dot
- Dashboard (ghost) and Publish / Update site (primary)

**Sidebar tabs** (segmented control, 3 columns):
- **Content:**
  - Section list with a drag handle ⋮⋮, the label, and a show/hide toggle. Hidden sections drop to 45% opacity. Hero and Contact cannot be hidden.
  - The selected section's form sits below the list:
    - Hero:
      - Portrait drop zone with a dashed border that turns accent on drag-over. It accepts png/jpg/webp and has Upload/Replace/Remove.
      - Eyebrow and Headline fields.
      - An **AI rewrite box** (blueprint, accent-100) with options: Shorter / Bolder / More personal. While rewriting, the headline fades.
      - Introduction, Button label and Button link fields.
    - About: two paragraphs.
    - Impact: value + label rows. Hint: "Up to 8 numbers. Four reads best."
    - Experience, Selected work and Testimonials: list rows with "+ Add…".
    - Contact:
      - Invitation and Email fields.
      - Link rows (label, URL, and a validation message: "Add a URL" / "Opens in a new tab" / error).
      - Quick-add chips: LinkedIn, X, Company site, Book a call.
- **Brand:**
  - Six palette presets per template (`PALETTES`), each shown as a bg/ink/accent swatch strip with a check when selected.
  - Three custom colour rows (swatch picker + hex input).
  - A live **contrast readout**: ratio plus a message (≥7 "Excellent", ≥4.5 "Good…", otherwise "Too low…"). Its ring and background follow the result.
  - "Reset to {template} default".
- **Template:** a thumbnail list of all six templates, rendered with the user's content and each template's current theme.

**Canvas:** surface bg, 28px padding, and a blueprint browser frame holding the live template. The template is always laid out at 1280px wide and scaled to fit (`zoom = frameWidth / 1280`).

**Publish dialog** (blueprint, 540px, backdrop neutral-900 at 40% with blur 3px). Three stages:
1. **Plan:**
   - Address input with a `.ceomaker.com` suffix and an "✓ Available" check.
   - Monthly/Annual plan cards; Annual has a "2 months free" tag.
   - "Continue to checkout · {total}" primary button.
   - Footnote: "Secure checkout by Lemon Squeezy. VAT handled for you."
2. **Paying:** spinner, "Confirming payment" → "Publishing your site", and "Snapshotting your draft as version N."
3. **Done:**
   - A check circle whose stroke draws in.
   - "You're live", with a link to the address.
   - Buttons: Go to dashboard / Keep editing.
   - Later edits stay in draft until the user publishes again.

### A7. Dashboard (`(app)/dashboard/page.tsx`)
- Header: wordmark, email, avatar.
- Kicker "Welcome back, {first}", then H1 "Your site".
- **Site card** (blueprint, spans 2 columns):
  - 280px live preview.
  - Address and a pulsing status line: "{status} · {template} template".
  - Buttons: Edit site (secondary), View site (primary).
- **Side cards:**
  - Plan: "{plan} · {total}", the renewal line, and "Manage billing".
  - Custom domain: "Coming soon".
- **Published versions:** a `.table` with Version / Published / Template / action ("Current" tag or "Restore").

### A8. Site not live / paused (public `(sites)/s/[subdomain]` fallback)
A centred blueprint card, max 520px, with a kicker, title and body. There are two variants: not yet published, and paused.
- Button: "Create your own site".
- Footer: "Powered by CEOMaker".

The copy is in `statusPage` in the logic.

---

## Part B — Site templates (`packages/templates`)

### What changes in the codebase
1. **Schema:** extend `TEMPLATE_KEYS` in `packages/schema/src/templates.ts` to `["meridian","aurora","obsidian","monument","bento","chronicle"]`. Keep `executive` as an alias of `meridian`, and make `getTemplate()` fall back to it, so existing sites keep rendering.
2. **Registry:** add six `TemplateDefinition`s in `registry.ts`. Descriptions are in `Templates.dc.html`.
3. **Folder per template:** follow `src/executive/`, i.e. `src/<key>/index.tsx` plus `sections/*.tsx`. The shared helpers (`monogram.ts`, `links.ts`, `rich-text.tsx`) apply as they are.
4. **Fonts:** Inter, Manrope, Newsreader and Playfair Display are already in `FONT_VARIABLES`. Each template hard-codes its own pairing (below). It does not read `fontPair`.

### Section mapping (design → schema)
| Design section | Schema `type` | Design field | Schema field |
|---|---|---|---|
| Hero | `hero` | eyebrow, headline, subheadline, cta/ctaHref, photo | eyebrow, headline, subheadline, primaryCta, image |
| Impact | `achievements` | stats[{v,l}] | items[{value,label}] |
| About | `about` | aboutA + *aboutBold* + aboutB, aboutC | `body` rich text: paragraph 1 with one emphasis run, then paragraph 2 |
| Experience | `experience` | role, org, loc, dates, summary | role, organization, location, start/end, summary |
| Selected work | `portfolio` | kind, title, meta, year | title, description (+ **new** optional `kind`, `meta`, `year`) |
| Testimonials | `testimonials` | quote, author, role | same |
| Contact | `contact` | blurb, email, links | blurb, email, links |

**New fields the designs use.** Add them to `site.meta` or the hero, all optional:
- `location` (string)
- `company` (string)
- `availability` (e.g. "Open to board and advisory roles") and `availabilityShort`
- `affiliations` (string[], shown in the "Boards & affiliations" strip or marquee)
- `keywords` (string[], the Monument marquee)

Each template must render cleanly when these are missing.

**Derived values:**
- initials: from `monogram.ts`
- first/last name: split on the first space
- the testimonial pull-quote: the first testimonial, used by Obsidian and Bento
- the Chronicle drop cap: the first character of About
- the Chronicle timeline year: the first token of `start`

### Visibility and order
Honour `section.visible`. The designs show sections in this order: hero, [affiliations], impact, about, experience, work, testimonials, contact. Bento is the exception; it packs everything into one grid. The editor's section drag-reorder should write to the `sections` array order. Templates other than Bento render in array order.

### Theme mapping
The designs use three user colours per template: **bg, ink, accent**. Everything else is derived:
- muted = ink mixed 62% into bg
- line = ink at 15%
- soft = ink at 5%
- accent-soft = accent at 12%
- accent-deep = accent mixed 62% with black
- on-accent = `readableTextOn(accent)`
- surface = #ffffff on light grounds; on dark grounds, bg mixed 92% with white

Map these to the existing schema as `background`=bg, `foreground`=ink, `accent`=accent, `primary`=accent, and `muted`=the derived value. Extend `themeToStyle()` to emit `--site-line`, `--site-soft`, `--site-accent-soft`, `--site-accent-deep` and `--site-surface` using `color-mix()`. `radius` is fixed per template and not user-set.

**Default themes (bg / ink / accent):**
- Meridian: #f7f4ee / #1a1a1a / #8a6d3b
- Aurora: #fbfbfd / #0f1222 / #4f46e5
- Obsidian: #0b0b0c / #f2efe9 / #c9a86a
- Monument: #f2f2ee / #0a0a0a / #1f3bff
- Bento: #ececef / #111113 / #0e7a5f
- Chronicle: #f3efe6 / #22211d / #2f4a3a

The six presets per template are in the `PALETTES` constant in `CEOMaker Start.dc.html`. Validate any custom colours with the existing `themeSchema` contrast refinements.

### Per-template specs
Every template is designed at a 1280px viewport. Make each responsive: collapse grids to one column below about 768px, and scale display type with `clamp()`. Exact values for every element are inline in `PortfolioTemplate.dc.html`; each template is in its own `<!-- N · NAME -->` block.

**T1 Meridian, v2 — editorial, neutral.** For CEOs and chairs. Built in `Meridian.dc.html`; every frame is in `Meridian Board.dc.html` (ids 1a–1z).
- Fonts: Newsreader (name, statement, lede, list titles, figures, quotes) and Inter (labels, body, meta, form). No other families.
- **Signature: the seal.** A 300px (phone 148px) ring: two accent hairlines, the name and location set around the ring in Inter caps (SVG `textPath`, `textLength` = circumference, repeated to fill), initials in Newsreader italic in the centre on the accent tint. A photo fills the inner circle; without one the initials stay and nothing else moves. Initials: first letter of first and last word (Unicode-aware); for CJK names, the first character. Entrance: fade + ring rotates -40°→0 over 1.8s; on hover the ring turns slowly (48s/turn). Off under reduced motion.
- **Name is the H1**, sized to its longest word: `size = clamp(min, availableWidth / (longestWord × 0.52em), max)`, max 132 desktop / 60 phone, min 56 / 30. Uppercase counts 1.25, CJK 1.9. Hyphenated words can break after the hyphen. Header name truncates with an ellipsis; the H1 never does.
- Hero: kicker = title (eyebrow) · location, caps, accent text. Then name, statement (headline), optional intro, one button (label = CTA or the fixed label "Contact", links to #contact). Desktop grid `1fr 300px`; phone stacks with the seal first.
- Sections: 1px hairline on top, label column 200px (150 under 960px, stacked on phone), content right. Order: hero, affiliations, about, impact, experience, selected work, in their words, contact. Middle sections follow the `order` array via CSS `order`. Empty sections don't render and their nav links disappear.
- Count rules: Impact columns = n (≤4), 3 (5–6), 4 (7–8); phone 2. One figure is set at 96px with the label beside it. Quotes: first is the lead (38px italic, 30 if over 200 chars); the rest go in up to 3 columns under a hairline. Experience and work are rows, so 1–8 all work. Missing summary/meta/year lines are skipped.
- Long text: about lede drops 32→26px over 320 chars; contact line 52→40px over 90 chars.
- **Contact + form.** Invitation (blurb) as a Newsreader line, then email and links on the left, form on the right (phone: form first, full-bleed panel). If there's no blurb, the email becomes the headline line. Form fields: optional topic chips (from `form.topics`, seeded from the onboarding goals + "Something else"), Your name, Email, Organisation (optional), Message, hidden honeypot `website`, Send message. Fields are 52px tall at 16px text (prevents iOS zoom). Validation on submit: "Add your name.", "Add your email so {first} can reply." / "Check the email address.", "Add a short message." Errors get an accent border + inset and a "!" message. States: sending (spinner, fields at 60%), sent ("Message sent", "Thanks, {sender}. {first} will reply to {email}.", "Send another message"). `form.enabled === false` removes it; email and links take the width. The editor's Contact panel has an On/Off control for it.
- **Phone is a first view**, not a squeeze: 22px margins, 60px sticky header with a 44px Contact button, full-width primary buttons, 48px link rows.
- **Empty fields:** see the "When a field is empty" table on board frame 1z.

**Colour (Meridian).** Users set three colours; everything else is derived. In CSS these are `color-mix(in srgb, …)` of the three vars; the percentages are computed so contrast holds whatever the user picks:
- Secondary text = text mixed into background, starting at 72% and raised in 2% steps until it reaches 4.5:1.
- Accent text = accent, or accent mixed toward text until it reaches 4.5:1.
- Field border = text from 40% upwards until it reaches 3:1.
- On accent = background or text, whichever contrasts more with the accent.
- Hairline = text 14%. Wash = text 4%. Accent tint = accent 8%. Focus ring = accent 24% transparent. Placeholder line = text 9% (questions preview only).
- Presets (bg / text / accent): Navy #fbfbfa / #16181b / #1f3a5f (default); Bottle green #fbfbfa / #161917 / #1e4a3a; Oxblood #fbfaf8 / #1b1717 / #6d2433; Graphite #ffffff / #111111 / #3b4048; Ivory #f7f4ee / #1a1a1a / #7a5f2e; Night #111316 / #ecebe6 / #a9bfdc.
- Errors use the accent with an icon and message, not a fourth colour.

**T2 Aurora — soft gradient.** For founders and tech leaders.
- Font: Manrope throughout.
- Max width 1120px.
- Three blurred radial accent blobs float behind the hero (`pt-float`, 14–20s alternate).
- Header: a centred frosted pill nav with a black "Get in touch" pill.
- Hero is centred:
  - Availability pill with a pinging green dot.
  - H1: 76px, weight 800, -0.045em.
  - Pill buttons.
  - A floating profile card: avatar, name, "role · company", "Based in {location}".
- Affiliations: a masked horizontal marquee (40s loop).
- Stats: 4 cards with 28px radius. Card 1 is an indigo→violet gradient with white text.
- About and Experience use a 4fr/8fr grid with pill labels. The About emphasis is gradient text.
- Experience: 24px-radius cards with a hover shadow.
- Work: 4 cards with pastel gradient tops.
- Testimonials: 2 cards.
- Contact: a 36px-radius gradient banner with a white email pill.

**T3 Obsidian — dark luxe.** For investors.
- Fonts: Playfair Display for headings, Inter for body.
- Header:
  - A 42px accent-bordered monogram square.
  - The name spaced .28em.
  - An outlined "Private enquiries" pill.
- Hero: 6fr/5fr.
  - Portrait: 4:5 in an offset 22px accent hairline frame, with italic initials at 18% opacity.
  - Champagne CTA pill.
- Stats: in the accent colour.
- Affiliations: centred italics.
- About: centred.
- "The record": a 3-column row grid.
- Work: 2×2 surface cards whose border turns accent on hover.
- Testimonial: a single centred pull-quote, 42px italic, with a 96px accent open-quote.
- Contact: centred, with a pill email.

**T4 Monument — bold type.** For operators.
- Font: Inter at weights 700–900.
- Full-bleed with 40px padding.
- Header: a 3-column row under an ink rule (name / availability dot / nav).
- Hero:
  - First and last name at 236px, weight 900, -0.075em, line-height .8, uppercase.
  - A 300×190 accent portrait block sits inline after the last name.
  - Below: a 4fr/8fr grid with "(Role)" and a 52px H1.
  - A square accent CTA with the label flush-left and → on the right.
- A full-width accent marquee of keywords at 64px, separated by ✦.
- Sections are labelled "(01) Impact" etc. under ink rules.
  - Stats: 84px in accent.
  - Experience rows: hover soft bg.
  - Work rows: title at 40px; hover turns it accent.
  - Contact: the email at 108px in accent with a 6px underline.

**T5 Bento — card grid.** Scannable.
- Font: Manrope.
- The whole page is one 4-column grid: `grid-auto-rows minmax(150px,auto)`, gap 16px, card radius 28px.
- Cell order:
  1. Portrait card (spans 2 rows, deep accent gradient, name and role at the bottom)
  2. Hero card (spans 2×2)
  3. "Open to" card with a pinging dot
  4. "Based in" card (accent-soft)
  5. 4 stat cards
  6. About (span 2)
  7. Pull-quote (span 2, ink bg, green quote mark)
  8. Experience list (span 3, with org monogram tiles)
  9. "Elsewhere" links card
  10. 4 work cards
  11. Contact banner (span 4)
- Hover: `translateY(-3px)` plus a soft shadow.

**T6 Chronicle — warm long-form.** For advisors and writers.
- Fonts: Newsreader for the body at 19px; Inter for labels.
- Content width 720–880px, centred.
- Hero:
  - A 128px round portrait with an 8px bg ring and a hairline outer ring.
  - The eyebrow.
  - H1: 74px.
  - An italic 23px intro.
  - An underlined accent text link.
- A 56px accent rule acts as the divider.
- About: 24px with a 92px accent drop cap.
- Stats: centred.
- "The record": a timeline. The start year sits right-aligned at 40px in accent, with a hairline to its right, followed by the role.
- Work: a list of kind / title / year.
- Testimonials: centred italic quotes at 32px.
- Contact ends with a signature "— {First}" in italics at 40px.

### Shared behaviour
- Every link in the Contact section uses `target="_blank" rel="noopener me"`. The email uses `mailto:`.
- When there is no photo, show a gradient plus initials. When there is one, it covers the portrait box.
- Footer: "© {publishedAt year} {name}" and the location.
- Keep the existing skip-link, the `<nav aria-label="Sections">` and the `publishedAt`-driven year from `ExecutiveTemplate`.
- Animations in the templates (`pt-marquee`, `pt-float`, `pt-ping`) must be disabled under `prefers-reduced-motion`.

---

## State management (app)
- **Answers:** `{ role, industry, stage, goals[], voice, name, org, sources[], email }`. Persist the draft before sign-in (localStorage), then save to the site record after auth.
- **Site draft:** `{ template, themes: {[templateKey]: {bg,ink,accent}}, content, hidden sections / order }`.
  - Switching template keeps the content.
  - Each template remembers its own colour overrides.
  - Autosave on change, with "Saving…" shown for about 900ms.
- **Publish:** plan (monthly/annual) → checkout (Lemon Squeezy) → a version snapshot with an incrementing number. The status becomes Live; later edits mark it "Unpublished changes".
- **Generation:** stream progress for the five `GEN` steps. The preview reveal follows progress.
- **Previews:** always render the real template component at 1280px and scale it with CSS `zoom` or `transform: scale()` from a `ResizeObserver` on the frame.

## Files in this bundle
- `CEOMaker Start.dc.html`: all app screens (use the Screens bar to jump between them)
- `PortfolioTemplate.dc.html`: the six site templates plus their content and theme logic
- `Meridian.dc.html`: the Meridian v2 template, including the contact form and draft mode. `PortfolioTemplate` delegates to it for `meridian`
- `Meridian Board.dc.html`: every Meridian frame: starter/full at 1280 and 390, no photo, Night, form states, long text, 1/3/8 items, questions preview and the system sheet
- `image-slot.js`: drop-a-photo helper used by the board only
- `Templates.dc.html`: overview board of all six templates (append `?only=aurora` etc. to show one)
- `support.js`: the runtime that makes the `.dc.html` files open in a browser
- `_ds/industry-…/styles.css` and `_ds_bundle.js`: app tokens and component classes (`.btn`, `.tag`, `.field`, `.input`, `.seg`, `.table`, `.dialog`, `.blueprint`)

## Assets
No bitmap assets. Portraits are user uploads with a gradient-and-initials fallback. Icons are Lucide (stroke 1.5) in the app; the templates use typographic glyphs (↗ → ✦ “). Fonts are Google Fonts: Barlow, Barlow Condensed, Inter, Manrope, Newsreader and Playfair Display.
