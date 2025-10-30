#!/usr/bin/env node

/**
 * Migration Validation Script
 * 
 * This script validates the SQL syntax of migration files
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
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}✗ ${message}${colors.reset}`);
}

function validateSQLFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic SQL syntax checks
    const issues = [];
    
    // Check for unmatched parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }
    
    // Check for unmatched quotes
    const singleQuotes = (content.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      issues.push('Unmatched single quotes');
    }
    
    // Check for common SQL syntax patterns
    if (content.includes('CREATE TABLE') && !content.includes(';')) {
      issues.push('CREATE TABLE statement may be missing semicolon');
    }
    
    // Check for proper function syntax
    const functionMatches = content.match(/CREATE.*FUNCTION.*\(/g);
    if (functionMatches) {
      functionMatches.forEach((match, index) => {
        const functionStart = content.indexOf(match);
        const afterFunction = content.substring(functionStart);
        if (!afterFunction.includes('LANGUAGE')) {
          issues.push(`Function ${index + 1} may be missing LANGUAGE clause`);
        }
      });
    }
    
    return issues;
  } catch (error) {
    return [`Error reading file: ${error.message}`];
  }
}

function main() {
  log(`${colors.bright}${colors.blue}Migration Validation${colors.reset}\n`);
  
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    logError('Migrations directory not found');
    process.exit(1);
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  let hasErrors = false;
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const issues = validateSQLFile(filePath);
    
    if (issues.length === 0) {
      logSuccess(`${file} - No issues found`);
    } else {
      logError(`${file} - Issues found:`);
      issues.forEach(issue => {
        log(`  • ${issue}`, colors.yellow);
      });
      hasErrors = true;
    }
  }
  
  if (hasErrors) {
    log(`\n${colors.red}Some migration files have potential issues. Please review them.${colors.reset}`);
    process.exit(1);
  } else {
    log(`\n${colors.green}All migration files passed basic validation!${colors.reset}`);
  }
}

// Run the script
main();