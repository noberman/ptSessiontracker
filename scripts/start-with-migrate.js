#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🔧 Running database migrations...');

// Run migrations
const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true
});

migrate.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Migrations completed successfully');
  } else {
    console.log('⚠️  Migration failed with code', code, 'but continuing to start the app...');
  }
  
  // Start the app regardless of migration result
  console.log('🚀 Starting application...');
  const start = spawn('npm', ['run', 'start:app'], {
    stdio: 'inherit',
    shell: true
  });
  
  start.on('close', (code) => {
    process.exit(code);
  });
});