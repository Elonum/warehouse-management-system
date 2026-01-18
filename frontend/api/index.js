/**
 * API Client Entry Point
 * 
 * По умолчанию использует реальный API клиент
 * 
 * Для переключения на Mock API (для разработки без backend):
 * 1. Закомментируйте строки ниже
 * 2. Раскомментируйте строки с mockApiClient
 */

// Используем реальный API клиент
import { api as apiClient, ApiError } from './apiClient';

export { apiClient as api, ApiError };
export { apiClient as default };

// Для использования Mock API (для разработки без backend) раскомментируйте строки ниже:
// export { api } from './mockApiClient';
// export { api as default } from './mockApiClient';
