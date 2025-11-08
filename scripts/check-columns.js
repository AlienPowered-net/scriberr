import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const result = await prisma.$queryRaw`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'NoteVersion' 
    AND column_name IN ('saveType', 'freeVisible')
  `;
  console.log('Columns found:', result);
  
  if (result.length === 2) {
    console.log('✓ Both saveType and freeVisible columns exist');
    process.exit(0);
  } else {
    console.log('✗ Columns missing. Found:', result.map(r => r.column_name));
    process.exit(1);
  }
} catch (error) {
  console.log('Error:', error.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

