# Wix Velo integration

The public Wix page should use the `apocalypse-clock` Custom Element instead of an HTML Component (`HtmlComponent`) or website iframe.

## Architecture

- `apocalypse-clock-element.js` is the generated, externally hosted Web Component used by Wix.
- The component renders the application in an open shadow root, so the dashboard CSS does not overwrite Wix page styles.
- The element contains no `iframe` and does not duplicate model calculations in Wix page code.
- `home-page-code.js` is the small Velo page-code bridge. It records the expected model and dataset identities on the selected Custom Element.
- The versioned model, dataset, tests and generator remain in this repository. Rebuild the Wix artifact with `npm run build:wix` after an accepted source change.

## Wix Editor settings

1. Enable Velo developer mode.
2. Add **Embed Code > Custom Element**.
3. Choose **Server URL** and use `https://jerseroman.github.io/apocalypse-clock/wix/apocalypse-clock-element.js`.
4. Set the tag name to `apocalypse-clock`.
5. Set the element ID to `apocalypseClock`.
6. Add the contents of `home-page-code.js` to the Home page code.
7. Preview and verify model 1.2.9, dataset 1.9.0, Dynamic Cascade P50/P90 2036/2042, domain functional P50 values 2045/2036/2040, and the responsive layout; then publish.

Wix's current documentation describes both Wix-hosted Velo files and HTTPS server URLs as supported Custom Element sources. The external URL is used here so the published artifact has a Git commit history and can be reproduced from the same source as the standalone dashboard.
