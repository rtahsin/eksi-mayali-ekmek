import type { createAdminClient } from "@/lib/supabase/admin";

export type AuditAdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export interface AuditLogInput {
  actorId: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kritik admin/operasyon eylemlerini `public.audit_logs` tablosuna yazar.
 * Hata durumunda ana işlemi asla bozmaz; yalnızca `console.error` basar.
 */
export async function writeAuditLog(
  adminClient: AuditAdminClient | null,
  input: AuditLogInput
): Promise<void> {
  if (!adminClient) return;

  try {
    const actorUuid = input.actorId && UUID_RE.test(input.actorId) ? input.actorId : null;
    const { error } = await adminClient.from("audit_logs").insert({
      actor_id: actorUuid,
      actor_role: input.actorRole || "unknown",
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
    });

    if (error) {
      console.error("[audit] audit_logs insert failed:", error);
    }
  } catch (err: unknown) {
    console.error("[audit] audit_logs exception:", err);
  }
}
