const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const auditCount = await prisma.adminAuditLog.count();
    const tokenCount = await prisma.tempAuthToken.count();
    console.log('✅ Super admin tables exist!');
    console.log('AdminAuditLog records:', auditCount);
    console.log('TempAuthToken records:', tokenCount);
    
    // Check if SUPER_ADMIN role exists
    const superAdmins = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });
    console.log('Super admin users:', superAdmins);
    
  } catch (error) {
    console.error('❌ Tables might not exist:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();