import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

import { env } from '../../config/env';
import { UserRole } from '../../constants/enums';
import { HttpError } from '../../utils/http-error';
import { LoginInput, RegisterInput } from './dto';
import { authRepository } from './repository';

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const signAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

const signRefreshToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

export const authService = {
  async register(payload: RegisterInput) {
    const existingUser = await authRepository.findUserByEmail(payload.email);
    if (existingUser) {
      throw new HttpError(StatusCodes.CONFLICT, 'Email already exists');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    try {
      const created = await authRepository.createMember({
        fullName: payload.fullName,
        email: payload.email,
        passwordHash,
      });

      return {
        id: created.id,
        fullName: created.full_name,
        email: created.email,
        role: created.role as UserRole,
      };
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string; details?: string };

      if (dbError.code === '42703' || dbError.message?.includes('password_hash')) {
        throw new HttpError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Database schema mismatch: users.password_hash is missing. Apply backend/sql/schema.sql first.',
        );
      }

      if (dbError.code === '23503' || dbError.message?.includes('auth.users')) {
        throw new HttpError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Database schema mismatch: users.id still references auth.users. Use the custom users schema from backend/sql/schema.sql.',
        );
      }

      throw new HttpError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        dbError.message || 'Registration failed due to server error',
      );
    }
  },

  async login(payload: LoginInput) {
    const user = await authRepository.findUserByEmail(payload.email);

    if (!user || !user.is_active) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password_hash);

    if (!isPasswordValid) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await authRepository.updateRefreshTokenHash(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role as UserRole,
      },
    };
  },

  async refresh(refreshToken: string) {
    let decoded: jwt.JwtPayload;

    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token');
    }

    const userId = decoded.sub;
    if (!userId || typeof userId !== 'string') {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Invalid refresh token payload');
    }

    const user = await authRepository.findUserById(userId);

    if (!user || !user.refresh_token_hash) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Refresh token not recognized');
    }

    const matches = await bcrypt.compare(refreshToken, user.refresh_token_hash);
    if (!matches) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'Refresh token mismatch');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const nextAccessToken = signAccessToken(tokenPayload);
    const nextRefreshToken = signRefreshToken(tokenPayload);
    const nextRefreshTokenHash = await bcrypt.hash(nextRefreshToken, 10);

    await authRepository.updateRefreshTokenHash(user.id, nextRefreshTokenHash);

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  },

  async logout(userId: string) {
    await authRepository.updateRefreshTokenHash(userId, null);
  },
};
