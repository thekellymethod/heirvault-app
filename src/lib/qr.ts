import { createHmac, randomBytes } from "node:crypto";

type TokenPayload = {
  registryId: string;
  purpose: "update";
  iat: number;
  exp: number;
  nonce: string;
};

function base64url(input: Buffer | string) {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function unbase64url(input: string) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  return Buffer.from(input, "base64");
}

function sign(data: string, secret: string) {
  return base64url(createHmac("sha256", secret).update(data).digest());
}

export function signToken(
  payload: Omit<TokenPayload, "iat" | "exp" | "nonce">,
  ttlSeconds: number
): string {
  const secret = process.env.HEIRVAULT_TOKEN_SECRET;
  if (!secret) throw new Error("Missing HEIRVAULT_TOKEN_SECRET");

  const now = Math.floor(Date.now() / 1000);
  const full: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    nonce: base64url(randomBytes(16)),
  };

  const header = { alg: "HS256", typ: "HV1" };
  const part1 = base64url(JSON.stringify(header));
  const part2 = base64url(JSON.stringify(full));
  const data = `${part1}.${part2}`;
  const sig = sign(data, secret);
  return `${data}.${sig}`;
}

export function verifyToken(token: string): { valid: boolean; payload?: TokenPayload; reason?: string } {
  try {
    const secret = process.env.HEIRVAULT_TOKEN_SECRET;
    if (!secret) return { valid: false, reason: "missing_secret" };

    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, reason: "bad_format" };

    const [p1, p2, sig] = parts;
    const data = `${p1}.${p2}`;
    const expected = sign(data, secret);
    if (expected !== sig) return { valid: false, reason: "bad_signature" };

    const payload = JSON.parse(unbase64url(p2).toString("utf8")) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || now > payload.exp) return { valid: false, reason: "expired" };
    if (payload.purpose !== "update") return { valid: false, reason: "wrong_purpose" };

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "verify_error" };
  }
}
