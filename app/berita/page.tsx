import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('berita');
  return {
    title: categoryLabel,
    description: 'Kumpulan liputan berita terkini, peristiwa, kebijakan daerah, dan informasi publik seputar Sukabumi dan sekitarnya.',
    openGraph: {
      title: `${categoryLabel} Sukabumi | JurnalWave`,
      description: 'Kumpulan liputan berita terkini, peristiwa, kebijakan daerah, dan informasi publik seputar Sukabumi dan sekitarnya.',
    },
  };
}

export default async function BeritaPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('berita'),
  ]);

  const beritaArticles = allArticles.filter(
    a =>
      a.category === 'berita' ||
      (a.categoryLabel && a.categoryLabel.toUpperCase().includes('BERITA'))
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Kumpulan liputan berita terkini, peristiwa, kebijakan daerah, dan informasi publik seputar Sukabumi"
      articles={beritaArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
