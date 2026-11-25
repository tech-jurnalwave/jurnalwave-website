import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('tech');
  return {
    title: categoryLabel,
    description: 'Kabar dunia teknologi, game, E-Sport, AI, gadget terbaru, dan tren digital anak muda.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Kabar dunia teknologi, game, E-Sport, AI, gadget terbaru, dan tren digital anak muda.',
    },
  };
}

export default async function TechPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('tech'),
  ]);

  const techArticles = allArticles.filter(
    a =>
      a.category === 'tech' ||
      a.category === 'game' ||
      (a.categoryLabel && (
        a.categoryLabel.toUpperCase() === 'TECH' ||
        a.categoryLabel.toUpperCase() === 'TEKNOLOGI' ||
        a.categoryLabel.toUpperCase() === 'GAME' ||
        a.categoryLabel.toUpperCase().includes('TECH')
      )) ||
      ((a.subCategory || '').toUpperCase() === 'TECH')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Kabar seputar teknologi, gadget, game, E-Sport, dan tren digital anak muda"
      articles={techArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
