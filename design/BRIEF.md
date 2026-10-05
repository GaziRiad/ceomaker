# Claude Design brief

How we ask Claude Design for a template. The owner runs **one prompt per template, at max effort,
with no follow-up prompts**: usage is the constraint, so the prompt asks only for what the engineer
can't produce in code, and asks Claude Design to finish in one run without questions.

To write a prompt: paste the standing brief below as is, then add a short "This template" section
(reference, audience, what to see, presets, and any motion beyond CSS). Keep the standing brief in
step with the content model (`packages/schema`) whenever it grows.

## Standing brief

```
You are designing a website template for CEOMaker, a website builder for busy, non-technical executives (CEOs, founders, chairs, investors, senior leaders). An executive answers a few questions, AI drafts their personal site in their voice, they pick a template, edit every visible text in place, and publish to name.ceomaker.app or their own domain. A template is a design, not a site: every customer's content renders through it, and owners switch templates without losing anything. Existing templates: Meridian (quiet serif on light, free), Harbour (warm greeting, Figtree Light, a large arched portrait on soft white, rounded cards, free), Monument (bold condensed type on a full colour field, Pro), Salon (dark gallery, large serif, photo collage around the name, Pro), Folio (warm paper, large grotesk, a full-bleed carousel of projects, Pro) and Tempo (clean white, expanded grotesk at poster scale, the name parted around the portrait, scroll motion, Pro). New templates are Pro unless "This template" says otherwise: they must feel clearly premium and look unlike these six.

Your job: design ONE template at high fidelity as an HTML design file, ready for an engineer to rebuild in React. Finish everything in this one run. Don't stop to ask questions: make reasonable choices and list them in the handoff notes.

## 1. The content every template renders
A site is an ordered list of sections. Owners reorder, hide and edit them; optional fields are often empty.
- Name: its own field (up to 60 characters). Shown in the header and usually as the main title.
- Hero: eyebrow (optional, 80), headline (required, up to 120: a one-sentence positioning line, not the name), introduction (optional, 280), one button (optional: label and link), one image (optional, usually a portrait).
- Gallery: up to 12 extra photos, each with an optional caption (120). Most owners have none or a few.
- About: heading (optional, 80), body (rich text: paragraphs with bold, italic and links), one image (optional).
- Experience: heading, up to 20 items: role (100), organisation (100), location (optional), start and end (free text such as "2019" or "Present"), summary (optional, 500).
- Achievements: heading, up to 8 items: value (up to 20 chars, such as "$2.1B", "40+") and label (80).
- Focus (what the owner works on now): heading, up to 6 items: title (60) and description (optional, 200).
- Portfolio (ventures, projects, books, talks, board seats, press): heading, up to 12 items: title (120), kind (30), meta (120), year, description (300), link and image, all optional except the title.
- Testimonials: heading, up to 10 items: quote (500), author (80), role (100), photo (optional).
- Call to action: headline (120), body (optional, 280), button (optional).
- Contact: heading, blurb (280), email, up to 10 links (LinkedIn, X, GitHub, website, Instagram, YouTube, other), and a contact form the owner can switch off (name, email, organisation, topic from up to 8 owner-defined topics, message).
- Every image has an optional focal point set by the owner (used for cropping). Photo treatment is site-wide: Original (default, true colours), Tinted or Mono.
- Owners can rename section titles and the template's own wording ("Menu", "Send message").

## 2. Proposing new content
If the design needs something we don't have (a logo strip, press mentions, speaking topics), propose it as a NEW optional field or section with its limits: how many items, which fields, text lengths, image ratios. The template must look finished without it.

## 3. Hard rules
1. Design for real executives: one professional headshot, maybe a few event photos, often no project images. The page must look finished with no images at all.
2. Images are owner uploads of mixed quality and shape. Give each image slot an aspect ratio and crop. A missing image closes up the layout or becomes typographic: never an empty box on a live site.
3. Long content never breaks the layout: names like "Alexandra Montgomery-Fitzgerald", titles up to 120 characters. Words never break mid-word.
4. Colour: the owner picks three colours (background, text, accent). Derive everything else, and keep body text at 4.5:1 contrast or more (3:1 for large type and borders). Provide 5 named presets, at least one light and one dark.
5. Type: Google Fonts only, at most two families.
6. Lay out by container width, not viewport width (the editor shows the page in a frame).
7. Motion: CSS only unless the template section allows more; respects prefers-reduced-motion; nothing stays hidden if JavaScript doesn't run.
8. Everything visible is editable text or an image slot. No baked-in decorative text (fake years, "©", a city) unless it maps to a field.
9. Accessible: one h1, headings in order, visible focus states, 44 px tap targets on phones.
10. One page with anchor navigation, plus a phone menu.
11. Truthful: sample copy can be fictional, but the design must not depend on numbers, logos, quotes or clients an executive may not have.

## 4. Deliverables (only these)
1. The template itself as one HTML design file, at 1280 px and 390 px, with typical content: one portrait, 3 or 4 items per section.
2. One small states frame, only for the hero and this template's signature element: no images, one image, the maximum, and the longest name.
3. The 5 presets as small swatches or thumbnails.
4. A short handoff note: type scale, derived colour formulas, image ratios, motion durations and easing, any NEW content proposed, the choices you made, and a one-word name with a two-line picker description.

Don't produce: a content map, editing notes, minimal/typical/full boards for every section, every preset or photo treatment as full pages, or a separate 820 px page. Check your work once at the end, not after every frame.
```

## History

- Rounds 1 and 2 (Meridian, Monument) and Salon used a larger brief: every section in three states at three widths, a content map and editing notes. Salon's run used most of a usage window, so the deliverables were cut to the list above (October 2026). The engineer covers the rest in code: mapping to the content model, every state at 1280, 820 and 390, and the editor.
