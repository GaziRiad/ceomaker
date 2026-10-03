import type { CSSProperties, ElementType, ReactNode } from "react";

/** The four "+" registration marks of a blueprint frame. */
export function Corners() {
  return (
    <>
      <i aria-hidden className="corner tl" />
      <i aria-hidden className="corner tr" />
      <i aria-hidden className="corner bl" />
      <i aria-hidden className="corner br" />
    </>
  );
}

/** Hairline frame with registration marks, used for cards, previews and dialogs. */
export function Blueprint<T extends ElementType = "div">({
  as,
  className = "",
  style,
  children,
  ...rest
}: {
  as?: T;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "style" | "children">) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component className={`blueprint ${className}`} style={style} {...rest}>
      <Corners />
      {children}
    </Component>
  );
}

/**
 * The CEOMaker symbol: a frame's corner and the block it holds (design/brand). Drawn on a
 * 28-unit grid; at 16px and below use FAVICON_PATH, whose bars are tuned to whole pixels.
 */
export const SYMBOL_PATH = "M0 0H28V6H6V28H0Z M10 10H28V28H10Z";

export function BrandSymbol({
  size = 20,
  color = "var(--color-accent)",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className={className}
      style={{ flex: "none" }}
    >
      <path fill={color} fillRule="evenodd" d={SYMBOL_PATH} />
    </svg>
  );
}

/** The lockup: symbol, then CEO in the text colour and MAKER in the accent. */
export function Wordmark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-heading font-semibold uppercase ${className}`}
      style={{ fontSize: size, letterSpacing: "0.02em", lineHeight: 1, gap: size * 0.4 }}
    >
      <BrandSymbol size={Math.round(size * 0.82)} />
      <span>
        CEO<span className="text-accent">Maker</span>
      </span>
    </span>
  );
}

export interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export function Icon({
  size = 18,
  strokeWidth = 1.5,
  className,
  color = "currentColor",
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

// Lucide icons (stroke 1.5), inlined: the app uses only a handful.
export function ArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  );
}

export function Check(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

export function Mail(props: IconProps) {
  return (
    <Icon {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Icon>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <span aria-hidden className="cm-spinner" style={{ width: size, height: size }} />;
}

/** Round initials badge for the signed-in user. */
export function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="flex size-8 flex-none items-center justify-center rounded-full bg-accent-200 text-[13px] text-accent-800"
    >
      {initials}
    </span>
  );
}

/** Fixed browser-like address bar on top of preview frames. */
export function AddressBar({
  address,
  live = false,
  height = 32,
}: {
  address: string;
  live?: boolean;
  height?: number;
}) {
  return (
    <div
      className="flex items-center gap-2.5 border-b border-divider px-3 text-xs text-neutral-700"
      style={{ height }}
    >
      {live ? <span className="cm-pulse size-[7px] flex-none rounded-full bg-accent" /> : null}
      <span className="truncate">{address}</span>
    </div>
  );
}
