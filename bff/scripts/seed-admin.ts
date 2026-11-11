import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * تهيئة حساب إدارة أول (Super Admin).
 * كلمة المرور تُقرأ من ADMIN_BOOTSTRAP_PASSWORD، وإن لم توجد تُولَّد عشوائيًا
 * وتُحفظ في secrets/admin-bootstrap.txt بصلاحيات 0600 — ولا تُطبع في السجل.
 */
async function main(): Promise<void> {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@sharik-alomr.com')
    .trim()
    .toLowerCase();
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'مدير النظام';

  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  let generated = false;
  if (!password) {
    password = randomBytes(18).toString('base64url');
    generated = true;
  }
  if (password.length < 10) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD يجب أن يكون 10 أحرف على الأقل');
  }

  const role = await prisma.adminRole.findUnique({ where: { key: 'super_admin' } });
  if (!role) {
    throw new Error('دور super_admin غير موجود — طبّق seed الأدوار أولًا');
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  const admin = await prisma.$transaction(async (tx) => {
    const existing = await tx.admin.findUnique({ where: { email } });
    const row = existing
      ? await tx.admin.update({
          where: { id: existing.id },
          data: { name, passwordHash, status: 'active' },
        })
      : await tx.admin.create({
          data: { name, email, passwordHash, status: 'active' },
        });

    await tx.adminUserRole.deleteMany({ where: { adminId: row.id } });
    await tx.adminUserRole.create({
      data: { adminId: row.id, roleId: role.id },
    });

    await tx.auditLog
      .create({
        data: {
          actorAdminId: row.id,
          actorRole: 'super_admin',
          action: existing ? 'admin.bootstrap_password_reset' : 'admin.bootstrap_create',
          targetType: 'admin',
          targetId: row.id,
          reason: 'تهيئة حساب الإدارة من سكربت النشر',
        },
      })
      .catch(() => undefined);

    return row;
  });

  if (generated) {
    const dir = resolve(process.cwd(), '..', 'secrets');
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, 'admin-bootstrap.txt');
    writeFileSync(file, `email=${email}\npassword=${password}\n`, { mode: 0o600 });
    console.info(`[seed-admin] تم إنشاء كلمة مرور عشوائية وحفظها في: ${file}`);
  }

  console.info(`[seed-admin] الحساب الإداري جاهز: ${admin.email} (super_admin)`);
}

void main()
  .catch((error) => {
    console.error('[seed-admin] failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
