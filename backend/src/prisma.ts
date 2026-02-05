import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Prevent exhausting DB connections in dev/hot-reload.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = global as any;

function createPrismaClient() {
  // Prisma Client Engine requires a driver adapter (engineType="client").
  // Use better-sqlite3 for local/dev.
  const dbPath = process.env.DATABASE_URL?.startsWith('file:')
    ? process.env.DATABASE_URL.replace(/^file:/, '')
    : './dev.db';

  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  // Prisma v7 requires a non-empty options object.
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
