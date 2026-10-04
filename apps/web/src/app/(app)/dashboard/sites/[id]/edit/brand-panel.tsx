"use client";

import {
  contrastRatio,
  defaultColors,
  MIN_TEXT_CONTRAST,
  PHOTO_GRADES,
  templatePalettes,
  type PhotoGrade,
  type SiteColors,
  type TemplateKey,
} from "@ceomaker/schema";
import { useState } from "react";
import { Check } from "@/components/ui";

const HEX = /^#[0-9a-f]{6}$/i;

const COLOR_ROWS: { key: keyof SiteColors; label: string; hint: string }[] = [
  { key: "bg", label: "Background", hint: "Page ground" },
  { key: "ink", label: "Text", hint: "Headlines and body copy" },
  { key: "accent", label: "Accent", hint: "Buttons, numbers and highlights" },
];

const GRADES: Record<PhotoGrade, { label: string; hint: string }> = {
  original: { label: "Original", hint: "Each photo keeps its own colours." },
  tinted: {
    label: "Tinted",
    hint: "Grey, washed in your accent colour, so phone snaps and press shots read as one set.",
  },
  mono: { label: "Mono", hint: "Black and white." },
};

function HexInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  // Local text so a half-typed hex code isn't overwritten while typing.
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  return (
    <input
      className="input"
      aria-label={`${label} hex code`}
      spellCheck={false}
      maxLength={7}
      value={focused ? text : value}
      style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, textTransform: "lowercase" }}
      onFocus={() => {
        setText(value);
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        let next = event.target.value.trim();
        setText(next);
        if (!next.startsWith("#")) next = `#${next}`;
        if (HEX.test(next)) onChange(next.toLowerCase());
      }}
    />
  );
}

export function BrandPanel({
  templateKey,
  templateVersion,
  templateName,
  colors,
  onColors,
  onReset,
  photoGrade,
  onPhotoGrade,
}: {
  templateKey: TemplateKey;
  templateVersion: number;
  templateName: string;
  colors: SiteColors;
  onColors: (colors: SiteColors) => void;
  onReset: () => void;
  /** Null when the template doesn't treat photos. */
  photoGrade: PhotoGrade | null;
  onPhotoGrade: (grade: PhotoGrade) => void;
}) {
  const ratio = contrastRatio(colors.ink, colors.bg);
  const ok = ratio >= MIN_TEXT_CONTRAST;
  const message =
    ratio >= 7
      ? "Excellent contrast between text and background."
      : ok
        ? "Good contrast. Meets the readability standard."
        : `Too low to read comfortably. Publishing needs at least ${MIN_TEXT_CONTRAST}:1.`;
  const isDefault =
    JSON.stringify(colors) === JSON.stringify(defaultColors(templateKey, templateVersion));

  return (
    <div className="cm-rise flex flex-col gap-[18px]" style={{ padding: "16px 16px 40px" }}>
      <div className="flex flex-col gap-1">
        <span className="kicker">Palette · {templateName}</span>
        <span className="text-[13px] text-neutral-700">
          Every colour on the page follows these three.
        </span>
      </div>
      <div role="radiogroup" aria-label="Palettes" className="grid grid-cols-2 gap-2">
        {templatePalettes(templateKey, templateVersion).map((palette) => {
          const selected =
            palette.colors.bg === colors.bg &&
            palette.colors.ink === colors.ink &&
            palette.colors.accent === colors.accent;
          return (
            <button
              key={palette.name}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onColors(palette.colors)}
              className="flex flex-col gap-2 bg-bg p-2.5 text-left transition-[border-color,transform] duration-200 ease-industry hover:-translate-y-px"
              style={{
                border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-divider)"}`,
              }}
            >
              <span aria-hidden className="flex h-[34px] overflow-hidden border border-divider">
                <span className="flex-[2]" style={{ background: palette.colors.bg }} />
                <span className="flex-1" style={{ background: palette.colors.ink }} />
                <span className="flex-1" style={{ background: palette.colors.accent }} />
              </span>
              <span className="flex items-center justify-between text-[13px]">
                {palette.name}
                {selected ? (
                  <Check size={14} strokeWidth={2} color="var(--color-accent-700)" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="kicker">Custom colours</span>
        {COLOR_ROWS.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[40px_minmax(0,1fr)_104px] items-center gap-2.5"
          >
            <label
              className="relative size-10 cursor-pointer border border-divider"
              style={{
                background: colors[row.key],
                boxShadow: "inset 0 0 0 3px var(--color-neutral-100)",
              }}
            >
              <span className="sr-only">Pick {row.label.toLowerCase()} colour</span>
              <input
                type="color"
                value={colors[row.key]}
                className="absolute inset-0 cursor-pointer opacity-0"
                onInput={(event) =>
                  onColors({ ...colors, [row.key]: (event.target as HTMLInputElement).value })
                }
                onChange={(event) => onColors({ ...colors, [row.key]: event.target.value })}
              />
            </label>
            <span className="flex flex-col">
              <span className="text-sm">{row.label}</span>
              <span className="text-xs text-neutral-700">{row.hint}</span>
            </span>
            <HexInput
              label={row.label}
              value={colors[row.key]}
              onChange={(value) => onColors({ ...colors, [row.key]: value })}
            />
          </div>
        ))}
      </div>
      <div
        role="status"
        className="flex items-center gap-2.5 p-3"
        style={{
          border: `1px solid ${ok ? "var(--color-divider)" : "var(--color-danger)"}`,
          background: ok ? "var(--color-bg)" : "var(--color-danger-soft)",
        }}
      >
        <span className="min-w-16 font-heading text-[22px] font-semibold">
          {ratio.toFixed(1)}:1
        </span>
        <span className="text-[13px] text-neutral-800">{message}</span>
      </div>
      <button
        type="button"
        className="btn btn-ghost self-start"
        style={{ paddingLeft: 0 }}
        disabled={isDefault}
        onClick={onReset}
      >
        Reset to {templateName} default
      </button>
      {photoGrade ? (
        <div className="flex flex-col gap-2">
          <span className="kicker">Photos</span>
          <div className="seg grid w-full grid-cols-3" role="radiogroup" aria-label="Photo grade">
            {PHOTO_GRADES.map((grade) => (
              <label key={grade} className="seg-opt justify-center">
                <input
                  type="radio"
                  name="photo-grade"
                  checked={photoGrade === grade}
                  onChange={() => onPhotoGrade(grade)}
                />
                {GRADES[grade].label}
              </label>
            ))}
          </div>
          <span className="text-xs text-neutral-700">
            {GRADES[photoGrade].hint} Applies to every photo on the site.
          </span>
        </div>
      ) : null}
    </div>
  );
}
