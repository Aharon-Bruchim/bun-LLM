import { z } from 'zod';
import type { Tool, ToolResult, ToolContext } from '../types/tool.interface';
import { UserManager } from '../../api/user/manager';
import { checkUserPermission, filterAllowedFields } from './permissions';
import { sanitizeMongoQuery } from '../../utils/security/sanitize';
import { zodMongoObjectId } from '../../utils/zod';

// סכמת קלט עם validation קפדני
const dbToolInputSchema = z.object({
    action: z.enum(['create', 'read', 'update', 'delete', 'list']),
    userId: z.string().optional(),
    data: z
        .object({
            name: z.string().min(1).max(100).optional(),
            email: z.string().email().optional(),
            isAdmin: z.boolean().optional(),
        })
        .optional(),
});

type DbToolInput = z.infer<typeof dbToolInputSchema>;

interface DbToolOutput {
    action: string;
    user?: unknown;
    users?: unknown[];
    message?: string;
}

export const dbTool: Tool<DbToolInput, DbToolOutput> = {
    name: 'db_users',
    description: `Manage users in the database. Actions:
        - create: Create a new user (admin only)
        - read: Get user by ID (self or admin)
        - update: Update user fields (self: name/email only, admin: all)
        - delete: Delete a user (admin only)
        - list: List all users (admin only)`,
    parameters: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: ['create', 'read', 'update', 'delete', 'list'],
                description: 'The database action to perform',
            },
            userId: {
                type: 'string',
                description: 'User ID (required for read, update, delete)',
            },
            data: {
                type: 'object',
                description: 'User data (for create/update): { name, email, isAdmin }',
            },
        },
        required: ['action'],
    },
    inputSchema: dbToolInputSchema,
    requiresAuth: true,

    async execute(input: DbToolInput, context: ToolContext): Promise<ToolResult<DbToolOutput>> {
        const { action, userId, data } = input;

        // סניטציה של הדאטה
        const sanitizedData = data ? (sanitizeMongoQuery(data) as typeof data) : undefined;

        try {
            switch (action) {
                case 'create': {
                    const perm = checkUserPermission('create', '', context.user);
                    if (!perm.allowed) {
                        return { success: false, error: perm.reason };
                    }

                    if (!sanitizedData?.name || !sanitizedData?.email) {
                        return { success: false, error: 'Name and email required for create' };
                    }

                    const newUser = await UserManager.createOne({
                        name: sanitizedData.name,
                        email: sanitizedData.email,
                        isAdmin: sanitizedData.isAdmin ?? false,
                    });

                    return {
                        success: true,
                        data: { action: 'create', user: newUser, message: 'User created successfully' },
                    };
                }

                case 'read': {
                    if (!userId) {
                        return { success: false, error: 'userId required for read' };
                    }

                    // Validate userId format
                    const idValidation = zodMongoObjectId.safeParse(userId);
                    if (!idValidation.success) {
                        return { success: false, error: 'Invalid user ID format' };
                    }

                    const perm = checkUserPermission('read', userId, context.user);
                    if (!perm.allowed) {
                        return { success: false, error: perm.reason };
                    }

                    const user = await UserManager.getById(userId);
                    return {
                        success: true,
                        data: { action: 'read', user },
                    };
                }

                case 'update': {
                    if (!userId) {
                        return { success: false, error: 'userId required for update' };
                    }

                    // Validate userId format
                    const idValidation = zodMongoObjectId.safeParse(userId);
                    if (!idValidation.success) {
                        return { success: false, error: 'Invalid user ID format' };
                    }

                    const perm = checkUserPermission('update', userId, context.user);
                    if (!perm.allowed) {
                        return { success: false, error: perm.reason };
                    }

                    if (!sanitizedData) {
                        return { success: false, error: 'Data required for update' };
                    }

                    // סינון שדות לפי הרשאות
                    const allowedUpdates = filterAllowedFields(sanitizedData, context.user?.isAdmin ?? false);

                    if (Object.keys(allowedUpdates).length === 0) {
                        return { success: false, error: 'No valid fields to update' };
                    }

                    const updatedUser = await UserManager.updateOne(userId, allowedUpdates);
                    return {
                        success: true,
                        data: { action: 'update', user: updatedUser, message: 'User updated successfully' },
                    };
                }

                case 'delete': {
                    if (!userId) {
                        return { success: false, error: 'userId required for delete' };
                    }

                    // Validate userId format
                    const idValidation = zodMongoObjectId.safeParse(userId);
                    if (!idValidation.success) {
                        return { success: false, error: 'Invalid user ID format' };
                    }

                    const perm = checkUserPermission('delete', userId, context.user);
                    if (!perm.allowed) {
                        return { success: false, error: perm.reason };
                    }

                    await UserManager.deleteOne(userId);
                    return {
                        success: true,
                        data: { action: 'delete', message: 'User deleted successfully' },
                    };
                }

                case 'list': {
                    const perm = checkUserPermission('list', '', context.user);
                    if (!perm.allowed) {
                        return { success: false, error: perm.reason };
                    }

                    const users = await UserManager.getByQuery({}, 0, 100);
                    return {
                        success: true,
                        data: { action: 'list', users },
                    };
                }

                default:
                    return { success: false, error: 'Unknown action' };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Database operation failed',
            };
        }
    },
};
