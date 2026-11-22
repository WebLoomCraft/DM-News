"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Type,
  Underline,
  Youtube,
} from "lucide-react";
import { parseYouTubeId, youtubeEmbedUrl } from "@/lib/utils";
import { stripHtml } from "@/lib/utils";
import MediaPicker from "./MediaPicker";
import { Button, Field, Input, Modal, notify } from "./ui";

type Command = { icon: typeof Bold; label: string; run: () => void };

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the story…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(value || "");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [htmlMode, setHtmlMode] = useState(false);
  const [words, setWords] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    if (value !== lastEmitted.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    setWords(stripHtml(ref.current.innerHTML || "").split(/\s+/).filter(Boolean).length);
  }, [value]);

  const emit = () => {
    const html = ref.current?.innerHTML ?? "";
    lastEmitted.current = html;
    setWords(stripHtml(html).split(/\s+/).filter(Boolean).length);
    onChange(html);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    emit();
  };

  const commands: Command[] = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Underline, label: "Underline", run: () => exec("underline") },
    { icon: Heading2, label: "Heading 2", run: () => exec("formatBlock", "<h2>") },
    { icon: Heading3, label: "Heading 3", run: () => exec("formatBlock", "<h3>") },
    { icon: Type, label: "Paragraph", run: () => exec("formatBlock", "<p>") },
    { icon: List, label: "Bulleted list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Quote", run: () => exec("formatBlock", "<blockquote>") },
    { icon: Minus, label: "Divider", run: () => insertHtml("<hr/>") },
  ];

  const insertImage = (url: string, alt: string) => {
    insertHtml(
      `<figure><img src="${url.replace(/"/g, "&quot;")}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" /><figcaption>${alt}</figcaption></figure><p><br/></p>`,
    );
    notify("Image inserted", "success");
  };

  const insertYoutube = () => {
    const id = parseYouTubeId(ytUrl);
    if (!id) {
      notify("That does not look like a YouTube link", "error");
      return;
    }
    const embed = youtubeEmbedUrl(ytUrl) || `https://www.youtube-nocookie.com/embed/${id}`;
    insertHtml(
      `<iframe src="${embed}" title="YouTube video player" width="640" height="360" loading="lazy" allowfullscreen></iframe><p><br/></p>`,
    );
    setYtOpen(false);
    setYtUrl("");
    notify("Video embedded", "success");
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    const href = /^https?:|^mailto:|^tel:|^\/|^#/i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
    ref.current?.focus();
    const selection = window.getSelection();
    const text = selection && selection.toString().trim();
    if (text) {
      document.execCommand("createLink", false, href);
    } else {
      insertHtml(`<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener">${href}</a>&nbsp;`);
    }
    emit();
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {commands.map(({ icon: Icon, label, run }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={run}
            className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-white hover:text-[#0b1b33]"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button
          type="button"
          title="Insert link"
          aria-label="Insert link"
          onClick={() => setLinkOpen(true)}
          className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-white hover:text-[#0b1b33]"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Remove link"
          aria-label="Remove link"
          onClick={() => exec("unlink")}
          className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-white hover:text-[#0b1b33]"
        >
          <Link2Off className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Insert image from media library"
          aria-label="Insert image"
          onClick={() => setMediaOpen(true)}
          className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-white hover:text-[#0b1b33]"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Embed YouTube video"
          aria-label="Embed YouTube video"
          onClick={() => setYtOpen(true)}
          className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-white hover:text-[#0b1b33]"
        >
          <Youtube className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          onClick={() => exec("removeFormat")}
          className="grid h-8 w-8 place-items-center text-slate-600 hover:bg-white hover:text-[#0b1b33]"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (htmlMode && ref.current) {
              const textarea = document.getElementById("rte-source") as HTMLTextAreaElement | null;
              if (textarea) {
                lastEmitted.current = textarea.value;
                onChange(textarea.value);
              }
            }
            setHtmlMode((v) => !v);
          }}
          className="ml-auto px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-slate-500 hover:text-[#0b1b33]"
        >
          {htmlMode ? "Visual" : "HTML"}
        </button>
        <span className="px-2 text-[0.65rem] text-slate-400">{words} words</span>
      </div>

      {htmlMode ? (
        <textarea
          id="rte-source"
          defaultValue={value}
          onChange={(e) => {
            lastEmitted.current = e.target.value;
            onChange(e.target.value);
          }}
          className="min-h-[380px] w-full bg-white p-4 font-mono text-xs text-slate-700 outline-none"
          spellCheck={false}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Article body"
          data-placeholder={placeholder}
          onInput={emit}
          onBlur={emit}
          onPaste={(event) => {
            event.preventDefault();
            const text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
          }}
          className="editor-surface bg-white p-4 outline-none"
        />
      )}

      <MediaPicker
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        title="Insert image"
        onSelect={(item) => insertImage(item.url, item.alt || item.originalName)}
      />

      <Modal
        open={ytOpen}
        onClose={() => setYtOpen(false)}
        title="Embed a video"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setYtOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertYoutube}>Insert embed</Button>
          </>
        }
      >
        <Field label="YouTube URL" hint="Paste a watch, share or embed link — it is converted to a privacy-friendly embed.">
          <Input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        </Field>
      </Modal>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Insert link"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertLink}>Add link</Button>
          </>
        }
      >
        <Field label="Destination" hint="Select text first to link the selection, otherwise the URL itself is inserted.">
          <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" />
        </Field>
      </Modal>
    </div>
  );
}
