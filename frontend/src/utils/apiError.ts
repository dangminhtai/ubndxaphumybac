import axios from 'axios';

interface ErrorResponse {
  error?: string;
  code?: string;
  requestId?: string;
  retryable?: boolean;
}

export interface ApiErrorInfo {
  message: string;
  code: string;
  requestId?: string;
  retryable: boolean;
}

export function getApiErrorInfo(error: unknown, fallbackMessage: string): ApiErrorInfo {
  if (!axios.isAxiosError<ErrorResponse>(error)) {
    return { message: fallbackMessage, code: 'CLIENT_ERROR', retryable: false };
  }

  if (!error.response) {
    const isTimeout = error.code === 'ECONNABORTED';
    return {
      message: isTimeout
        ? 'Máy chủ phản hồi quá chậm. Vui lòng thử lại.'
        : 'Không kết nối được máy chủ. Vui lòng kiểm tra hệ thống đang hoạt động.',
      code: isTimeout ? 'REQUEST_TIMEOUT' : 'SERVICE_UNREACHABLE',
      retryable: true,
    };
  }

  return {
    message: error.response.data?.error || fallbackMessage,
    code: error.response.data?.code || `HTTP_${error.response.status}`,
    requestId: error.response.data?.requestId,
    retryable: Boolean(error.response.data?.retryable),
  };
}

export function formatApiError(error: unknown, fallbackMessage: string) {
  const info = getApiErrorInfo(error, fallbackMessage);
  const reference = info.requestId ? ` · Mã tra cứu: ${info.requestId}` : '';
  return `${info.message} · Mã lỗi: ${info.code}${reference}`;
}
