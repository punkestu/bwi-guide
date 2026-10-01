import React from 'react';

/**
 * Universal SVG placeholder for failed or missing thumbnails in BWI-Guide / SoreAja.
 * Uses a clean vector illustration with brand colors and zero external network dependencies.
 */
export const DEFAULT_PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
  <defs>
    <linearGradient id="bwi-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#82181a" />
      <stop offset="100%" stop-color="#490b0c" />
    </linearGradient>
    <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.5" fill="rgba(255,255,255,0.08)" />
    </pattern>
  </defs>
  <rect width="400" height="300" fill="url(#bwi-bg)" />
  <rect width="400" height="300" fill="url(#dot-pattern)" />
  <g fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5">
    <circle cx="200" cy="120" r="54" />
    <circle cx="200" cy="120" r="68" stroke-dasharray="4 4" />
  </g>
  <g>
    <!-- Stylized camera / landscape icon -->
    <path d="M166 104h68l7 10h18a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H141a8 8 0 0 1-8-8v-40a8 8 0 0 1 8-8h18l7-10z" 
          fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.9)" stroke-width="3" stroke-linejoin="round" />
    <circle cx="200" cy="136" r="16" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.9)" stroke-width="3" />
    <circle cx="226" cy="120" r="3" fill="rgba(255,255,255,0.9)" />
  </g>
  <text x="200" y="198" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="13" fill="#ffffff" text-anchor="middle" letter-spacing="3">
    BANYUWANGI
  </text>
  <text x="200" y="218" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="10" fill="rgba(255,255,255,0.65)" text-anchor="middle" letter-spacing="1.5">
    DESTINATION PHOTO
  </text>
</svg>
`.trim())}`;

/**
 * Handle image error by preventing infinite loops and falling back to DEFAULT_PLACEHOLDER_IMAGE.
 */
export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackSrc: string = DEFAULT_PLACEHOLDER_IMAGE
) => {
  const target = e.currentTarget;
  if (target.dataset.fallbackApplied === 'true') {
    return;
  }
  target.dataset.fallbackApplied = 'true';
  target.onerror = null;
  target.src = fallbackSrc;
};

/**
 * Safely resolve an image source, returning fallback if null/empty.
 */
export const getSafeImageSrc = (
  src?: string | null,
  fallbackSrc: string = DEFAULT_PLACEHOLDER_IMAGE
): string => {
  if (!src || typeof src !== 'string' || !src.trim()) {
    return fallbackSrc;
  }
  return src.trim();
};
