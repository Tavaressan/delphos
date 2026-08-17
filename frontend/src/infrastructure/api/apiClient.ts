import { ErrorResponse } from '../../types';

export function getBaseUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (backendUrl) {
    return backendUrl;
  }

  // In production, NEXT_PUBLIC_BACKEND_URL must be explicitly set
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_BACKEND_URL environment variable is required in production'
    );
  }

  // In development, fallback to localhost
  return 'http://localhost:8000';
}

const DEFAULT_TIMEOUT = 15000; // 15 seconds

export class ApiError extends Error {
  status: number;
  data?: ErrorResponse;

  constructor(message: string, status: number, data?: ErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

async function request<T>(path: string, options: RequestOptions = {}, isMultipart = false): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, headers, ...rest } = options;
  // Resolvido a cada request: avaliar no import faria o build de produção
  // falhar no prerender quando NEXT_PUBLIC_BACKEND_URL ainda não está definida.
  const url = `${getBaseUrl().replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = {
    ...rest,
    signal: controller.signal,
    // Multipart requests devem deixar o browser definir o Content-Type
    // (inclusive o boundary), então não sobrescrevemos com application/json.
    headers: isMultipart ? { ...headers } : {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(id);

    if (!response.ok) {
      let errorData: ErrorResponse | undefined;
      try {
        errorData = await response.json();
      } catch {
        // Fallback if not JSON
      }
      throw new ApiError(
        errorData?.error || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout exceeded', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message || 'Network error occurred', 500);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
  put: <T>(path: string, body: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(path: string, body?: any, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),

  postForm: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: formData }, true),
};
