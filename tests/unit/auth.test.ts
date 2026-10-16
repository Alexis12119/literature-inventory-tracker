import { afterEach, describe, expect, it, vi } from "vitest";
import { registrationSchema } from "@/src/lib/validation/inventory";

// server-only throws outside React Server Components; stub it for unit tests.
vi.mock("server-only", () => ({}));

describe("registration validation", () => {
  it("accepts a complete servant registration", () => {
    expect(() =>
      registrationSchema.parse({
        firstName: "Juan",
        middleName: "Santos",
        lastName: "Dela Cruz",
        email: "juan@example.com",
        password: "password123",
        confirmPassword: "password123",
      }),
    ).not.toThrow();
  });

  it("accepts a missing middle name and never a role field", () => {
    const parsed = registrationSchema.parse({
      firstName: "Maria",
      lastName: "Reyes",
      email: "maria@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("is_admin");
  });

  it("rejects short passwords", () => {
    expect(() =>
      registrationSchema.parse({
        firstName: "Juan",
        lastName: "Cruz",
        email: "juan@example.com",
        password: "short",
        confirmPassword: "short",
      }),
    ).toThrow(/at least 8/);
  });
});

describe("service client guard", () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = OLD;
    vi.resetModules();
  });

  it("refuses to start without a server-only secret", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_x";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    const { createServiceClient } = await import("@/src/lib/supabase/service");
    expect(() => createServiceClient()).toThrow(/server secret/i);
  });
});
