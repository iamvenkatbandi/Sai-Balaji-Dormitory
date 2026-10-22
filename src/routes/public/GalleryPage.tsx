import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { PlaceholderPhoto } from '../../components/PlaceholderPhoto';

type Category = 'all' | 'ac' | 'non-ac' | 'beds' | 'washrooms' | 'common';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ac', label: 'AC Hall' },
  { key: 'non-ac', label: 'Non-AC Hall' },
  { key: 'beds', label: 'Beds & partitions' },
  { key: 'washrooms', label: 'Washrooms' },
  { key: 'common', label: 'Common areas' },
];

const ITEMS: { category: Exclude<Category, 'all'>; label: string; caption: string }[] = [
  { category: 'ac', label: 'AC Hall overview', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'ac', label: 'AC family compartment', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'non-ac', label: 'Non-AC Hall overview', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'non-ac', label: 'Non-AC bunk unit', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'beds', label: 'AC bed with partition', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'beds', label: 'Bunk lower and upper beds', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'washrooms', label: 'AC washroom group', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'washrooms', label: 'Non-AC washroom group', caption: 'Representative placeholder — awaiting verified photography.' },
  { category: 'common', label: 'Common area', caption: 'Representative placeholder — awaiting verified photography.' },
];

export function GalleryPage() {
  const [cat, setCat] = useState<Category>('all');
  const visible = cat === 'all' ? ITEMS : ITEMS.filter((i) => i.category === cat);

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="Photography"
        intro="Images below are labelled representative placeholders. Verified photographs of the actual property will replace them once supplied."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              cat === c.key
                ? 'border-brand-900 bg-brand-900 text-white'
                : 'border-line bg-surface text-ink hover:bg-bg'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {visible.map((item) => (
          <PlaceholderPhoto key={item.label} label={item.label} caption={item.caption} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-8 text-sm text-muted">No images in this category yet.</p>
      )}
    </>
  );
}