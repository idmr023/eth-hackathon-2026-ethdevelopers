import { afterEach, describe, it, expect, vi } from "vitest";
import { apiFetch, ApiError } from "./api";

const realFetch = globalThis.fetch;

function mockFetch(response: {
  ok: boolean;
  status: number;
  body: unknown;
}) {
  const fn = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: () => Promise.resolve(response.body),
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("apiFetch", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("devuelve data y total del envelope", async () => {
    const fn = mockFetch({
      ok: true,
      status: 200,
      body: { ok: true, data: [{ id: "1" }], total: 3 },
    });
    const result = await apiFetch<{ id: string }[]>("/api/invoices");
    expect(result).toEqual({ data: [{ id: "1" }], total: 3 });
    expect(fn.mock.calls[0][0]).toBe("/api/invoices");
  });

  it("serializa query strings omitiendo vacíos", async () => {
    const fn = mockFetch({ ok: true, status: 200, body: { ok: true, data: [] } });
    await apiFetch("/api/invoices", {
      query: { status: "PENDING", q: "" },
    });
    const url = fn.mock.calls[0][0] as string;
    expect(url).toContain("status=PENDING");
    expect(url).not.toContain("q=");
  });

  it("lanza ApiError con código del backend", async () => {
    mockFetch({
      ok: false,
      status: 409,
      body: { ok: false, code: "FRAUD_DETECTED", message: "Doble financiamiento" },
    });
    await expect(apiFetch("/api/invoices/register")).rejects.toMatchObject({
      code: "FRAUD_DETECTED",
      status: 409,
    });
  });

  it("usa INTERNAL_ERROR si el error no trae envelope", async () => {
    mockFetch({ ok: false, status: 500, body: null });
    await expect(apiFetch("/api/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("envía body JSON y credentials include", async () => {
    const fn = mockFetch({ ok: true, status: 200, body: { ok: true, data: {} } });
    await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email: "a@b.pe", password: "x" },
    });
    const [, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect(JSON.parse(String(init.body))).toEqual({ email: "a@b.pe", password: "x" });
  });
});
