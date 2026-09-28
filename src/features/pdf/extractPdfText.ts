import * as pdfjs from 'pdfjs-dist';

// Vite가 worker 파일을 번들에 포함시키도록 URL로 참조한다.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageText {
  page: number;
  items: TextItem[];
}

/** PDF 파일의 모든 페이지에서 text item + 좌표를 추출한다. 서버로는 아무것도 보내지 않는다. */
export async function extractPdfText(file: File): Promise<PageText[]> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: PageText[] = [];

  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items: TextItem[] = [];

      for (const raw of content.items) {
        if (!('str' in raw)) continue;
        const str = raw.str.trim();
        if (!str) continue;
        const [, , , d, x, y] = raw.transform as number[];
        items.push({ str, x, y, width: raw.width, height: Math.abs(d) || raw.height });
      }
      pages.push({ page: p, items });
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return pages;
}
