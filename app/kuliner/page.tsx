import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('kuliner');
  return {
    title: categoryLabel,
    description: 'Rekomendasi kafe estetik, tempat nongkrong, jajanan hits, dan kuliner terbaik Sukabumi.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Rekomendasi kafe estetik, tempat nongkrong, jajanan hits, dan kuliner terbaik Sukabumi.',
    },
  };
}

export default async function KulinerPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('kuliner'),
  ]);

  const kulinerArticles = allArticles.filter(
    a =>
      a.category === 'kuliner' ||
      (a.categoryLabel && a.categoryLabel.toUpperCase().includes('KULINER')) ||
      ((a.subCategory || '').toUpperCase() === 'CULINARY') ||
      a.title.toLowerCase().includes('kuliner') ||
      a.title.toLowerCase().includes('kafe') ||
      a.title.toLowerCase().includes('kopi') ||
      a.title.toLowerCase().includes('jajan')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Rekomendasi kafe estetik, tempat nongkrong, jajanan hits, dan kuliner terbaik Sukabumi"
      articles={kulinerArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
