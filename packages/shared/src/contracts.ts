import { z } from 'zod';

export const publishUpdateSchema = z.object({
  clientAssignedId: z.string().min(1).max(128).optional(),
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  author: z.string().trim().min(1).max(100).optional().default('Anonymous'),
});

export type PublishUpdateDto = z.infer<typeof publishUpdateSchema>;

export const historyQuerySchema = z.object({
  after: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 0))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'Parameter "after" must be a non-negative integer sequence',
    }),
  limit: z
    .string()
    .optional()
    .transform((val) => (val !== undefined ? parseInt(val, 10) : 50))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'Parameter "limit" must be between 1 and 100',
    }),
});

export type HistoryQueryDto = z.infer<typeof historyQuerySchema>;

export const clientWsMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SUBSCRIBE'),
    roomId: z.string().min(1).max(100),
    afterSequence: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal('PING'),
  }),
]);
