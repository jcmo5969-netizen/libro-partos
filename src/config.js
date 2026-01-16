// Configuración de la aplicación
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const IS_PRODUCTION = import.meta.env.PROD;
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Libro de Partos';

// Configuración de exportaciones
export const EXPORT_CONFIG = {
  maxRowsExcel: 100000,
  dateFormat: 'DD-MM-YYYY',
  timeFormat: 'HH:mm'
};

// Configuración de la API
export const API_CONFIG = {
  timeout: 30000, // 30 segundos
  retries: 3
};

// Logs solo en desarrollo
export const enableLogs = () => {
  if (!IS_PRODUCTION) {
    console.log('🔧 Modo desarrollo');
    console.log('📡 API URL:', API_URL);
  }
};

enableLogs();

