#!/usr/bin/env node

/**
 * Environment Verification Script for BudgetUp
 * Verifies that all required environment variables are set
 * and validates their format where applicable
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Required environment variables
const requiredEnvVars = {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: {
    description: 'Supabase project URL',
    validator: value => {
      const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.co$/;
      return urlPattern.test(value);
    },
    example: 'https://your-project.supabase.co',
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    description: 'Supabase anonymous/public key',
    validator: value => {
      // Supabase anon keys are JWT tokens, should start with 'eyJ'
      return value && value.startsWith('eyJ') && value.length > 100;
    },
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key (server-side only)',
    validator: value => {
      // Service role keys are also JWT tokens
      return value && value.startsWith('eyJ') && value.length > 100;
    },
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    serverOnly: true,
  },
};

// Optional environment variables with defaults
const optionalEnvVars = {
  NODE_ENV: {
    description: 'Node environment',
    default: 'development',
    validator: value => ['development', 'production', 'test'].includes(value),
  },
  PORT: {
    description: 'Server port',
    default: '3000',
    validator: value => {
      const port = parseInt(value);
      return !isNaN(port) && port > 0 && port < 65536;
    },
  },
  NEXT_PUBLIC_APP_URL: {
    description: 'Application base URL',
    default: 'http://localhost:3000',
    validator: value => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
  },
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envPath)) {
    logError('.env.local file not found');

    if (fs.existsSync(envExamplePath)) {
      logInfo(
        'Found .env.example file. Copy it to .env.local and fill in the values:'
      );
      log(`  cp .env.example .env.local`, 'cyan');
    } else {
      logInfo(
        'Create a .env.local file with the required environment variables'
      );
    }

    return false;
  }

  logSuccess('.env.local file found');
  return true;
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });

  return envVars;
}

function validateEnvironmentVariables() {
  const envVars = { ...process.env, ...loadEnvFile() };
  let hasErrors = false;
  let hasWarnings = false;

  log('\n📋 Checking required environment variables:', 'bold');

  // Check required variables
  for (const [varName, config] of Object.entries(requiredEnvVars)) {
    const value = envVars[varName];

    if (!value) {
      logError(`${varName} is missing`);
      logInfo(`  Description: ${config.description}`);
      logInfo(`  Example: ${config.example}`);
      hasErrors = true;
      continue;
    }

    if (config.validator && !config.validator(value)) {
      logError(`${varName} has invalid format`);
      logInfo(`  Description: ${config.description}`);
      logInfo(`  Example: ${config.example}`);
      hasErrors = true;
      continue;
    }

    // Mask sensitive values in output
    const displayValue =
      config.serverOnly || varName.includes('KEY')
        ? `${value.substring(0, 10)}...`
        : value;

    logSuccess(`${varName} = ${displayValue}`);
  }

  log('\n📋 Checking optional environment variables:', 'bold');

  // Check optional variables
  for (const [varName, config] of Object.entries(optionalEnvVars)) {
    const value = envVars[varName] || config.default;

    if (!envVars[varName]) {
      logWarning(`${varName} not set, using default: ${config.default}`);
      hasWarnings = true;
    } else if (config.validator && !config.validator(value)) {
      logError(`${varName} has invalid format: ${value}`);
      logInfo(`  Description: ${config.description}`);
      hasErrors = true;
    } else {
      logSuccess(`${varName} = ${value}`);
    }
  }

  return { hasErrors, hasWarnings };
}

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  log('\n🔧 Checking Node.js version:', 'bold');

  if (majorVersion < 18) {
    logError(
      `Node.js ${nodeVersion} is not supported. Please use Node.js 18 or higher.`
    );
    return false;
  }

  logSuccess(`Node.js ${nodeVersion} ✓`);
  return true;
}

function checkPackageManager() {
  log('\n📦 Checking package manager:', 'bold');

  // Check if pnpm is available
  try {
    const { execSync } = require('child_process');
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    logSuccess(`pnpm ${pnpmVersion} ✓`);
    return true;
  } catch (_error) {
    logError('pnpm is not installed or not available in PATH');
    logInfo('Install pnpm: npm install -g pnpm');
    return false;
  }
}

function generateEnvExample() {
  const envExamplePath = path.join(process.cwd(), '.env.example');

  let content = '# BudgetUp Environment Variables\n';
  content += '# Copy this file to .env.local and fill in the actual values\n\n';

  content += '# Supabase Configuration\n';
  content += '# Get these from your Supabase project settings\n';
  for (const [varName, config] of Object.entries(requiredEnvVars)) {
    content += `${varName}=${config.example}\n`;
  }

  content += '\n# Optional Configuration\n';
  for (const [varName, config] of Object.entries(optionalEnvVars)) {
    content += `# ${varName}=${config.default}\n`;
  }

  fs.writeFileSync(envExamplePath, content);
  logInfo(`Generated .env.example file`);
}

function main() {
  log('🚀 BudgetUp Environment Verification', 'bold');
  log('=====================================\n', 'bold');

  let allChecksPass = true;

  // Check Node.js version
  if (!checkNodeVersion()) {
    allChecksPass = false;
  }

  // Check package manager
  if (!checkPackageManager()) {
    allChecksPass = false;
  }

  // Check if .env.local exists
  const envFileExists = checkEnvFile();

  // Generate .env.example if it doesn't exist
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    generateEnvExample();
  }

  if (!envFileExists) {
    allChecksPass = false;
  } else {
    // Validate environment variables
    const { hasErrors, hasWarnings } = validateEnvironmentVariables();

    if (hasErrors) {
      allChecksPass = false;
    }

    if (hasWarnings) {
      log(
        '\n⚠️  Some optional environment variables are using default values',
        'yellow'
      );
    }
  }

  // Final summary
  log('\n' + '='.repeat(50), 'bold');

  if (allChecksPass) {
    logSuccess('🎉 All environment checks passed!');
    logInfo('Your development environment is ready.');
    process.exit(0);
  } else {
    logError('❌ Environment verification failed');
    logInfo('Please fix the issues above before running the application.');
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironmentVariables,
  checkNodeVersion,
  checkPackageManager,
};
