const { PrismaClient } = require('@prisma/client');

// Use staging database directly
process.env.DATABASE_URL = "postgresql://postgres:ACyQysrYpxpwXqsPagIgKmPUylApGhQR@turntable.proxy.rlwy.net:24999/railway";

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('=== CHECKING STAGING DATABASE STATE ===\n');
  
  try {
    // Check which tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('📋 TABLES THAT EXIST:');
    const tableNames = tables.map(t => t.table_name);
    tableNames.forEach(t => console.log(`  ✓ ${t}`));
    
    // Check for specific tables we expect
    const expectedTables = [
      'users', 'organizations', 'locations', 'sessions', 'clients', 
      'packages', 'commission_tiers', 'invitations', 'package_types',
      'admin_audit_logs', 'temp_auth_tokens'
    ];
    
    console.log('\n📊 EXPECTED TABLES CHECK:');
    for (const table of expectedTables) {
      if (tableNames.includes(table)) {
        console.log(`  ✅ ${table} exists`);
      } else {
        console.log(`  ❌ ${table} MISSING`);
      }
    }
    
    // Check ENUMs
    console.log('\n🏷️ ENUMS THAT EXIST:');
    const enums = await prisma.$queryRaw`
      SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      GROUP BY t.typname;
    `;
    
    for (const enumType of enums) {
      console.log(`  ${enumType.typname}: [${enumType.values.join(', ')}]`);
    }
    
    // Check specific columns on organizations table
    if (tableNames.includes('organizations')) {
      console.log('\n🏢 ORGANIZATIONS TABLE COLUMNS:');
      const orgColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        ORDER BY ordinal_position;
      `;
      
      const importantColumns = [
        'subscriptionTier', 'commissionMethod', 'isClone', 'clonedFrom', 
        'clonedAt', 'adminNotes', 'lastIssue', 'lastIssueDate'
      ];
      
      const columnNames = orgColumns.map(c => c.column_name);
      for (const col of importantColumns) {
        if (columnNames.includes(col.toLowerCase())) {
          console.log(`  ✅ ${col} exists`);
        } else {
          console.log(`  ❌ ${col} MISSING`);
        }
      }
    }
    
    // Check if Role enum has SUPER_ADMIN
    console.log('\n👤 ROLE ENUM VALUES:');
    const roleValues = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
      ORDER BY enumsortorder;
    `;
    
    const roles = roleValues.map(r => r.enumlabel);
    console.log(`  Current values: [${roles.join(', ')}]`);
    if (roles.includes('SUPER_ADMIN')) {
      console.log('  ✅ SUPER_ADMIN role exists');
    } else {
      console.log('  ❌ SUPER_ADMIN role MISSING');
    }
    
    // Check migrations table
    console.log('\n📝 MIGRATIONS MARKED AS APPLIED:');
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at DESC
      LIMIT 15;
    `;
    
    for (const m of migrations) {
      console.log(`  - ${m.migration_name}`);
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();