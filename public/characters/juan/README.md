# Juan character assets

This folder is the canonical source for Juan's high-detail guided-tour artwork.

## Required first asset

Upload the introduction pose exactly as:

`public/characters/juan/juan-phone.webp`

Recommended source artwork:
- transparent background
- portrait/vertical composition
- waist-up or upper-body framing
- Juan holding or looking at a smartphone
- at least 1200 px tall before export
- WebP preferred for production size and quality
- keep generous transparent breathing room around the head, shoulders, arms, and phone

The app already looks for this file. Until it exists, `JuanCharacter` automatically falls back to the existing vector so production remains safe.

## Future canonical poses

Add new poses here and register them in `src/pages/onboarding/JuanCharacter.jsx`, for example:

- `juan-neutral.webp`
- `juan-thinking.webp`
- `juan-pointing.webp`

Every pose must preserve the same Juan identity: same face, hairstyle, skin tone, clothing identity, proportions, age range, and visual treatment.
