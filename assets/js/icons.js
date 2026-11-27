// Line icons for the interface, geometric glyphs for levels and topics, and the logo.

const svg = (body, vb = 24, extra = '') =>
  `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

const UI = {
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
  code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.5h9.2L17.5 7"/>',
  edit: '<path d="M4.5 19.5h4l10-10-4-4-10 10v4z"/><path d="M13 7l4 4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z"/>',
  enter: '<path d="M19 5v6.5a3 3 0 0 1-3 3H5.5M9.5 10.5l-4 4 4 4"/>',
  map: '<path d="M9 4.5L3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8 9 4.5zM9 4.5v12.7M15 6.8v12.7"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
};

const GITHUB = '<path fill="currentColor" stroke="none" d="M12 .8a11.2 11.2 0 0 0-3.5 21.8c.6.1.8-.2.8-.5v-2c-3.1.7-3.8-1.3-3.8-1.3-.5-1.3-1.2-1.7-1.2-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.7 2.6 1.2 3.3.9.1-.7.4-1.2.7-1.5-2.5-.3-5.1-1.2-5.1-5.5 0-1.2.4-2.2 1.2-3-.1-.3-.5-1.4.1-3 0 0 .9-.3 3.1 1.2a10.7 10.7 0 0 1 5.6 0c2.1-1.5 3.1-1.2 3.1-1.2.6 1.6.2 2.7.1 3 .7.8 1.2 1.8 1.2 3 0 4.3-2.6 5.2-5.1 5.5.4.4.8 1 .8 2.1v3.1c0 .3.2.7.8.5A11.2 11.2 0 0 0 12 .8z"/>';

export function icon(name, cls = '') {
  const body = name === 'github' ? GITHUB : UI[name];
  return `<span class="ic${cls ? ' ' + cls : ''}">${svg(body)}</span>`;
}

// 40×40 glyphs for the geometry levels.
const STAGE = {
  angles: '<path d="M7 31h27M7 31l21-19"/><path d="M17.5 31a10.5 10.5 0 0 0-2.7-7"/>',
  congruence: '<path d="M3.5 31l6-17 7 17z"/><path d="M22.5 31l6-17 7 17z"/><path d="M5.6 21.4l2.6 1M27.2 21.4l-2.6 1" stroke-width="1.6"/>',
  isosceles: '<path d="M8 33L20 7l12 26z"/><path d="M11.5 19.4l5 2.4M23.5 21.8l5-2.4" stroke-width="1.6"/>',
  parallel: '<path d="M4 13h32M4 27h32M11 36L22 4"/><path d="M27.5 10l3 3-3 3M27.5 24l3 3-3 3" stroke-width="1.6"/>',
  inequality: '<path d="M5 32l9-21 21 21z"/><path d="M5 32h30" stroke-width="3.2"/><path d="M11 18.5a7 7 0 0 0 6.6-1" />',
  quad: '<path d="M10 30l6-18h18l-6 18z"/>',
  midsegment: '<path d="M6 33L20 7l14 26z"/><path d="M13 20h14"/><circle cx="13" cy="20" r="1.6" fill="currentColor"/><circle cx="27" cy="20" r="1.6" fill="currentColor"/>',
  pythagoras: '<path d="M8 32V11l22 21z"/><path d="M8 27h5v5" stroke-width="1.6"/>',
  similarity: '<path d="M3.5 33l6-11 6 11z"/><path d="M17.5 33l9.5-23 10 23z"/>',
  circle: '<circle cx="20" cy="20" r="14"/><path d="M20 6L7.9 27h24.2z"/>',
  trigtri: '<path d="M5 32h29V11z"/><path d="M29 32v-5h5" stroke-width="1.6"/><path d="M14 32a9 9 0 0 0-1.6-5.2"/>',
};

// 48×48 glyphs for topics.
const TOPIC = {
  geometry: '<circle cx="31" cy="18" r="10.5"/><path d="M6 41l13-28 14 28z"/><circle cx="19" cy="13" r="1.8" fill="currentColor"/>',
  trig: '<path d="M4 24h40" opacity=".45"/><path d="M4 24c4.5-14 9.5-14 14 0s9.5 14 14 0 7-10.5 12-7"/>',
  analytic: '<path d="M9 41V6M5 37h38" opacity=".45"/><path d="M11 33L40 11"/><circle cx="25.5" cy="22" r="2" fill="currentColor"/>',
  algebra: '<path d="M24 41V6M6 34h36" opacity=".45"/><path d="M9 8c5 30 25 30 30 0"/>',
  sequences: '<circle cx="9" cy="36" r="2.2"/><circle cx="18" cy="32" r="3.4"/><circle cx="28.5" cy="26" r="4.6"/><circle cx="40" cy="18" r="6"/>',
  calculus: '<path d="M6 40h37M8 42V6" opacity=".45"/><path d="M8 34c8-1 12-21 20-22s10 10 14 12"/><path d="M20 40V22M26 40V14M32 40v-25" stroke-width="1.4" opacity=".6"/>',
  matrix: '<path d="M12 8H7v32h5M36 8h5v32h-5"/><circle cx="17" cy="16" r="1.8" fill="currentColor"/><circle cx="31" cy="16" r="1.8" fill="currentColor"/><circle cx="17" cy="32" r="1.8" fill="currentColor"/><circle cx="31" cy="32" r="1.8" fill="currentColor"/><circle cx="24" cy="24" r="1.8" fill="currentColor"/>',
  integral: '<path d="M30 7c-4-2-7 0-7.5 5L20 36c-.5 5-3.5 7-7.5 5"/><path d="M30 26h10" opacity=".55"/>',
  hexagon: '<path d="M24 5l16.5 9.5v19L24 43 7.5 33.5v-19z"/><path d="M24 5v38M7.5 14.5l33 19M40.5 14.5l-33 19" opacity=".4"/>',
  graph: '<circle cx="10" cy="12" r="3.5"/><circle cx="37" cy="10" r="3.5"/><circle cx="24" cy="26" r="3.5"/><circle cx="12" cy="38" r="3.5"/><circle cx="38" cy="37" r="3.5"/><path d="M13 14l8.5 9.5M34 12l-7.5 11.5M21.5 28.5L14 35.5M27 28.5l8 6.5M13.5 12l20-2"/>',
};

export function glyph(name, kind = 'stage') {
  const set = kind === 'topic' ? TOPIC : STAGE;
  return svg(set[name] || '', kind === 'topic' ? 48 : 40, ' class="glyph"');
}

// The mark: an "L" drawn as a right angle with its square marker.
export const LOGO = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <rect x="1" y="1" width="38" height="38" rx="11" fill="#2E5CC4"/>
  <path d="M13 9.5v19h17" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 22.6h5.9v5.9" stroke="#FFD84D" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
</svg>`;
