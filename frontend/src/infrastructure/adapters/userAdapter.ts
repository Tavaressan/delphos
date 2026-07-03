import { UserProfile } from '../../domain/entities';
import { GetMeResponse } from '../../domain/dto';

export const userAdapter = {
  toEntity(dto: GetMeResponse): UserProfile {
    return {
      id: dto.id,
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      jobTitle: dto.jobTitle,
      avatarUrl: dto.avatarUrl,
      status: dto.status,
      tenantId: dto.tenantId,
      createdAt: dto.createdAt,
      lastLogin: dto.lastLogin,
      roles: dto.roles ?? [],
    };
  },
};
