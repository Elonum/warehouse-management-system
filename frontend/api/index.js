/**
 * API Client Entry Point
 * 
 * По умолчанию использует Mock API для разработки без backend
 * 
 * Для переключения на реальный API:
 * 1. Установите VITE_API_URL в .env файле
 * 2. Или измените импорт ниже на './apiClient'
 */

// По умолчанию используем mock API (для разработки без backend)
export { api } from './mockApiClient';
export { api as default } from './mockApiClient';

// Для использования реального API раскомментируйте строки ниже и закомментируйте строки выше:
// export { api } from './apiClient';
// export { api as default } from './apiClient';
