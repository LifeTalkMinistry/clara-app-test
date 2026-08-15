# CLARA Life Profile viewport isolation

The Life Profile is rendered through a React DOM portal directly under `document.body` even though its route is resolved by the authenticated app router.

This prevents generic `.theme-page-shell main ...` modal and responsive CSS from taking layout authority over the dedicated Life Profile screen.

The three-color CLARA brand rail is additionally locked to exactly 3px inside the isolated viewport so broad first-child/flex rules cannot expand it into the page body.

This is presentation-only. Life Profile storage, tier gates, compact Life Context generation, financial context, and Gemini call behavior remain unchanged.
