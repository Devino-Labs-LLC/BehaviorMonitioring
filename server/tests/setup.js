// Setup for server tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.ClientHost = 'http://localhost:3000';
process.env.HOST = 'http://localhost';
process.env.PORT = '5000';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';
process.env.BUSINESS_EMAIL = 'test@bmetrics.com';
process.env.POC_Email = 'admin@bmetrics.com';
process.env.Resend_API_KEY = 'test-resend-key';
process.env.Brevo_API_KEY = 'test-brevo-key';

// Mock Sequelize models
jest.mock('../models', () => {
  const mockModel = {
    findOne: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
  };

  return {
    sequelize: {
      authenticate: jest.fn().mockResolvedValue(true),
      sync: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(true),
    },
    Client: mockModel,
    Employee: mockModel,
    Home: mockModel,
    BehaviorAndSkill: mockModel,
    BehaviorData: mockModel,
    SkillData: mockModel,
    SessionNoteData: mockModel,
    CompanyData: mockModel,
    RefreshToken: mockModel,
    AuthLog: mockModel,
  };
});

// Suppress console.error in tests
globalThis.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
