'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  addToCart as addFn,
  cartCount as countFn,
  cartSubtotal as subtotalFn,
  deserializeCart,
  removeFromCart as removeFn,
  serializeCart,
  updateQuantity as updateFn,
  type CartItem,
} from '@/lib/cart-logic';
import type { VariantDTO } from '@/lib/types';

const STORAGE_KEY = 'boreale_cart_v1';

interface CartContextValue {
  items: CartItem[];
  ready: boolean; // true once hydrated from localStorage
  count: number;
  subtotalCents: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: { slug: string; name: string; imageUrl: string | null }, variant: VariantDTO, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  /** Remplace entièrement le panier (restauration depuis un lien email). */
  replaceCart: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Hydratation depuis localStorage (client uniquement)
  useEffect(() => {
    setItems(deserializeCart(window.localStorage.getItem(STORAGE_KEY)));
    setReady(true);
  }, []);

  // Persistance
  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, serializeCart(items));
  }, [items, ready]);

  // Empêche le scroll quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const addItem = useCallback((product: { slug: string; name: string; imageUrl: string | null }, variant: VariantDTO, quantity = 1) => {
    setItems((prev) => addFn(prev, product, variant, quantity));
    setDrawerOpen(true);
  }, []);

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) => updateFn(prev, variantId, quantity));
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => removeFn(prev, variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const replaceCart = useCallback((items: CartItem[]) => setItems(items), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: countFn(items),
      subtotalCents: subtotalFn(items),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      updateQuantity,
      removeItem,
      clear,
      replaceCart,
    }),
    [items, ready, drawerOpen, addItem, updateQuantity, removeItem, clear, replaceCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return ctx;
}
