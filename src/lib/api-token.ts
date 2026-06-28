import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function unauthorized(message: string, status: 401 | 403 | 503) {
  return NextResponse.json({ error: message }, { status });
}

function safeTokenEqual(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifyApiToken(request: NextRequest) {
  const expectedToken = process.env.CAMP_API_TOKEN;
  if (!expectedToken) return unauthorized("CAMP_API_TOKEN is not configured.", 503);

  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return unauthorized("Missing bearer token.", 401);

  return safeTokenEqual(match[1].trim(), expectedToken)
    ? undefined
    : unauthorized("Invalid bearer token.", 403);
}
