import { describe, it, expect } from "vitest";
import { poolConfig, cleanSrc } from "./db-config";

describe("poolConfig", () => {
  it("local database: no TLS, sslmode stripped", () => {
    const c = poolConfig("postgresql://u:p@localhost:5432/db");
    expect(c.ssl).toBeUndefined();
  });
  it("supabase pooler without CA: encrypted, not verified, and URL sslmode cannot override", () => {
    const c = poolConfig("postgresql://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require");
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
    expect(c.connectionString).not.toMatch(/sslmode/);
  });
  it("CA supplied: full verification on any host", () => {
    const c = poolConfig("postgresql://u:p@db.example.supabase.co:5432/postgres", "PEM");
    expect(c.ssl).toEqual({ ca: "PEM", rejectUnauthorized: true });
  });
  it("other remote hosts verify TLS", () => {
    expect(poolConfig("postgresql://u:p@ep-x.neon.tech/db").ssl).toEqual({ rejectUnauthorized: true });
  });
  it("missing url is harmless", () => expect(poolConfig(undefined)).toEqual({}));
  it("password with special characters survives", () => {
    const c = poolConfig("postgresql://postgres.abc:p%40ss%2Fw@aws-0-us-east-1.pooler.supabase.com:6543/postgres");
    expect(c.connectionString).toContain("p%40ss%2Fw");
  });
});

describe("cleanSrc", () => {
  it("accepts simple tags, lowercases", () => expect(cleanSrc("IG-Ad")).toBe("ig-ad"));
  it("rejects junk / injection / too long / empty", () => {
    for (const bad of ["a b", "x'; drop table", "<script>", "a".repeat(25), "", null, undefined]) expect(cleanSrc(bad as string)).toBeNull();
  });
});
