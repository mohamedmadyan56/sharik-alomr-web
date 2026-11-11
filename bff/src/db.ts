import { PrismaClient } from '@prisma/client';
import { config } from './config';

/**
 * عميل Prisma الخاص بالـ BFF — يتصل بنفس قاعدة بيانات الموبايل.
 * لا يكتب في جداول الموبايل إلا في حدود الحقول المشتركة (users / wallets ...).
 */
export const prisma = new PrismaClient({
  datasources: { db: { url: config.databaseUrl } },
  log: config.isProduction ? ['error'] : ['warn', 'error'],
});
