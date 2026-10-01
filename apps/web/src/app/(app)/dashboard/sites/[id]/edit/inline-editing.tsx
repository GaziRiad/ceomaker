"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Session {
  element: HTMLElement;
  path: string;
  /** The text the element showed when editing began. */
  before: string;
  restore: () => void;
}

/** The text an element shows, as edits are read: aria-hidden decorations don't count. */
function shownText(node: Node): string {
  if (node instanceof CharacterData) return node instanceof Text ? node.data : "";
  if (node instanceof Element && node.getAttribute("aria-hidden") === "true") return "";
  if (node instanceof HTMLBRElement) return "\n";
  let text = "";
  for (const child of node.childNodes) text += shownText(child);
  return text;
}

function readText(element: HTMLElement): string {
  return shownText(element).replace(/ /g, " ");
}

/**
 * Records an element's subtree so whatever typing did to it can be undone exactly. React owns
 * these nodes: they're put back before the edit is committed, and React then updates them.
 */
function snapshot(root: Node): () => void {
  const records: { node: Node; data: string | null; children: Node[] }[] = [];
  const walk = (node: Node) => {
    records.push({
      node,
      data: node instanceof CharacterData ? node.data : null,
      children: [...node.childNodes],
    });
    node.childNodes.forEach(walk);
  };
  walk(root);
  return () => {
    for (const { node, data, children } of records) {
      if (node instanceof CharacterData) {
        if (node.data !== data) node.data = data ?? "";
      } else if (
        node instanceof Element &&
        (node.childNodes.length !== children.length ||
          children.some((child, index) => node.childNodes[index] !== child))
      ) {
        node.replaceChildren(...children);
      }
    }
  };
}

function caretRangeAt(x: number, y: number): Range | null {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    return range;
  }
  return document.caretRangeFromPoint?.(x, y) ?? null;
}

/** Puts the caret where the click landed, or keeps a selection the click made inside the field. */
function placeCaret(field: HTMLElement, selected: Range | null, x: number, y: number) {
  const selection = window.getSelection();
  if (!selection) return;
  let range =
    selected && !selected.collapsed && field.contains(selected.commonAncestorContainer)
      ? selected
      : caretRangeAt(x, y);
  if (!range || !field.contains(range.startContainer)) {
    range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Inserts pasted text as one plain line at the caret. */
function insertPlainText(text: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

const BLOCKED_INPUT = new Set([
  "insertParagraph",
  "insertLineBreak",
  "insertFromDrop",
  "deleteByDrag",
]);

/**
 * Makes text in the preview editable in place. Templates mark each text with the content path
 * it shows (data-field). Clicking one turns it into a plain-text editor; Enter or clicking away
 * commits, Escape cancels. The preview never navigates: links only select text to edit.
 */
export function InlineEditing({
  children,
  onStart,
  onCommit,
}: {
  children: ReactNode;
  /** A field was clicked. Returns whether it can be edited in place right now. */
  onStart: (path: string) => boolean;
  onCommit: (path: string, before: string, after: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onStart, onCommit });

  useEffect(() => {
    callbacks.current = { onStart, onCommit };
  });

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    let session: Session | null = null;

    const finish = (save: boolean) => {
      const current = session;
      if (!current) return;
      session = null;
      const after = readText(current.element);
      current.element.removeAttribute("contenteditable");
      current.element.style.removeProperty("caret-color");
      current.restore();
      if (save && after !== current.before) {
        callbacks.current.onCommit(current.path, current.before, after);
      }
    };

    const start = (field: HTMLElement, path: string, x: number, y: number) => {
      const selection = window.getSelection();
      const selected = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
      session = { element: field, path, before: readText(field), restore: snapshot(field) };
      try {
        field.contentEditable = "plaintext-only";
      } catch {
        field.contentEditable = "true";
      }
      field.spellcheck = true;
      // Emphasis can be painted with transparent text (gradients), so pin the caret's colour.
      field.style.setProperty("caret-color", getComputedStyle(field).color);
      field.focus({ preventScroll: true });
      placeCaret(field, selected, x, y);
    };

    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      const target = event.target instanceof Element ? event.target : null;
      const field = target?.closest<HTMLElement>("[data-field]");
      const path = field?.dataset.field;
      if (!field || !path || !container.contains(field) || field === session?.element) return;
      if (!callbacks.current.onStart(path)) return;
      start(field, path, event.clientX, event.clientY);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!session || event.target !== session.element || event.isComposing) return;
      if (event.key === "Enter") {
        event.preventDefault();
        session.element.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      if (session && event.target === session.element) finish(true);
    };

    const onBeforeInput = (event: InputEvent) => {
      if (session && (event.inputType.startsWith("format") || BLOCKED_INPUT.has(event.inputType))) {
        event.preventDefault();
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      if (!session) return;
      event.preventDefault();
      insertPlainText((event.clipboardData?.getData("text/plain") ?? "").replace(/\s+/g, " "));
    };

    container.addEventListener("click", onClick);
    container.addEventListener("keydown", onKeyDown);
    container.addEventListener("focusout", onFocusOut);
    container.addEventListener("beforeinput", onBeforeInput);
    container.addEventListener("paste", onPaste);
    return () => {
      container.removeEventListener("click", onClick);
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("focusout", onFocusOut);
      container.removeEventListener("beforeinput", onBeforeInput);
      container.removeEventListener("paste", onPaste);
      session = null;
    };
  }, []);

  return (
    <div ref={root} className="cm-inline-edit">
      {children}
    </div>
  );
}
