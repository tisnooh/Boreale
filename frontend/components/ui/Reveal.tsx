'use client';

import { useEffect, useRef, useState, type ReactNode, type ElementType } from 'react';

/**
 * Reveal au scroll : IntersectionObserver, une seule fois par élément.
 * Variants : up (défaut), left, scale. Délai en ms pour le stagger.
 * Sans JS / reduced-motion : le contenu reste visible (noscript + CSS global).
 */
export function Reveal({
  children,
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  variant?: 'up' | 'left' | 'scale';
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const variantClass = variant === 'left' ? 'reveal-left' : variant === 'scale' ? 'reveal-scale' : '';

  return (
    <Tag
      ref={ref}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
      className={`reveal ${variantClass} ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}
