// Project Buddy as an installed app: the colours and icons a phone shows
// outside the site's pages. The manifest (src/app/manifest.ts) and the root
// layout's metadata read them.

// The parchment theme's backgrounds (src/themes/parchment.css), as rgb()
// because not every browser reads oklch() in a
// manifest or a theme-color meta tag. The light one is behind the splash
// screen and colours the browser's bar in light mode; the dark one colours
// it in dark mode. web-app.test.ts checks they match the theme.
const APP_COLORS = {
  lightBackground: "rgb(239, 208, 147)",
  darkBackground: "rgb(36, 27, 19)",
} as const;

// The icons in public/icons/: the header's gold compass on its ink brown,
// rendered from app-icon.svg there. Each
// keeps its picture inside the middle 80%, so the large one serves as a
// maskable icon too.
const APP_ICONS = {
  small: { src: "/icons/icon-192.png", size: 192 },
  large: { src: "/icons/icon-512.png", size: 512 },
  apple: { src: "/icons/apple-touch-icon.png", size: 180 },
} as const;

export { APP_COLORS, APP_ICONS };
