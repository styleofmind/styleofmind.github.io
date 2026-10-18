# Style of Mind — concept-v2.3

Snapshot date: 2026-10-08

This branch preserves the current reconstruction concept for the Style of Mind landing page based on the supplied 1024×1536 visual reference.

## Current state

Phase 1:
- The long reference is split into 12 visual sections.
- Key visual reference crops were prepared for the hero woman, hero background, landscapes, botanical decoration, lotus, mountains, FAQ illustration and star texture.

Phase 2:
- A semantic HTML/CSS/JS prototype has been prepared.
- Sections are represented as:
  01 Hero
  02 Benefits
  03 About
  04 Method
  05 Requests
  06 Formats
  07 Process
  08 Results
  09 Reviews
  10 FAQ
  11 CTA
  12 Footer
- Navigation anchors, CTA modal, FAQ accordion, focus states and responsive scaling are included.
- The current working package is the local Phase 2 artifact shared in the ChatGPT conversation.

## Recommended asset strategy

Use a hybrid composition:
- Raster/WebP/PNG for photographic or painterly backgrounds and hero/object artwork.
- Transparent PNG/WebP for foreground characters and luminous objects.
- SVG for botanical linework, simple icons and decorative geometry.
- CSS for borders, cards, buttons, spacing, gradients and layout.
- Real HTML text instead of baked-in text images.

## Next implementation step

Replace the Hero reference crop with independent layers:
background + woman/object + decorative light/lines + real HTML typography/navigation/CTA.

Then use the same layer-first approach for the remaining sections and perform visual comparison against the section reference crops.

The published concept is available at /concepts/concept-2/v2.3/.
