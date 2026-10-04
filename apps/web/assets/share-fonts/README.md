# Share card fonts

Static TrueType instances from Google Fonts, used only on the server to draw the share image
(`src/lib/share-card.tsx`): Newsreader, Inter, Public Sans, Big Shoulders Display, Italiana and Hanken Grotesk, plus Barlow and Barlow Condensed for the product's own share image (`src/app/(app)/opengraph-image.tsx`). All are
under the SIL Open Font License 1.1. The image renderer can't read variable fonts or WOFF2, so
these are separate from the fonts the pages load with next/font.
