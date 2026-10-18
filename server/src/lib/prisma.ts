import { PrismaClient } from '@prisma/client';

declare const globalThis: {
  prismaGlobal?: PrismaClient;
} & typeof global;

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
