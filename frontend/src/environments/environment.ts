// Production-time config. Empty base => same-origin (served behind a proxy).
export const environment = {
  production: true,
  apiBase: '/api',
  wsBase: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
};
