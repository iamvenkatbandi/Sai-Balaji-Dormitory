import type { PropertyImage } from '../lib/images';

interface Props {
  image: PropertyImage;
  priority?: boolean;
  className?: string;
}

export function PropertyPhoto({ image, priority = false, className = '' }: Props) {
  return (
    <figure className={`overflow-hidden rounded-card border border-line bg-surface ${className}`}>
      <div className={`${image.aspect} w-full overflow-hidden bg-bg`}>
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <figcaption className="border-t border-line bg-surface px-3 py-2 text-xs text-muted">
        {image.caption}
      </figcaption>
    </figure>
  );
}