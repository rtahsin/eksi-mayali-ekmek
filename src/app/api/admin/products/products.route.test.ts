import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/security/apiAuth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({
    ok: true,
    user: { id: "admin-1", role: "admin" },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        like: vi.fn().mockResolvedValue({ data: [] }),
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

import { POST } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";

describe("POST /api/admin/products health terms validation (K006 / P1-08)", () => {
  it("rejects product with health/cure terms in description with 400", async () => {
    const req = new Request("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Karakılçık Ekmeği",
        description: "Bu ekmek son derece sağlıklıdır ve bağışıklık sistemini korur.",
        price: 150,
        category: "bread",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("K006");
    expect(json.error).toContain("sağlıklı");
  });

  it("rejects product with health/cure terms in masterclass with 400", async () => {
    const req = new Request("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Siyez Ekmeği",
        description: "Atalık taş değirmen siyez unu ve ekşi maya.",
        price: 160,
        category: "bread",
        masterclass: {
          flourHeritage: "Kastamonu siyezi, şifa deposudur ve sindirimi kolaylaştırır.",
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain("K006");
    expect(json.error).toContain("şifa");
  });

  it("accepts product with clean objective biological descriptions", async () => {
    const req = new Request("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Tam Buğday Ekşi Mayalı",
        description: "Taş değirmen tam buğday unu, su, ekşi maya ve kaya tuzu.",
        price: 140,
        category: "bread",
        flourTypes: ["Taş Değirmen Tam Buğday Unu"],
        ingredients: ["Tam buğday unu", "Su", "Ekşi maya kültürü", "Tuz"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("accepts product with saleWeekdays and generates upcoming sale dates window", async () => {
    const req = new Request("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Gece Yarısı",
        description: "Yalnız cuma geceleri pişen özel cevizli ekşi mayalı.",
        price: 180,
        category: "bread",
        saleWeekdays: [5],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

describe("POST /api/admin/products masterclass.showcase validation", () => {
  it("accepts valid masterclass.showcase URLs and normalizes empty strings to undefined", async () => {
    const adminClient = createAdminClient() as unknown as {
      rpc: ReturnType<typeof vi.fn>;
    };
    adminClient.rpc.mockClear();

    const req = new Request("http://localhost:3000/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Atalık Siyez Somunu",
        description: "Taş fırında 24 saat soğuk fermantasyonla pişen somun.",
        price: 175,
        category: "bread",
        masterclass: {
          flourHeritage: "Kastamonu taş değirmen siyez unu.",
          showcase: {
            cutoutUrl: "https://cdn.ekmeklab.tr/urun-vitrin/cutout/siyez.webp",
            crumbUrl: "/images/showcase/siyez-crumb.webp",
            spinFrameUrls: [
              "https://cdn.ekmeklab.tr/urun-vitrin/spin/frame-00.webp",
              "https://cdn.ekmeklab.tr/urun-vitrin/spin/frame-01.webp",
            ],
            spinFramesUrlPattern: "",
            spinFrameCount: 36,
            ambientVideoUrl: "   ",
            specularTone: "ember",
          },
        },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(adminClient.rpc).toHaveBeenCalledTimes(1);

    const rpcPayload = adminClient.rpc.mock.calls[0]?.[1] as {
      p_product?: { masterclass?: { showcase?: Record<string, unknown> } };
    };
    const savedShowcase = rpcPayload?.p_product?.masterclass?.showcase;
    expect(savedShowcase).toEqual({
      cutoutUrl: "https://cdn.ekmeklab.tr/urun-vitrin/cutout/siyez.webp",
      crumbUrl: "/images/showcase/siyez-crumb.webp",
      spinFrameUrls: [
        "https://cdn.ekmeklab.tr/urun-vitrin/spin/frame-00.webp",
        "https://cdn.ekmeklab.tr/urun-vitrin/spin/frame-01.webp",
      ],
      spinFrameCount: 36,
      specularTone: "ember",
    });
  });

  it("rejects javascript: and data: URLs in masterclass.showcase with 400", async () => {
    const invalidPayloads = [
      { cutoutUrl: "javascript:alert(1)" },
      { crumbUrl: "data:image/png;base64,AAAA" },
      { ambientVideoUrl: "javascript:void(0)" },
      { spinFrameUrls: ["https://cdn.ekmeklab.tr/ok.webp", "javascript:alert(2)"] },
      { spinFramesUrlPattern: "//evil.example/spin-{00}.webp", spinFrameCount: 24 },
      { spinFrameCount: 8 },
      { spinFrameUrls: Array.from({ length: 73 }, (_, i) => `https://cdn.ekmeklab.tr/f-${i}.webp`) },
    ];

    for (const showcase of invalidPayloads) {
      const req = new Request("http://localhost:3000/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Karakılçık Somunu",
          description: "Taş fırın ekşi mayalı karakılçık ekmeği.",
          price: 165,
          category: "bread",
          masterclass: { showcase },
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    }
  });
});
