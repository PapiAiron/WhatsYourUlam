import { useEffect } from 'react';
import { BRAND } from '@/constants/brand';

interface SeoProps {
  title: string;
  description?: string;
  noindex?: boolean;
}

export function Seo({
  title,
  description = BRAND.subTagline,
  noindex = false,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes(BRAND.name)
      ? title
      : `${title} · ${BRAND.name}`;
    document.title = fullTitle;

    const updateMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) {
        el.setAttribute('content', content);
      }
    };

    updateMeta('meta[name="description"]', description);
    updateMeta('meta[property="og:title"]', fullTitle);
    updateMeta('meta[property="og:description"]', description);

    let robots = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, nofollow');
    } else if (robots) {
      robots.setAttribute('content', 'index, follow');
    }
  }, [title, description, noindex]);

  return null;
}
