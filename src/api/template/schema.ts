import { z } from 'zod';
import { zodMongoObjectId } from '../../utils/zod';

const templateFields = z.object({
    name: z.string(),
    email: z.string().email(),
});

export const getByQuerySchema = z.object({
    step: z.number().min(0).default(0),
    limit: z.number().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
});

export const getCountSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional(),
});

export const getByIdSchema = z.object({
    id: zodMongoObjectId,
});

export const createOneSchema = templateFields;

export const updateOneSchema = z.object({
    id: zodMongoObjectId,
    data: templateFields.partial(),
});

export const deleteOneSchema = z.object({
    id: zodMongoObjectId,
});
