"use client";

import { useState, type CSSProperties } from "react";
import { ChevronDown } from "@/components/icons";
import { VisitorMap, type MapPlace } from "@/components/visitor-map";
import type { CountryView } from "@/lib/analytics/report-view";

/** "Where visitors are": the map and the list of countries, which carry the same information. */
export function Geography({
  subtitle,
  places,
  countries,
}: {
  subtitle: string;
  places: MapPlace[];
  countries: CountryView[];
}) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(countries[0] ? [countries[0].name] : []),
  );
  const max = Math.max(1, ...countries.map((country) => country.visitors));

  return (
    <section
      aria-label="Where visitors are"
      className="blueprint cm-enter grid grid-cols-1 bg-neutral-100 sm:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]"
      style={{ "--delay": "220ms" } as CSSProperties}
    >
      <i aria-hidden className="corner tl" />
      <i aria-hidden className="corner tr" />
      <i aria-hidden className="corner bl" />
      <i aria-hidden className="corner br" />
      <div className="flex min-w-0 flex-col gap-3.5 p-[18px] sm:border-r sm:border-divider sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
          <h2 className="m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase">
            Where visitors are
          </h2>
          <span className="text-[15px] text-neutral-700">{subtitle}</span>
        </div>
        <div className="my-2 flex flex-1 flex-col justify-center">
          <VisitorMap
            places={places}
            highlight={highlight}
            label="World map of visitors by city. The list of countries has the same information."
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-neutral-700">
          <span className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-accent" />
            Bigger dot, more visitors
          </span>
          <span className="flex items-center gap-2">
            <span className="box-border size-3 rounded-full border-[1.5px] border-accent" />
            Visited in the last 24 hours
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2.5 border-t border-divider p-[18px] sm:border-t-0 sm:px-6 sm:py-5">
        <div className="flex justify-between text-[13px] tracking-[0.1em] text-accent-700 uppercase">
          <span>Countries</span>
          <span>Visitors</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {countries.map((country) => {
            const expanded = open.has(country.name);
            const cityMax = Math.max(1, ...country.cities.map((city) => city.visitors));
            return (
              <li key={country.name} className="border-t border-divider">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpen((current) => {
                      const next = new Set(current);
                      if (next.has(country.name)) next.delete(country.name);
                      else next.add(country.name);
                      return next;
                    })
                  }
                  onMouseEnter={() => setHighlight(country.code)}
                  onMouseLeave={() => setHighlight(null)}
                  onFocus={() => setHighlight(country.code)}
                  onBlur={() => setHighlight(null)}
                  className={`grid min-h-12 w-full cursor-pointer grid-cols-[24px_minmax(0,1fr)_auto_16px] items-center gap-2.5 px-1.5 py-2.5 text-left text-text transition-colors hover:bg-neutral-200 ${
                    highlight !== null && highlight === country.code ? "bg-accent-100" : ""
                  }`}
                >
                  <span aria-hidden className="text-lg leading-none">
                    {country.flag}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="truncate text-[15px]">{country.name}</span>
                    <span className="block h-1 bg-neutral-200">
                      <span
                        className="cm-hbar block h-full bg-accent"
                        style={{ width: `${(country.visitors / max) * 100}%` }}
                      />
                    </span>
                  </span>
                  <span className="text-[15px] font-medium tabular-nums">{country.visitors}</span>
                  <ChevronDown
                    size={16}
                    className={`text-neutral-700 transition-transform duration-[250ms] ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                {expanded ? (
                  <ul className="cm-swap m-0 flex list-none flex-col gap-2.5 pt-0.5 pr-1.5 pb-3.5 pl-10">
                    {country.cities.map((city) => (
                      <li
                        key={city.name}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-[5px] text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {city.name}
                          {city.recent ? (
                            <span className="text-xs text-accent-700">· Last 24 hours</span>
                          ) : null}
                        </span>
                        <span className="tabular-nums">{city.visitors}</span>
                        <span className="col-span-full block h-[3px] bg-neutral-200">
                          <span
                            className="block h-full bg-accent-400"
                            style={{ width: `${(city.visitors / cityMax) * 100}%` }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
