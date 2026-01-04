import type { UserContext } from '../types/context.interface';

export type Permission = 'create' | 'read' | 'update' | 'delete' | 'list';

interface PermissionCheck {
    allowed: boolean;
    reason?: string;
}

/**
 * בדיקת הרשאות למשתמש
 *
 * מודל הרשאות:
 * - Admin: יכול לעשות הכל
 * - User רגיל: יכול לקרוא/לעדכן רק את עצמו (שם ומייל בלבד)
 */
export function checkUserPermission(
    action: Permission,
    targetUserId: string,
    currentUser: UserContext | null
): PermissionCheck {
    // אין משתמש מחובר - דחייה
    if (!currentUser) {
        return { allowed: false, reason: 'Authentication required' };
    }

    const isSelf = currentUser.id === targetUserId;

    switch (action) {
        case 'create':
            // רק Admin יכול ליצור משתמשים
            if (!currentUser.isAdmin) {
                return { allowed: false, reason: 'Only admins can create users' };
            }
            return { allowed: true };

        case 'read':
            // משתמש יכול לקרוא את עצמו, Admin יכול לקרוא כל אחד
            if (isSelf || currentUser.isAdmin) {
                return { allowed: true };
            }
            return { allowed: false, reason: 'Cannot read other user profiles' };

        case 'update':
            // Admin יכול לעדכן כל אחד, משתמש רק את עצמו
            if (currentUser.isAdmin) {
                return { allowed: true };
            }
            if (isSelf) {
                return { allowed: true }; // הגבלת שדות מטופלת בנפרד
            }
            return { allowed: false, reason: 'Cannot update other user profiles' };

        case 'delete':
            // רק Admin יכול למחוק
            if (!currentUser.isAdmin) {
                return { allowed: false, reason: 'Only admins can delete users' };
            }
            return { allowed: true };

        case 'list':
            // רק Admin יכול לראות רשימת משתמשים
            if (!currentUser.isAdmin) {
                return { allowed: false, reason: 'Only admins can list users' };
            }
            return { allowed: true };

        default:
            return { allowed: false, reason: 'Unknown action' };
    }
}

// שדות שמשתמש רגיל יכול לעדכן בפרופיל שלו
export const SELF_UPDATABLE_FIELDS = ['name', 'email'] as const;

/**
 * סינון שדות לעדכון לפי הרשאות
 * Admin יכול לעדכן הכל, משתמש רגיל רק name ו-email
 */
export function filterAllowedFields(
    updates: Record<string, unknown>,
    isAdmin: boolean
): Record<string, unknown> {
    if (isAdmin) {
        return updates; // Admin יכול לעדכן הכל
    }

    // משתמש רגיל - רק שדות מותרים
    const filtered: Record<string, unknown> = {};
    for (const field of SELF_UPDATABLE_FIELDS) {
        if (field in updates) {
            filtered[field] = updates[field];
        }
    }
    return filtered;
}
