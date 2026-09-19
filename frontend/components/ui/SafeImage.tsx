'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

/**
 * next/image avec repli automatique sur le placeholder BORÉALE si l'image échoue
 * (URL distante indisponible, asset manquant…) : jamais d'image cassée affichée.
 */
export function SafeImage({ alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  const src = failed ? '/products/placeholder.svg' : props.src;
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
