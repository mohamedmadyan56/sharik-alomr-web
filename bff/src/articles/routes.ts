import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db';
import { asyncHandler, ok } from '../http/envelope';
import { ApiError } from '../http/errors';
import { validate } from '../http/validate';
import { categoryNameEn } from './categories';

export const articlesRouter = Router();

const ARTICLE_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverUrl: true,
  readTimeMinutes: true,
  isFeatured: true,
  views: true,
  likes: true,
  bookmarkCount: true,
  publishedAt: true,
  category: { select: { id: true, key: true, nameAr: true } },
} satisfies Prisma.BlogArticleSelect;

function mapCategory<T extends { key: string; nameAr: string } | null>(category: T) {
  if (!category) return null;
  return { ...category, nameEn: categoryNameEn(category.key, category.nameAr) };
}

/** تصنيفات المدونة — نفس مسار الموبايل مع ترجمة إنجليزية إضافية. */
articlesRouter.get(
  '/blog/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.blogCategory.findMany({ orderBy: { nameAr: 'asc' } });
    return ok(
      res,
      categories.map((category) => ({
        ...category,
        nameEn: categoryNameEn(category.key, category.nameAr),
      })),
    );
  }),
);

/**
 * قائمة المقالات المنشورة.
 * تدعم categoryId أو category (key)، وsearch، وfeatured، وbefore (id للمقال).
 */
articlesRouter.get(
  '/blog/articles',
  asyncHandler(async (req, res) => {
    const query = validate(
      z.object({
        categoryId: z.string().optional(),
        category: z.string().trim().optional(),
        featured: z.enum(['true', 'false']).optional(),
        search: z.string().trim().max(100).optional(),
        limit: z.coerce.number().int().min(1).max(50).default(20),
        before: z.string().optional(),
      }),
      req.query,
    );

    let cursor: Date | undefined;
    if (query.before) {
      const pivot = await prisma.blogArticle.findUnique({
        where: { id: query.before },
        select: { publishedAt: true },
      });
      cursor = pivot?.publishedAt ?? undefined;
    }

    const where: Prisma.BlogArticleWhereInput = {
      status: 'published',
      ...(query.categoryId
        ? { categoryId: query.categoryId }
        : query.category
          ? { category: { key: query.category } }
          : {}),
      ...(query.featured === 'true' ? { isFeatured: true } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { excerpt: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(cursor ? { publishedAt: { lt: cursor } } : {}),
    };

    const articles = await prisma.blogArticle.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: query.limit,
      select: ARTICLE_LIST_SELECT,
    });

    return ok(res, {
      results: articles.map((article) => ({
        ...article,
        category: mapCategory(article.category),
      })),
      hasMore: articles.length === query.limit,
    });
  }),
);

/** تفاصيل مقال منشور — يقبل slug أو id، ويزيد عدّاد المشاهدات. */
articlesRouter.get(
  '/blog/articles/:slugOrId',
  asyncHandler(async (req, res) => {
    const identifier = req.params.slugOrId;
    const article = await prisma.blogArticle.findFirst({
      where: {
        status: 'published',
        OR: [{ slug: identifier }, { id: identifier }],
      },
      include: {
        category: true,
        _count: { select: { comments: true } },
      },
    });

    if (!article) throw ApiError.notFound('المقال غير موجود');

    await prisma.blogArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });

    return ok(res, {
      ...article,
      views: article.views + 1,
      category: mapCategory(article.category),
    });
  }),
);
