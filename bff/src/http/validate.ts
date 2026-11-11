import type { ZodTypeAny, infer as ZodInfer } from 'zod';

/** تحقّق موحّد — عند الفشل يرمي ZodError ويعالجه errorHandler المركزي. */
export function validate<T extends ZodTypeAny>(schema: T, value: unknown): ZodInfer<T> {
  return schema.parse(value) as ZodInfer<T>;
}
