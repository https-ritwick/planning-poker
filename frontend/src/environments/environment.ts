// Production-time config. Empty base => same-origin (served behind a proxy).
export const environment = {
  production: true,
  apiBase: 'https://planning-poker-backend.onrender.com',
  wsBase: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
};
