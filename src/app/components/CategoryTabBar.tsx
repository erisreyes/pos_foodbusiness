import { cn } from './ui/utils';

export type CategoryTab = {
  id: string;
  name: string;
};

type CategoryTabBarProps = {
  tabs: CategoryTab[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function CategoryTabBar({ tabs, selectedId, onSelect }: CategoryTabBarProps) {
  return (
    <div
      className="overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Product categories"
    >
      <div className="flex gap-2 w-max min-w-full pb-0.5">
        {tabs.map((tab) => {
          const isActive = selectedId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab.id)}
              className={cn(
                'shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors touch-manipulation min-h-11',
                isActive
                  ? 'bg-[#15803d] text-white shadow-sm'
                  : 'border border-[#E6ECE7] bg-white text-gray-600 hover:border-[#C9E8D5] hover:bg-[#F8FAF8]',
              )}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

