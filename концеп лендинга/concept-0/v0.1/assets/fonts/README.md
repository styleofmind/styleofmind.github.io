# Local web fonts


Font faces use `font-display: optional` and preload the main Cyrillic subsets to avoid late font swaps and layout jumps; Latin subsets load on demand.
This landing page serves its fonts from this directory instead of requesting Google Fonts at runtime. The Cyrillic subsets are preloaded in `index.html`; Latin subsets load on demand.

- `cormorant-garamond-*.woff2`: Cormorant Garamond, variable weights 400?600.
- `manrope-*.woff2`: Manrope, variable weights 400?700.
- `OFL-Cormorant-Garamond.txt` and `OFL-Manrope.txt`: license texts from the official Google Fonts repository.

Sources: [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) and [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope). Both are distributed under the SIL Open Font License; the corresponding license files are retained beside the font assets.
