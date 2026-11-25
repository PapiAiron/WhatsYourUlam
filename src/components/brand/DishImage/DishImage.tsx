import { useState } from 'react';
import clsx from 'clsx';
import { DishPlaceholder } from '../DishPlaceholder';
import styles from './DishImage.module.css';

interface DishImageProps {
  src?: string;
  alt: string;
  tone?: 'clay' | 'moss' | 'turmeric' | 'tamarind';
  aspect?: '4/3' | '16/9' | '1/1';
  className?: string;
  priority?: boolean;
}

export function DishImage({
  src,
  alt,
  tone = 'clay',
  aspect = '4/3',
  className,
  priority = false,
}: DishImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const aspectClass =
    aspect === '16/9'
      ? styles.aspect16x9
      : aspect === '1/1'
        ? styles.aspect1x1
        : styles.aspect4x3;

  return (
    <div className={clsx(styles.frame, aspectClass, className)}>
      {(!src || failed) && <DishPlaceholder title={alt} tone={tone} />}
      {src && !failed && (
        <>
          {!loaded && <DishPlaceholder title={alt} tone={tone} shimmer />}
          <img
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={clsx(styles.img, loaded && styles.imgLoaded)}
          />
        </>
      )}
    </div>
  );
}
