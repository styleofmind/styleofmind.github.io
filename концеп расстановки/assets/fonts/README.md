# Shared fonts for constellation concepts


Font faces use `font-display: optional` and preload the main Cyrillic subsets to avoid late font swaps and layout jumps; Latin subsets load on demand.
Served locally by the static site so first paint does not wait for Google Fonts CSS and remote font files. The cyrillic font subsets are preloaded by the pages that use them; latin subsets are loaded when needed.

- Lora (weights 400?700 variable), for concept 0 versions 0.1 and 0.2.
- Lato (static weights 400 and 700, Latin subset), for concept 0 versions 0.1 and 0.2. Lato's published CSS subset has no Cyrillic face, so Russian glyphs retain the existing system sans-serif fallback.
- Inter (weights 400?600 variable) and Playfair Display (weights 400?600 variable), for concept 2 version 2.2.
- `OFL-*.txt` files are the official SIL Open Font License texts for each family.

Sources: [Lora](https://github.com/google/fonts/tree/main/ofl/lora), [Lato](https://github.com/google/fonts/tree/main/ofl/lato), [Inter](https://github.com/google/fonts/tree/main/ofl/inter), [Playfair Display](https://github.com/google/fonts/tree/main/ofl/playfairdisplay).
