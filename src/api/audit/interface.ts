import type { Document, Types } from 'mongoose';

export type AuditAction = 'tool_execution' | 'user_update' | 'user_create' | 'user_delete' | 'login' | 'error';

export interface AuditLog {
    userId?: Types.ObjectId;
    action: AuditAction;
    toolName?: string;
    details: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    duration?: number; // in milliseconds
    requestId: string;
    ipAddress?: string;
    createdAt: Date;
}

export interface AuditLogDocument extends AuditLog, Document {}
