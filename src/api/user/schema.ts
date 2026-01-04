import { z } from 'zod';
import { zodMongoObjectId } from '../../utils/zod';

const userFields = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    isAdmin: z.boolean().default(false),
});

export const getByQuerySchema = z.object({
    step: z.number().min(0).default(0),
    limit: z.number().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    isAdmin: z.boolean().optional(),
});

export const getCountSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    isAdmin: z.boolean().optional(),
});

export const getByIdSchema = z.object({
    id: zodMongoObjectId,
});

export const createOneSchema = userFields;

export const updateOneSchema = z.object({
    id: zodMongoObjectId,
    data: userFields.partial(),
});

export const deleteOneSchema = z.object({
    id: zodMongoObjectId,
});
