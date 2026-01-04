import { Types } from 'mongoose';
import { AuditLogModel } from './model';
import type { AuditAction } from './interface';

interface LogToolExecutionParams {
    userId?: string;
    toolName: string;
    args: unknown;
    result: unknown;
    success: boolean;
    errorMessage?: string;
    duration: number;
    requestId: string;
}

interface LogActionParams {
    userId?: string;
    action: AuditAction;
    details?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
    requestId: string;
    ipAddress?: string;
}

export class AuditManager {
    /**
     * Log a tool execution
     */
    static async logToolExecution(params: LogToolExecutionParams) {
        const log = new AuditLogModel({
            userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
            action: 'tool_execution',
            toolName: params.toolName,
            details: {
                args: params.args,
                result: params.result,
            },
            success: params.success,
            errorMessage: params.errorMessage,
            duration: params.duration,
            requestId: params.requestId,
        });
        return log.save();
    }

    /**
     * Log a generic action
     */
    static async logAction(params: LogActionParams) {
        const log = new AuditLogModel({
            userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
            action: params.action,
            details: params.details || {},
            success: params.success,
            errorMessage: params.errorMessage,
            requestId: params.requestId,
            ipAddress: params.ipAddress,
        });
        return log.save();
    }

    /**
     * Get audit logs by user
     */
    static async getByUserId(userId: string, limit = 100, skip = 0) {
        return AuditLogModel.find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Get audit logs by action type
     */
    static async getByAction(action: AuditAction, limit = 100, skip = 0) {
        return AuditLogModel.find({ action })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Get tool execution logs
     */
    static async getToolExecutions(toolName?: string, limit = 100) {
        const query: Record<string, unknown> = { action: 'tool_execution' };
        if (toolName) {
            query['toolName'] = toolName;
        }
        return AuditLogModel.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name email')
            .lean();
    }

    /**
     * Get recent errors
     */
    static async getErrors(limit = 100) {
        return AuditLogModel.find({ success: false })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name email')
            .lean();
    }

    /**
     * Get statistics for a time period
     */
    static async getStats(startDate: Date, endDate: Date) {
        return AuditLogModel.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        action: '$action',
                        toolName: '$toolName',
                    },
                    count: { $sum: 1 },
                    successCount: { $sum: { $cond: ['$success', 1, 0] } },
                    avgDuration: { $avg: '$duration' },
                },
            },
        ]);
    }

    /**
     * Delete old logs (cleanup)
     */
    static async deleteOlderThan(days: number) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return AuditLogModel.deleteMany({ createdAt: { $lt: cutoffDate } });
    }
}
