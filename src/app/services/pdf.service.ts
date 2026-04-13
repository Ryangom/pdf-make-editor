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
    if (template.pages) {
      // Multi-page mode - extract from all pages
      for (const page of template.pages) {
        for (const el of page.elements) {
          const matches = el.content.matchAll(/\{\{(\w+)\}\}/g);
          for (const m of matches) vars.add(m[1]);
        }
      }
    } else {
      // Single-page mode
      for (const el of template.elements) {
        const matches = el.content.matchAll(/\{\{(\w+)\}\}/g);
        for (const m of matches) vars.add(m[1]);
      }
    }
    return Array.from(vars);
  }

  // ─── Build PDFMake Content ────────────────────────────────────────────────
  private buildPageContent(template: Template, record: DataRecord): any[] {
    // For backward compatibility, use the current page
    const currentPage = template.pages ? template.pages[0] : {
      settings: template.page,
      elements: template.elements
    };
    return this.buildPageContentFromPage(currentPage, record);
  }

  private buildPageContentFromPage(pageData: any, record: DataRecord): any[] {
    const content: any[] = [];

    // Background image
    if (pageData.settings.backgroundImage) {
      content.push({
        image: pageData.settings.backgroundImage,
        width: pageData.settings.width,
        height: pageData.settings.height,
        absolutePosition: { x: 0, y: 0 },
      });
    }

    // Elements (sorted by array order = z-index)
    for (const el of pageData.elements) {
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
          // Text enhancements
          if (el.style.underline || el.style.strike) {
            const decorations: string[] = [];
            if (el.style.underline) decorations.push('underline');
            if (el.style.strike) decorations.push('lineThrough');
            node.decoration = decorations;
          }
          if (el.style.decorationStyle && el.style.decorationStyle !== 'none') {
            node.decorationStyle = el.style.decorationStyle;
          }
          if (el.style.decorationColor) {
            node.decorationColor = el.style.decorationColor;
          }
          if (el.style.characterSpacing && el.style.characterSpacing > 0) {
            node.characterSpacing = el.style.characterSpacing;
          }
          if (el.style.linkUrl) {
            node.link = this.resolveVars(el.style.linkUrl, record);
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

        case 'line': {
          content.push({
            canvas: [{
              type: 'line',
              x1: 0, y1: el.style.lineWidth / 2 || 1,
              x2: el.width, y2: el.style.lineWidth / 2 || 1,
              lineWidth: el.style.lineWidth || 1,
              lineColor: el.style.lineColor || '#000000',
              lineCap: el.style.lineCapStyle || 'butt',
              dash: el.style.lineDash > 0 ? { length: el.style.lineDash } : undefined,
            }],
            absolutePosition: { x: el.x, y: el.y },
            width: el.width,
          });
          break;
        }

        case 'ellipse': {
          const hasBackground = el.style.backgroundColor && el.style.backgroundColor !== 'transparent';
          const hasBorder = el.style.borderWidth > 0 && el.style.borderColor && el.style.borderColor !== 'transparent';
          content.push({
            canvas: [{
              type: 'ellipse',
              x: el.width / 2,
              y: el.height / 2,
              r1: el.width / 2,
              r2: el.height / 2,
              color: hasBackground ? el.style.backgroundColor : undefined,
              lineWidth: hasBorder ? el.style.borderWidth : 0,
              lineColor: hasBorder ? el.style.borderColor : undefined,
            }],
            absolutePosition: { x: el.x, y: el.y },
            width: el.width,
            height: el.height,
          });
          break;
        }

        case 'table': {
          if (el.tableData) {
            const tableData = el.tableData;
            content.push({
              table: {
                headerRows: tableData.headerRows || 1,
                widths: tableData.colWidths || ['*'],
                body: tableData.cells.map((row: any[], ri: number) =>
                  row.map((cell: any) => ({
                    text: this.resolveVars(cell.text, record),
                    rowSpan: cell.rowSpan,
                    colSpan: cell.colSpan,
                    fillColor: cell.fillColor || (ri % 2 === 1 ? tableData.alternateRowFill : undefined),
                    color: cell.color,
                    bold: cell.bold,
                    fontSize: cell.fontSize || tableData.defaultFontSize,
                    alignment: cell.alignment,
                    border: cell.border,
                    borderColor: cell.borderColor,
                  }))
                ),
              },
              absolutePosition: { x: el.x, y: el.y },
              width: el.width,
            });
          }
          break;
        }

        case 'qrcode': {
          const qrContent = this.resolveVars(el.content, record);
          content.push({
            qr: qrContent || 'QR',
            fit: el.style.qrFit || el.width,
            foreground: el.style.qrForeground || '#000000',
            background: el.style.qrBackground || '#ffffff',
            eccLevel: el.style.qrEcc || 'M',
            absolutePosition: { x: el.x, y: el.y },
          });
          break;
        }

        case 'list': {
          const listItems = (el.listItems || []).map((item: any) => this.resolveVars(item.text, record));
          if (el.listType === 'ol') {
            content.push({
              ol: listItems,
              type: el.listStyle || 'decimal',
              color: el.listMarkerColor,
              absolutePosition: { x: el.x, y: el.y },
              width: el.width,
            });
          } else {
            content.push({
              ul: listItems,
              type: el.listStyle || 'disc',
              color: el.listMarkerColor,
              absolutePosition: { x: el.x, y: el.y },
              width: el.width,
            });
          }
          break;
        }

        case 'columns': {
          const columns = (el.columnDefs || []).map((col: any) => ({
            text: this.resolveVars(col.text, record),
            width: col.width,
            fontSize: col.fontSize,
            color: col.color,
            bold: col.bold,
            alignment: col.alignment,
          }));
          content.push({
            columns,
            columnGap: el.columnGap || 20,
            absolutePosition: { x: el.x, y: el.y },
          });
          break;
        }

        case 'svg': {
          const svgContent = this.resolveVars(el.content, record);
          content.push({
            svg: svgContent,
            fit: [el.width, el.height],
            absolutePosition: { x: el.x, y: el.y },
          });
          break;
        }
      }
    }

    return content;
  }

  // ─── Build Full Doc Definition ────────────────────────────────────────────
  buildDocDefinition(template: Template, records: DataRecord[]): any {
    const effectiveRecords = records.length > 0 ? records : [{}];
    const content: any[] = [];

    // Get page settings
    const pageSettings = template.pages ? template.pages[0].settings : template.page;

    if (template.pages && template.hasBackPage && template.pages.length >= 2) {
      // Multi-page mode (front/back)
      effectiveRecords.forEach((record, idx) => {
        if (idx > 0) {
          // Page break between records
          content.push({ text: '', pageBreak: 'before' });
        }

        // Add front page
        const frontPage = template.pages![0];
        content.push(...this.buildPageContentFromPage(frontPage, record));

        // Add back page
        const backPage = template.pages![1];
        content.push({ text: '', pageBreak: 'before' }); // Page break for back
        content.push(...this.buildPageContentFromPage(backPage, record));
      });

      // Use front page settings for PDF dimensions
      const frontPage = template.pages![0];
      return {
        pageSize: { width: frontPage.settings.width, height: frontPage.settings.height },
        pageMargins: [
          frontPage.settings.marginLeft,
          frontPage.settings.marginTop,
          frontPage.settings.marginRight,
          frontPage.settings.marginBottom
        ],
        content,
        // Header & Footer
        header: frontPage.settings.headerText ? this.createHeaderFunction(frontPage.settings, records) : undefined,
        footer: this.createFooterFunction(frontPage.settings, records),
        // Watermark
        watermark: frontPage.settings.watermark ? this.createWatermark(frontPage.settings) : undefined,
      };
    } else {
      // Single-page mode (backward compatibility)
      const { width, height, marginTop, marginRight, marginBottom, marginLeft } = template.page;

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
        // Header & Footer
        header: template.page.headerText ? this.createHeaderFunction(template.page, records) : undefined,
        footer: this.createFooterFunction(template.page, records),
        // Watermark
        watermark: template.page.watermark ? this.createWatermark(template.page) : undefined,
      };
    }
  }

  private createHeaderFunction(settings: any, records: DataRecord[]): (currentPage: number, pageCount: number) => any {
    return (currentPage: number, pageCount: number) => ({
      text: this.resolveVars(settings.headerText, { pageNumber: String(currentPage), totalPages: String(pageCount), ...records[0] }),
      fontSize: settings.headerFontSize || 12,
      alignment: settings.headerAlignment || 'center',
      margin: [settings.marginLeft || 0, settings.headerMarginTop || 10, settings.marginRight || 0, 0],
    });
  }

  private createFooterFunction(settings: any, records: DataRecord[]): (currentPage: number, pageCount: number) => any {
    return (currentPage: number, pageCount: number) => {
      const footerParts: string[] = [];
      if (settings.footerText) {
        footerParts.push(this.resolveVars(settings.footerText, { pageNumber: String(currentPage), totalPages: String(pageCount), ...records[0] }));
      }
      if (settings.showPageNumbers) {
        const pageNumText = (settings.pageNumberFormat || 'Page {{page}} of {{total}}')
          .replace('{{page}}', String(currentPage))
          .replace('{{total}}', String(pageCount));
        footerParts.push(pageNumText);
      }
      return {
        text: footerParts.join(' | '),
        fontSize: settings.footerFontSize || 12,
        alignment: settings.footerAlignment || 'center',
        margin: [settings.marginLeft || 0, 0, settings.marginRight || 0, settings.footerMarginBottom || 10],
      };
    };
  }

  private createWatermark(settings: any): any {
    return {
      text: settings.watermark,
      color: settings.watermarkColor || '#cccccc',
      opacity: settings.watermarkOpacity || 0.3,
      bold: settings.watermarkBold || false,
      angle: settings.watermarkAngle || 45,
      fontSize: settings.watermarkFontSize || 80,
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
${template.pages && template.hasBackPage ? `// Multi-page template (front + back pages)
const docDefinition = {
  pageSize: { width: ${template.pages[0].settings.width}, height: ${template.pages[0].settings.height} },
  pageMargins: [${template.pages[0].settings.marginLeft}, ${template.pages[0].settings.marginTop}, ${template.pages[0].settings.marginRight}, ${template.pages[0].settings.marginBottom}],
  content: records.flatMap((r, i) => buildPageContent(r, i === 0)),
};` : `const docDefinition = {
  pageSize: { width: ${template.page.width}, height: ${template.page.height} },
  pageMargins: [${template.page.marginLeft}, ${template.page.marginTop}, ${template.page.marginRight}, ${template.page.marginBottom}],
  content: records.flatMap((r, i) => buildPageContent(r, i === 0)),
};`}

pdfMake.createPdf(docDefinition).open();`
        : `// ── Single Record Data ──
const record = ${sampleData.slice(2, -2).trim()};

const docDefinition = ${docStr};

pdfMake.createPdf(docDefinition).open();`}
`;
  }

  private generateLoopCode(template: Template): string {
    const lines: string[] = [];

    if (template.pages && template.hasBackPage && template.pages.length >= 2) {
      // Multi-page mode - generate code for both front and back pages
      const frontPage = template.pages[0];
      const backPage = template.pages[1];

      // Front page
      lines.push(`  // Front Page`);
      if (frontPage.settings.backgroundImage) {
        lines.push(`  content.push({`);
        lines.push(`    image: frontBackgroundImageData, // your base64 data URL for front`);
        lines.push(`    width: ${frontPage.settings.width}, height: ${frontPage.settings.height},`);
        lines.push(`    absolutePosition: { x: 0, y: 0 },`);
        lines.push(`  });`);
      }

      for (const el of frontPage.elements) {
        if (!el.visible) continue;
        lines.push(`  // Front: "${el.label}" (${el.type})`);
        this.addElementCode(lines, el);
      }

      // Page break for back
      lines.push(`  content.push({ text: '', pageBreak: 'before' });`);
      lines.push(`  // Back Page`);

      if (backPage.settings.backgroundImage) {
        lines.push(`  content.push({`);
        lines.push(`    image: backBackgroundImageData, // your base64 data URL for back`);
        lines.push(`    width: ${backPage.settings.width}, height: ${backPage.settings.height},`);
        lines.push(`    absolutePosition: { x: 0, y: 0 },`);
        lines.push(`  });`);
      }

      for (const el of backPage.elements) {
        if (!el.visible) continue;
        lines.push(`  // Back: "${el.label}" (${el.type})`);
        this.addElementCode(lines, el);
      }
    } else {
      // Single-page mode (backward compatibility)
      const currentPage = template.pages ? template.pages[0] : {
        settings: template.page,
        elements: template.elements
      };

      if (currentPage.settings.backgroundImage) {
        lines.push(`  // Background image (replace with your base64 or URL)`);
        lines.push(`  content.push({`);
        lines.push(`    image: backgroundImageData, // your base64 data URL`);
        lines.push(`    width: ${currentPage.settings.width}, height: ${currentPage.settings.height},`);
        lines.push(`    absolutePosition: { x: 0, y: 0 },`);
        lines.push(`  });`);
      }

      for (const el of currentPage.elements) {
        if (!el.visible) continue;
        lines.push(`  // Element: "${el.label}" (${el.type})`);
        this.addElementCode(lines, el);
      }
    }

    lines.push(`  return content;`);
    return lines.join('\n');
  }

  private addElementCode(lines: string[], el: any): void {
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
        lines.push(`    color: ${JSON.stringify(el.style.backgroundColor)}, lineWidth: ${el.style.borderWidth}, lineColor: ${JSON.stringify(el.style.borderColor)} }],`);
        lines.push(`    absolutePosition: { x: ${Math.round(el.x)}, y: ${Math.round(el.y)} },`);
        lines.push(`    width: ${Math.round(el.width)},`);
        lines.push(`  });`);
        break;
    }
    lines.push('');
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
