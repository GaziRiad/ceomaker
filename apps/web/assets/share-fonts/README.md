# Share card fonts

Static TrueType instances from Google Fonts, used only on the server to draw the share image
(`src/lib/share-card.tsx`): Newsreader, Inter, Public Sans, Big Shoulders Display, Italiana, Hanken Grotesk, Geist and Geist Mono, plus Barlow and Barlow Condensed for the product's own share image (`src/app/(app)/opengraph-image.tsx`). All are
under the SIL Open Font License 1.1. The image renderer can't read variable fonts or WOFF2, so
these are separate from the fonts the pages load with next/font.

Geist and Geist Mono ship only as variable fonts, so their static weights were cut from Google
Fonts' files with fontTools (`fonttools varLib.instancer Geist[wght].ttf wght=600 --static`).
