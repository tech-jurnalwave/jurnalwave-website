import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('wisata');
  return {
    title: categoryLabel,
    description: 'Spot wisata alam, pantai, curug, camping ground, dan destinasi healing terbaik di Sukabumi.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Spot wisata alam, pantai, curug, camping ground, dan destinasi healing terbaik di Sukabumi.',
    },
  };
}

export default async function WisataPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('wisata'),
  ]);

  const wisataArticles = allArticles.filter(
    a =>
      a.category === 'wisata' ||
      (a.categoryLabel && a.categoryLabel.toUpperCase().includes('WISATA')) ||
      ((a.subCategory || '').toUpperCase() === 'TRAVELING') ||
      a.title.toLowerCase().includes('wisata') ||
      a.title.toLowerCase().includes('pantai') ||
      a.title.toLowerCase().includes('curug') ||
      a.title.toLowerCase().includes('healing')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Spot wisata alam, destinasi jalan-jalan, dan tempat healing terbaik di Sukabumi"
      articles={wisataArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
