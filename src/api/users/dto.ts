import { z } from 'zod';

import { UserRole } from '../../constants/enums';

export const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
