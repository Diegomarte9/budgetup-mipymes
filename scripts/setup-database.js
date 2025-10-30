#!/usr/bin/env node

/**
 * Database Setup Script for BudgetUp MiPymes
 * 
 * This script helps set up the database schema by providing instructions
 * and validating the environment configuration.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}✗ ${message}${colors.reset}`);
}

function checkEnvironment() {
  logHeader('Environment Check');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is missing`);
      allPresent = false;
    }
  }
  
  if (!allPresent) {
    logError('Please set all required environment variables in .env.local');
    process.exit(1);
  }
  
  return true;
}

function listMigrationFiles() {
  logHeader('Available Migration Files');
  
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  const seedsDir = path.join(__dirname, '..', 'database', 'seeds');
  
  if (!fs.existsSync(migrationsDir)) {
    logError('Migrations directory not found');
    return;
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  log('\nMigration files (execute in this order):');
  migrationFiles.forEach((file, index) => {
    log(`  ${index + 1}. ${file}`, colors.cyan);
  });
  
  if (fs.existsSync(seedsDir)) {
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    log('\nSeed files (execute after migrations):');
    seedFiles.forEach((file, index) => {
      log(`  ${index + 1}. ${file}`, colors.magenta);
    });
  }
}

function showInstructions() {
  logHeader('Database Setup Instructions');
  
  log('\nTo set up your database, you have several options:\n');
  
  log(`${colors.bright}Option 1: Supabase Dashboard${colors.reset}`);
  log('1. Go to your Supabase project dashboard');
  log('2. Navigate to SQL Editor');
  log('3. Copy and paste each migration file in order');
  log('4. Execute each migration');
  
  log(`\n${colors.bright}Option 2: Supabase CLI (if configured)${colors.reset}`);
  log('1. Install Supabase CLI: npm install -g supabase');
  log('2. Initialize: supabase init');
  log('3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF');
  log('4. Apply migrations: supabase db push');
  
  log(`\n${colors.bright}Option 3: Direct SQL Connection${colors.reset}`);
  log('1. Connect to your PostgreSQL database');
  log('2. Execute migration files in order');
  log('3. Execute seed files');
  
  logWarning('\nIMPORTANT: Always backup your database before applying migrations!');
}

function validateMigrationFiles() {
  logHeader('Migration File Validation');
  
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logError('Migrations directory not found');
    return false;
  }
  
  const expectedFiles = [
    '001_initial_schema.sql',
    '002_rls_functions_and_policies.sql',
    '003_views_and_functions.sql',
    '004_audit_triggers.sql'
  ];
  
  let allPresent = true;
  
  for (const file of expectedFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`${file} exists`);
    } else {
      logError(`${file} is missing`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

function main() {
  log(`${colors.bright}${colors.blue}BudgetUp MiPymes - Database Setup${colors.reset}`);
  log('This script helps you set up the database schema for BudgetUp.\n');
  
  // Check environment variables
  checkEnvironment();
  
  // Validate migration files
  if (!validateMigrationFiles()) {
    logError('Some migration files are missing. Please check the database/migrations directory.');
    process.exit(1);
  }
  
  // List available files
  listMigrationFiles();
  
  // Show setup instructions
  showInstructions();
  
  logHeader('Next Steps');
  log('1. Choose one of the options above to apply the migrations');
  log('2. After applying migrations, run: pnpm run supabase:types');
  log('3. Verify the setup by checking your Supabase dashboard');
  
  logSuccess('\nDatabase setup script completed successfully!');
}

// Run the script
main();