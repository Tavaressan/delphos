import { UserSession } from '../../domain/entities';
import { UserSessionResponse } from '../../domain/dto';

export const userSessionAdapter = {
  toEntity(dto: UserSessionResponse): UserSession {
    return {
      id: dto.id,
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
      createdAt: dto.createdAt,
      lastActiveAt: dto.lastActiveAt,
    };
  },
};
