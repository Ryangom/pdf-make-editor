import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { PdfService } from '../../services/pdf.service';
import { DataRecord, Template } from '../../models/editor.models';

@Component({
  selector: 'app-data-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="data-panel">
      <!-- Header -->
      <div class="dp-header">
        <div class="dp-title">
          <span class="dp-icon">⚙</span>
          Bulk Data & Loop
        </div>
        <span class="record-badge" *ngIf="records.length">{{ records.length }} record{{ records.length !== 1 ? 's' : '' }}</span>
      </div>

      <div class="dp-body">
        <!-- Detected Variables -->
        <div class="vars-section" *ngIf="detectedVars.length">
          <div class="dp-section-title">Detected Variables</div>
          <div class="var-chips">
            <span class="var-chip" *ngFor="let v of detectedVars">{{ formatVar(v) }}</span>
          </div>
          <p class="hint">Use these keys in your JSON data records.</p>
        </div>
        <div class="vars-section" *ngIf="!detectedVars.length">
          <p class="hint">Add text elements with <code>{{ varSyntaxHint }}</code> syntax to use dynamic data.</p>
        </div>

        <!-- Input Mode Tabs -->
        <div class="tabs" style="margin-bottom: 16px">
          <button class="tab" [class.active]="mode === 'json'" (click)="mode = 'json'">JSON</button>
          <button class="tab" [class.active]="mode === 'csv'" (click)="mode = 'csv'">CSV</button>
          <button class="tab" [class.active]="mode === 'table'" (click)="mode = 'table'">Table</button>
        </div>

        <!-- JSON Mode -->
        <div *ngIf="mode === 'json'">
          <div class="dp-section-title">JSON Array</div>
          <div class="json-toolbar">
            <button class="dp-btn" (click)="generateSampleJson()">Generate Sample</button>
            <button class="dp-btn" (click)="formatJson()">Format</button>
            <button class="dp-btn" (click)="clearData()">Clear</button>
          </div>
          <textarea
            class="json-input"
            [(ngModel)]="jsonText"
            (ngModelChange)="onJsonChange($event)"
            placeholder='[
  { "name": "Alice Smith", "id": "STU001", "grade": "A" },
  { "name": "Bob Jones", "id": "STU002", "grade": "B" }
]'
            rows="10"
            [class.error]="jsonError">
          </textarea>
          <div class="error-msg" *ngIf="jsonError">⚠ {{ jsonError }}</div>
        </div>

        <!-- CSV Mode -->
        <div *ngIf="mode === 'csv'">
          <div class="dp-section-title">CSV (first row = headers)</div>
          <div class="json-toolbar">
            <button class="dp-btn" (click)="generateSampleCsv()">Generate Sample</button>
            <button class="dp-btn" (click)="parseCsv()">Parse CSV</button>
            <label class="dp-btn">
              <input type="file" accept=".csv,.txt" (change)="onCsvFile($event)" hidden />
              Upload CSV
            </label>
          </div>
          <textarea
            class="json-input"
            [(ngModel)]="csvText"
            placeholder="name,id,grade
Alice Smith,STU001,A
Bob Jones,STU002,B"
            rows="8">
          </textarea>
          <button class="dp-btn primary" (click)="parseCsv()" style="width:100%;margin-top:8px">
            → Parse & Apply
          </button>
        </div>

        <!-- Table Mode -->
        <div *ngIf="mode === 'table'" class="table-mode">
          <div class="table-toolbar">
            <button class="dp-btn" (click)="addRow()">+ Row</button>
            <button class="dp-btn" (click)="addColumn()">+ Column</button>
            <button class="dp-btn" (click)="clearData()">Clear</button>
          </div>
          <div class="table-wrap" *ngIf="tableHeaders.length; else noTable">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th *ngFor="let h of tableHeaders; let hi = index">
                    <input type="text" class="th-input" [value]="h"
                      (input)="onHeaderChange(hi, $any($event.target).value)" />
                    <button class="remove-col" (click)="removeColumn(hi)" title="Remove column">✕</button>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of tableRows; let ri = index">
                  <td class="row-num">{{ ri + 1 }}</td>
                  <td *ngFor="let h of tableHeaders; let hi = index">
                    <input type="text" class="td-input"
                      [value]="row[h] || ''"
                      (input)="onCellChange(ri, h, $any($event.target).value)" />
                  </td>
                  <td>
                    <button class="remove-row" (click)="removeRow(ri)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noTable>
            <div class="empty-table">
              <p>Click "Add Column" to start building your data table.</p>
            </div>
          </ng-template>
        </div>

        <!-- Records summary -->
        <div class="records-summary" *ngIf="records.length">
          <div class="dp-section-title">Records Preview</div>
          <div class="record-list">
            <div class="record-item" *ngFor="let r of records.slice(0, 5); let i = index"
                 [class.preview-active]="i === previewIdx"
                 (click)="previewIdx = i; applyPreview()">
              <span class="rec-num">#{{ i + 1 }}</span>
              <span class="rec-preview">{{ getRecordPreview(r) }}</span>
            </div>
            <div class="record-more" *ngIf="records.length > 5">
              + {{ records.length - 5 }} more records
            </div>
          </div>
          <div class="preview-info">
            Click a record to preview it on canvas.
          </div>
        </div>

        <!-- Generate Actions -->
        <div class="generate-section">
          <div class="dp-section-title">Generate PDF</div>
          <div class="gen-options">
            <div class="toggle-row" style="margin-bottom: 12px">
              <span>Bulk Mode (loop all records)</span>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="isBulk">
                <span class="slider"></span>
              </label>
            </div>
            <div class="gen-info" *ngIf="isBulk">
              Will generate <strong>{{ records.length || 0 }}</strong> page{{ (records.length || 0) !== 1 ? 's' : '' }} in one PDF
            </div>
            <div class="gen-info" *ngIf="!isBulk">
              Will generate a single PDF using the first record (or no data)
            </div>
          </div>
          <div class="gen-buttons">
            <button class="btn btn-primary gen-btn" (click)="generatePdf('open')" [disabled]="isGenerating">
              <span *ngIf="!isGenerating">{{ isBulk ? '🖨 Print All (' + records.length + ')' : '👁 Preview PDF' }}</span>
              <span *ngIf="isGenerating">⏳ Generating...</span>
            </button>
            <button class="btn btn-ghost gen-btn" (click)="generatePdf('download')" [disabled]="isGenerating">
              ⬇ Download PDF
            </button>
          </div>
          <div class="error-msg" *ngIf="genError">⚠ {{ genError }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .data-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .dp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
    }

    .dp-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-1);

      .dp-icon { color: var(--accent-2); font-size: 14px; }
    }

    .record-badge {
      background: var(--accent-dim);
      color: var(--accent-3);
      border: 1px solid var(--accent-border);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
    }

    .dp-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dp-section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-3);
      margin-bottom: 10px;
    }

    .vars-section { }

    .var-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .var-chip {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: var(--accent-dim);
      color: var(--accent-3);
      border: 1px solid var(--accent-border);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .hint {
      font-size: 12px;
      color: var(--text-3);
      line-height: 1.6;

      code {
        font-family: 'JetBrains Mono', monospace;
        background: var(--bg-4);
        padding: 1px 4px;
        border-radius: 3px;
        font-size: 11px;
        color: var(--accent-3);
      }
    }

    .json-toolbar {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .dp-btn {
      padding: 5px 10px;
      background: var(--bg-3);
      border: 1px solid var(--border-2);
      border-radius: var(--radius-sm);
      color: var(--text-2);
      font-size: 11px;
      font-family: 'Outfit', sans-serif;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;

      &:hover { background: var(--bg-hover); color: var(--text-1); }
      &.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    }

    .json-input {
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.7;
      resize: vertical;
      min-height: 150px;
      background: var(--bg-0);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: #a8d8a0;
      padding: 12px;

      &.error { border-color: var(--error); }
      &::placeholder { color: var(--text-4); }
    }

    .error-msg {
      color: var(--error);
      font-size: 12px;
      margin-top: 4px;
    }

    /* Table */
    .table-toolbar { display: flex; gap: 6px; margin-bottom: 10px; }

    .table-wrap { overflow-x: auto; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;

      th, td {
        border: 1px solid var(--border);
        padding: 4px;
        min-width: 80px;
      }

      th {
        background: var(--bg-3);
        color: var(--text-3);
        position: relative;
        padding-right: 20px;
      }

      .row-num { color: var(--text-4); text-align: center; min-width: 30px; font-size: 11px; }
    }

    .th-input {
      background: transparent;
      border: none;
      color: var(--text-2);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      width: calc(100% - 16px);
      padding: 0;
      &:focus { outline: none; background: var(--bg-4); }
    }

    .td-input {
      background: transparent;
      border: none;
      color: var(--text-1);
      font-size: 12px;
      width: 100%;
      padding: 0;
      &:focus { outline: none; background: var(--bg-4); padding: 2px 4px; }
    }

    .remove-col, .remove-row {
      background: none;
      border: none;
      color: var(--text-4);
      cursor: pointer;
      font-size: 10px;
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      &:hover { color: var(--error); }
    }

    .remove-row {
      position: static;
      transform: none;
      padding: 2px 6px;
    }

    .empty-table {
      text-align: center;
      padding: 24px;
      color: var(--text-3);
      font-size: 12px;
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
    }

    /* Records summary */
    .record-list { display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; }

    .record-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: var(--radius-sm);
      background: var(--bg-3);
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.1s;

      &:hover { background: var(--bg-hover); }
      &.preview-active { border-color: var(--accent-border); background: var(--accent-dim); }

      .rec-num { font-size: 10px; color: var(--text-3); font-family: 'JetBrains Mono', monospace; min-width: 24px; }
      .rec-preview { font-size: 12px; color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }

    .record-more { font-size: 11px; color: var(--text-3); text-align: center; padding: 4px; }

    .preview-info { font-size: 11px; color: var(--text-3); }

    /* Generate */
    .generate-section {
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
    }

    .gen-options { margin-bottom: 12px; }

    .gen-info {
      font-size: 12px;
      color: var(--text-3);
      margin-top: 6px;
      strong { color: var(--accent-3); }
    }

    .gen-buttons {
      display: flex;
      gap: 8px;
    }

    .gen-btn { flex: 1; justify-content: center; }
  `]
})
export class DataPanelComponent implements OnInit, OnDestroy {
  mode: 'json' | 'csv' | 'table' = 'json';
  jsonText = '';
  csvText = '';
  jsonError = '';
  records: DataRecord[] = [];
  tableHeaders: string[] = [];
  tableRows: DataRecord[] = [];
  detectedVars: string[] = [];
  isBulk = true;
  isGenerating = false;
  genError = '';
  previewIdx = 0;
  template!: Template;
  readonly varSyntaxHint = '{{variableName}}';
  formatVar(v: string) { return '{{' + v + '}}'; }
  private subs = new Subscription();

  constructor(
    private editorService: EditorService,
    private pdfService: PdfService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subs.add(this.editorService.template$.subscribe(t => {
      this.template = t;
      this.detectedVars = this.pdfService.extractVars(t);
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  // ─── JSON ──────────────────────────────────────────────────────────────────
  onJsonChange(text: string) {
    this.jsonError = '';
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
      this.records = parsed;
      this.editorService.setBulkData(this.records);
    } catch (e: any) {
      if (text.trim()) this.jsonError = e.message;
    }
  }

  generateSampleJson() {
    const vars = this.detectedVars.length ? this.detectedVars : ['name', 'id', 'role'];
    const sample = Array.from({ length: 3 }, (_, i) => {
      const rec: DataRecord = {};
      vars.forEach(v => { rec[v] = `${v}_${i + 1}`; });
      return rec;
    });
    this.jsonText = JSON.stringify(sample, null, 2);
    this.onJsonChange(this.jsonText);
  }

  formatJson() {
    try {
      const parsed = JSON.parse(this.jsonText);
      this.jsonText = JSON.stringify(parsed, null, 2);
      this.jsonError = '';
    } catch { }
  }

  clearData() {
    this.jsonText = '';
    this.csvText = '';
    this.records = [];
    this.tableRows = [];
    this.editorService.setBulkData([]);
  }

  // ─── CSV ───────────────────────────────────────────────────────────────────
  generateSampleCsv() {
    const vars = this.detectedVars.length ? this.detectedVars : ['name', 'id', 'role'];
    const rows = [vars.join(',')];
    for (let i = 1; i <= 3; i++) {
      rows.push(vars.map(v => `${v}_${i}`).join(','));
    }
    this.csvText = rows.join('\n');
  }

  parseCsv() {
    const lines = this.csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim());
    this.records = lines.slice(1).map(line => {
      const vals = line.split(',');
      const rec: DataRecord = {};
      headers.forEach((h, i) => { rec[h] = (vals[i] ?? '').trim(); });
      return rec;
    });
    this.jsonText = JSON.stringify(this.records, null, 2);
    this.mode = 'json';
    this.editorService.setBulkData(this.records);
  }

  onCsvFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.csvText = ev.target?.result as string;
      this.parseCsv();
      this.cdr.markForCheck();
    };
    reader.readAsText(file);
  }

  // ─── Table ─────────────────────────────────────────────────────────────────
  addRow() {
    const rec: DataRecord = {};
    this.tableHeaders.forEach(h => { rec[h] = ''; });
    this.tableRows = [...this.tableRows, rec];
    this.syncTableToRecords();
  }

  addColumn() {
    const name = `field${this.tableHeaders.length + 1}`;
    this.tableHeaders = [...this.tableHeaders, name];
    this.tableRows = this.tableRows.map(r => ({ ...r, [name]: '' }));
    this.syncTableToRecords();
  }

  removeRow(idx: number) {
    this.tableRows = this.tableRows.filter((_, i) => i !== idx);
    this.syncTableToRecords();
  }

  removeColumn(idx: number) {
    const h = this.tableHeaders[idx];
    this.tableHeaders = this.tableHeaders.filter((_, i) => i !== idx);
    this.tableRows = this.tableRows.map(r => { const nr = { ...r }; delete nr[h]; return nr; });
    this.syncTableToRecords();
  }

  onHeaderChange(idx: number, val: string) {
    const old = this.tableHeaders[idx];
    this.tableHeaders = [...this.tableHeaders];
    this.tableHeaders[idx] = val;
    this.tableRows = this.tableRows.map(r => {
      const nr = { ...r, [val]: r[old] ?? '' };
      delete nr[old];
      return nr;
    });
    this.syncTableToRecords();
  }

  onCellChange(ri: number, header: string, val: string) {
    this.tableRows = this.tableRows.map((r, i) => i === ri ? { ...r, [header]: val } : r);
    this.syncTableToRecords();
  }

  private syncTableToRecords() {
    this.records = [...this.tableRows];
    this.jsonText = JSON.stringify(this.records, null, 2);
    this.editorService.setBulkData(this.records);
    this.cdr.markForCheck();
  }

  // ─── Preview ───────────────────────────────────────────────────────────────
  applyPreview() {
    const rec = this.records[this.previewIdx];
    if (rec) this.editorService.setBulkData(this.records);
  }

  getRecordPreview(r: DataRecord): string {
    return Object.entries(r).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ');
  }

  // ─── Generate ──────────────────────────────────────────────────────────────
  async generatePdf(action: 'open' | 'download') {
    this.genError = '';
    this.isGenerating = true;
    this.cdr.markForCheck();
    try {
      const recs = this.isBulk ? this.records : (this.records.length > 0 ? [this.records[0]] : [{}]);
      await this.pdfService.generatePdf(this.template, recs, action);
    } catch (e: any) {
      this.genError = e.message || 'PDF generation failed';
    } finally {
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }
}
