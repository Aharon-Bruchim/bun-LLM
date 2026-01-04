// מידע על המשתמש הנוכחי
export interface UserContext {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
}

// Context מלא להרצת Tool
export interface ExecutionContext {
    user: UserContext | null;
    requestId: string;
    timestamp: Date;
    ipAddress?: string;
}
