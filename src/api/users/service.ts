import bcrypt from 'bcryptjs';
import { StatusCodes } from 'http-status-codes';

import { HttpError } from '../../utils/http-error';
import { CreateUserInput, UpdateUserInput } from './dto';
import { userRepository } from './repository';

export const userService = {
  async listUsers() {
    return userRepository.listUsers();
  },

  async createUser(payload: CreateUserInput) {
    const existingUser = await userRepository.findByEmail(payload.email);
    if (existingUser) {
      throw new HttpError(StatusCodes.CONFLICT, 'Email already exists');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    return userRepository.createUser({ ...payload, passwordHash });
  },

  async updateUser(id: string, payload: UpdateUserInput) {
    return userRepository.updateUser(id, payload);
  },
};
