"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, ImageOff } from "lucide-react";
import { formatVnd } from "@/lib/format";
import type { ClientMenuCategory, ClientMenuItem } from "@/types/customer";

export function MenuBrowser({
  categories,
  onSelectItem,
  stickyTop = "104px",
  gridClassName = "grid-cols-2 gap-3 sm:grid-cols-3",
}: {
  categories: ClientMenuCategory[];
  onSelectItem: (item: ClientMenuItem) => void;
  /** Offset for the sticky search/category bar — match the height of any fixed header above it. */
  stickyTop?: string;
  gridClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, query]);

  function scrollTo(id: string) {
    setActiveCategory(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col">
      <div className="sticky z-10 space-y-2 border-b bg-background/95 px-4 py-2 backdrop-blur" style={{ top: stickyTop }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm món..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {!query && (
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  activeCategory === cat.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 p-4">
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy món phù hợp</p>
        )}
        {filtered.map((cat) => (
          <div key={cat.id} ref={(el) => { sectionRefs.current[cat.id] = el; }}>
            <h2 className="mb-2 text-base font-semibold">{cat.name}</h2>
            <div className={`grid ${gridClassName}`}>
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md disabled:opacity-60"
                >
                  <div className="relative flex aspect-square items-center justify-center bg-muted">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-6 text-muted-foreground" />
                    )}
                    {item.soldOut && (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/80 text-xs font-semibold text-muted-foreground">
                        Hết hàng
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 p-2.5">
                    <p className="line-clamp-2 text-sm font-medium leading-tight">{item.name}</p>
                    <p className="text-sm font-semibold text-primary">
                      {formatVnd(item.salePrice ?? item.basePrice)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
