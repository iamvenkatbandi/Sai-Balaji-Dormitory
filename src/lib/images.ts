export interface PropertyImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  aspect: string;
}

export const IMAGES: Record<string, PropertyImage> = {
  heroAcHall: {
    src: '/images/hero-ac-hall.jpg',
    alt: 'AC dormitory hall with a row of partitioned sleeping cubicles — four-sided partitions with a doorway opening on the entrance side, partition height approximately 170 cm',
    width: 1536,
    height: 864,
    aspect: 'aspect-[16/9]',
  },
  acBedPartition: {
    src: '/images/ac-bed-partition.jpg',
    alt: 'Single AC sleeping cubicle: solid partitions on all four sides with a central doorway opening, bed with amber bedding and a reading light inside',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  acFamilyInside: {
    src: '/images/ac-family-compartment-inside.jpg',
    alt: 'Interior of a two-bed AC family compartment with matching bedding, shared nightstand, and partitions on all four sides',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  acFamilyDoor: {
    src: '/images/ac-family-compartment-door.jpg',
    alt: 'Exterior of a family compartment in the AC hall, showing the entrance doorway and the plaque beside it',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  acHallOverview: {
    src: '/images/ac-hall-overview.jpg',
    alt: 'Overview of the AC dormitory hall showing repeated rows of partitioned cubicles receding down the aisle',
    width: 1536,
    height: 864,
    aspect: 'aspect-[16/9]',
  },
  nonAcBunk: {
    src: '/images/non-ac-bunk.jpg',
    alt: 'Metal-framed bunk bed in the non-AC hall: upper bunk with ladder and safety rail, lower bunk, both with white bedding',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  nonAcBunkDetail: {
    src: '/images/non-ac-bunk-detail.jpg',
    alt: 'Close view of the bunk ladder and safety rail on the upper sleeping level',
    width: 1024,
    height: 1280,
    aspect: 'aspect-[4/5]',
  },
  nonAcHallOverview: {
    src: '/images/non-ac-hall-overview.jpg',
    alt: 'Overview of the non-AC hall: rows of metal bunk units with a central aisle and overhead ceiling fans',
    width: 1536,
    height: 864,
    aspect: 'aspect-[16/9]',
  },
  nonAcHallAisle: {
    src: '/images/non-ac-hall-aisle.jpg',
    alt: 'Aisle between two rows of non-AC bunk beds with tiled flooring and overhead lighting',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  acWashroomCorridor: {
    src: '/images/ac-washroom-corridor.jpg',
    alt: 'Entrance corridor of the AC washroom group: private stall doors with occupied indicators on one side, basins and mirrors on the other',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  nonAcWashroomCorridor: {
    src: '/images/non-ac-washroom-corridor.jpg',
    alt: 'Entrance corridor of the non-AC washroom group with beige tiling, private stall doors, and basins with mirrors',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
  bedTurnover: {
    src: '/images/bed-turnover.jpg',
    alt: 'Freshly prepared AC sleeping cubicle with smoothed bedding, folded towel at the foot of the bed, and a blank card on the pillow',
    width: 1536,
    height: 1024,
    aspect: 'aspect-[3/2]',
  },
};