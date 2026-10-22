import type { PropertyImage } from '../lib/images';

interface Props {
  image: PropertyImage;
  priority?: boolean;
  aspectClass?: string;
  className?: string;
}

export function PropertyPhoto({
  image,
  priority = false,
  aspectClass = 'aspect-[4/3]',
  className = '',
}: Props) {
  return (
    <figure className={`overflow-hidden rounded-card border border-line bg-surface ${className}`}>
      <div className={`relative w-full overflow-hidden bg-bg ${aspectClass}`}>
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </figure>
  );
}