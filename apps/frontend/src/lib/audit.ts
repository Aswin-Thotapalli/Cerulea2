import { db } from '@/db/client';
import { auditLogs } from '@/db/schema';
import { randomUUID } from 'crypto';

export interface AuditEntry {
  userId?: string | null;
  actorEmail?: string | null;
  actorType?: 'user' | 'admin' | 'system';
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  status?: 'success' | 'failure' | 'warning';
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      userId: entry.userId ?? null,
      actorEmail: entry.actorEmail ?? null,
      actorType: entry.actorType ?? 'user',
      action: entry.action,
      resource: entry.resource ?? null,
      resourceId: entry.resourceId ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ip: entry.ip ?? null,
      status: entry.status ?? 'success',
    });
  } catch {
    // Audit logging is best-effort — never block the main request
  }
}
