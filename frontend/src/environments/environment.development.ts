// Dev config — ng serve proxies /api and /ws to the FastAPI backend on :8000.
export const environment = {
  production: false,
  apiBase: '/api',
  wsBase: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
};
