# Share card fonts

Static TrueType instances from Google Fonts, used only on the server to draw the share image
(`src/lib/share-card.tsx`): Newsreader, Inter, Public Sans, Big Shoulders Display, Italiana, Hanken Grotesk, Geist, Geist Mono, Archivo, Martian Mono and Figtree, plus Barlow and Barlow Condensed for the product's own share image (`src/app/(app)/opengraph-image.tsx`). All are
under the SIL Open Font License 1.1. The image renderer can't read variable fonts or WOFF2, so
these are separate from the fonts the pages load with next/font.

Geist and Geist Mono ship only as variable fonts, so their static weights were cut from Google
Fonts' files with fontTools (`fonttools varLib.instancer Geist[wght].ttf wght=600 --static`).

Archivo is cut at weight 440 and width 125 (`ArchivoExpanded-440.ttf`, registered as "Archivo
Expanded"), how Tempo sets its display type, since the image renderer can't stretch a font.
Martian Mono is its default instance at weight 400, as Google Fonts serves it to the pages.
Figtree is its static Light (300) and Medium (500) instances, as Google Fonts serves them as TrueType.
