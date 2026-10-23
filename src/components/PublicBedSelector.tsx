import { useMemo } from 'react';
import type { PublicBed } from '../lib/queries';

const BED_STYLE = {
  available: { fill: '#FFFFFF', border: '#2E7D5B', text: '#2E7D5B' },
  selected: { fill: '#E6F4ED', border: '#2E7D5B', text: '#2E7D5B' },
  disabled: { fill: '#F3F4F6', border: '#E5E7EB', text: '#9CA3AF' },
};

export function PublicBedSelector({ 
  beds, 
  selectedBedId, 
  onSelect,
  gender 
}: { 
  beds: PublicBed[]; 
  selectedBedId: string | null; 
  onSelect: (id: string) => void;
  gender: string;
}) {
  const grouped = useMemo(() => {
    const isBunk = beds[0]?.product_type === 'non_ac_space';
    if (isBunk) {
      const map = new Map<string, { unitCode: string; spaces: PublicBed[] }>();
      for (const row of beds) {
        const key = row.bunk_unit_code ?? 'unknown';
        if (!map.has(key)) map.set(key, { unitCode: key, spaces: [] });
        map.get(key)!.spaces.push(row);
      }
      return { units: Array.from(map.values()).sort((a, b) => a.unitCode.localeCompare(b.unitCode)), individual: [] };
    }
    return { units: [], individual: [...beds].sort((a, b) => a.code.localeCompare(b.code)) };
  }, [beds]);

  const totalItems = beds[0]?.product_type === 'non_ac_space' ? grouped.units.length : grouped.individual.length;
  const half = Math.ceil(totalItems / 2);
  const leftItems = beds[0]?.product_type === 'non_ac_space' ? grouped.units.slice(0, half) : grouped.individual.slice(0, half);
  const rightItems = beds[0]?.product_type === 'non_ac_space' ? grouped.units.slice(half) : grouped.individual.slice(half);

  return (
    <div className="relative mx-auto w-full max-w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 sm:p-6 shadow-inner mt-6">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
        <div className="rounded-t-md bg-brand-900 px-6 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
          Main Entrance
        </div>
      </div>

      <div className="flex w-full gap-2 sm:gap-4 items-stretch justify-center mt-4 pb-2">
        <div className="flex-1 rounded-lg bg-white p-2 sm:p-4 shadow-sm border border-gray-200 min-w-0">
          <div className="flex items-stretch gap-3 sm:gap-6 w-full mx-auto">
            <div className="flex-1 min-w-0">
              <BedGridSide items={leftItems} isBunk={beds[0]?.product_type === 'non_ac_space'} selectedBedId={selectedBedId} onSelect={onSelect} gender={gender} />
            </div>
            <div className="w-8 sm:w-12 bg-gray-100 rounded-md flex flex-col items-center justify-center border-x border-dashed border-gray-300 shrink-0">
              <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest rotate-[-90deg] whitespace-nowrap">Walkway</span>
            </div>
            <div className="flex-1 min-w-0">
              <BedGridSide items={rightItems} isBunk={beds[0]?.product_type === 'non_ac_space'} selectedBedId={selectedBedId} onSelect={onSelect} gender={gender} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BedGridSide({ items, isBunk, selectedBedId, onSelect, gender }: {
  items: any[];
  isBunk: boolean;
  selectedBedId: string | null;
  onSelect: (id: string) => void;
  gender: string;
}) {
  const rows = 5;
  const cols = Math.ceil(items.length / rows);
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      if (index < items.length) row.push(items[index]);
    }
    grid.push(row);
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {grid.map((row, rIdx) => (
        <div key={rIdx} className={`flex gap-1.5 w-full ${rIdx > 0 && rIdx % 2 === 0 ? 'mt-4 sm:mt-6' : ''}`}>
          {row.map((item, cIdx) => (
            <div key={cIdx} className="flex-1 min-w-0">
              {isBunk ? (
                <BunkCell unit={item} selectedBedId={selectedBedId} onSelect={onSelect} gender={gender} />
              ) : (
                <BedTile bed={item} selectedBedId={selectedBedId} onSelect={onSelect} gender={gender} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BedTile({ bed, selectedBedId, onSelect, gender }: { bed: PublicBed; selectedBedId: string | null; onSelect: (id: string) => void; gender: string }) {
  const isSelected = selectedBedId === bed.space_id;
  const isEligible = bed.is_available && (!bed.women_reserved || gender === 'female');
  const style = !isEligible ? BED_STYLE.disabled : isSelected ? BED_STYLE.selected : BED_STYLE.available;
  const displayCode = bed.code.startsWith('F-') ? bed.code.replace('F-00', 'F').replace('F-0', 'F') : bed.code.replace('AC-', '');

  return (
    <button
      type="button"
      disabled={!isEligible}
      onClick={() => onSelect(bed.space_id)}
      className={`group relative flex h-[50px] w-full flex-col items-center justify-between rounded border-2 py-1 transition-all ${
        isEligible ? 'hover:scale-105 hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
      }`}
      style={{ background: style.fill, borderColor: style.border, color: style.text }}
    >
      <div className="h-1.5 w-3/4 rounded-full opacity-30" style={{ background: style.text }} />
      <span className="font-mono text-[9px] font-bold tracking-tight truncate w-full text-center px-0.5">{displayCode}</span>
      {bed.women_reserved && <span className="absolute -right-1 -top-1 grid h-3 w-3 place-items-center rounded-full bg-[#B3261E] text-[6px] font-bold text-white shadow">W</span>}
    </button>
  );
}

function BunkCell({ unit, selectedBedId, onSelect, gender }: { unit: { unitCode: string; spaces: PublicBed[] }; selectedBedId: string | null; onSelect: (id: string) => void; gender: string }) {
  const upper = unit.spaces.find((s) => s.position === 'upper');
  const lower = unit.spaces.find((s) => s.position === 'lower');

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      {upper ? <BunkSpace bed={upper} letter="U" selectedBedId={selectedBedId} onSelect={onSelect} gender={gender} /> : <div className="h-5 w-full rounded-sm border border-dashed border-gray-200 opacity-50" />}
      <div className="h-0.5" />
      {lower ? <BunkSpace bed={lower} letter="L" selectedBedId={selectedBedId} onSelect={onSelect} gender={gender} /> : <div className="h-5 w-full rounded-sm border border-dashed border-gray-200 opacity-50" />}
      <span className="mt-0.5 font-mono text-[8px] font-medium text-gray-400 w-full text-center truncate">{unit.unitCode.replace('NA-', '')}</span>
    </div>
  );
}

function BunkSpace({ bed, letter, selectedBedId, onSelect, gender }: { bed: PublicBed; letter: 'U' | 'L'; selectedBedId: string | null; onSelect: (id: string) => void; gender: string }) {
  const isSelected = selectedBedId === bed.space_id;
  const isEligible = bed.is_available && (!bed.women_reserved || gender === 'female');
  const style = !isEligible ? BED_STYLE.disabled : isSelected ? BED_STYLE.selected : BED_STYLE.available;

  return (
    <button
      type="button"
      disabled={!isEligible}
      onClick={() => onSelect(bed.space_id)}
      className={`group relative flex h-[22px] w-full min-w-0 items-center justify-between rounded-sm border px-1 transition-all ${
        isEligible ? 'hover:scale-110 hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
      }`}
      style={{ background: style.fill, borderColor: style.border, color: style.text }}
    >
      <span className="text-[9px] font-bold">{letter}</span>
      {bed.women_reserved && <span className="h-1.5 w-1.5 rounded-full bg-[#B3261E]" />}
    </button>
  );
}