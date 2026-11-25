import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getCategoryLabelFromDb } from '@/lib/categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const label = await getCategoryLabelFromDb(slug);

  return {
    title: `${label} | JurnalWave`,
    description: `Kumpulan liputan, artikel, dan informasi terkini seputar ${label} di Sukabumi dan sekitarnya.`,
    openGraph: {
      title: `${label} | JurnalWave`,
      description: `Kumpulan liputan, artikel, dan informasi terkini seputar ${label} di Sukabumi dan sekitarnya.`,
    },
  };
}

export default async function DynamicCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const [allArticles, label] = await Promise.all([
    fetchArticles(),
    getCategoryLabelFromDb(slug),
  ]);
  const filtered = allArticles.filter((a) => {
    const cat = (a.category || '').toLowerCase();
    const catLabel = (a.categoryLabel || '').toLowerCase();
    const subCat = (a.subCategory || '').toLowerCase();
    const target = slug.toLowerCase();
    const targetLabel = label.toLowerCase();

    return (
      cat === target ||
      cat === targetLabel ||
      catLabel === target ||
      catLabel === targetLabel ||
      subCat === target ||
      subCat === targetLabel ||
      a.title.toLowerCase().includes(target) ||
      a.title.toLowerCase().includes(targetLabel)
    );
  });

  return (
    <CategoryTemplate
      title={label}
      description={`Kumpulan liputan dan artikel seputar ${label} di Sukabumi dan sekitarnya.`}
      articles={filtered}
      categoryName={label}
      allArticles={allArticles}
    />
  );
}
