import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const categoryLabel = await getCategoryLabelFromDb('inspirasi');
  return {
    title: categoryLabel,
    description: 'Kisah anak muda berprestasi, atlet, kreator konten, dan wirausaha muda sukses Sukabumi.',
    openGraph: {
      title: `${categoryLabel} | JurnalWave`,
      description: 'Kisah anak muda berprestasi, atlet, kreator konten, dan wirausaha muda sukses Sukabumi.',
    },
  };
}

export default async function InspirasiPage() {
  const [allArticles, categoryLabel] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb('inspirasi'),
  ]);

  const inspirasiArticles = allArticles.filter(
    a =>
      a.category === 'inspirasi' ||
      (a.categoryLabel && a.categoryLabel.toUpperCase().includes('INSPIRASI')) ||
      a.title.toLowerCase().includes('inspirasi') ||
      a.title.toLowerCase().includes('sukses') ||
      a.title.toLowerCase().includes('prestasi')
  );

  return (
    <CategoryTemplate
      title={categoryLabel}
      description="Kisah sosok muda berprestasi, kreator, dan wirausaha muda sukses Sukabumi"
      articles={inspirasiArticles}
      categoryName={categoryLabel}
      allArticles={allArticles}
    />
  );
}
