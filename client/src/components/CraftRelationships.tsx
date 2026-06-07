/**
 * CraftRelationships — ARC Raiders themed craft/recycle accordion.
 * Adapted from ARDB-main CraftRelationshipsAccordion.tsx.
 * No Next.js deps — pure React + Tailwind + ARC palette.
 */
import { useState } from 'react';
import {
  ChevronDown,
  Package,
  Hammer,
  Recycle,
  ArrowRight,
  Search,
} from 'lucide-react';
import { useCraftRelationships } from '../lib/useCraftRelationships';
import type { CraftComponent } from '../lib/useCraftRelationships';
import { getItemImg, getItemImgWebp } from '../lib/itemDb';

/* ARC palette */
const RC: Record<string, string> = {
  legendary: '#ffcc00',
  epic: '#c43198',
  rare: '#01abf4',
  uncommon: '#25bb55',
  common: '#6c6b6a',
};
const rc = (r?: string) => RC[(r ?? 'common').toLowerCase()] ?? RC.common;

function ItemChip({
  comp,
  onClick,
}: {
  comp: CraftComponent;
  onClick?: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const srcs = [
    getItemImg(comp.id) ?? '',
    getItemImgWebp(comp.id) ?? '',
  ].filter(Boolean);
  const src = srcs[imgIdx];
  const color = rc(comp.rarity);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 border transition-colors text-left"
      style={{ borderColor: `${color}30`, background: `${color}08` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${color}30`;
      }}
    >
      <div
        className="w-7 h-7 shrink-0 flex items-center justify-center bg-[#080810]"
        style={{ border: `1px solid ${color}30` }}
      >
        {src ? (
          <img
            src={src}
            alt={comp.name}
            className="w-5 h-5 object-contain"
            onError={() => setImgIdx((i) => Math.min(i + 1, srcs.length))}
          />
        ) : (
          <Package className="w-4 h-4" style={{ color }} />
        )}
      </div>
      <span className="text-sm font-black text-white truncate max-w-[140px]">
        {comp.name}
      </span>
      {comp.quantity && comp.quantity > 1 && (
        <span className="text-xs font-black shrink-0" style={{ color }}>
          ×{comp.quantity}
        </span>
      )}
    </button>
  );
}

interface SectionDef {
  key: 'recipe' | 'recycle_components' | 'used_in' | 'recycle_from';
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'recipe',
    label: 'Ingredients',
    icon: <Hammer className="w-4 h-4" />,
    color: '#01abf4',
    description: 'Required to craft this item',
  },
  {
    key: 'recycle_components',
    label: 'Recycle Output',
    icon: <Recycle className="w-4 h-4" />,
    color: '#25bb55',
    description: 'Items you get by recycling this',
  },
  {
    key: 'used_in',
    label: 'Used In',
    icon: <ArrowRight className="w-4 h-4" />,
    color: '#ffcc00',
    description: 'Recipes that require this item',
  },
  {
    key: 'recycle_from',
    label: 'Obtain By Recycling',
    icon: <Search className="w-4 h-4" />,
    color: '#c43198',
    description: 'Recycle these items to get this',
  },
];

interface CraftRelationshipsProps {
  itemId: string | undefined;
  onItemClick?: (id: string) => void;
  defaultOpen?: boolean;
}

export default function CraftRelationships({
  itemId,
  onItemClick,
  defaultOpen = false,
}: CraftRelationshipsProps) {
  const relationships = useCraftRelationships(itemId);
  const [open, setOpen] = useState<Set<string>>(
    defaultOpen ? new Set(SECTIONS.map((s) => s.key)) : new Set(),
  );

  const toggle = (key: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasAny = SECTIONS.some((s) => relationships[s.key].length > 0);
  if (!hasAny) return null;

  return (
    <div className="space-y-2">
      {SECTIONS.map((section) => {
        const items = relationships[section.key];
        if (items.length === 0) return null;
        const isOpen = open.has(section.key);

        return (
          <div
            key={section.key}
            className="border border-[#1e1e2e] overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => toggle(section.key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#0d0d14] hover:bg-[#111120] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span style={{ color: section.color }}>{section.icon}</span>
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  {section.label}
                </span>
                <span className="text-xs text-[#6c6b6a]">({items.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6c6b6a] hidden sm:block">
                  {section.description}
                </span>
                <ChevronDown
                  className="w-4 h-4 text-[#6c6b6a] transition-transform"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                />
              </div>
            </button>

            {/* Content */}
            {isOpen && (
              <div className="px-4 py-3 bg-[#080810] border-t border-[#1e1e2e]">
                <div className="flex flex-wrap gap-2">
                  {items.map((comp) => (
                    <ItemChip
                      key={comp.id}
                      comp={comp}
                      onClick={
                        onItemClick ? () => onItemClick(comp.id) : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
