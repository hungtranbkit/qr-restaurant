"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsTab } from "./components/items-tab";
import { CategoriesTab } from "./components/categories-tab";
import { ModifiersTab } from "./components/modifiers-tab";
import { StationsTab } from "./components/stations-tab";
import type { AdminCategory, AdminItem, AdminModifierGroup, AdminStation } from "./types";

export function MenuAdminClient({
  initialCategories,
  initialItems,
  initialModifierGroups,
  initialStations,
}: {
  initialCategories: AdminCategory[];
  initialItems: AdminItem[];
  initialModifierGroups: AdminModifierGroup[];
  initialStations: AdminStation[];
  canEditPrice: boolean;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [modifierGroups, setModifierGroups] = useState(initialModifierGroups);
  const [stations, setStations] = useState(initialStations);

  async function refreshAll() {
    const [c, i, m, s] = await Promise.all([
      fetch("/api/admin/menu/summary?type=categories").then((r) => r.json()),
      fetch("/api/admin/menu/summary?type=items").then((r) => r.json()),
      fetch("/api/admin/menu/summary?type=modifierGroups").then((r) => r.json()),
      fetch("/api/admin/menu/summary?type=stations").then((r) => r.json()),
    ]);
    setCategories(c.data);
    setItems(i.data);
    setModifierGroups(m.data);
    setStations(s.data);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Menu & Tuỳ chọn</h1>
        <p className="text-sm text-muted-foreground">{items.length} món trong {categories.length} danh mục</p>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Món ăn</TabsTrigger>
          <TabsTrigger value="categories">Danh mục</TabsTrigger>
          <TabsTrigger value="modifiers">Tuỳ chọn</TabsTrigger>
          <TabsTrigger value="stations">Trạm bếp</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <ItemsTab
            items={items}
            categories={categories}
            stations={stations}
            modifierGroups={modifierGroups}
            onChange={refreshAll}
          />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab categories={categories} onChange={refreshAll} />
        </TabsContent>
        <TabsContent value="modifiers">
          <ModifiersTab modifierGroups={modifierGroups} onChange={refreshAll} />
        </TabsContent>
        <TabsContent value="stations">
          <StationsTab stations={stations} onChange={refreshAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
