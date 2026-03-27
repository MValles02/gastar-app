import axios from 'axios';

const NETWORK_ERROR_MESSAGE = 'No pudimos comunicarnos con el servidor. Intenta de nuevo.';
const UNKNOWN_ERROR_MESSAGE = 'Ocurrió un error inesperado. Intentá de nuevo.';

export interface NormalizedError {
  status: number | null;
  message: string;
  isNetworkError: boolean;
  isAuthError: boolean;
}

export function normalizeError(error: unknown, fallbackMessage = UNKNOWN_ERROR_MESSAGE): NormalizedError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const backendMessage = error.response?.data?.error;

    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return {
        status,
        message: backendMessage,
        isNetworkError: false,
        isAuthError: status === 401,
      };
    }

    if (!error.response) {
      return {
        status: null,
        message: NETWORK_ERROR_MESSAGE,
        isNetworkError: true,
        isAuthError: false,
      };
    }

    return {
      status,
      message: fallbackMessage,
      isNetworkError: false,
      isAuthError: status === 401,
    };
  }

  if (error instanceof Error && error.message) {
    return {
      status: null,
      message: error.message,
      isNetworkError: false,
      isAuthError: false,
    };
  }

  return {
    status: null,
    message: fallbackMessage,
    isNetworkError: false,
    isAuthError: false,
  };
}

export function getErrorMessage(error: unknown, fallbackMessage?: string): string {
  return normalizeError(error, fallbackMessage).message;
}

export function isUnauthorizedError(error: unknown): boolean {
  return normalizeError(error).status === 401;
}
