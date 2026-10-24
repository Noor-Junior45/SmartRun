/**
 * Build & Version Metadata for Giriraj Power
 * Injected at compile time via Vite config & synchronized with Server /api/version
 */

export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined'
    ? __APP_VERSION__
    : '1.1.3';

export const APP_VERSION_CODE = 14;

export const CLIENT_BUILD_ID =
  typeof __APP_BUILD_ID__ !== 'undefined' && __APP_BUILD_ID__
    ? __APP_BUILD_ID__
    : `build_${APP_VERSION}_14`;

export const BUILD_TIMESTAMP =
  typeof __BUILD_TIMESTAMP__ !== 'undefined'
    ? __BUILD_TIMESTAMP__
    : new Date().toISOString();

export interface ServerVersionInfo {
  success: boolean;
  version: string;
  versionCode?: number;
  buildId: string;
  serverStartedAt?: string;
  builtAt?: string;
  environment?: string;
  timestamp?: number;
}
