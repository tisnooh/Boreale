'use client';

import { useEffect, useState } from 'react';
import { ProductForm } from '@/components/admin/ProductForm';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);
  if (!id) return null;
  return <ProductForm productId={id} />;
}
