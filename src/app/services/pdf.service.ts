import { Injectable } from '@angular/core';
import { Template, EditorElement, DataRecord } from '../models/editor.models';

// PDFMake is loaded via window in browser
declare const require: any;

@Injectable({ providedIn: 'root' })
export class PdfService {
  private pdfMake: any = null;

  private async getPdfMake(): Promise<any> {
    if (this.pdfMake) return this.pdfMake;
    const pdfMakeLib = await import('pdfmake/build/pdfmake' as any);
    const pdfFonts = await import('pdfmake/build/vfs_fonts' as any);
    const pm = pdfMakeLib.default || pdfMakeLib;
    const fonts = pdfFonts.default || pdfFonts;
    pm.vfs = fonts.pdfMake?.vfs ?? fonts.vfs ?? fonts;
    this.pdfMake = pm;
    return pm;
  }

  // ─── Variable Resolution ──────────────────────────────────────────────────
  resolveVars(content: string, record: DataRecord): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => record[key] ?? `{{${key}}}`);
  }

  extractVars(template: Template): string[] {
    const vars = new Set<string>();
    for (const el of template.elements) {
      const matches = el.content.matchAll(/\{\{(\w+)\}\}/g);
      for (const m of matches) vars.add(m[1]);
    }
    return Array.from(vars);
  }

  // ─── Build PDFMake Content ────────────────────────────────────────────────
  private buildPageContent(template: Template, record: DataRecord): any[] {
    const content: any[] = [];

    // Background image
    if (template.page.backgroundImage) {
      content.push({
        image: template.page.backgroundImage,
        width: template.page.width,
        height: template.page.height,
        absolutePosition: { x: 0, y: 0 },
      });
    }

    // Elements (sorted by array order = z-index)
    for (const el of template.elements) {
      if (!el.visible) continue;

      switch (el.type) {
        case 'text': {
          const resolved = this.resolveVars(el.content, record);
          const node: any = {
            text: resolved,
            absolutePosition: { x: el.x, y: el.y },
            width: el.width,
            fontSize: el.style.fontSize,
            color: el.style.color,
            bold: el.style.bold,
            italics: el.style.italic,
            alignment: el.style.alignment,
            lineHeight: el.style.lineHeight,
            opacity: el.style.opacity,
          };
          if (el.style.backgroundColor && el.style.backgroundColor !== 'transparent') {
            node.background = el.style.backgroundColor;
          }
          content.push(node);
          break;
        }

        case 'image': {
          const src = this.resolveVars(el.content, record);
          if (!src) break;
          content.push({
            image: src,
            width: el.width,
            height: el.height,
            absolutePosition: { x: el.x, y: el.y },
            opacity: el.style.opacity,
          });
          break;
        }

        case 'rectangle': {
          const hasBackground = el.style.backgroundColor && el.style.backgroundColor !== 'transparent';
          const hasBorder = el.style.borderWidth > 0 && el.style.borderColor && el.style.borderColor !== 'transparent';
          if (hasBackground || hasBorder) {
            content.push({
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: el.width,
                h: el.height,
                color: hasBackground ? el.style.backgroundColor : undefined,
                lineWidth: hasBorder ? el.style.borderWidth : 0,
                lineColor: hasBorder ? el.style.borderColor : undefined,
              }],
              absolutePosition: { x: el.x, y: el.y },
              width: el.width,
            });
          }
          break;
        }

        case 'roundrect': {
          const hasBackground = el.style.backgroundColor && el.style.backgroundColor !== 'transparent';
          const hasBorder = el.style.borderWidth > 0 && el.style.borderColor && el.style.borderColor !== 'transparent';
          const radius = el.style.borderRadius || 10;
          if (hasBackground || hasBorder) {
            content.push({
              canvas: [{
                type: 'rect',
                x: 0, y: 0,
                w: el.width,
                h: el.height,
                r: radius,
                color: hasBackground ? el.style.backgroundColor : undefined,
                lineWidth: hasBorder ? el.style.borderWidth : 0,
                lineColor: hasBorder ? el.style.borderColor : undefined,
              }],
              absolutePosition: { x: el.x, y: el.y },
              width: el.width,
            });
          }
          break;
        }
      }
    }

    return content;
  }

  // ─── Build Full Doc Definition ────────────────────────────────────────────
  buildDocDefinition(template: Template, records: DataRecord[]): any {
    const { width, height, marginTop, marginRight, marginBottom, marginLeft } = template.page;
    const effectiveRecords = records.length > 0 ? records : [{}];

    const content: any[] = [];

    effectiveRecords.forEach((record, idx) => {
      if (idx > 0) {
        // Page break between records
        content.push({ text: '', pageBreak: 'before' });
      }
      content.push(...this.buildPageContent(template, record));
    });

    return {
      pageSize: { width, height },
      pageMargins: [marginLeft, marginTop, marginRight, marginBottom],
      content,
    };
  }

  // ─── Generate PDF ─────────────────────────────────────────────────────────
  async generatePdf(
    template: Template,
    records: DataRecord[],
    action: 'open' | 'download' = 'open'
  ): Promise<void> {
    const pm = await this.getPdfMake();
    const docDef = this.buildDocDefinition(template, records);
    const pdf = pm.createPdf(docDef);
    if (action === 'download') {
      pdf.download(`${template.name.replace(/\s+/g, '_')}.pdf`);
    } else {
      pdf.open();
    }
  }

  // ─── Generate Code ────────────────────────────────────────────────────────
  generateCode(template: Template, records: DataRecord[], isBulk: boolean): string {
    const effectiveRecords = isBulk && records.length > 0 ? records : [{}];
    const docDef = this.buildDocDefinition(template, effectiveRecords);

    // Replace long base64 strings with placeholder comments
    const shrunk = this.shrinkBase64(docDef);

    const docStr = JSON.stringify(shrunk, null, 2);

    const sampleData = isBulk && records.length > 0
      ? JSON.stringify(records, null, 2)
      : JSON.stringify([this.extractVars(template).reduce((a, v) => ({ ...a, [v]: `<${v}>` }), {})], null, 2);

    return `// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PDFMake Template: ${template.name}
// Generated by PDFMake Visual Editor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Install: npm install pdfmake
// In browser: import * as pdfMake from 'pdfmake/build/pdfmake';
//             import * as pdfFonts from 'pdfmake/build/vfs_fonts';
//             pdfMake.vfs = pdfFonts.pdfMake.vfs;

${isBulk ? `// ── Bulk Data (replace with your real data) ──
const records = ${sampleData};

// ── Helper: replace {{variable}} placeholders ──
function resolveVars(content, record) {
  return content.replace(/\\{\\{(\\w+)\\}\\}/g, (_, k) => record[k] ?? \`{{$\{k}}}\`);
}

// ── Build content for one record ──
function buildPageContent(record, isFirst) {
  const content = [];
  if (!isFirst) content.push({ text: '', pageBreak: 'before' });

` + this.generateLoopCode(template) + `

  return content;
}

// ── Assemble full doc ──
const docDefinition = {
  pageSize: { width: ${template.page.width}, height: ${template.page.height} },
  pageMargins: [${template.page.marginLeft}, ${template.page.marginTop}, ${template.page.marginRight}, ${template.page.marginBottom}],
  content: records.flatMap((r, i) => buildPageContent(r, i === 0)),
};

pdfMake.createPdf(docDefinition).open();`
        : `// ── Single Record Data ──
const record = ${sampleData.slice(2, -2).trim()};

const docDefinition = ${docStr};

pdfMake.createPdf(docDefinition).open();`}
`;
  }

  private generateLoopCode(template: Template): string {
    const lines: string[] = [];
    if (template.page.backgroundImage) {
      lines.push(`  // Background image (replace with your base64 or URL)`);
      lines.push(`  content.push({`);
      lines.push(`    image: backgroundImageData, // your base64 data URL`);
      lines.push(`    width: ${template.page.width}, height: ${template.page.height},`);
      lines.push(`    absolutePosition: { x: 0, y: 0 },`);
      lines.push(`  });`);
      lines.push('');
    }
    for (const el of template.elements) {
      if (!el.visible) continue;
      lines.push(`  // Element: "${el.label}" (${el.type})`);
      switch (el.type) {
        case 'text':
          lines.push(`  content.push({`);
          lines.push(`    text: resolveVars(${JSON.stringify(el.content)}, record),`);
          lines.push(`    absolutePosition: { x: ${Math.round(el.x)}, y: ${Math.round(el.y)} },`);
          lines.push(`    width: ${Math.round(el.width)},`);
          lines.push(`    fontSize: ${el.style.fontSize},`);
          lines.push(`    color: ${JSON.stringify(el.style.color)},`);
          if (el.style.bold) lines.push(`    bold: true,`);
          if (el.style.italic) lines.push(`    italics: true,`);
          lines.push(`    alignment: ${JSON.stringify(el.style.alignment)},`);
          lines.push(`  });`);
          break;
        case 'image':
          lines.push(`  content.push({`);
          lines.push(`    image: resolveVars(${JSON.stringify(el.content)}, record), // use base64 or {{varName}}`);
          lines.push(`    width: ${Math.round(el.width)}, height: ${Math.round(el.height)},`);
          lines.push(`    absolutePosition: { x: ${Math.round(el.x)}, y: ${Math.round(el.y)} },`);
          lines.push(`  });`);
          break;
        case 'rectangle':
          lines.push(`  content.push({`);
          lines.push(`    canvas: [{ type: 'rect', x: 0, y: 0, w: ${Math.round(el.width)}, h: ${Math.round(el.height)},`);
          lines.push(`      color: ${JSON.stringify(el.style.backgroundColor)}, lineWidth: ${el.style.borderWidth}, lineColor: ${JSON.stringify(el.style.borderColor)} }],`);
          lines.push(`    absolutePosition: { x: ${Math.round(el.x)}, y: ${Math.round(el.y)} },`);
          lines.push(`    width: ${Math.round(el.width)},`);
          lines.push(`  });`);
          break;
        case 'roundrect':
          lines.push(`  content.push({`);
          lines.push(`    canvas: [{ type: 'rect', x: 0, y: 0, w: ${Math.round(el.width)}, h: ${Math.round(el.height)}, r: ${el.style.borderRadius || 10},`);
          lines.push(`      color: ${JSON.stringify(el.style.backgroundColor)}, lineWidth: ${el.style.borderWidth}, lineColor: ${JSON.stringify(el.style.borderColor)} }],`);
          lines.push(`    absolutePosition: { x: ${Math.round(el.x)}, y: ${Math.round(el.y)} },`);
          lines.push(`    width: ${Math.round(el.width)},`);
          lines.push(`  });`);
          break;
      }
      lines.push('');
    }
    lines.push(`  return content;`);
    return lines.join('\n');
  }

  private shrinkBase64(obj: any): any {
    if (typeof obj === 'string' && obj.length > 200 && obj.startsWith('data:')) {
      return `[BASE64_IMAGE_DATA ~${Math.round(obj.length / 1024)}KB]`;
    }
    if (Array.isArray(obj)) return obj.map(v => this.shrinkBase64(v));
    if (obj && typeof obj === 'object') {
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, this.shrinkBase64(v)]));
    }
    return obj;
  }

}
