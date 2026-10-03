"use client";

import {
  contrastRatio,
  cutToWidth,
  GOOGLE_DESCRIPTION_PX,
  GOOGLE_TITLE_PX,
  type SiteColors,
  type SiteMeta,
} from "@ceomaker/schema";
import { FONTS, ShareCard, SHARE_CARD_WIDTH } from "@ceomaker/templates";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Alert, CircleAlert } from "@/components/icons";
import { Blueprint } from "@/components/ui";
import { CropDialog } from "./crop-dialog";
import {
  pickImage,
  uploadCrop,
  type CropState,
  type PickedImage,
  type ShareUploadKind,
} from "./share-uploads";

// The Sharing tab: what people see in Google and in shared links before they open the site.
// Each field starts on its automatic value; typing makes it custom, and the canvas shows live
// previews of a Google result, a LinkedIn post and a browser tab.

export interface ShareView {
  template: string;
  templateName: string;
  colors: SiteColors;
  name: string;
  initials: string;
  role?: string | undefined;
  organization?: string | undefined;
  /** The hero portrait, if any. */
  photo?: string | undefined;
  /** The site's address: its own domain when connected, else name.ceomaker.app. */
  domain: string;
  /** What the owner typed; empty means automatic. */
  title: string;
  description: string;
  autoTitle: string;
  autoDescription: string;
  shareImage?: string | undefined;
  favicon?: string | undefined;
}

const BROWSER_FONTS = {
  serif: FONTS.newsreader,
  sans: FONTS.inter,
  display: FONTS.bigShoulders,
  body: FONTS.publicSans,
};

const shownTitle = (view: ShareView) => view.title.trim() || view.autoTitle;
const shownDescription = (view: ShareView) => view.description.trim() || view.autoDescription;

function Tag({ custom }: { custom: boolean }) {
  return custom ? (
    <span className="tag tag-accent">Custom</span>
  ) : (
    <span className="tag tag-neutral">Automatic</span>
  );
}

function Warning({ children }: { children: ReactNode }) {
  return (
    <span className="flex gap-2 bg-warning-soft px-3 py-2.5 text-[13px] leading-[1.45] text-warning">
      <CircleAlert size={16} className="mt-px flex-none" />
      <span>{children}</span>
    </span>
  );
}

function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <span
      role="alert"
      className="flex gap-2 bg-danger-soft px-3 py-2.5 text-[13px] leading-[1.45] text-danger"
    >
      <Alert size={16} className="mt-px flex-none" />
      <span>{children}</span>
    </span>
  );
}

/** The automatic favicon: initials on the accent, in the template's display face. */
export function Monogram({
  view,
  size,
  fontSize,
}: {
  view: ShareView;
  size: number;
  fontSize: number;
}) {
  const { bg, ink, accent } = view.colors;
  const on = contrastRatio(bg, accent) >= contrastRatio(ink, accent) ? bg : ink;
  const monument = view.template === "monument";
  return (
    <span
      className="relative flex flex-none items-center justify-center overflow-hidden leading-none"
      style={{
        width: size,
        height: size,
        background: accent,
        color: on,
        fontFamily: monument ? FONTS.bigShoulders : FONTS.newsreader,
        fontWeight: monument ? 900 : 500,
        fontSize,
        letterSpacing: "0.01em",
      }}
    >
      {view.initials}
      {view.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element -- an uploaded image at a fixed size
        <img src={view.favicon} alt="" className="absolute inset-0 size-full object-cover" />
      ) : null}
    </span>
  );
}

/** The generated share card, drawn at 1200 x 630 and scaled to its box. */
function ScaledCard({ view }: { view: ShareView }) {
  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.27);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const update = () => {
      const next = element.clientWidth / SHARE_CARD_WIDTH;
      if (next > 0) setZoom(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="aspect-[1200/630] w-full overflow-hidden" aria-hidden>
      <div style={{ zoom }}>
        <ShareCard
          template={view.template}
          colors={view.colors}
          name={view.name}
          role={view.role}
          organization={view.organization}
          domain={view.domain}
          photo={view.photo}
          fonts={BROWSER_FONTS}
        />
      </div>
    </div>
  );
}

function ShareImage({ view }: { view: ShareView }) {
  return view.shareImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded 1200 x 630 image
    <img
      src={view.shareImage}
      alt="Your share image"
      className="block aspect-[1200/630] w-full object-cover"
    />
  ) : (
    <ScaledCard view={view} />
  );
}

function FileButton({
  label,
  accept,
  disabled,
  onFile,
}: {
  label: string;
  accept: string;
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className="btn btn-secondary cursor-pointer bg-neutral-100 has-[:disabled]:cursor-default has-[:disabled]:opacity-60"
      style={{ fontSize: 13, padding: "5px 10px" }}
    >
      {label}
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

const RESET = { fontSize: 13, padding: "4px 0" } as const;

export function SharingPanel({
  view,
  onMeta,
}: {
  view: ShareView;
  onMeta: (patch: Partial<SiteMeta>) => void;
}) {
  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [pending, setPending] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<ShareUploadKind, string | null>>({
    image: null,
    favicon: null,
  });
  const [names, setNames] = useState<Record<ShareUploadKind, string | null>>({
    image: null,
    favicon: null,
  });

  const title = shownTitle(view);
  const description = shownDescription(view);
  const titleCut = cutToWidth(title, 20, GOOGLE_TITLE_PX);
  const descriptionCut = cutToWidth(description, 14, GOOGLE_DESCRIPTION_PX);
  const customTitle = view.title.trim() !== "";
  const customDescription = view.description.trim() !== "";

  const closeCrop = () => {
    if (picked) URL.revokeObjectURL(picked.src);
    setPicked(null);
    setCropError(null);
  };

  const save = async (image: PickedImage, crop: CropState) => {
    setPending(true);
    setCropError(null);
    const result = await uploadCrop(image, crop);
    setPending(false);
    if (!result.ok) {
      if (picked) setCropError(result.error);
      else setErrors((current) => ({ ...current, [image.kind]: result.error }));
      return false;
    }
    onMeta(image.kind === "image" ? { shareImage: result.src } : { favicon: result.src });
    setNames((current) => ({ ...current, [image.kind]: image.name }));
    return true;
  };

  const onFile = async (file: File, kind: ShareUploadKind) => {
    setErrors((current) => ({ ...current, [kind]: null }));
    const result = await pickImage(file, kind);
    if (!result.ok) {
      setErrors((current) => ({ ...current, [kind]: result.error }));
      return;
    }
    const image = result.image;
    // A square favicon needs no crop.
    if (kind === "favicon" && Math.abs(image.width - image.height) < 2) {
      await save(image, { x: 0.5, y: 0.5, zoom: 1 });
      URL.revokeObjectURL(image.src);
      return;
    }
    setPicked(image);
  };

  return (
    <div className="flex flex-col gap-6" style={{ padding: "16px 16px 40px" }}>
      <div className="flex flex-col gap-1">
        <span className="kicker">Search and sharing</span>
        <span className="text-[13px] text-neutral-700">
          What people see in Google and in shared links, before they open your site.
        </span>
      </div>

      <div className="field flex flex-col gap-1.5">
        <span className="flex items-center justify-between">
          <label htmlFor="share-title" className="field-label" style={{ margin: 0 }}>
            Title
          </label>
          <Tag custom={customTitle} />
        </span>
        <input
          id="share-title"
          className="input"
          maxLength={70}
          value={view.title}
          placeholder={view.autoTitle}
          aria-describedby="share-title-hint"
          onChange={(event) => onMeta({ title: event.target.value })}
        />
        <span
          id="share-title-hint"
          className="flex justify-between gap-3 text-xs leading-[1.4] text-neutral-700"
        >
          <span>
            {customTitle
              ? "Shown as the link in Google and in browser tabs."
              : "Automatic: your name, role and organisation."}
          </span>
          <span
            className="flex-none tabular-nums"
            style={{ color: titleCut.cut ? "var(--color-warning)" : "var(--color-neutral-600)" }}
          >
            {title.length} / 70
          </span>
        </span>
        {titleCut.cut ? (
          <Warning>
            Google will cut this off after “{titleCut.last}”. Put the words that matter most first,
            or shorten it.
          </Warning>
        ) : null}
        {view.title ? (
          <button
            type="button"
            className="btn btn-ghost self-start"
            style={RESET}
            onClick={() => onMeta({ title: "" })}
          >
            Reset to automatic
          </button>
        ) : null}
      </div>

      <div className="field flex flex-col gap-1.5">
        <span className="flex items-center justify-between">
          <label htmlFor="share-description" className="field-label" style={{ margin: 0 }}>
            Description
          </label>
          <Tag custom={customDescription} />
        </span>
        <textarea
          id="share-description"
          className="input"
          maxLength={160}
          style={{ minHeight: 104, resize: "vertical" }}
          value={view.description}
          placeholder={view.autoDescription}
          aria-describedby="share-description-hint"
          onChange={(event) => onMeta({ description: event.target.value })}
        />
        <span
          id="share-description-hint"
          className="flex justify-between gap-3 text-xs leading-[1.4] text-neutral-700"
        >
          <span>
            {customDescription
              ? "Shown under the title in Google."
              : "Automatic: your introduction, shortened to fit."}
          </span>
          <span
            className="flex-none tabular-nums"
            style={{
              color: descriptionCut.cut ? "var(--color-warning)" : "var(--color-neutral-600)",
            }}
          >
            {description.length} / 160
          </span>
        </span>
        {descriptionCut.cut ? (
          <Warning>
            Google will show about the first {descriptionCut.shown} characters. The rest will be cut
            off.
          </Warning>
        ) : null}
        {view.description ? (
          <button
            type="button"
            className="btn btn-ghost self-start"
            style={RESET}
            onClick={() => onMeta({ description: "" })}
          >
            Reset to automatic
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex items-center justify-between">
          <span className="field-label" style={{ margin: 0 }}>
            Share image
          </span>
          <Tag custom={Boolean(view.shareImage)} />
        </span>
        <div className="border border-divider bg-bg leading-none">
          <ShareImage view={view} />
        </div>
        <span className="text-xs leading-[1.4] text-neutral-700">
          {view.shareImage
            ? `${names.image ?? "Your image"} · cropped to 1200 × 630.`
            : `Made from your name, role and ${view.templateName} colours. It updates when they change. Upload 1200 × 630 or larger to replace it.`}
        </span>
        {errors.image ? <ErrorNote>{errors.image}</ErrorNote> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <FileButton
            label={view.shareImage ? "Replace image" : "Upload image"}
            accept="image/png,image/jpeg,image/webp"
            disabled={pending}
            onFile={(file) => void onFile(file, "image")}
          />
          {view.shareImage ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 13, padding: "5px 8px" }}
              onClick={() => {
                onMeta({ shareImage: undefined });
                setErrors((current) => ({ ...current, image: null }));
              }}
            >
              Reset to automatic
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex items-center justify-between">
          <span className="field-label" style={{ margin: 0 }}>
            Favicon
          </span>
          <Tag custom={Boolean(view.favicon)} />
        </span>
        <div className="flex items-center gap-3.5 border border-divider bg-bg p-3">
          <div className="flex flex-none items-end gap-2.5" aria-hidden>
            {[
              [48, 20],
              [32, 13],
              [16, 7],
            ].map(([size, fontSize]) => (
              <span key={size} className="flex flex-col items-center gap-1">
                <Monogram view={view} size={size!} fontSize={fontSize!} />
                <span className="text-[11px] text-neutral-600">{size}</span>
              </span>
            ))}
          </div>
          <span className="text-[13px] leading-[1.45] text-neutral-700">
            {view.favicon
              ? `${names.favicon ?? "Your image"}. Shown in browser tabs, bookmarks and next to your Google result.`
              : "Your monogram on your accent colour. Shown in browser tabs, bookmarks and next to your Google result."}
          </span>
        </div>
        {errors.favicon ? <ErrorNote>{errors.favicon}</ErrorNote> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <FileButton
            label={view.favicon ? "Replace image" : "Upload square image"}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            disabled={pending}
            onFile={(file) => void onFile(file, "favicon")}
          />
          {view.favicon ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 13, padding: "5px 8px" }}
              onClick={() => {
                onMeta({ favicon: undefined });
                setErrors((current) => ({ ...current, favicon: null }));
              }}
            >
              Reset to automatic
            </button>
          ) : null}
        </div>
        <span className="text-xs leading-[1.4] text-neutral-700">
          Square, at least 192 × 192. If yours can&apos;t load, your monogram is shown instead.
        </span>
      </div>

      <span className="border-t border-divider pt-3.5 text-[13px] leading-normal text-neutral-700">
        Changes go live when you update your site. Apps that already showed your link may keep the
        old preview for a few days.
      </span>

      <CropDialog
        key={picked?.src ?? "none"}
        image={picked}
        pending={pending}
        error={cropError}
        onApply={(crop) => {
          if (!picked) return;
          void save(picked, crop).then((ok) => {
            if (ok) closeCrop();
          });
        }}
        onCancel={closeCrop}
      />
    </div>
  );
}

function PreviewLabel({ name, note }: { name: string; note: string }) {
  return (
    <span className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-neutral-700">
      <span className="tracking-[0.1em] uppercase">{name}</span>
      <span>{note}</span>
    </span>
  );
}

/** The canvas while Sharing is open: live previews instead of the site. */
export function SharingPreviews({ view }: { view: ShareView }) {
  const title = shownTitle(view);
  const description = shownDescription(view);
  const googleTitle = cutToWidth(title, 20, GOOGLE_TITLE_PX);
  const googleDescription = cutToWidth(description, 14, GOOGLE_DESCRIPTION_PX);
  const position = [view.role, view.organization].filter(Boolean).join(" · ");

  return (
    <div
      className="flex min-h-0 flex-col overflow-auto bg-surface"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="sticky top-0 z-10 flex h-14 flex-none items-center justify-center bg-surface px-6">
        <span className="kicker">Previews · update as you type</span>
      </div>
      <div className="mx-auto flex w-full max-w-[700px] flex-none flex-col gap-8 px-4 pt-1 pb-12 sm:px-6">
        <div className="flex flex-col gap-2.5">
          <PreviewLabel name="Google search · desktop" note="Uses title, description and favicon" />
          <Blueprint
            className="bg-white shadow-sm"
            style={{
              padding: "22px 26px",
              fontFamily: "Arial, Helvetica, sans-serif",
              lineHeight: "normal",
            }}
          >
            <div className="max-w-[600px]">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-7 flex-none items-center justify-center rounded-full"
                  style={{ background: "#f1f3f4", border: "1px solid #dadce0" }}
                >
                  <Monogram view={view} size={18} fontSize={8} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span style={{ fontSize: 14, lineHeight: "20px", color: "#202124" }}>
                    {view.name}
                  </span>
                  <span
                    className="truncate"
                    style={{ fontSize: 12, lineHeight: "18px", color: "#4d5156" }}
                  >
                    https://{view.domain}
                  </span>
                </span>
              </div>
              <div
                className="line-clamp-2 overflow-hidden sm:line-clamp-none sm:whitespace-nowrap"
                style={{ marginTop: 6, fontSize: 20, lineHeight: "26px", color: "#1a0dab" }}
              >
                {googleTitle.text}
              </div>
              <div style={{ marginTop: 4, fontSize: 14, lineHeight: "22px", color: "#4d5156" }}>
                {googleDescription.text}
              </div>
            </div>
          </Blueprint>
        </div>

        <div className="flex flex-col gap-2.5">
          <PreviewLabel
            name="LinkedIn post"
            note="Uses share image and title. WhatsApp and email look similar."
          />
          <Blueprint
            className="bg-white shadow-sm"
            style={{
              padding: 0,
              fontFamily: "-apple-system, system-ui, 'Segoe UI', Roboto, sans-serif",
              lineHeight: 1.35,
            }}
          >
            <div className="flex items-center gap-2.5" style={{ padding: "14px 16px" }}>
              <span className="relative flex size-11 flex-none items-center justify-center overflow-hidden rounded-full bg-accent-200 text-[15px] font-semibold text-accent-800">
                {view.initials}
                {view.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the owner's portrait
                  <img
                    src={view.photo}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : null}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold" style={{ color: "rgba(0,0,0,.9)" }}>
                  {view.name}
                </span>
                {position ? (
                  <span className="text-xs" style={{ color: "rgba(0,0,0,.6)" }}>
                    {position}
                  </span>
                ) : null}
                <span className="text-xs" style={{ color: "rgba(0,0,0,.6)" }}>
                  Now
                </span>
              </span>
            </div>
            <div className="mx-4 mb-4 overflow-hidden" style={{ border: "1px solid #e0dfdc" }}>
              <div className="leading-none" style={{ borderBottom: "1px solid #e0dfdc" }}>
                <ShareImage view={view} />
              </div>
              <div
                className="flex flex-col gap-0.5"
                style={{ padding: "10px 14px 12px", background: "#f9fafb" }}
              >
                <span
                  className="line-clamp-2 text-sm font-semibold"
                  style={{ color: "rgba(0,0,0,.9)" }}
                >
                  {title}
                </span>
                <span className="text-xs" style={{ color: "rgba(0,0,0,.6)" }}>
                  {view.domain}
                </span>
              </div>
            </div>
          </Blueprint>
        </div>

        <div className="flex flex-col gap-2.5">
          <PreviewLabel name="Browser tab" note="Uses favicon and title" />
          <Blueprint
            className="shadow-sm"
            style={{
              padding: 0,
              background: "#dfe1e5",
              fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
            }}
          >
            <div className="flex items-end gap-0.5" style={{ padding: "8px 10px 0" }}>
              <span className="flex gap-1.5" style={{ padding: "0 10px 10px 4px" }} aria-hidden>
                {["#ff5f57", "#febc2e", "#28c840"].map((color) => (
                  <span key={color} className="size-3 rounded-full" style={{ background: color }} />
                ))}
              </span>
              <span
                className="flex h-9 min-w-0 items-center gap-2 bg-white px-3"
                style={{ width: 250, borderRadius: "9px 9px 0 0" }}
              >
                <Monogram view={view} size={16} fontSize={7} />
                <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "#202124" }}>
                  {title}
                </span>
                <span aria-hidden className="text-sm" style={{ color: "#5f6368" }}>
                  ×
                </span>
              </span>
              <span
                className="hidden h-9 items-center px-3.5 text-xs sm:flex"
                style={{ width: 170, color: "#5f6368" }}
              >
                New tab
              </span>
            </div>
            <div
              className="bg-white"
              style={{ padding: "7px 10px", borderBottom: "1px solid #dadce0" }}
            >
              <div
                className="flex h-[30px] items-center gap-2 rounded-[15px] px-3 text-[13px]"
                style={{ background: "#f1f3f4", color: "#202124" }}
              >
                <svg
                  aria-hidden
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5f6368"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="truncate">{view.domain}</span>
              </div>
            </div>
            <div className="h-14 bg-white" />
          </Blueprint>
        </div>
      </div>
    </div>
  );
}
