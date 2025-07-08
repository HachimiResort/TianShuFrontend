export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  appEnv: import.meta.env.VITE_APP_ENV,
  isDebug: import.meta.env.VITE_DEBUG === 'true',
  isDevelopment: import.meta.env.VITE_APP_ENV === 'development',
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
} as const;


// 导出常用的配置
export const { apiBaseUrl, appEnv, isDebug, isDevelopment, isProduction } = config;