"use client";

import { useState, useCallback, useMemo } from "react";
import type { CartLine } from "@/types/customer";

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addLine = useCallback((line: Omit<CartLine, "key">) => {
    setLines((prev) => [...prev, { ...line, key: `${Date.now()}-${Math.random()}` }]);
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0), [lines]);

  return { lines, addLine, updateQuantity, removeLine, clear, itemCount, subtotal };
}

export type UseCartReturn = ReturnType<typeof useCart>;
