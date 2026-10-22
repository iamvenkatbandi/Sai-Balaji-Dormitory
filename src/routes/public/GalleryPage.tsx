import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { PropertyPhoto } from '../../components/PropertyPhoto';
import { IMAGES, type PropertyImage } from '../../lib/images';

type Category = 'all' | 'ac' | 'non-ac' | 'beds' | 'washrooms' | 'common';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ac', label: 'AC Hall' },
  { key: 'non-ac', label: 'Non-AC Hall' },
  { key: 'beds', label: 'Beds & partitions' },
  { key: 'washrooms', label: 'Washrooms' },
  { key: 'common', label: 'Common areas' },
];

interface Tile {
  category: Exclude<Category, 'all'>;
  image: PropertyImage;
}

const TILES: Tile[] = [
  { category: 'ac', image: IMAGES.heroAcHall },
  { category: 'ac', image: IMAGES.acHallOverview },
  { category: 'ac', image: IMAGES.acFamilyInside },
  { category: 'ac', image: IMAGES.acFamilyDoor },
  { category: 'non-ac', image: IMAGES.nonAcHallOverview },
  { category: 'non-ac', image: IMAGES.nonAcHallAisle },
  { category: 'beds', image: IMAGES.acBedPartition },
  { category: 'beds', image: IMAGES.nonAcBunk },
  { category: 'beds', image: IMAGES.nonAcBunkDetail },
  { category: 'beds', image: IMAGES.bedTurnover },
  { category: 'washrooms', image: IMAGES.acWashroomCorridor },
  { category: 'washrooms', image: IMAGES.nonAcWashroomCorridor },
];

export function GalleryPage() {
  const [cat, setCat] = useState<Category>('all');
  const visible = cat === 'all' ? TILES : TILES.filter((t) => t.category === cat);

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="Photography"
        intro="All images below are illustrative renders, not actual photographs. Verified photographs of the property will replace them once taken."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            aria-pressed={cat === c.key}
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

      {visible.length === 0 ? (
        <p className="text-sm text-muted">No images in this category yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {visible.map((tile) => (
            <PropertyPhoto key={tile.image.src} image={tile.image} />
          ))}
        </div>
      )}
    </>
  );
}