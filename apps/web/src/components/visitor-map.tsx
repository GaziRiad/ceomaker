"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { WORLD_GRID, WORLD_ROWS } from "@/lib/analytics/world-dots";

export interface MapPlace {
  key: string;
  city: string;
  country: string;
  code: string | null;
  latitude: number;
  longitude: number;
  visitors: number;
  recent: boolean;
}

// The world as a grid of dots (equirectangular), with a dot per city sized by its visitors and
// a ring where someone visited in the last 24 hours. Pitch: CELL units between grid dots.
const CELL = 10;
const WIDTH = WORLD_GRID.columns * CELL;
const HEIGHT = WORLD_GRID.rows * CELL;

/** One path of zero-length segments with round caps draws every land dot in one element. */
const LAND = (() => {
  let path = "";
  WORLD_ROWS.forEach((row, rowIndex) => {
    let column = 0;
    row.split(".").forEach((run, index) => {
      const length = parseInt(run, 36);
      if (index % 2 === 1) {
        for (let dot = 0; dot < length; dot++) {
          path += `M${(column + dot) * CELL + CELL / 2} ${rowIndex * CELL + CELL / 2}h0`;
        }
      }
      column += length;
    });
  });
  return path;
})();

function project(latitude: number, longitude: number): { x: number; y: number } {
  const x = ((longitude + 180) / WORLD_GRID.step) * CELL;
  const y = ((WORLD_GRID.north - latitude) / WORLD_GRID.step) * CELL;
  return {
    x: Math.min(WIDTH, Math.max(0, x)),
    y: Math.min(HEIGHT - CELL / 2, Math.max(CELL / 2, y)),
  };
}

export function VisitorMap({
  places,
  highlight = null,
  label,
  className = "",
}: {
  places: MapPlace[];
  /** A country code: its cities stay bright, the others dim. */
  highlight?: string | null;
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const dots = useMemo(() => {
    const max = Math.max(1, ...places.map((place) => place.visitors));
    return (
      places
        .map((place) => ({
          ...place,
          ...project(place.latitude, place.longitude),
          radius: 9 + 17 * Math.sqrt(place.visitors / max),
        }))
        // Big dots first, so small ones stay visible on top.
        .sort((a, b) => b.radius - a.radius)
    );
  }, [places]);
  const shown = dots.find((dot) => dot.key === active);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={label}
        className="block h-auto w-full overflow-visible"
        onMouseLeave={() => setActive(null)}
      >
        <path
          d={LAND}
          className="cm-fade"
          stroke="var(--color-neutral-300)"
          strokeWidth={4.4}
          strokeLinecap="round"
          fill="none"
        />
        {dots.map((dot, index) => {
          const dim = highlight !== null && dot.code !== highlight;
          return (
            <g
              key={dot.key}
              style={{ opacity: dim ? 0.25 : 1, transition: "opacity .25s" }}
              onMouseEnter={() => setActive(dot.key)}
              onClick={() => setActive((current) => (current === dot.key ? null : dot.key))}
            >
              {dot.recent ? (
                <>
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.radius + 7}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                  />
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.radius + 7}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={3}
                    className="cm-ring"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />
                </>
              ) : null}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={dot.radius}
                fill="var(--color-accent)"
                fillOpacity={dot.key === active ? 1 : 0.85}
                stroke="var(--color-neutral-100)"
                strokeWidth={3}
                className="cm-dot cursor-pointer"
                style={{ "--delay": `${200 + index * 40}ms` } as CSSProperties}
              />
            </g>
          );
        })}
      </svg>
      {shown ? (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full bg-neutral-900 px-2.5 py-1.5 text-[13px] whitespace-nowrap text-neutral-100 shadow-md"
          style={{
            left: `${(shown.x / WIDTH) * 100}%`,
            top: `calc(${((shown.y - shown.radius) / HEIGHT) * 100}% - 8px)`,
          }}
        >
          {shown.city}, {shown.country} · {shown.visitors}{" "}
          {shown.visitors === 1 ? "visitor" : "visitors"}
        </span>
      ) : null}
    </div>
  );
}
