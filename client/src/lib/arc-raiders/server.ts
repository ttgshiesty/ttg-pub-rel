// Server-only exports
// WARNING: Only import this file in server-side code (Node scripts, API routes, etc.)
// NEVER import this file in browser/client code - it requires Playwright (Node-only)

export { BrowserArcRaidersClient, createBrowserClient } from './browser-client';
export type { BrowserClientConfig } from './browser-client';
