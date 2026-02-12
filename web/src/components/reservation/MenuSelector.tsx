'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Clock, X } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS } from '@/constants/menu';

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  duration: number;
  category: {
    id: string;
    name: string;
    nameEn: string;
  };
}

export interface MenuCategory {
  id: string;
  name: string;
  nameEn: string;
  displayOrder: number;
}

interface MenuSelectorProps {
  categories: MenuCategory[];
  menus: MenuItem[];
  selectedMenuIds: string[];
  onToggle: (menuId: string) => void;
  onClearAll?: () => void;
}

export default function MenuSelector({
  categories,
  menus,
  selectedMenuIds,
  onToggle,
  onClearAll,
}: MenuSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const selectedMenus = selectedMenuIds
    .map((id) => menus.find((m) => m.id === id))
    .filter((m): m is MenuItem => m !== undefined);

  const totalPrice = selectedMenus.reduce((sum, m) => sum + m.price, 0);
  const totalDuration = selectedMenus.reduce((sum, m) => sum + m.duration, 0);

  const getCategoryColor = (name: string) => CATEGORY_COLORS[name] || '#6B8E6B';
  const getCategoryTextColor = (name: string) => CATEGORY_TEXT_COLORS[name] || '#FFFFFF';

  return (
    <div>
      {/* Instruction */}
      <p className="text-sm text-[var(--color-warm-gray)] text-center mb-8">
        カテゴリを選択すると詳細メニューが表示されます。複数選択が可能です。
      </p>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {categories.map((category) => {
          const categoryItems = menus.filter((item) => item.categoryId === category.id);
          const isExpanded = expandedCategory === category.id;
          const selectedInCategory = selectedMenuIds.filter((id) =>
            categoryItems.some((item) => item.id === id)
          );
          const hasSelection = selectedInCategory.length > 0;
          const color = getCategoryColor(category.name);

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              className={`relative p-4 text-center transition-all duration-300 border ${
                isExpanded
                  ? 'border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white'
                  : hasSelection
                    ? 'border-[var(--color-sage)] bg-[var(--color-sage)]/5'
                    : 'border-[var(--color-light-gray)] hover:border-[var(--color-sage-light)] bg-white'
              }`}
            >
              {/* Category badge */}
              {hasSelection && !isExpanded && (
                <div className="absolute top-2 right-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                    style={{ backgroundColor: color, color: getCategoryTextColor(category.name) }}
                  >
                    {selectedInCategory.length}
                  </div>
                </div>
              )}

              <span
                className="block text-[10px] sm:text-xs tracking-[0.05em] sm:tracking-[0.1em] uppercase mb-1 truncate"
                style={{ color: isExpanded ? 'rgba(255,255,255,0.6)' : 'var(--color-warm-gray)' }}
              >
                {category.nameEn}
              </span>
              <span
                className={`block text-sm sm:text-base font-medium truncate ${
                  isExpanded ? 'text-white' : 'text-[var(--color-charcoal)]'
                }`}
              >
                {category.name}
              </span>

              {/* Bottom color accent */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px] transition-opacity"
                style={{
                  backgroundColor: color,
                  opacity: hasSelection || isExpanded ? 1 : 0,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Expanded Menu Items */}
      <AnimatePresence mode="wait">
        {expandedCategory && (
          <motion.div
            key={expandedCategory}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-[var(--color-cream)] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm tracking-[0.1em] uppercase text-[var(--color-warm-gray)]">
                  {categories.find((c) => c.id === expandedCategory)?.nameEn}
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedCategory(null)}
                  className="text-[var(--color-warm-gray)] hover:text-[var(--color-charcoal)] transition-colors"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="space-y-2">
                {menus
                  .filter((m) => m.categoryId === expandedCategory)
                  .map((menu) => {
                    const isSelected = selectedMenuIds.includes(menu.id);
                    const color = getCategoryColor(menu.category.name);

                    return (
                      <button
                        key={menu.id}
                        type="button"
                        onClick={() => onToggle(menu.id)}
                        className={`w-full p-4 text-left transition-all duration-200 flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[var(--color-sage)] text-white'
                            : 'bg-white hover:bg-[var(--color-sage)]/5 border border-transparent hover:border-[var(--color-sage-light)]'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? 'border-white bg-white/20'
                              : 'border-[var(--color-light-gray)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>

                        {/* Menu info */}
                        <div className="flex-1 min-w-0">
                          <span className="block font-medium text-sm sm:text-base truncate">
                            {menu.name}
                          </span>
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isSelected ? 'text-white/70' : 'text-[var(--color-warm-gray)]'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {menu.duration}分
                          </span>
                        </div>

                        {/* Price */}
                        <span
                          className={`font-light text-lg flex-shrink-0 ${
                            isSelected ? 'text-white/90' : 'text-[var(--color-gold)]'
                          }`}
                        >
                          ¥{menu.price.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Menus Summary */}
      <AnimatePresence>
        {selectedMenuIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border border-[var(--color-sage)] bg-white p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[var(--color-warm-gray)]">
                選択中のメニュー（{selectedMenuIds.length}件）
              </p>
              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-[var(--color-warm-gray)] hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  すべて解除
                </button>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {selectedMenus.map((menu) => {
                const color = getCategoryColor(menu.category.name);
                return (
                  <div
                    key={menu.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--color-light-gray)] last:border-b-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-[var(--color-charcoal)] truncate">
                        {menu.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[var(--color-gold)] font-light">
                        ¥{menu.price.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggle(menu.id)}
                        className="text-[var(--color-warm-gray)] hover:text-red-500 transition-colors p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="flex justify-between items-end pt-3 border-t border-[var(--color-sage)]/30">
              <div>
                <p className="text-xs text-[var(--color-warm-gray)]">合計所要時間</p>
                <p className="text-sm font-medium">約{totalDuration}分</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--color-warm-gray)]">合計金額</p>
                <p className="text-xl font-light text-[var(--color-gold)]">
                  ¥{totalPrice.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
