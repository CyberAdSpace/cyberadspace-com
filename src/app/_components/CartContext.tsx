"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Decorative cart for v1. Real checkout is on each brand's own site.
export type CartItem = {
  brand: string;
  brandSlug: string;
  brandAccent: string;
  name: string;
  price: string;
  shopUrl: string | null;
};

type Ctx = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (idx: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (o: boolean) => void;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  return (
    <CartCtx.Provider
      value={{
        items,
        add: (item) => {
          setItems((s) => [...s, item]);
          setOpen(true);
        },
        remove: (idx) => setItems((s) => s.filter((_, i) => i !== idx)),
        clear: () => setItems([]),
        open,
        setOpen,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
