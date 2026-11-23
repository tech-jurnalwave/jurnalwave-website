import type { Metadata } from 'next';
import { CategoryTemplate } from '@/components/layout/CategoryTemplate';
import { fetchArticles } from '@/lib/wordpress';
import { getArticleCategories } from '@/lib/categories';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = getArticleCategories();
  const found = categories.find((c) => c.value.toLowerCase() === slug.toLowerCase());
  const label = found ? found.label : slug.charAt(0).toUpperCase() + slug.slice(1);

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
  const categories = getArticleCategories();
  const found = categories.find((c) => c.value.toLowerCase() === slug.toLowerCase());
  const label = found ? found.label : slug.charAt(0).toUpperCase() + slug.slice(1);

  const allArticles = await fetchArticles();
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
