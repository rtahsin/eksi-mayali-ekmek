import { type NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/security/apiAuth";
import { SITE_URL } from "@/lib/site";

/**
 * A5 Kese Kâğıdı Gazetesi için 300 DPI vektörel SVG QR üretici.
 * Yalnızca `SITE_URL` altındaki güvenli iç rotalara işaret eder.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const rawPath = request.nextUrl.searchParams.get("path") || "/bilim";
  const safePath =
    rawPath.startsWith("/") && !rawPath.startsWith("//") && rawPath.length <= 180
      ? rawPath
      : "/bilim";

  const targetUrl = `${SITE_URL}${safePath}`;
  const svg = await QRCode.toString(targetUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: {
      dark: "#3B1E1A",
      light: "#FBF6EC",
    },
  });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
