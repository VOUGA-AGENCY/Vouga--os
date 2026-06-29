import { useEditor, EditorContent, Editor, ReactRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  Trash2,
  Plus,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
} from "lucide-react";

// Embeddable iframe node (used for PDFs embutidos na página)
const Iframe = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
      height: { default: "600" },
    };
  },
  parseHTML() {
    return [{ tag: "iframe" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "iframe",
      mergeAttributes(HTMLAttributes, {
        frameborder: "0",
        allowfullscreen: "true",
        style:
          "width:100%;height:" +
          (HTMLAttributes.height || "600") +
          "px;border:1px solid hsl(var(--border));border-radius:8px;margin:8px 0;display:block;",
      }),
    ];
  },
});

type CommandItem = {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  command: (props: { editor: Editor; range: { from: number; to: number } }) => void;
};

function buildItems(opts: {
  onImportExcel: () => void;
  onImportPdf: () => void;
  onImportImage: () => void;
}): CommandItem[] {
  return [
    {
      title: "Título 1",
      icon: Heading1,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
    },
    {
      title: "Título 2",
      icon: Heading2,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
    },
    {
      title: "Título 3",
      icon: Heading3,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
    },
    {
      title: "Lista",
      icon: List,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Lista numerada",
      icon: ListOrdered,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "To do list",
      icon: CheckSquare,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      title: "Tabela",
      description: "3x3 editável",
      icon: TableIcon,
      command: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: "Citação",
      icon: Quote,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Bloco de código",
      icon: Code,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Separador",
      icon: Minus,
      command: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "Imagem",
      description: "PNG, JPG",
      icon: ImageIcon,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        opts.onImportImage();
      },
    },
    {
      title: "Importar Excel",
      description: ".xlsx ou .csv → tabela",
      icon: FileSpreadsheet,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        opts.onImportExcel();
      },
    },
    {
      title: "Importar PDF",
      description: "Embutido na página",
      icon: FileText,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        opts.onImportPdf();
      },
    },
  ];
}

const CommandList = forwardRef<
  { onKeyDown: (e: { event: KeyboardEvent }) => boolean },
  { items: CommandItem[]; command: (item: CommandItem) => void }
>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));
  if (!items.length)
    return (
      <div className="rounded-md border border-border bg-popover p-2 text-xs text-muted-foreground shadow-md">
        Sem resultados
      </div>
    );
  return (
    <div className="max-h-80 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => command(item)}
            onMouseEnter={() => setSelected(i)}
            className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs ${
              i === selected ? "bg-accent" : ""
            }`}
          >
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              {item.description && (
                <p className="truncate text-[10px] text-muted-foreground">{item.description}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
});
CommandList.displayName = "CommandList";

const SlashCommand = Extension.create<{
  getItems: () => CommandItem[];
}>({
  name: "slashCommand",
  addOptions() {
    return { getItems: () => [] };
  },
  addProseMirrorPlugins() {
    const getItems = this.options.getItems;
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("slashCommand"),
        startOfLine: false,
        command: ({ editor, range, props }) => {
          (props as CommandItem).command({ editor, range });
        },
        items: ({ query }) =>
          getItems().filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] = [];
          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              const editorEl = props.editor.options.element as HTMLElement;
              const host =
                (editorEl.closest('[role="dialog"]') as HTMLElement | null) ??
                document.body;
              popup = tippy("body", {
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
                appendTo: () => host,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                zIndex: 9999,
              });
            },
            onUpdate: (props) => {
              component?.updateProps(props);
              popup[0]?.setProps({
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
              });
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return (component?.ref as { onKeyDown?: (p: typeof props) => boolean } | null)?.onKeyDown?.(props) ?? false;
            },
            onExit: () => {
              popup[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

async function uploadToDocs(file: File, folder: string): Promise<string | null> {
  const path = `commercial/${folder}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error } = await supabase.storage.from("docs").upload(path, file);
  if (error) {
    toast.error(error.message);
    return null;
  }
  const { data } = await supabase.storage.from("docs").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

function sheetToHtmlTable(sheet: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
  if (!rows.length) return "";
  const [header, ...body] = rows;
  const headHtml = `<tr>${header.map((c) => `<th>${escapeHtml(String(c ?? ""))}</th>`).join("")}</tr>`;
  const bodyHtml = body
    .map((r) => `<tr>${header.map((_, i) => `<td>${escapeHtml(String(r[i] ?? ""))}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${headHtml}${bodyHtml}</table>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export type RichEditorHandle = { getHTML: () => string };

export const RichEditor = forwardRef<
  RichEditorHandle,
  { value: string; onChange: (html: string) => void; placeholder?: string; bordered?: boolean; minHeight?: number }
>(({ value, onChange, placeholder, bordered = false, minHeight }, ref) => {
  const excelInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [sheetPicker, setSheetPicker] = useState<{ wb: XLSX.WorkBook } | null>(null);
  const [pdfPicker, setPdfPicker] = useState<{ url: string; name: string } | null>(null);

  const editor = useEditor({
    extensions: useMemo(
      () => [
        StarterKit,
        Placeholder.configure({ placeholder: placeholder ?? "Escreve, ou carrega / para inserir..." }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true, HTMLAttributes: { class: "kt-table" } }),
        TableRow,
        TableHeader,
        TableCell,
        Link.configure({ openOnClick: true, autolink: true }),
        Image.configure({ HTMLAttributes: { class: "kt-img" } }),
        Iframe,
        SlashCommand.configure({
          getItems: () =>
            buildItems({
              onImportExcel: () => excelInput.current?.click(),
              onImportPdf: () => pdfInput.current?.click(),
              onImportImage: () => imageInput.current?.click(),
            }),
        }),
      ],
      [placeholder],
    ),
    content: value || "",
    editorProps: {
      attributes: {
        style: minHeight ? `min-height:${minHeight}px` : "",
        class:
          "kt-editor focus:outline-none max-w-none" +
          (minHeight ? "" : " min-h-[500px]"),
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (file.type.startsWith("image/")) {
          event.preventDefault();
          void handleImage(file);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useImperativeHandle(ref, () => ({ getHTML: () => editor?.getHTML() ?? "" }), [editor]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  async function handleImage(file: File) {
    const url = await uploadToDocs(file, "img");
    if (url && editor) editor.chain().focus().setImage({ src: url, alt: file.name }).run();
  }

  async function handlePdf(file: File) {
    const url = await uploadToDocs(file, "pdf");
    if (url) setPdfPicker({ url, name: file.name });
  }

  function insertPdfEmbed(url: string) {
    if (!editor) return;
    editor.chain().focus().insertContent({ type: "iframe", attrs: { src: url, height: "600" } }).run();
    setPdfPicker(null);
  }

  function insertPdfLink(url: string, name: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<p>📎 <a href="${url}" target="_blank" rel="noopener">${escapeHtml(name)}</a></p>`,
      )
      .run();
    setPdfPicker(null);
  }

  async function handleExcel(file: File) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    if (wb.SheetNames.length === 1) {
      insertSheet(wb, wb.SheetNames[0]);
    } else {
      setSheetPicker({ wb });
    }
  }

  function insertSheet(wb: XLSX.WorkBook, name: string) {
    const html = sheetToHtmlTable(wb.Sheets[name]);
    if (html && editor) editor.chain().focus().insertContent(html).run();
    setSheetPicker(null);
  }

  return (
    <div className="space-y-3">
      
      <div className={bordered ? "rounded-md border border-border bg-background p-6" : ""}>
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu
            editor={editor}
            options={{ placement: "top" }}
            shouldShow={({ editor }) => editor.isActive("table")}
            className="flex items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-md"
          >
            <TableBtn label="Linha acima" onClick={() => editor.chain().focus().addRowBefore().run()}>
              <ArrowUpFromLine className="h-3.5 w-3.5" />
            </TableBtn>
            <TableBtn label="Linha abaixo" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <ArrowDownFromLine className="h-3.5 w-3.5" />
            </TableBtn>
            <TableBtn label="Coluna à esquerda" onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <ArrowLeftFromLine className="h-3.5 w-3.5" />
            </TableBtn>
            <TableBtn label="Coluna à direita" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <ArrowRightFromLine className="h-3.5 w-3.5" />
            </TableBtn>
            <div className="mx-1 h-4 w-px bg-border" />
            <TableBtn label="Apagar linha" onClick={() => editor.chain().focus().deleteRow().run()}>
              <span className="text-[10px]">− linha</span>
            </TableBtn>
            <TableBtn label="Apagar coluna" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <span className="text-[10px]">− coluna</span>
            </TableBtn>
            <div className="mx-1 h-4 w-px bg-border" />
            <TableBtn label="Apagar tabela" onClick={() => editor.chain().focus().deleteTable().run()}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </TableBtn>
          </BubbleMenu>
        )}
      </div>

      <input
        ref={excelInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleExcel(f);
          e.target.value = "";
        }}
      />
      <input
        ref={pdfInput}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePdf(f);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImage(f);
          e.target.value = "";
        }}
      />

      {sheetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-popover p-4 shadow-lg">
            <p className="mb-3 text-sm font-medium">Escolhe a folha a importar</p>
            <ul className="space-y-1">
              {sheetPicker.wb.SheetNames.map((n) => (
                <li key={n}>
                  <button
                    onClick={() => insertSheet(sheetPicker.wb, n)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    {n}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setSheetPicker(null)}
              className="mt-3 w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pdfPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-md border border-border bg-popover p-4 shadow-lg">
            <p className="mb-1 text-sm font-medium">Como inserir o PDF?</p>
            <p className="mb-3 truncate text-xs text-muted-foreground">{pdfPicker.name}</p>
            <div className="space-y-1.5">
              <button
                onClick={() => insertPdfEmbed(pdfPicker.url)}
                className="w-full rounded border border-border px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <p className="font-medium">Embutido na página</p>
                <p className="text-xs text-muted-foreground">Visualizador inline, sempre visível</p>
              </button>
              <button
                onClick={() => insertPdfLink(pdfPicker.url, pdfPicker.name)}
                className="w-full rounded border border-border px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <p className="font-medium">Só link clicável</p>
                <p className="text-xs text-muted-foreground">Abre noutro separador</p>
              </button>
            </div>
            <button
              onClick={() => setPdfPicker(null)}
              className="mt-3 w-full rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
RichEditor.displayName = "RichEditor";

function TableBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded px-1.5 text-xs text-foreground hover:bg-accent"
    >
      {children}
    </button>
  );
}
