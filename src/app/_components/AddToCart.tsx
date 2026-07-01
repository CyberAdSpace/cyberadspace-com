"use client";

import { useState } from "react";
import { useCart, CartItem } from "./CartContext";

export default function AddToCart({
  item,
  accent,
}: {
  item: CartItem;
  accent: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() => {
        add(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }}
      className="btn"
      style={{
        borderColor: accent,
        color: added ? "#0a0a0a" : accent,
        background: added ? accent : "transparent",
      }}
    >
      {added ? "Added ✓" : "Add"}
    </button>
  );
}
