const jwt = require('jsonwebtoken');
const { signToken } = require('../src/utils/jwt');
const { isMember, isScrumMaster } = require('../src/utils/roles');

describe('JWT utility', () => {
  it('creates a verifiable token', () => {
    process.env.JWT_SECRET = 'unit-test-secret';
    const token = signToken({ _id: '507f191e810c19729de860ea', email: 'user@example.com' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.userId).toBe('507f191e810c19729de860ea');
    expect(decoded.email).toBe('user@example.com');
  });
});

describe('Role utilities', () => {
  const members = [
    { user: 'user-1', role: 'scrum_master' },
    { user: 'user-2', role: 'player' },
  ];

  it('detects scrum master permissions', () => {
    expect(isScrumMaster(members, 'user-1')).toBe(true);
    expect(isScrumMaster(members, 'user-2')).toBe(false);
  });

  it('detects room membership', () => {
    expect(isMember(members, 'user-2')).toBe(true);
    expect(isMember(members, 'user-3')).toBe(false);
  });
});
