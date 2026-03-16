import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { PdfService } from '../../services/pdf.service';
import { Template } from '../../models/editor.models';

interface ExampleTemplate {
  label: string;
  icon: string;
  file: string;
  sampleData: Record<string, string>[];
}

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">

      <!-- ── Left: Brand + template name ── -->
      <div class="tb-left">
        <div class="brand" (click)="showWelcome = true" title="About">
          <span class="brand-hex">⬡</span>
          <span class="brand-name">PDFMake<em>Editor</em></span>
        </div>
        <div class="tb-sep"></div>
        <input
          class="tpl-name-input"
          [value]="template?.name"
          (change)="renameTemplate($any($event.target).value)"
          title="Click to rename" />
      </div>

      <!-- ── Center: Edit actions ── -->
      <div class="tb-center">
        <button class="tb-btn" (click)="editorService.undo()" title="Undo (Ctrl+Z)">
          ↩ Undo
        </button>
        <button class="tb-btn" (click)="editorService.redo()" title="Redo (Ctrl+Y)">
          ↪ Redo
        </button>

        <div class="tb-sep"></div>

        <button class="tb-btn" (click)="saveTemplate()" title="Save (Ctrl+S)">
          💾 Save
        </button>
        <label class="tb-btn" title="Load template JSON">
          📂 Load
          <input type="file" accept=".json" (change)="onLoadFile($event)" hidden />
        </label>

        <!-- Examples dropdown -->
        <div class="dd-wrap">
          <button class="tb-btn tb-btn-examples" (click)="toggleExamples()">
            ✦ Examples
            <span class="dd-arrow" [class.open]="showExamples">▾</span>
          </button>
          <div class="dropdown" *ngIf="showExamples">
            <div class="dd-header">Built-in Templates</div>
            <button class="dd-item" *ngFor="let ex of examples" (click)="loadExample(ex)">
              <span class="dd-icon">{{ ex.icon }}</span>
              <div class="dd-info">
                <span class="dd-label">{{ ex.label }}</span>
                <span class="dd-meta">{{ ex.sampleData.length }} sample records included</span>
              </div>
              <span class="dd-arrow-r">›</span>
            </button>
          </div>
        </div>

        <div class="tb-sep"></div>

        <button class="tb-btn tb-btn-danger" (click)="showResetConfirm = true" title="New blank template">
          ＋ New
        </button>
      </div>

      <!-- ── Right: Export ── -->
      <div class="tb-right">
        <div class="el-badge" *ngIf="template?.elements?.length">
          <span class="el-n">{{ template.elements.length }}</span>
          <span class="el-lbl">elem{{ template.elements.length !== 1 ? 's' : '' }}</span>
        </div>

        <button class="tb-btn tb-btn-preview" (click)="quickPreview()" [disabled]="isGenerating">
          {{ isGenerating ? '⏳ Generating…' : '▶ Preview PDF' }}
        </button>
        <button class="tb-btn tb-btn-export" (click)="downloadPdf()" [disabled]="isGenerating">
          ⬇ Export PDF
        </button>
      </div>
    </div>

    <!-- ── Toast ── -->
    <div class="toast" [class.show]="!!toastMsg" [class.err]="toastType === 'error'">
      {{ toastMsg }}
    </div>

    <!-- ── Reset confirm modal ── -->
    <div class="overlay" *ngIf="showResetConfirm" (click)="showResetConfirm = false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-icon">🔄</div>
        <div class="modal-title">New Template?</div>
        <p class="modal-desc">All elements and settings will be cleared. Save your work first!</p>
        <div class="modal-btns">
          <button class="btn btn-ghost" (click)="showResetConfirm = false">Cancel</button>
          <button class="btn btn-danger" (click)="resetTemplate()">Clear &amp; Start New</button>
        </div>
      </div>
    </div>

    <!-- ── Welcome modal ── -->
    <div class="overlay" *ngIf="showWelcome" (click)="showWelcome = false">
      <div class="welcome-modal" (click)="$event.stopPropagation()">
        <div class="wm-header">
          <span class="wm-hex">⬡</span>
          <div>
            <div class="wm-title">PDFMake Visual Editor</div>
            <div class="wm-sub">Design PDF templates visually. Generate code instantly.</div>
          </div>
          <button class="wm-close" (click)="showWelcome = false">✕</button>
        </div>

        <div class="wm-features">
          <div class="wm-feat" *ngFor="let f of features">
            <span class="wm-feat-icon">{{ f.icon }}</span>
            <div>
              <div class="wm-feat-title">{{ f.title }}</div>
              <div class="wm-feat-desc">{{ f.desc }}</div>
            </div>
          </div>
        </div>

        <div class="wm-shortcuts">
          <div class="wm-shortcuts-title">Keyboard Shortcuts</div>
          <div class="wm-kb-grid">
            <kbd>Ctrl+Z</kbd><span>Undo</span>
            <kbd>Ctrl+Y</kbd><span>Redo</span>
            <kbd>Ctrl+S</kbd><span>Save template</span>
            <kbd>Delete</kbd><span>Remove element</span>
            <kbd>Arrow keys</kbd><span>Nudge 1pt</span>
            <kbd>Shift+↑↓←→</kbd><span>Nudge 10pt</span>
            <kbd>Ctrl+Scroll</kbd><span>Zoom in/out</span>
            <kbd>Esc</kbd><span>Close dialogs</span>
          </div>
        </div>

        <div class="wm-var-box">
          <div class="wm-shortcuts-title">Dynamic Variables</div>
          <p class="wm-var-desc">
            In any Text element, type <code>{{ varEx1 }}</code> or <code>{{ varEx2 }}</code> to bind data fields.
            Feed records from the <strong>Bulk Data</strong> panel to print personalised PDFs in bulk.
          </p>
        </div>

        <div class="wm-actions">
          <button class="btn btn-ghost" (click)="showWelcome = false">Start Blank</button>
          <button class="btn btn-primary" (click)="loadExampleAndClose(examples[0])">
            Load Student ID Example →
          </button>
          <button class="btn btn-ghost" (click)="loadExampleAndClose(examples[1])">
            Load Certificate Example →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Toolbar shell ── */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 52px;
      padding: 0 14px;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      gap: 6px;
      position: relative;
      z-index: 200;
    }

    .tb-left, .tb-center, .tb-right {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    /* ── Brand ── */
    .brand {
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      padding: 5px 7px;
      border-radius: 7px;
      transition: background 0.12s;
      &:hover { background: var(--bg-hover); }

      .brand-hex {
        font-size: 20px;
        color: var(--accent);
        filter: drop-shadow(0 0 8px rgba(124,90,245,.45));
      }
      .brand-name {
        font-family: 'Syne', sans-serif;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: -.01em;
        white-space: nowrap;
        em { font-style: normal; color: var(--accent-2); }
      }
    }

    .tpl-name-input {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--text-3);
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 8px;
      max-width: 160px;
      outline: none;
      transition: all .15s;
      cursor: text;
      &:hover { border-color: var(--border); color: var(--text-2); }
      &:focus { border-color: var(--accent-border); background: var(--bg-3); color: var(--text-1); max-width: 220px; }
    }

    .tb-sep {
      width: 1px; height: 18px;
      background: var(--border-2);
      margin: 0 4px;
      flex-shrink: 0;
    }

    /* ── Buttons ── */
    .tb-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--text-2);
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
      font-weight: 500;
      cursor: pointer;
      transition: all .12s;
      white-space: nowrap;
      text-decoration: none;

      &:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-1); border-color: var(--border); }
      &:disabled { opacity: .35; cursor: not-allowed; }
    }

    .tb-btn-examples { color: var(--accent-3); }
    .dd-arrow { font-size: 10px; transition: transform .15s; &.open { transform: rotate(180deg); } }
    .tb-btn-danger:hover:not(:disabled) { color: var(--error); border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.06); }

    .tb-btn-preview {
      background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600;
      &:hover:not(:disabled) { background: #8b6cf7; border-color: #8b6cf7; }
    }
    .tb-btn-export {
      background: var(--bg-3); color: var(--accent-3); border-color: var(--accent-border);
      &:hover:not(:disabled) { background: var(--accent-dim); }
    }

    /* ── Element badge ── */
    .el-badge {
      display: flex; align-items: baseline; gap: 3px;
      padding: 3px 9px; background: var(--bg-3);
      border: 1px solid var(--border); border-radius: 20px;
      margin-right: 4px;
      .el-n { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; color: var(--accent-3); }
      .el-lbl { font-size: 10px; color: var(--text-3); }
    }

    /* ── Examples dropdown ── */
    .dd-wrap { position: relative; }

    .dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 270px;
      background: var(--bg-2);
      border: 1px solid var(--border-2);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 600;
      overflow: hidden;
      animation: ddIn .15s ease;
    }

    @keyframes ddIn {
      from { opacity: 0; transform: translateY(-5px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dd-header {
      padding: 9px 14px 5px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
      color: var(--text-3);
    }

    .dd-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 10px 14px;
      background: none; border: none; border-top: 1px solid var(--border);
      cursor: pointer; text-align: left; transition: background .1s;
      &:hover { background: var(--bg-hover); }

      .dd-icon { font-size: 22px; flex-shrink: 0; }
      .dd-info { flex: 1; display: flex; flex-direction: column; gap: 2px;
        .dd-label { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .dd-meta  { font-size: 11px; color: var(--text-3); }
      }
      .dd-arrow-r { color: var(--text-3); font-size: 16px; }
    }

    /* ── Toast ── */
    .toast {
      position: fixed; top: 60px; left: 50%;
      transform: translateX(-50%) translateY(-6px);
      padding: 8px 18px; border-radius: 6px;
      font-size: 13px; font-weight: 500;
      pointer-events: none; opacity: 0;
      transition: opacity .2s, transform .2s;
      z-index: 9000;
      background: rgba(34,211,160,.1); border: 1px solid var(--success); color: var(--success);

      &.show { opacity: 1; transform: translateX(-50%) translateY(0); }
      &.err  { background: rgba(248,113,113,.1); border-color: var(--error); color: var(--error); }
    }

    /* ── Reset modal ── */
    .modal {
      background: var(--bg-2); border: 1px solid var(--border-2);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
      padding: 32px 28px; min-width: 360px; max-width: 90vw;
      text-align: center;

      .modal-icon { font-size: 40px; margin-bottom: 10px; }
      .modal-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 10px; }
      .modal-desc { color: var(--text-2); font-size: 14px; line-height: 1.6; margin-bottom: 22px; }
      .modal-btns { display: flex; gap: 8px; justify-content: center; }
    }

    /* ── Welcome modal ── */
    .welcome-modal {
      background: var(--bg-2);
      border: 1px solid var(--border-2);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: 0;
      width: min(580px, 94vw);
      overflow: hidden;
    }

    .wm-header {
      display: flex; align-items: center; gap: 14px;
      padding: 28px 28px 20px;
      background: linear-gradient(135deg, rgba(124,90,245,.12), rgba(167,139,250,.06));
      border-bottom: 1px solid var(--border);

      .wm-hex { font-size: 48px; color: var(--accent); filter: drop-shadow(0 0 14px rgba(124,90,245,.5)); line-height: 1; flex-shrink: 0; }
      .wm-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
      .wm-sub { font-size: 13px; color: var(--text-3); margin-top: 3px; }
      .wm-close {
        margin-left: auto; background: none; border: none; color: var(--text-3);
        font-size: 16px; cursor: pointer; padding: 4px 8px;
        border-radius: 6px; align-self: flex-start;
        &:hover { color: var(--text-1); background: var(--bg-hover); }
      }
    }

    .wm-features {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 1px; background: var(--border);
      border-bottom: 1px solid var(--border);
    }

    .wm-feat {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 14px 18px;
      background: var(--bg-2);

      .wm-feat-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
      .wm-feat-title { font-size: 13px; font-weight: 600; color: var(--text-1); margin-bottom: 3px; }
      .wm-feat-desc  { font-size: 11px; color: var(--text-3); line-height: 1.5; }
    }

    .wm-shortcuts { padding: 16px 24px 0; }
    .wm-shortcuts-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: var(--text-3); margin-bottom: 10px;
    }

    .wm-kb-grid {
      display: grid; grid-template-columns: auto 1fr auto 1fr;
      gap: 5px 12px; align-items: center;

      kbd {
        font-family: 'JetBrains Mono', monospace; font-size: 10px;
        background: var(--bg-4); color: var(--text-2);
        border: 1px solid var(--border-2); border-bottom-width: 2px;
        padding: 2px 6px; border-radius: 4px; white-space: nowrap;
      }
      span { font-size: 11px; color: var(--text-3); }
    }

    .wm-var-box {
      margin: 14px 24px 0;
      padding: 12px 14px;
      background: var(--bg-0);
      border: 1px solid var(--border);
      border-radius: var(--radius);

      .wm-var-desc { font-size: 12px; color: var(--text-3); line-height: 1.7; margin-top: 6px;
        code { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: var(--accent-dim); color: var(--accent-3); padding: 1px 5px; border-radius: 3px; }
        strong { color: var(--text-2); }
      }
    }

    .wm-actions {
      display: flex; gap: 8px; padding: 20px 24px;
      border-top: 1px solid var(--border); flex-wrap: wrap;
      justify-content: flex-end;
    }
  `]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  template!: Template;
  isGenerating = false;
  showResetConfirm = false;
  showWelcome = false;
  showExamples = false;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;
  private subs = new Subscription();

  readonly varEx1 = '{{name}}';
  readonly varEx2 = '{{studentId}}';

  readonly features = [
    { icon: '🎨', title: 'Visual Canvas',      desc: 'Drag, resize & style elements on a pixel-perfect page with real-time preview' },
    { icon: '⚡', title: 'Dynamic Variables',  desc: 'Bind {{variables}} to text & image elements for fully personalised output' },
    { icon: '🔁', title: 'Bulk Loop',          desc: 'Feed a JSON / CSV dataset to print N pages in one PDF — one per record' },
    { icon: '📋', title: 'Export Code',         desc: 'Copy the generated pdfmake JS code and drop it straight into your project' },
  ];

  readonly examples: ExampleTemplate[] = [
    {
      label: 'Student ID Card',
      icon: '🪪',
      file: 'assets/example-student-id.template.json',
      sampleData: [
        { name: 'Alice Johnson', studentId: 'STU-2024-001', department: 'Computer Science', year: '2024–25', validUntil: 'Dec 2025' },
        { name: 'Bob Martinez',  studentId: 'STU-2024-002', department: 'Mathematics',       year: '2024–25', validUntil: 'Dec 2025' },
        { name: 'Carol Chen',    studentId: 'STU-2024-003', department: 'Physics',           year: '2024–25', validUntil: 'Dec 2025' },
      ]
    },
    {
      label: 'Certificate of Completion',
      icon: '🏆',
      file: 'assets/example-certificate.template.json',
      sampleData: [
        { organization: 'Tech Academy', tagline: 'Excellence in Education', recipientName: 'Alice Johnson', courseName: 'Full Stack Web Development', date: '15 March 2025', signatoryName: 'Dr. Sarah Lee', signatoryTitle: 'Programme Director', directorName: 'Prof. James Brown', certNo: 'CERT-2025-001' },
        { organization: 'Tech Academy', tagline: 'Excellence in Education', recipientName: 'Bob Martinez',  courseName: 'Full Stack Web Development', date: '15 March 2025', signatoryName: 'Dr. Sarah Lee', signatoryTitle: 'Programme Director', directorName: 'Prof. James Brown', certNo: 'CERT-2025-002' },
        { organization: 'Tech Academy', tagline: 'Excellence in Education', recipientName: 'Carol Chen',    courseName: 'Full Stack Web Development', date: '15 March 2025', signatoryName: 'Dr. Sarah Lee', signatoryTitle: 'Programme Director', directorName: 'Prof. James Brown', certNo: 'CERT-2025-003' },
      ]
    }
  ];

  constructor(
    public editorService: EditorService,
    private pdfService: PdfService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.subs.add(this.editorService.template$.subscribe(t => {
      this.template = t;
      this.cdr.markForCheck();
    }));
    if (!sessionStorage.getItem('pdfmake-welcomed')) {
      setTimeout(() => { this.showWelcome = true; this.cdr.markForCheck(); }, 500);
      sessionStorage.setItem('pdfmake-welcomed', '1');
    }
  }

  ngOnDestroy() { this.subs.unsubscribe(); clearTimeout(this.toastTimer); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.saveTemplate(); }
    if (e.key === 'Escape') {
      this.showResetConfirm = false; this.showWelcome = false; this.showExamples = false;
      this.cdr.markForCheck();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.dd-wrap')) {
      this.showExamples = false;
      this.cdr.markForCheck();
    }
  }

  renameTemplate(name: string) {
    if (name.trim()) this.editorService.updateTemplateName(name.trim());
  }

  toggleExamples() { this.showExamples = !this.showExamples; }

  loadExample(ex: ExampleTemplate) {
    this.showExamples = false;
    this.http.get(ex.file, { responseType: 'text' }).subscribe({
      next: json => {
        try {
          this.editorService.importTemplate(json);
          this.editorService.setBulkData(ex.sampleData);
          this.toast(`✓ "${ex.label}" loaded with ${ex.sampleData.length} records`, 'success');
        } catch (err: any) { this.toast('Parse error: ' + err.message, 'error'); }
        this.cdr.markForCheck();
      },
      error: () => this.toast('Could not fetch example file', 'error')
    });
  }

  loadExampleAndClose(ex: ExampleTemplate) {
    this.showWelcome = false;
    this.loadExample(ex);
  }

  saveTemplate() {
    const json = this.editorService.exportTemplate();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this.template?.name ?? 'template').replace(/\s+/g, '_')}.template.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('✓ Template saved as JSON', 'success');
  }

  onLoadFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        this.editorService.importTemplate(ev.target?.result as string);
        this.toast('✓ Template loaded', 'success');
      } catch (err: any) { this.toast('Invalid template: ' + err.message, 'error'); }
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  }

  resetTemplate() {
    this.editorService.resetTemplate();
    this.showResetConfirm = false;
    this.toast('✓ Canvas cleared', 'success');
  }

  async quickPreview() {
    this.isGenerating = true; this.cdr.markForCheck();
    try {
      const rec = this.editorService.bulkData;
      await this.pdfService.generatePdf(this.template, rec.length ? [rec[0]] : [{}], 'open');
      this.toast('✓ PDF preview opened', 'success');
    } catch (e: any) { this.toast('⚠ ' + (e.message || 'Failed'), 'error'); }
    finally { this.isGenerating = false; this.cdr.markForCheck(); }
  }

  async downloadPdf() {
    this.isGenerating = true; this.cdr.markForCheck();
    try {
      const rec = this.editorService.bulkData;
      await this.pdfService.generatePdf(this.template, rec.length ? rec : [{}], 'download');
      this.toast('✓ PDF downloaded', 'success');
    } catch (e: any) { this.toast('⚠ ' + (e.message || 'Failed'), 'error'); }
    finally { this.isGenerating = false; this.cdr.markForCheck(); }
  }

  private toast(msg: string, type: 'success' | 'error') {
    clearTimeout(this.toastTimer);
    this.toastMsg = msg; this.toastType = type; this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; this.cdr.markForCheck(); }, 3200);
  }
}
