import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { PdfService } from '../../services/pdf.service';
import { Template, DataRecord } from '../../models/editor.models';

@Component({
  selector: 'app-code-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="code-viewer">
      <!-- Header -->
      <div class="cv-header">
        <div class="cv-title">
          <span class="cv-icon">&lt;/&gt;</span>
          PDFMake Code
        </div>
        <div class="cv-actions">
          <div class="toggle-row" style="gap:8px">
            <span class="toggle-label">Bulk Loop</span>
            <label class="toggle" style="margin:0">
              <input type="checkbox" [(ngModel)]="isBulk" (ngModelChange)="regenerate()">
              <span class="slider"></span>
            </label>
          </div>
          <button class="cv-btn" (click)="regenerate()">↻ Refresh</button>
          <button class="cv-btn" (click)="copyCode()" [class.copied]="copied">
            {{ copied ? '✓ Copied!' : '⎘ Copy' }}
          </button>
          <button class="cv-btn" (click)="downloadCode()">⬇ Download</button>
        </div>
      </div>

      <!-- Code Info Bar -->
      <div class="cv-info-bar">
        <div class="info-chips">
          <span class="info-chip">
            <span class="chip-label">Elements</span>
            <span class="chip-val">{{ template?.elements?.length || 0 }}</span>
          </span>
          <span class="info-chip">
            <span class="chip-label">Records</span>
            <span class="chip-val">{{ records.length || (isBulk ? 0 : 1) }}</span>
          </span>
          <span class="info-chip">
            <span class="chip-label">Page</span>
            <span class="chip-val">{{ template?.page?.width }}×{{ template?.page?.height }}</span>
          </span>
          <span class="info-chip" *ngIf="detectedVars.length">
            <span class="chip-label">Variables</span>
            <span class="chip-val">{{ detectedVars.join(', ') }}</span>
          </span>
        </div>
        <span class="code-size" *ngIf="generatedCode">{{ codeSize }}</span>
      </div>

      <!-- Code Area -->
      <div class="code-area">
        <pre class="code-pre" *ngIf="generatedCode"><code [innerHTML]="highlighted"></code></pre>
        <div class="code-empty" *ngIf="!generatedCode">
          <div class="empty-code-icon">&lt;/&gt;</div>
          <p>No template to show.</p>
          <p class="sub">Add elements to generate code.</p>
        </div>
      </div>

      <!-- Usage Guide -->
      <div class="usage-guide">
        <div class="guide-title">📖 How to use this code</div>
        <div class="guide-steps">
          <div class="step">
            <span class="step-num">1</span>
            <code>npm install pdfmake</code>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>Import pdfmake in your project:</span>
            <code>import * as pdfMake from 'pdfmake/build/pdfmake';</code>
            <code>import * as pdfFonts from 'pdfmake/build/vfs_fonts';</code>
            <code>pdfMake.vfs = pdfFonts.pdfMake.vfs;</code>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>Paste the generated code and call:</span>
            <code>pdfMake.createPdf(docDefinition).open();</code>
          </div>
          <div class="step" *ngIf="isBulk">
            <span class="step-num">4</span>
            <span>Replace the <code>records</code> array with your actual data (from database, CSV, etc.)</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .code-viewer {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .cv-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      flex-wrap: wrap;
      gap: 8px;
    }

    .cv-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-1);

      .cv-icon {
        font-family: 'JetBrains Mono', monospace;
        color: var(--accent-2);
        font-size: 14px;
      }
    }

    .cv-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-label {
      font-size: 12px;
      color: var(--text-2);
    }

    .cv-btn {
      padding: 5px 12px;
      background: var(--bg-3);
      border: 1px solid var(--border-2);
      border-radius: var(--radius-sm);
      color: var(--text-2);
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;

      &:hover { background: var(--bg-hover); color: var(--text-1); }
      &.copied { background: rgba(34,211,160,0.1); border-color: var(--success); color: var(--success); }
    }

    /* Info bar */
    .cv-info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 20px;
      background: var(--bg-1);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .info-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .info-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;

      .chip-label {
        color: var(--text-3);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.06em;
      }

      .chip-val {
        color: var(--accent-3);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        background: var(--accent-dim);
        padding: 1px 6px;
        border-radius: 3px;
      }
    }

    .code-size {
      font-size: 11px;
      color: var(--text-3);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Code area */
    .code-area {
      flex: 1;
      overflow: auto;
      background: var(--bg-0);
      max-height: 60vh;
    }

    .code-pre {
      margin: 0;
      padding: 20px 24px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      line-height: 1.75;
      color: var(--text-2);
      min-height: 100%;
      white-space: pre;

      code { display: block; }
    }

    /* Syntax highlighting classes */
    :host ::ng-deep {
      .kw { color: #c792ea; font-weight: 600; }       /* keywords */
      .str { color: #c3e88d; }                         /* strings */
      .num { color: #f78c6c; }                         /* numbers */
      .cmt { color: #546e7a; font-style: italic; }     /* comments */
      .fn { color: #82aaff; }                          /* function names */
      .key { color: #89ddff; }                         /* object keys */
      .bool { color: #ff5370; }                        /* booleans */
      .punc { color: #89ddff; }                        /* punctuation */
    }

    .code-empty {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-3);
      padding: 40px;
      text-align: center;

      .empty-code-icon {
        font-size: 36px;
        font-family: 'JetBrains Mono', monospace;
        opacity: 0.3;
        color: var(--accent);
      }

      p { font-size: 13px; }
      .sub { font-size: 11px; opacity: 0.6; }
    }

    /* Usage guide */
    .usage-guide {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-1);
      flex-shrink: 0;
    }

    .guide-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-2);
      margin-bottom: 10px;
    }

    .guide-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;

      .step-num {
        width: 18px;
        height: 18px;
        background: var(--accent-dim);
        color: var(--accent-3);
        border: 1px solid var(--accent-border);
        border-radius: 50%;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      span { font-size: 12px; color: var(--text-3); }

      code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        background: var(--bg-0);
        color: var(--accent-2);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid var(--border);
      }
    }
  `]
})
export class CodeViewerComponent implements OnInit, OnDestroy {
  template!: Template;
  records: DataRecord[] = [];
  generatedCode = '';
  highlighted = '';
  isBulk = true;
  copied = false;
  detectedVars: string[] = [];
  private subs = new Subscription();

  get codeSize(): string {
    const bytes = new Blob([this.generatedCode]).size;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  constructor(
    private editorService: EditorService,
    private pdfService: PdfService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.subs.add(this.editorService.template$.subscribe(t => {
      this.template = t;
      this.detectedVars = this.pdfService.extractVars(t);
      this.regenerate();
      this.cdr.markForCheck();
    }));
    this.subs.add(this.editorService.bulkData$.subscribe(records => {
      this.records = records;
      this.regenerate();
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  regenerate() {
    if (!this.template) return;
    this.generatedCode = this.pdfService.generateCode(this.template, this.records, this.isBulk);
    this.highlighted = this.syntaxHighlight(this.generatedCode);
    this.cdr.markForCheck();
  }

  copyCode() {
    navigator.clipboard.writeText(this.generatedCode).then(() => {
      this.copied = true;
      this.cdr.markForCheck();
      setTimeout(() => { this.copied = false; this.cdr.markForCheck(); }, 2000);
    });
  }

  downloadCode() {
    const blob = new Blob([this.generatedCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.template?.name?.replace(/\s+/g, '_') ?? 'template'}_pdfmake.js`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private syntaxHighlight(code: string): string {
    // Escape HTML first
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Apply syntax highlighting
    // Comments (// ...)
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="cmt">$1</span>');
    // Strings
    escaped = escaped.replace(/(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g, (m) => {
      // Don't highlight if inside a comment tag
      return `<span class="str">${m}</span>`;
    });
    // Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
    // Keywords
    escaped = escaped.replace(
      /\b(const|let|var|function|return|if|else|for|of|forEach|new|import|from|true|false|null|undefined|async|await)\b/g,
      '<span class="kw">$1</span>'
    );
    // Object keys (word followed by colon)
    escaped = escaped.replace(/(\b\w+\b)(?=\s*:)/g, '<span class="key">$1</span>');
    // Boolean fix
    escaped = escaped.replace(/\b(true|false)\b/g, '<span class="bool">$1</span>');

    return escaped;
  }

  // Expose for template
  extractVars(t: Template) { return this.pdfService.extractVars(t); }
}
