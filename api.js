const localFallback = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') : '';

export const API_BASE = localFallback.replace(/\/+$/, '');
export const MAX_UPLOAD_BYTES = import.meta.env.PROD ? 4 * 1024 * 1024 : 20 * 1024 * 1024;
export const apiUrl = (path) => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
