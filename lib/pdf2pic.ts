// lib/pdf2pic.ts
import { fromBuffer } from "pdf2pic";

interface PdfToJpgOptions {
  width?: number;
  height?: number;
  density?: number;
}

export async function pdfToJpg(
  buffer: Buffer,
  options: PdfToJpgOptions = {}
): Promise<Buffer> {
  const converter = fromBuffer(buffer, {
    density: options.density || 150,
    format: "jpg",
    width: options.width || 1200,
    height: options.height || 1600,
  });

  const result = await converter(1);

  // Type assertion for base64
  const base64 = (result as any).base64 as string;

  if (!base64) {
    throw new Error("PDF conversion failed: no base64 data returned");
  }

  return Buffer.from(base64, "base64");
}
