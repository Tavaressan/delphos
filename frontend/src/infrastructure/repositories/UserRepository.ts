import { UserProfile } from '../../domain/entities';
import { GetMeResponse, UpdateProfileRequest, UploadAvatarResponse } from '../../domain/dto';
import { apiClient } from '../api/apiClient';
import { userAdapter } from '../adapters/userAdapter';

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
}

export const userRepository = new UserRepository();
