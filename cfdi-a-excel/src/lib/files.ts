/** Utilidades para recolectar archivos .xml desde un drop (incluye carpetas) o un <input>. */

const isXml = (name: string) => name.toLowerCase().endsWith(".xml");

function readEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function walk(entry: FileSystemEntry, out: File[], others: { count: number }) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    if (isXml(file.name)) out.push(file);
    else others.count++;
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries devuelve los resultados por lotes: hay que llamarlo hasta que regrese vacío.
    for (;;) {
      const batch = await readEntries(reader);
      if (!batch.length) break;
      for (const child of batch) await walk(child, out, others);
    }
  }
}

export async function filesFromDataTransfer(dt: DataTransfer) {
  // Arrastrar desde una página web (p. ej. GitHub) entrega un enlace, no un archivo.
  const hasFiles = Array.from(dt.items).some((i) => i.kind === "file") || dt.files.length > 0;
  if (!hasFiles) {
    const linkDropped = dt.types.includes("text/uri-list") || dt.types.includes("text/plain");
    return { xml: [] as File[], ignored: 0, linkDropped };
  }
  const xml: File[] = [];
  const others = { count: 0 };
  const entries = Array.from(dt.items)
    .filter((i) => i.kind === "file")
    .map((i) => i.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e);

  if (entries.length) {
    for (const entry of entries) await walk(entry, xml, others);
  } else {
    for (const f of Array.from(dt.files)) {
      if (isXml(f.name)) xml.push(f);
      else others.count++;
    }
  }
  return { xml, ignored: others.count, linkDropped: false };
}

export function filesFromList(list: FileList | null) {
  const all = Array.from(list ?? []);
  const xml = all.filter((f) => isXml(f.name));
  return { xml, ignored: all.length - xml.length };
}
