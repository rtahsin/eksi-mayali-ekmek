import { describe, it, expect } from "vitest";
import { detectInAppBrowser } from "./inAppBrowser";

describe("detectInAppBrowser", () => {
  it("iPhone Instagram uygulama içi tarayıcısını (WKWebView) tespit eder", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21G93 Instagram 348.0.0.29.93 (iPhone15,3; iOS 17_6_1; tr_TR; tr; scale=3.00; 1290x2796; 641289451)";
    expect(detectInAppBrowser(ua)).toEqual({
      isInApp: true,
      appName: "Instagram",
      isIOS: true,
    });
  });

  it("Android Instagram uygulama içi tarayıcısını tespit eder", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 Instagram 349.1.0.41.103 Android (34/14; 450dpi; 1080x2340; samsung; SM-S928B; e3q; s5e9945; tr_TR; 643812390)";
    expect(detectInAppBrowser(ua)).toEqual({
      isInApp: true,
      appName: "Instagram",
      isIOS: false,
    });
  });

  it("iPhone TikTok (BytedanceWebview / musical_ly) uygulama içi tarayıcısını tespit eder", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_36.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/tr Region/TR BytedanceWebview/d8a21c6";
    expect(detectInAppBrowser(ua)).toEqual({
      isInApp: true,
      appName: "TikTok",
      isIOS: true,
    });
  });

  it("Android TikTok UA dizgisini tespit eder", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 trill_360204 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/TikTok BytedanceWebview/d8a21c6";
    expect(detectInAppBrowser(ua)).toEqual({
      isInApp: true,
      appName: "TikTok",
      isIOS: false,
    });
  });

  it("Facebook (FBAN / FBAV) ve LinkedIn (LinkedInApp) gömülü tarayıcılarını tespit eder", () => {
    const fbUa =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21G80 [FBAN/FBIOS;FBAV/479.0.0.42.109;FBBV/638112233;FBDV/iPhone16,1;FBMD/iPhone;FBSN/iOS;FBSV/17.6;FBSS/3;FBID/phone;FBLC/tr_TR;FBOP/5]";
    expect(detectInAppBrowser(fbUa)).toEqual({
      isInApp: true,
      appName: "Facebook",
      isIOS: true,
    });

    const liUa =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29.8821";
    expect(detectInAppBrowser(liUa)).toEqual({
      isInApp: true,
      appName: "LinkedIn",
      isIOS: true,
    });
  });

  it("normal iOS Safari, iOS Chrome, Android Chrome ve Firefox tarayıcılarında isInApp: false döner", () => {
    const iosSafari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";
    expect(detectInAppBrowser(iosSafari)).toEqual({
      isInApp: false,
      appName: null,
      isIOS: true,
    });

    const iosChrome =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1";
    expect(detectInAppBrowser(iosChrome)).toEqual({
      isInApp: false,
      appName: null,
      isIOS: true,
    });

    const androidChrome =
      "Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36";
    expect(detectInAppBrowser(androidChrome)).toEqual({
      isInApp: false,
      appName: null,
      isIOS: false,
    });

    const desktopFirefox =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
    expect(detectInAppBrowser(desktopFirefox)).toEqual({
      isInApp: false,
      appName: null,
      isIOS: false,
    });
  });

  it("boş metin geldiğinde güvenli varsayılan döner", () => {
    expect(detectInAppBrowser("")).toEqual({
      isInApp: false,
      appName: null,
      isIOS: false,
    });
  });
});
