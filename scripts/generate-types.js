#!/usr/bin/env node

/**
 * Script para generar tipos TypeScript desde Supabase
 * Uso: node scripts/generate-types.js
 */

const { execSync } = require('child_process');
const path = require('path');

// Colores para la consola
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function main() {
  log('🔄 Generando tipos TypeScript desde Supabase...', 'blue');

  try {
    // Verificar que supabase CLI esté instalado
    try {
      execSync('supabase --version', { stdio: 'ignore' });
    } catch (_error) {
      log('❌ Supabase CLI no está instalado', 'red');
      log('💡 Instálalo con: npm install -g supabase', 'yellow');
      process.exit(1);
    }

    // Verificar variables de entorno
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const missingVars = requiredEnvVars.filter(
      varName => !process.env[varName]
    );

    if (missingVars.length > 0) {
      log(
        `❌ Variables de entorno faltantes: ${missingVars.join(', ')}`,
        'red'
      );
      log('💡 Configura tu archivo .env.local', 'yellow');
      process.exit(1);
    }

    // Generar tipos
    const outputPath = path.join(
      __dirname,
      '..',
      'src',
      'types',
      'supabase.ts'
    );
    const projectRef =
      process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];

    const command = `supabase gen types typescript --project-id ${projectRef} > ${outputPath}`;

    log('📡 Conectando con Supabase...', 'yellow');
    execSync(command, { stdio: 'inherit' });

    log('✅ Tipos generados exitosamente en src/types/supabase.ts', 'green');
    log('🎉 ¡Listo para usar con TypeScript!', 'green');
  } catch (_error) {
    log('❌ Error generando tipos:', 'red');
    log(_error.message, 'red');
    log(
      '💡 Asegúrate de que tu proyecto Supabase esté configurado correctamente',
      'yellow'
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
