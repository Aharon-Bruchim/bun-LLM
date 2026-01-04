import { TRPCError } from '@trpc/server';

export class ServiceError extends Error {
    constructor(
        public code: number,
        message: string,
    ) {
        super(message);
    }
}

export class DocumentNotFoundError extends TRPCError {
    constructor(id: string) {
        super({
            code: 'NOT_FOUND',
            message: `No document found with id ${id}`,
        });
    }
}

export class DuplicateEmailError extends TRPCError {
    constructor(email: string) {
        super({
            code: 'CONFLICT',
            message: `Email ${email} already exists`,
        });
    }
}
