import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('sport');
  return {
    title: `${categoryLabel} | JurnalWave`,
    description: 'Kabar sepak bola Persib, Timnas Indonesia, E-Sport, turnamen game, liga top dunia, dan olahraga anak muda.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Kabar sepak bola Persib, Timnas Indonesia, E-Sport, turnamen game, liga top dunia, dan olahraga anak muda.',
    },
  };
}

export default async function SportEsportPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('sport'),
  ]);

  const sportArticles = allArticles.filter(
    (a) =>
      a.category === 'sport' ||
      a.category === 'sport-esport' ||
      a.category === 'esport' ||
      (a.categoryLabel && (
        a.categoryLabel.toUpperCase().includes('SPORT') ||
        a.categoryLabel.toUpperCase().includes('OLAHRAGA') ||
        a.categoryLabel.toUpperCase().includes('ESPORT')
      )) ||
      ((a.subCategory || '').toUpperCase() === 'SPORT') ||
      ((a.subCategory || '').toUpperCase() === 'ESPORT') ||
      a.title.toLowerCase().includes('persib') ||
      a.title.toLowerCase().includes('sepak bola')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Kabar seputar sepak bola Persib, Timnas Indonesia, kompetisi lokal, E-Sport, dan olahraga anak muda"
      articles={sportArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
