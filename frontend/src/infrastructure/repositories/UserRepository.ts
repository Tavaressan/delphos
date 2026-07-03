import { UserProfile, UserSession } from '../../domain/entities';
import {
  GetMeResponse,
  UpdateProfileRequest,
  UploadAvatarResponse,
  ChangePasswordRequest,
  UserSessionResponse,
} from '../../domain/dto';
import { apiClient } from '../api/apiClient';
import { userAdapter } from '../adapters/userAdapter';
import { userSessionAdapter } from '../adapters/userSessionAdapter';

export class UserRepository {
  async getMe(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<GetMeResponse>('/api/users/me', {
      headers: { 'X-User-Id': userId },
    });
    return userAdapter.toEntity(response);
  }

  async updateMe(userId: string, patch: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.patch<GetMeResponse>('/api/users/me', patch, {
      headers: { 'X-User-Id': userId },
    });
    return userAdapter.toEntity(response);
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.postForm<UploadAvatarResponse>('/api/users/me/avatar', formData, {
      headers: { 'X-User-Id': userId },
    });
    return response.avatarUrl;
  }

  async changePassword(userId: string, patch: ChangePasswordRequest): Promise<void> {
    await apiClient.patch('/api/users/me/password', patch, {
      headers: { 'X-User-Id': userId },
    });
  }

  async listSessions(userId: string): Promise<UserSession[]> {
    const response = await apiClient.get<UserSessionResponse[]>('/api/users/me/sessions', {
      headers: { 'X-User-Id': userId },
    });
    return response.map(userSessionAdapter.toEntity);
  }

  async revokeOtherSessions(userId: string): Promise<void> {
    await apiClient.delete('/api/users/me/sessions', {
      headers: { 'X-User-Id': userId },
    });
  }
}

export const userRepository = new UserRepository();
