import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('sport');
  return {
    title: categoryLabel,
    description: 'Kabar sepak bola Persib, Timnas Indonesia, liga top dunia, dan olahraga anak muda.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Kabar sepak bola Persib, Timnas Indonesia, liga top dunia, dan olahraga anak muda.',
    },
  };
}

export default async function SportPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('sport'),
  ]);

  const sportArticles = allArticles.filter(
    a =>
      a.category === 'sport' ||
      (a.categoryLabel && (
        a.categoryLabel.toUpperCase() === 'SPORT' ||
        a.categoryLabel.toUpperCase().includes('SPORT')
      )) ||
      ((a.subCategory || '').toUpperCase() === 'SPORT')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Kabar seputar sepak bola Persib, Timnas Indonesia, kompetisi lokal, dan olahraga anak muda"
      articles={sportArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
