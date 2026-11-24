import { XMLParser, XMLValidator } from "fast-xml-parser";

/** Una fila del reporte: exactamente las columnas que se exportan a Excel. */
export interface CfdiRow {
  fecha: string;
  uuid: string;
  serie: string;
  folio: string;
  tipoComprobante: string;
  rfcEmisor: string;
  nombreEmisor: string;
  rfcReceptor: string;
  nombreReceptor: string;
  metodoPago: string;
  formaPago: string;
  usoCfdi: string;
  subtotal: number;
  descuento: number;
  ivaTrasladado: number;
  retencionIva: number;
  retencionIsr: number;
  total: number;
  conceptos: string;
  /** Metadatos (no se exportan como columna). */
  version: string;
  archivo: string;
}

export type ParseResult =
  | { ok: true; row: CfdiRow; warnings: string[] }
  | { ok: false; error: string };

type Node = Record<string, unknown>;

// Nodos que pueden repetirse: siempre los tratamos como arreglo.
const ARRAY_NODES = new Set([
  "Concepto",
  "Traslado",
  "Retencion",
  "Complemento",
  "Deduccion",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true, // cfdi:Comprobante -> Comprobante, tfd:... -> ...
  parseAttributeValue: false, // conserva "00123" como texto
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ARRAY_NODES.has(name),
});

const IMPUESTO_ISR = "001";
const IMPUESTO_IVA = "002";

const str = (v: unknown): string =>
  v === undefined || v === null ? "" : String(v).trim();

const num = (v: unknown): number => {
  const n = Number(str(v));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const asNode = (v: unknown): Node | undefined =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Node) : undefined;

const asList = (v: unknown): Node[] =>
  Array.isArray(v) ? (v.filter((x) => asNode(x)) as Node[]) : asNode(v) ? [v as Node] : [];

/** Suma los importes de Traslado/Retencion de un nodo Impuestos por clave de impuesto. */
function sumTaxes(impuestos: Node | undefined, kind: "Traslados" | "Retenciones", code: string) {
  const group = asNode(impuestos?.[kind]);
  const items = asList(group?.[kind === "Traslados" ? "Traslado" : "Retencion"]);
  return items
    .filter((t) => normalizeImpuesto(t.Impuesto) === code)
    .reduce((acc, t) => acc + num(t.Importe), 0);
}

/** Acepta "002" (3.3/4.0) y también "IVA"/"ISR" (formatos antiguos). */
function normalizeImpuesto(v: unknown): string {
  const s = str(v).toUpperCase();
  if (s === "IVA") return IMPUESTO_IVA;
  if (s === "ISR") return IMPUESTO_ISR;
  return s.padStart(3, "0");
}

/** Decodifica respetando la declaración encoding="..." (algunos sistemas emiten ISO-8859-1). */
export async function readXmlText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const head = new TextDecoder("ascii").decode(buffer.slice(0, 200));
  const match = head.match(/encoding\s*=\s*["']([\w-]+)["']/i);
  let encoding = match?.[1]?.toLowerCase() ?? "utf-8";
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    encoding = "utf-8";
    return new TextDecoder(encoding).decode(buffer);
  }
}

export function parseCfdi(xml: string, fileName: string): ParseResult {
  const text = xml.replace(/^﻿/, "").trim();
  if (!text) return { ok: false, error: "El archivo está vacío." };

  const valid = XMLValidator.validate(text);
  if (valid !== true) {
    return {
      ok: false,
      error: `XML mal formado (línea ${valid.err.line}): ${valid.err.msg}`,
    };
  }

  let doc: Node;
  try {
    doc = parser.parse(text) as Node;
  } catch (e) {
    return { ok: false, error: `No se pudo leer el XML: ${(e as Error).message}` };
  }

  const c = asNode(doc.Comprobante);
  if (!c) {
    return {
      ok: false,
      error: "No es un CFDI: no se encontró el nodo cfdi:Comprobante.",
    };
  }

  const version = str(c.Version ?? c.version);
  if (version !== "3.3" && version !== "4.0") {
    return {
      ok: false,
      error: `Versión de CFDI no soportada (${version || "desconocida"}). Solo se aceptan 3.3 y 4.0.`,
    };
  }

  const warnings: string[] = [];
  const emisor = asNode(c.Emisor) ?? {};
  const receptor = asNode(c.Receptor) ?? {};

  // Timbre fiscal: puede venir en cualquiera de los nodos Complemento.
  const complementos = asList(c.Complemento);
  const timbre = complementos
    .map((comp) => asNode(comp.TimbreFiscalDigital))
    .find(Boolean);
  const uuid = str(timbre?.UUID).toUpperCase();
  if (!uuid) warnings.push("Sin Timbre Fiscal Digital (UUID): el CFDI podría no estar timbrado.");

  // Conceptos
  const conceptos = asList(asNode(c.Conceptos)?.Concepto);
  const descripcion = conceptos
    .map((x) => str(x.Descripcion))
    .filter(Boolean)
    .join(" | ");

  // Impuestos: primero el resumen a nivel comprobante; si no existe, sumamos por concepto.
  const impGlobal = asNode(c.Impuestos);
  let iva = 0;
  let retIva = 0;
  let retIsr = 0;
  if (impGlobal) {
    iva = sumTaxes(impGlobal, "Traslados", IMPUESTO_IVA);
    retIva = sumTaxes(impGlobal, "Retenciones", IMPUESTO_IVA);
    retIsr = sumTaxes(impGlobal, "Retenciones", IMPUESTO_ISR);
  } else {
    for (const concepto of conceptos) {
      const imp = asNode(concepto.Impuestos);
      iva += sumTaxes(imp, "Traslados", IMPUESTO_IVA);
      retIva += sumTaxes(imp, "Retenciones", IMPUESTO_IVA);
      retIsr += sumTaxes(imp, "Retenciones", IMPUESTO_ISR);
    }
  }

  // Nómina: el ISR retenido viene como Deducción tipo 002 en el complemento nomina12.
  const tipo = str(c.TipoDeComprobante).toUpperCase();
  if (tipo === "N" && retIsr === 0) {
    for (const comp of complementos) {
      const nomina = asNode(comp.Nomina);
      const deducciones = asList(asNode(nomina?.Deducciones)?.Deduccion);
      retIsr += deducciones
        .filter((d) => str(d.TipoDeduccion) === "002")
        .reduce((acc, d) => acc + num(d.Importe), 0);
    }
  }

  const moneda = str(c.Moneda).toUpperCase();
  if (moneda && moneda !== "MXN" && moneda !== "XXX") {
    warnings.push(`Montos en ${moneda} (TipoCambio ${str(c.TipoCambio) || "n/d"}), no convertidos a MXN.`);
  }

  return {
    ok: true,
    warnings,
    row: {
      fecha: str(c.Fecha),
      uuid,
      serie: str(c.Serie),
      folio: str(c.Folio),
      tipoComprobante: tipo,
      rfcEmisor: str(emisor.Rfc).toUpperCase(),
      nombreEmisor: str(emisor.Nombre),
      rfcReceptor: str(receptor.Rfc).toUpperCase(),
      nombreReceptor: str(receptor.Nombre),
      metodoPago: str(c.MetodoPago),
      formaPago: str(c.FormaPago),
      usoCfdi: str(receptor.UsoCFDI),
      subtotal: round2(num(c.SubTotal)),
      descuento: round2(num(c.Descuento)),
      ivaTrasladado: round2(iva),
      retencionIva: round2(retIva),
      retencionIsr: round2(retIsr),
      total: round2(num(c.Total)),
      conceptos: descripcion,
      version,
      archivo: fileName,
    },
  };
}
