// Application constants for BudgetUp MiPymes

export const APP_CONFIG = {
  name: 'BudgetUp para MiPymes',
  description:
    'Gestión financiera simple y efectiva para micro y pequeñas empresas dominicanas',
  version: '1.0.0',
  locale: 'es-DO',
  currency: 'DOP',
  timezone: 'America/Santo_Domingo',
} as const;

export const ROUTES = {
  // Public routes
  HOME: '/',

  // Auth routes
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  ONBOARDING: '/auth/onboarding',

  // Dashboard routes
  DASHBOARD: '/dashboard',
  TRANSACTIONS: '/transactions',
  ACCOUNTS: '/accounts',
  CATEGORIES: '/categories',
  REPORTS: '/reports',
  SETTINGS: '/settings',

  // API routes
  API: {
    AUTH: '/api/auth',
    ORGANIZATIONS: '/api/organizations',
    TRANSACTIONS: '/api/transactions',
    ACCOUNTS: '/api/accounts',
    CATEGORIES: '/api/categories',
    REPORTS: '/api/reports',
    METRICS: '/api/metrics',
  },
} as const;

export const BUSINESS_CONFIG = {
  // Dominican Republic specific
  defaultCurrency: 'DOP',
  defaultITBIS: 18, // 18% ITBIS rate

  // Account types
  accountTypes: [
    { value: 'cash', label: 'Efectivo' },
    { value: 'bank', label: 'Banco' },
    { value: 'credit_card', label: 'Tarjeta de Crédito' },
  ],

  // Transaction types
  transactionTypes: [
    { value: 'income', label: 'Ingreso', shortcut: 'i' },
    { value: 'expense', label: 'Gasto', shortcut: 'e' },
    { value: 'transfer', label: 'Transferencia', shortcut: 't' },
  ],

  // User roles
  roles: [
    { value: 'owner', label: 'Propietario' },
    { value: 'admin', label: 'Administrador' },
    { value: 'member', label: 'Miembro' },
  ],

  // Default categories for Dominican SMEs
  defaultCategories: {
    income: ['Ventas', 'Servicios', 'Intereses', 'Otros Ingresos'],
    expense: [
      'Nómina',
      'Renta',
      'Servicios Públicos',
      'Combustible',
      'Mantenimiento',
      'Suministros de Oficina',
      'Marketing',
      'Impuestos',
      'Seguros',
      'Otros Gastos',
    ],
  },
} as const;

export const UI_CONFIG = {
  // Pagination
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50, 100],

  // Date formats
  dateFormat: 'dd/MM/yyyy',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',

  // Currency format
  currencyFormat: {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },

  // Theme
  defaultTheme: 'system',

  // Toast duration
  toastDuration: 4000,
} as const;

export const VALIDATION_CONFIG = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // Transaction limits
  transaction: {
    maxAmount: 999999999.99,
    minAmount: 0.01,
    maxDescriptionLength: 500,
    maxNotesLength: 1000,
  },

  // Organization limits
  organization: {
    maxNameLength: 100,
    maxMembersPerOrg: 50,
  },

  // File upload
  fileUpload: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
} as const;
