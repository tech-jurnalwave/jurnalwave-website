'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NewsCard } from '@/components/cards/NewsCard';
import { Article } from '@/types';

interface CategoryTemplateProps {
  title: string;
  description: string;
  articles: Article[];
  categoryName: string;
  allArticles?: Article[];
}

export const CategoryTemplate: React.FC<CategoryTemplateProps> = ({
  title,
  description,
  articles: initialArticles,
  categoryName,
}) => {
  const [articles, setArticles] = useState<Article[]>(initialArticles);

  const deduplicate = (items: Article[]): Article[] => {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = (item.slug || item.id || item.title || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const matchCategory = useCallback(
    (article: Article): boolean => {
      const target = (categoryName || '').toLowerCase().trim();
      const cat = (article.category || '').toLowerCase().trim();
      const catLabel = (article.categoryLabel || '').toLowerCase().trim();
      const subCat = (article.subCategory || '').toLowerCase().trim();

      if (cat === target || catLabel === target || subCat === target) return true;

      // Pencocokan fleksibel untuk kategori Sport / Esport
      if (
        target.includes('sport') ||
        target.includes('esport') ||
        target.includes('olahraga')
      ) {
        return (
          cat === 'sport' ||
          cat === 'esport' ||
          cat === 'sport-esport' ||
          catLabel.includes('sport') ||
          catLabel.includes('olahraga') ||
          catLabel.includes('esport') ||
          subCat.includes('sport') ||
          subCat.includes('esport') ||
          article.title.toLowerCase().includes('persib') ||
          article.title.toLowerCase().includes('liga')
        );
      }

      if (target.includes('tech') || target.includes('teknologi') || target.includes('game')) {
        return (
          cat === 'tech' ||
          cat === 'game' ||
          catLabel.includes('tech') ||
          catLabel.includes('teknologi') ||
          catLabel.includes('game') ||
          subCat.includes('tech') ||
          subCat.includes('game')
        );
      }

      if (target.includes('kuliner') || target.includes('culinary')) {
        return (
          cat === 'kuliner' ||
          catLabel.includes('kuliner') ||
          subCat.includes('culinary') ||
          subCat.includes('kuliner') ||
          article.title.toLowerCase().includes('kuliner') ||
          article.title.toLowerCase().includes('kafe') ||
          article.title.toLowerCase().includes('kopi') ||
          article.title.toLowerCase().includes('jajan')
        );
      }

      if (target.includes('wisata') || target.includes('traveling') || target.includes('travel')) {
        return (
          cat === 'wisata' ||
          catLabel.includes('wisata') ||
          subCat.includes('traveling') ||
          subCat.includes('wisata') ||
          article.title.toLowerCase().includes('wisata') ||
          article.title.toLowerCase().includes('pantai') ||
          article.title.toLowerCase().includes('curug')
        );
      }

      if (target.includes('hiburan') || target.includes('entertainment')) {
        return (
          cat === 'hiburan' ||
          catLabel.includes('hiburan') ||
          subCat.includes('hiburan') ||
          catLabel.includes('musik') ||
          catLabel.includes('film')
        );
      }

      if (target.includes('inspirasi')) {
        return (
          cat === 'inspirasi' ||
          catLabel.includes('inspirasi') ||
          subCat.includes('inspirasi')
        );
      }

      if (target.includes('berita')) {
        return (
          cat === 'berita' ||
          catLabel.includes('berita') ||
          cat === 'daerah' ||
          cat === 'sekolah' ||
          cat === 'kampus'
        );
      }

      if (target.includes('otomotif')) {
        return cat === 'otomotif' || catLabel.includes('otomotif') || subCat.includes('otomotif');
      }

      if (target.includes('health') || target.includes('kesehatan')) {
        return (
          cat === 'health' ||
          cat === 'kesehatan' ||
          catLabel.includes('health') ||
          catLabel.includes('kesehatan') ||
          subCat.includes('health') ||
          subCat.includes('kesehatan')
        );
      }

      if (target.includes('science') || target.includes('sains')) {
        return (
          cat === 'science' ||
          cat === 'sains' ||
          catLabel.includes('science') ||
          catLabel.includes('sains') ||
          subCat.includes('science') ||
          subCat.includes('sains')
        );
      }

      if (target.includes('lifestyle')) {
        return (
          cat === 'lifestyle' ||
          cat === 'kuliner' ||
          cat === 'wisata' ||
          ['lifestyle', 'kuliner', 'wisata', 'fashion', 'style', 'traveling'].some((k) => catLabel.includes(k) || subCat.includes(k))
        );
      }

      // Fallback umum untuk kategori custom apa pun yang dibuat di CMS:
      return (
        cat.includes(target) ||
        target.includes(cat) ||
        catLabel.includes(target) ||
        target.includes(catLabel)
      );
    },
    [categoryName]
  );

  useEffect(() => {
    const syncArticles = () => {
      let combined: Article[] = initialArticles.filter(a => !a.status || a.status === 'published');

      // 1. Sync dari localStorage
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('jurnal_wave_articles');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              const published = parsed.filter((a: Article) => !a.status || a.status === 'published');
              const matchedFromLocal = published.filter(matchCategory);
              combined = matchedFromLocal;
            }
          }
        } catch {}
      }

      setArticles(combined);
    };

    syncArticles();

    // 2. Fetch fresh dari API articles
    const fetchLatest = async () => {
      try {
        const res = await fetch('/api/articles', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const published = json.data.filter((a: Article) => !a.status || a.status === 'published');
            const matched = published.filter(matchCategory);
            setArticles(matched);
            if (typeof window !== 'undefined') {
              localStorage.setItem('jurnal_wave_articles', JSON.stringify(published));
            }
          }
        }
      } catch {}
    };

    fetchLatest();

    // 3. Listener event storage & focus agar sinkron seketika saat admin terbitkan berita
    window.addEventListener('storage', syncArticles);
    window.addEventListener('focus', syncArticles);
    return () => {
      window.removeEventListener('storage', syncArticles);
      window.removeEventListener('focus', syncArticles);
    };
  }, [categoryName, initialArticles, matchCategory]);

  return (
    <div className="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12 flex flex-col min-w-0">
      <header className="mb-6 pb-3 border-b border-outline-variant/40">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-headline-xl text-on-surface tracking-tight">
          {title}
        </h1>
      </header>

      {articles.length > 0 ? (
        <div className="flex flex-col gap-6">
          {articles.map(article => (
            <NewsCard key={article.id} article={article} variant="row" />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-surface-container rounded-2xl border border-outline-variant/60 my-4">
          <p className="text-on-surface-variant font-medium text-sm">
            Belum ada artikel untuk kategori <span className="font-bold text-primary">{categoryName}</span>.
          </p>
        </div>
      )}
    </div>
  );
};
