#!/usr/bin/env node

const { spawn, execSync } = require('child_process');

console.log('🔧 Checking database migrations...');

try {
  // Check migration status first
  const status = execSync('npx prisma migrate status', { encoding: 'utf8' });
  
  if (status.includes('Database schema is up to date')) {
    console.log('✅ Database is already up to date, skipping migrations');
    startApp();
  } else {
    console.log('📦 Applying pending migrations...');
    
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
      startApp();
    });
  }
} catch (error) {
  console.log('⚠️  Could not check migration status, attempting to start app anyway...');
  startApp();
}

function startApp() {
  console.log('🚀 Starting application...');
  const start = spawn('npm', ['run', 'start:app'], {
    stdio: 'inherit',
    shell: true
  });
  
  start.on('close', (code) => {
    process.exit(code);
  });
}