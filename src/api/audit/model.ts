import mongoose from 'mongoose';
import type { AuditLogDocument } from './interface';

const AuditLogSchema = new mongoose.Schema<AuditLogDocument>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            index: true,
        },
        action: {
            type: String,
            enum: ['tool_execution', 'user_update', 'user_create', 'user_delete', 'login', 'error'],
            required: true,
            index: true,
        },
        toolName: {
            type: String,
            index: true,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        success: {
            type: Boolean,
            required: true,
        },
        errorMessage: {
            type: String,
        },
        duration: {
            type: Number,
        },
        requestId: {
            type: String,
            required: true,
            index: true,
        },
        ipAddress: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    }
);

// Compound indexes for common queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model<AuditLogDocument>('audit_logs', AuditLogSchema);
