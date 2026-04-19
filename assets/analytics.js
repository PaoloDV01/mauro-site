/**
 * analytics.js — Vercel Web Analytics Initialization
 *
 * Initializes Vercel Web Analytics for the site using the @vercel/analytics package.
 * This script is loaded as a module in all HTML pages to track page views and engagement.
 */

import { inject } from '../node_modules/@vercel/analytics/dist/index.mjs';

// Initialize Vercel Web Analytics
inject({
  mode: 'production',
  debug: false
});
