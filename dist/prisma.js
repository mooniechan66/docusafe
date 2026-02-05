"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
// Prevent exhausting DB connections in dev/hot-reload.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = global;
function createPrismaClient() {
    // Prisma Client Engine requires a driver adapter (engineType="client").
    // Use better-sqlite3 for local/dev.
    const dbPath = process.env.DATABASE_URL?.startsWith('file:')
        ? process.env.DATABASE_URL.replace(/^file:/, '')
        : './dev.db';
    const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({ url: dbPath });
    // Prisma v7 requires a non-empty options object.
    return new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
    });
}
exports.prisma = globalForPrisma.prisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map