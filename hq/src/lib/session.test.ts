import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";
import { base32Decode, base32Encode, hashPassword, totp, verifyPassword, verifyTotp } from "./password";

const S = "a-long-enough-test-secret-value";
describe("session token", () => {
  it("round-trips and rejects tampering, wrong secret, expiry, junk", async () => {
    const t = await signSession(S, "me@x.com", 1_000);
    expect(await verifySession(S, t, 2_000)).toBe("me@x.com");
    expect(await verifySession(S, t.slice(0, -2) + "xx", 2_000)).toBeNull();
    expect(await verifySession("another-long-enough-secret!!", t, 2_000)).toBeNull();
    expect(await verifySession(S, t, 1_000 + 13 * 3600_000)).toBeNull();
    const [b, s] = t.split("."); expect(await verifySession(S, `${b}x.${s}`, 2_000)).toBeNull();
    expect(await verifySession(S, "garbage", 2_000)).toBeNull();
    expect(await verifySession(S, undefined, 2_000)).toBeNull();
    expect(await verifySession(undefined, t, 2_000)).toBeNull();
    expect(await verifySession("short", t, 2_000)).toBeNull();
  });
});
describe("password + totp", () => {
  it("scrypt verifies right password only", () => {
    const h = hashPassword("correct horse battery");
    expect(verifyPassword("correct horse battery", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(verifyPassword("x", undefined)).toBe(false);
    expect(verifyPassword("x", "not-a-hash")).toBe(false);
  });
  it("TOTP matches the RFC 6238 vector (ASCII secret 12345678901234567890, T=59 -> ...287082)", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
    expect(totp(secret, 59_000)).toBe("287082");
    expect(verifyTotp(secret, "287082", 59_000)).toBe(true);
    expect(verifyTotp(secret, "287082", 59_000 + 20_000)).toBe(true);
    expect(verifyTotp(secret, "287082", 59_000 + 120_000)).toBe(false);
    expect(verifyTotp(secret, "12345", 59_000)).toBe(false);
  });
});
