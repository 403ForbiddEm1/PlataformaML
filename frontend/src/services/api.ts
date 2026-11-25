/**
 * Base HTTP & API Client configuration.
 * Configured according to the project architecture.
 * Integrates seamlessly with the Express/Node.js backend and FastAPI ML service.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const USE_MOCK = false; // Mockups desactivados: conectado directamente a API Backend real

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const HTTP_STATUS_FALLBACK_ES: Record<number, string> = {
  400: 'La solicitud contiene datos inválidos o incompletos. Verifica los campos e inténtalo de nuevo.',
  401: 'Credenciales incorrectas o sesión expirada. Verifica tus datos.',
  403: 'No tienes permisos suficientes para realizar esta acción.',
  404: 'No se encontró el recurso solicitado en el servidor.',
  409: 'Ya existe un registro con esos mismos datos.',
  413: 'El archivo enviado supera el tamaño máximo permitido.',
  422: 'Algunos datos enviados no cumplen con el formato requerido.',
  429: 'Demasiados intentos seguidos. Espera un momento antes de volver a intentarlo.',
  500: 'Ocurrió un error interno en el servidor. Inténtalo nuevamente en unos segundos.',
  502: 'El servidor no está disponible temporalmente (puerta de enlace).',
  503: 'Servicio temporalmente no disponible. Inténtalo en unos momentos.',
};

function normalizeApiErrorMessage(rawMessage: string, status?: number): string {
  const msg = (rawMessage || '').trim();
  const lower = msg.toLowerCase();

  if (
    !msg ||
    lower === 'bad request' ||
    lower === 'unauthorized' ||
    lower === 'forbidden' ||
    lower === 'not found' ||
    lower === 'conflict' ||
    lower === 'too many requests' ||
    lower === 'internal server error' ||
    lower === 'bad gateway' ||
    lower === 'service unavailable' ||
    lower === 'unprocessable entity'
  ) {
    return (status && HTTP_STATUS_FALLBACK_ES[status]) || 'Ocurrió un error inesperado al procesar la solicitud.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed') ||
    lower.includes('err_connection_refused')
  ) {
    return 'No se pudo conectar con el servidor. Verifica que el backend esté activo o revisa tu conexión.';
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('p1001') ||
    lower.includes("can't reach database")
  ) {
    return 'No se pudo conectar con la base de datos del servidor. Verifica que PostgreSQL esté encendido e inténtalo de nuevo.';
  }
  if (
    lower.includes('prismaclient') ||
    lower.includes('prisma.') ||
    lower.includes('invocation in') ||
    msg.includes('\n') && (lower.includes('throw new') || lower.includes('await '))
  ) {
    return 'Ocurrió un error interno de conexión con la base de datos en el servidor. Verifica que PostgreSQL esté activo e inténtalo nuevamente.';
  }
  if (lower.includes('invalid email') || lower.includes('invalid_string') && lower.includes('email')) {
    return 'El formato del correo electrónico no es válido.';
  }
  if (lower.includes('required') && msg.length < 40) {
    return 'Falta completar uno o más campos obligatorios.';
  }
  if (lower.includes('too small') || lower.includes('string must contain at least')) {
    return 'Uno de los campos no cumple con la longitud mínima requerida.';
  }
  if (lower.includes('unexpected token') || lower.includes('json')) {
    return (status && HTTP_STATUS_FALLBACK_ES[status]) || 'El servidor devolvió una respuesta no válida.';
  }

  return msg;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('nexo_auth_token');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response, _endpoint: string): Promise<ApiResponse<T>> {
    if (!response.ok) {
      let errorMsg = '';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || '';
      } catch {}
      throw new Error(normalizeApiErrorMessage(errorMsg || response.statusText, response.status));
    }
    return response.json();
  }

  private async safeFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (err: any) {
      throw new Error(normalizeApiErrorMessage(err?.message || 'Failed to fetch'));
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.safeFetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await this.safeFetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await this.safeFetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await this.safeFetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await this.safeFetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response, endpoint);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('nexo_auth_token');
    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await this.safeFetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<T>(response, endpoint);
  }
}

export const api = new ApiClient();
