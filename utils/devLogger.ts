// Allow enabling debug logs at runtime in staging via NEXT_PUBLIC_ENABLE_DEBUG_LOGS
// This variable is respected even when NODE_ENV is 'production' because it's
// a NEXT_PUBLIC_ env var that Next.js inlines at build time.
const enableDebugEnv = String(process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS || '').toLowerCase() === 'true';
const isDev = process.env.NODE_ENV !== 'production' || enableDebugEnv;

export function debug(...args: any[]) {
  if (isDev) {
    if (console && console.debug) console.debug(...args);
    else console.log(...args);
  }
}

export function info(...args: any[]) {
  if (isDev) {
    if (console && console.info) console.info(...args);
    else console.log(...args);
  }
}

export function warn(...args: any[]) {
  if (isDev) {
    if (console && console.warn) console.warn(...args);
    else console.log(...args);
  }
}

// Always emit errors so runtime failures are visible in production too
export function error(...args: any[]) {
  if (console && console.error) console.error(...args);
  else console.log(...args);
}

export default { debug, info, warn, error };
