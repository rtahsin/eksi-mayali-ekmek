export type InAppBrowserApp = "Instagram" | "TikTok" | "Facebook" | "LinkedIn";

export interface InAppBrowserInfo {
  isInApp: boolean;
  appName: InAppBrowserApp | null;
  isIOS: boolean;
}

const INSTAGRAM_RE = /Instagram/i;
const TIKTOK_RE = /TikTok|BytedanceWebview|musical_ly/i;
const FACEBOOK_RE = /\b(?:FBAN|FBAV)\b|FBAN\/|FBAV\//i;
const LINKEDIN_RE = /LinkedInApp/i;
const IOS_RE = /\b(?:iPhone|iPad|iPod)\b/i;
const IPADOS_DESKTOP_RE = /Macintosh/i;
const MOBILE_TOKEN_RE = /Mobile\//i;

/**
 * Uygulama içi gömülü tarayıcıları (WKWebView / Android WebView) tespit eder.
 * Google OAuth `403 disallowed_useragent` engeline takılan sosyal medya içi
 * tarayıcılarda kullanıcıya Safari / Chrome yönlendirmesi göstermek için kullanılır.
 */
export function detectInAppBrowser(userAgent: string): InAppBrowserInfo {
  const ua = typeof userAgent === "string" ? userAgent.trim() : "";
  if (!ua) {
    return { isInApp: false, appName: null, isIOS: false };
  }

  const isIOS = IOS_RE.test(ua) || (IPADOS_DESKTOP_RE.test(ua) && MOBILE_TOKEN_RE.test(ua));

  let appName: InAppBrowserApp | null = null;
  if (INSTAGRAM_RE.test(ua)) {
    appName = "Instagram";
  } else if (TIKTOK_RE.test(ua)) {
    appName = "TikTok";
  } else if (FACEBOOK_RE.test(ua)) {
    appName = "Facebook";
  } else if (LINKEDIN_RE.test(ua)) {
    appName = "LinkedIn";
  }

  return {
    isInApp: appName !== null,
    appName,
    isIOS,
  };
}
