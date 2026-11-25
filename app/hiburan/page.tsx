import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('hiburan');
  return {
    title: categoryLabel,
    description: 'Kabar musik, jadwal dan review film bioskop, konser, dan pop culture anak muda terkini.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Kabar musik, jadwal dan review film bioskop, konser, dan pop culture anak muda terkini.',
    },
  };
}

export default async function HiburanPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('hiburan'),
  ]);

  const hiburanArticles = allArticles.filter(
    a =>
      a.category === 'hiburan' ||
      (a.categoryLabel && a.categoryLabel.toUpperCase().includes('HIBURAN')) ||
      a.title.toLowerCase().includes('musik') ||
      a.title.toLowerCase().includes('film') ||
      a.title.toLowerCase().includes('konser') ||
      a.title.toLowerCase().includes('hiburan')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Kabar seputar musik, film bioskop, konser, dan pop culture anak muda terkini"
      articles={hiburanArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
