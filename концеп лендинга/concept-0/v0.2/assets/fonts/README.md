# Local web fonts ? concept 0.2

This version serves font files locally instead of requesting Google Fonts CSS at runtime. The Cyrillic Cormorant Garamond and Manrope subsets are preloaded in `index.html`. All faces use `font-display: optional` to avoid late font swaps and layout jumps; Latin subsets load when needed.

- `cormorant-garamond-*.woff2`: Cormorant Garamond, variable weights 400?600.
- `manrope-*.woff2`: Manrope, variable weights 400?700.
- `OFL-Cormorant-Garamond.txt` and `OFL-Manrope.txt`: official SIL Open Font License texts.

Sources: [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) and [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope).
