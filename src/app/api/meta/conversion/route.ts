import { NextRequest, NextResponse } from "next/server";

type PixelConfig = {
  id: string;
  testCode?: string;
};

const PIXELS: PixelConfig[] = [
  {
    id: "820661157705137",
    testCode: process.env.META_CAPI_TEST_CODE_PIXEL_820661157705137,
  },
  {
    id: "1548666406233185",
    testCode: process.env.META_CAPI_TEST_CODE_PIXEL_1548666406233185,
  },
];

const META_GRAPH_VERSION = "v19.0";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim();
  }
  return request.headers.get("x-real-ip") ?? undefined;
}

export async function POST(request: NextRequest) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing META_CAPI_ACCESS_TOKEN" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const eventName = body?.eventName ?? "PageView";
  const eventSourceUrl =
    body?.eventSourceUrl ?? request.headers.get("referer") ?? undefined;
  const eventId = body?.eventId ?? undefined;

  const userAgent = request.headers.get("user-agent") ?? undefined;
  const clientIp = getClientIp(request);
  const fbp = request.cookies.get("_fbp")?.value;
  const fbc = request.cookies.get("_fbc")?.value;

  const userData: Record<string, string> = {};
  if (userAgent) userData.client_user_agent = userAgent;
  if (clientIp) userData.client_ip_address = clientIp;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: eventSourceUrl,
    event_id: eventId,
    user_data: userData,
  };

  const shouldSendTestCode = process.env.META_CAPI_TEST_MODE === "true";

  const results = await Promise.all(
    PIXELS.map(async (pixel) => {
      const endpoint = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixel.id}/events`;
      const payload: Record<string, unknown> = {
        data: [event],
        access_token: accessToken,
      };

      if (shouldSendTestCode && pixel.testCode) {
        payload.test_event_code = pixel.testCode;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const json = await response.json().catch(() => ({}));
      return {
        pixelId: pixel.id,
        ok: response.ok,
        status: response.status,
        body: json,
      };
    })
  );

  return NextResponse.json({ ok: true, results });
}
