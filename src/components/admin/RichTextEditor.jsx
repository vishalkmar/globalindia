"use client";

import Link from "@tiptap/extension-link";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
  Unlink,
} from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

function ToolButton({ onClick, active, disabled, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded text-ink transition-colors hover:bg-surface disabled:opacity-40",
        active && "bg-[color-mix(in_oklab,var(--c-primary)_10%,var(--c-card))] text-primary",
      )}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </button>
  );
}

function safeHref(input) {
  const v = input.trim();
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return `https://${v}`;
  return null;
}

/**
 * Rich text editor (Phase 6 todo 10). Outputs simple semantic HTML (H2/H3, lists, links, quotes).
 * The output is sanitised again on the server before it is stored — never trust editor output alone.
 * @param {{ value: string, onChange: (html:string)=>void, label: string, placeholder?: string, minHeight?: number }} props
 */
export function RichTextEditor({ value, onChange, label, hint, minHeight = 200, className }) {
  const labelId = useId();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, link: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        "aria-labelledby": labelId,
        "aria-multiline": "true",
        role: "textbox",
        class: "prose-admin focus:outline-none px-4 py-3",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            ul: e.isActive("bulletList"),
            ol: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  function setLink() {
    const current = editor.getAttributes("link").href ?? "";
    const input = window.prompt("Link address (https://, mailto:, tel: or /page)", current);
    if (input === null) return;
    if (input.trim() === "") return editor.chain().focus().unsetLink().run();
    const href = safeHref(input);
    if (!href)
      return window.alert(
        "That link is not allowed. Use https://, mailto:, tel: or a page path like /products.",
      );
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  const s = state ?? {};
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id={labelId} className="text-label text-ink">
        {label}
      </span>
      <div className="overflow-hidden rounded-btn border border-line bg-card focus-within:border-primary">
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface px-1.5 py-1"
        >
          <ToolButton
            label="Bold"
            icon={Bold}
            active={s.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          />
          <ToolButton
            label="Italic"
            icon={Italic}
            active={s.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
          <ToolButton
            label="Heading"
            icon={Heading2}
            active={s.h2}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolButton
            label="Subheading"
            icon={Heading3}
            active={s.h3}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
          <ToolButton
            label="Bullet list"
            icon={List}
            active={s.ul}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          />
          <ToolButton
            label="Numbered list"
            icon={ListOrdered}
            active={s.ol}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          />
          <ToolButton
            label="Quote"
            icon={Quote}
            active={s.quote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <ToolButton
            label="Divider"
            icon={Minus}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
          <ToolButton label="Add link" icon={Link2} active={s.link} onClick={setLink} />
          <ToolButton
            label="Remove link"
            icon={Unlink}
            disabled={!s.link}
            onClick={() => editor?.chain().focus().unsetLink().run()}
          />
          <span className="flex-1" />
          <ToolButton
            label="Undo"
            icon={Undo2}
            disabled={!s.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          />
          <ToolButton
            label="Redo"
            icon={Redo2}
            disabled={!s.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          />
        </div>
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div className="skeleton m-3" style={{ height: minHeight - 24 }} />
        )}
      </div>
      {hint ? <p className="text-[0.8125rem] text-muted">{hint}</p> : null}
    </div>
  );
}
