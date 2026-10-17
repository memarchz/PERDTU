export function getJson<T>(url: string, options?: { signal?: AbortSignal }): Promise<T>;
export class ApiError extends Error { status: number; constructor(message: string, status: number); }
export type RequestOptions = { method?: string; token?: string; signal?: AbortSignal } & ({body?:unknown;formData?:never}|{body?:never;formData:FormData});
export function apiRequest<T>(url: string, options?: RequestOptions): Promise<T>;
