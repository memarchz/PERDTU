export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
}

export async function apiRequest(url, options = {}) {
  if(options.body !== undefined && options.formData !== undefined) throw new ApiError('Choose JSON or FormData, not both.',400);
  let response;
  try {
    response = await fetch(url, {
      method: options.method || 'GET', signal: options.signal,
      headers: { ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.formData !== undefined ? {body: options.formData} : {}),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError('Cannot connect to the API. Please try again.', 0);
  }
  if (response.status === 204) return undefined;
  let data;
  try { data = await response.json(); } catch {
    throw new ApiError('Could not load data. Please try again.', response.status);
  }
  if (!response.ok) {
    const message = response.status === 404 ? 'Not found.' : response.status < 500 && typeof data?.error === 'string' ? data.error : 'Could not load data. Please try again.';
    throw new ApiError(message, response.status);
  }
  return data;
}

export const getJson = (url, options = {}) => apiRequest(url, options);
