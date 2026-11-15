import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockRequireCapability = vi.fn();
const mockCreateAdminClient = vi.fn();
const mockWriteAuditLog = vi.fn();

vi.mock("@/lib/security/apiAuth", () => ({
  requireCapability: (...args: unknown[]) => mockRequireCapability(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("@/lib/security/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

interface MockCourier {
  id: string;
  display_name: string;
  is_active: boolean;
  is_on_shift?: boolean;
}

interface MockOrder {
  id: string;
  order_number: string;
  status: string;
  delivery_method: string;
  courier_id: string | null;
  customer_name: string;
}

interface MockClientOptions {
  courier?: MockCourier | null;
  orders?: MockOrder[];
  updateConflictIds?: string[];
  rpcResult?: { data: unknown; error: unknown };
}

function buildMockSupabase(opts: MockClientOptions) {
  const historyInsert = vi.fn(async () => ({ error: null }));
  const rpcSpy = vi.fn(async () => opts.rpcResult ?? { data: { ok: true }, error: null });
  const courierUpdateCalls: Array<{ id: string; payload: Record<string, unknown> }> = [];
  const updateCalls: Array<{ id: string; expectedStatus: string; payload: Record<string, unknown> }> =
    [];

  const client = {
    rpc: rpcSpy,
    from: (table: string) => {
      if (table === "couriers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.courier
                  ? { is_on_shift: true, ...opts.courier }
                  : null,
                error: null,
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async (_col: string, idVal: string) => {
              courierUpdateCalls.push({ id: idVal, payload });
              return { error: null };
            },
          }),
        };
      }

      if (table === "orders") {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: (opts.orders ?? []).filter((o) => ids.includes(o.id)),
              error: null,
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: (_idCol: string, idVal: string) => ({
              eq: (_statusCol: string, statusVal: string) => ({
                select: () => ({
                  maybeSingle: async () => {
                    updateCalls.push({ id: idVal, expectedStatus: statusVal, payload });
                    if (opts.updateConflictIds?.includes(idVal)) {
                      return { data: null, error: null };
                    }
                    const found = (opts.orders ?? []).find((o) => o.id === idVal);
                    if (!found || found.status !== statusVal) {
                      return { data: null, error: null };
                    }
                    return {
                      data: {
                        id: idVal,
                        status:
                          typeof payload.status === "string" ? payload.status : found.status,
                      },
                      error: null,
                    };
                  },
                }),
              }),
            }),
          }),
        };
      }

      if (table === "order_status_history") {
        return {
          insert: historyInsert,
        };
      }

      return {};
    },
  };

  return { client, historyInsert, rpcSpy, updateCalls, courierUpdateCalls };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("https://ekmeklab.local/api/admin/orders/bulk-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/orders/bulk-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCapability.mockResolvedValue({
      ok: true,
      auth: {
        ok: true,
        userId: "admin-1",
        email: "admin@ekmeklab.com",
        role: "admin",
        isAdmin: true,
      },
    });
    mockWriteAuditLog.mockResolvedValue(undefined);
  });

  it("yetkisiz istekte guard cevabını döner (401/403)", async () => {
    mockRequireCapability.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Yetkisiz" }, { status: 403 }),
    });

    const res = await POST(makeRequest({ orderIds: ["ord-1"], action: "approve" }));
    expect(res.status).toBe(403);
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it("geçersiz zod yükünü (boş liste veya eksik courierId) 400 ile reddeder", async () => {
    mockCreateAdminClient.mockReturnValue(buildMockSupabase({}).client);

    const emptyRes = await POST(makeRequest({ orderIds: [], action: "approve" }));
    expect(emptyRes.status).toBe(400);

    const missingCourierRes = await POST(
      makeRequest({ orderIds: ["ord-1"], action: "assign_courier" }),
    );
    expect(missingCourierRes.status).toBe(400);

    const tooManyIds = Array.from({ length: 101 }, (_, i) => `ord-${i}`);
    const maxRes = await POST(makeRequest({ orderIds: tooManyIds, action: "approve" }));
    expect(maxRes.status).toBe(400);
  });

  it("approve aksiyonunda yalnızca bekliyor siparişleri hazirlaniyor yapar ve tarihçe + audit yazar", async () => {
    const mockDb = buildMockSupabase({
      orders: [
        {
          id: "ord-1",
          order_number: "SIP-2611-001",
          status: "bekliyor",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Ayşe",
        },
        {
          id: "ord-2",
          order_number: "SIP-2611-002",
          status: "firinda",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Ali",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(
      makeRequest({
        orderIds: ["ord-1", "ord-2", "ord-missing"],
        action: "approve",
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      updatedCount: number;
      updatedIds: string[];
      skippedCount: number;
    };
    expect(json.updatedCount).toBe(1);
    expect(json.updatedIds).toEqual(["ord-1"]);
    expect(json.skippedCount).toBe(2);
    expect(mockDb.updateCalls).toHaveLength(1);
    expect(mockDb.updateCalls[0]).toMatchObject({
      id: "ord-1",
      expectedStatus: "bekliyor",
      payload: expect.objectContaining({ status: "hazirlaniyor" }),
    });
    expect(mockDb.historyInsert).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
  });

  it("prepare aksiyonunda hazirlaniyor siparişlerini firinda yapar", async () => {
    const mockDb = buildMockSupabase({
      orders: [
        {
          id: "ord-10",
          order_number: "SIP-2611-010",
          status: "hazirlaniyor",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Mehmet",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(makeRequest({ orderIds: ["ord-10"], action: "prepare" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { updatedIds: string[] };
    expect(json.updatedIds).toEqual(["ord-10"]);
    expect(mockDb.updateCalls[0]?.payload).toMatchObject({ status: "firinda" });
  });

  it("assign_courier varsayılan planlama modunda bekliyor->hazirlaniyor yapar, firinda durumunu korur ve 409 çakışmayı yakalar", async () => {
    const courierUuid = "11111111-1111-4111-8111-111111111111";
    const mockDb = buildMockSupabase({
      courier: { id: courierUuid, display_name: "Kemal Kurye", is_active: true, is_on_shift: false },
      orders: [
        {
          id: "ord-bekliyor",
          order_number: "SIP-2611-020",
          status: "bekliyor",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Ali",
        },
        {
          id: "ord-courier",
          order_number: "SIP-2611-021",
          status: "firinda",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Veli",
        },
        {
          id: "ord-pickup",
          order_number: "SIP-2611-022",
          status: "firinda",
          delivery_method: "pickup",
          courier_id: null,
          customer_name: "Zeynep",
        },
        {
          id: "ord-done",
          order_number: "SIP-2611-023",
          status: "teslim_edildi",
          delivery_method: "courier",
          courier_id: courierUuid,
          customer_name: "Can",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(
      makeRequest({
        orderIds: ["ord-bekliyor", "ord-courier", "ord-pickup", "ord-done"],
        action: "assign_courier",
        courierId: courierUuid,
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      updatedIds: string[];
      skippedCount: number;
    };
    expect(json.updatedIds).toEqual(["ord-bekliyor", "ord-courier"]);
    expect(json.skippedCount).toBe(2);
    expect(mockDb.updateCalls[0]?.payload).toMatchObject({
      status: "hazirlaniyor",
      courier_id: courierUuid,
      stop_sequence: null,
    });
    expect(typeof mockDb.updateCalls[0]?.payload.assigned_at).toBe("string");
    expect(mockDb.updateCalls[1]?.payload).toMatchObject({
      status: "firinda",
      courier_id: courierUuid,
      stop_sequence: null,
    });
    expect(mockDb.courierUpdateCalls).toHaveLength(0);

    const conflictDb = buildMockSupabase({
      courier: { id: courierUuid, display_name: "Kemal Kurye", is_active: true },
      orders: [
        {
          id: "ord-conflict",
          order_number: "SIP-2611-024",
          status: "firinda",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Deniz",
        },
      ],
      updateConflictIds: ["ord-conflict"],
    });
    mockCreateAdminClient.mockReturnValue(conflictDb.client);

    const conflictRes = await POST(
      makeRequest({
        orderIds: ["ord-conflict"],
        action: "assign_courier",
        courierId: courierUuid,
      }),
    );
    expect(conflictRes.status).toBe(409);
  });

  it("assign_courier startRoute=true iken kuryede yapar ve vardiya dışı kuryenin vardiyasını açar", async () => {
    const courierUuid = "11111111-1111-4111-8111-111111111111";
    const mockDb = buildMockSupabase({
      courier: { id: courierUuid, display_name: "Kemal Kurye", is_active: true, is_on_shift: false },
      orders: [
        {
          id: "ord-route-1",
          order_number: "SIP-2611-025",
          status: "hazirlaniyor",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Elif",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(
      makeRequest({
        orderIds: ["ord-route-1"],
        action: "assign_courier",
        courierId: courierUuid,
        startRoute: true,
      }),
    );

    expect(res.status).toBe(200);
    expect(mockDb.updateCalls[0]?.payload).toMatchObject({
      status: "kuryede",
      courier_id: courierUuid,
      stop_sequence: null,
    });
    expect(mockDb.courierUpdateCalls).toEqual([
      { id: courierUuid, payload: { is_on_shift: true } },
    ]);
  });

  it("unassign_courier kuryede siparişini firinda'ya döndürür ve zimmet alanlarını temizler", async () => {
    const courierUuid = "11111111-1111-4111-8111-111111111111";
    const mockDb = buildMockSupabase({
      orders: [
        {
          id: "ord-onroute",
          order_number: "SIP-2611-026",
          status: "kuryede",
          delivery_method: "courier",
          courier_id: courierUuid,
          customer_name: "Burak",
        },
        {
          id: "ord-planned",
          order_number: "SIP-2611-027",
          status: "hazirlaniyor",
          delivery_method: "courier",
          courier_id: courierUuid,
          customer_name: "Selin",
        },
        {
          id: "ord-bench",
          order_number: "SIP-2611-028",
          status: "firinda",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Mert",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(
      makeRequest({
        orderIds: ["ord-onroute", "ord-planned", "ord-bench"],
        action: "unassign_courier",
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { updatedIds: string[]; skippedCount: number };
    expect(json.updatedIds).toEqual(["ord-onroute", "ord-planned"]);
    expect(json.skippedCount).toBe(1);
    expect(mockDb.updateCalls[0]?.payload).toMatchObject({
      status: "firinda",
      courier_id: null,
      assigned_at: null,
      stop_sequence: null,
    });
    expect(mockDb.updateCalls[1]?.payload).toMatchObject({
      status: "hazirlaniyor",
      courier_id: null,
      assigned_at: null,
      stop_sequence: null,
    });
  });

  it("start_route zimmetli siparişleri kuryede yapar ve kuryesiz olanları atlar", async () => {
    const courierUuid = "11111111-1111-4111-8111-111111111111";
    const mockDb = buildMockSupabase({
      orders: [
        {
          id: "ord-assigned",
          order_number: "SIP-2611-029",
          status: "firinda",
          delivery_method: "courier",
          courier_id: courierUuid,
          customer_name: "Emre",
        },
        {
          id: "ord-unassigned",
          order_number: "SIP-2611-030",
          status: "firinda",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Oya",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(
      makeRequest({
        orderIds: ["ord-assigned", "ord-unassigned"],
        action: "start_route",
      }),
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { updatedIds: string[]; skippedCount: number };
    expect(json.updatedIds).toEqual(["ord-assigned"]);
    expect(json.skippedCount).toBe(1);
    expect(mockDb.updateCalls[0]?.payload).toMatchObject({
      status: "kuryede",
    });
  });

  it("cancel aksiyonunda staff yetkisiyle bile cancel_order_atomic p_actor_role='admin' ile çağrılır", async () => {
    mockRequireCapability.mockResolvedValue({
      ok: true,
      auth: {
        ok: true,
        userId: "staff-1",
        email: "staff@ekmeklab.com",
        role: "staff",
        isAdmin: true,
      },
    });

    const mockDb = buildMockSupabase({
      orders: [
        {
          id: "ord-cancel-1",
          order_number: "SIP-2611-031",
          status: "hazirlaniyor",
          delivery_method: "courier",
          courier_id: null,
          customer_name: "Ece",
        },
      ],
    });
    mockCreateAdminClient.mockReturnValue(mockDb.client);

    const res = await POST(
      makeRequest({
        orderIds: ["ord-cancel-1"],
        action: "cancel",
        reason: "Fırın arızası",
      }),
    );

    expect(res.status).toBe(200);
    expect(mockDb.rpcSpy).toHaveBeenCalledWith("cancel_order_atomic", {
      p_order_id: "ord-cancel-1",
      p_reason: "Fırın arızası",
      p_actor_role: "admin",
      p_actor_id: "staff-1",
      p_expected_status: "hazirlaniyor",
    });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      mockDb.client,
      expect.objectContaining({
        actorId: "staff-1",
        actorRole: "staff",
        action: "order.bulk_status",
      }),
    );
  });
});
