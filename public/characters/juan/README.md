# Juan character assets

This folder is the canonical source for Juan's high-detail guided-tour artwork.

## Current introduction asset

The production introduction pose is:

`public/characters/juan/juan-phone.png`

Recommended source artwork:
- portrait/vertical composition
- waist-up or upper-body framing
- Juan holding or looking at a smartphone
- at least 1200 px tall before export
- transparent background is preferred when available
- keep generous breathing room around the head, shoulders, arms, and phone

`JuanCharacter` loads this PNG directly and automatically falls back to the existing vector only if the uploaded artwork cannot be loaded.

## Future canonical poses

Add new poses here and register them in `src/pages/onboarding/JuanCharacter.jsx`, for example:

- `juan-neutral.png`
- `juan-thinking.png`
- `juan-pointing.png`

Every pose must preserve the same Juan identity: same face, hairstyle, skin tone, clothing identity, proportions, age range, and visual treatment.
