import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { Template, EditorElement, ElementType, PAGE_SIZES } from '../../models/editor.models';
import { ReversePipe } from '../../pipes/reverse.pipe';

@Component({
  selector: 'app-elements-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, ReversePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="palette">
      <!-- Header -->
      <div class="palette-header">
        <span class="logo-mark">⬡</span>
        <span class="logo-text">PDFMake<span>Editor</span></span>
      </div>

      <!-- Template Name -->
      <div class="panel-section template-name-section">
        <input
          type="text"
          [ngModel]="template?.name"
          (ngModelChange)="editorService.updateTemplateName($event)"
          placeholder="Template name"
          class="template-name-input" />
      </div>

       <!-- Page Size -->
       <div class="panel-section">
         <div class="section-title">Page Size</div>
         <select [(ngModel)]="selectedPageSizeLabel" (ngModelChange)="onPageSizeChange($event)">
           <option *ngFor="let ps of pageSizes" [value]="ps.label">{{ps.label}}</option>
         </select>
         <div *ngIf="selectedPageSizeLabel === 'Custom'" class="custom-size">
           <input type="number" [(ngModel)]="customWidth" placeholder="Width (pts)" min="50" max="2000" />
           <input type="number" [(ngModel)]="customHeight" placeholder="Height (pts)" min="50" max="2000" />
           <button class="btn btn-ghost" style="width:100%;margin-top:4px" (click)="applyCustomSize()">Apply</button>
         </div>
         <div class="size-display">
           {{ template?.page?.width }} × {{ template?.page?.height }} pts
         </div>
       </div>

       <!-- Back Page Toggle -->
       <div class="panel-section">
         <div class="section-title">Double-sided Card</div>
         <div class="toggle-row">
           <span>Enable Back Page</span>
           <label class="toggle">
             <input type="checkbox" [ngModel]="template?.hasBackPage" (ngModelChange)="toggleBackPage($event)">
             <span class="slider"></span>
           </label>
         </div>
         <p class="hint" style="margin-top: 8px;">Creates front and back pages for ID cards, business cards, etc.</p>
       </div>

      <!-- Background Image upload -->
      <div class="panel-section">
        <div class="section-title">Background Image</div>
        <label class="upload-area" [class.has-image]="template?.page?.backgroundImage">
          <input #fileInput type="file" accept="image/*" (change)="onBgUpload($event)" class="hidden-file-input" />
          <span *ngIf="!template?.page?.backgroundImage">
            <span class="upload-icon">↑</span>
            <span>Upload Image</span>
          </span>
          <span *ngIf="template?.page?.backgroundImage" class="has-bg">
            <span>✓ Background set</span>
            <button class="remove-bg-btn" (click)="removeBg($event)">✕</button>
          </span>
        </label>
      </div>

      <!-- Add Elements -->
      <div class="panel-section">
        <div class="section-title">Add Elements</div>
        <div class="element-types">
          <button class="el-type-btn" (click)="addElement('text')">
            <span class="el-icon">T</span>
            <span>Text</span>
          </button>
          <button class="el-type-btn" (click)="addElement('image')">
            <span class="el-icon">🖼</span>
            <span>Image</span>
          </button>
          <button class="el-type-btn" (click)="addElement('rectangle')">
            <span class="el-icon">▭</span>
            <span>Rectangle</span>
          </button>
          <button class="el-type-btn" (click)="addElement('roundrect')">
            <span class="el-icon">⧫</span>
            <span>Round</span>
          </button>
        </div>
      </div>

      <!-- Layers -->
      <div class="panel-section layers-section" style="flex:1;overflow:hidden;display:flex;flex-direction:column;">
        <div class="section-title">
          Layers
          <span class="layer-count" *ngIf="currentElements?.length">
            {{ currentElements.length }}
          </span>
        </div>
        <div class="layers-list" *ngIf="currentElements?.length; else emptyLayers">
          <div
            *ngFor="let el of currentElements | slice:0 | reverseArr; let i = index"
            class="layer-item"
            [class.active]="selectedId === el.id"
            [class.locked]="el.locked"
            (click)="selectEl(el.id)">

            <span class="layer-type-icon">{{ getTypeIcon(el.type) }}</span>
            <span class="layer-label" [title]="el.label">{{ el.label }}</span>

            <div class="layer-actions">
              <button class="la-btn" [class.muted]="!el.visible"
                (click)="$event.stopPropagation(); toggleVisible(el)" title="Toggle visibility">
                {{ el.visible ? '👁' : '🙈' }}
              </button>
              <button class="la-btn" [class.muted]="!el.locked"
                (click)="$event.stopPropagation(); toggleLocked(el)" title="Toggle lock">
                {{ el.locked ? '🔒' : '🔓' }}
              </button>
              <button class="la-btn" (click)="$event.stopPropagation(); moveUp(el.id)" title="Move up (↑ z-index)">↑</button>
              <button class="la-btn" (click)="$event.stopPropagation(); moveDown(el.id)" title="Move down (↓ z-index)">↓</button>
              <button class="la-btn danger" (click)="$event.stopPropagation(); deleteEl(el.id)" title="Delete">✕</button>
            </div>
          </div>
        </div>
        <ng-template #emptyLayers>
          <div class="empty-layers">
            <p>No elements yet.</p>
            <p>Add elements above.</p>
          </div>
        </ng-template>
      </div>

      <!-- Actions -->
      <div class="palette-footer">
        <button class="btn btn-ghost" style="flex:1" (click)="editorService.undo()" title="Ctrl+Z">↩ Undo</button>
        <button class="btn btn-ghost" style="flex:1" (click)="editorService.redo()" title="Ctrl+Y">↪ Redo</button>
      </div>
    </div>
  `,
  styles: [`
    .palette {
      width: 240px;
      flex-shrink: 0;
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .palette-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      border-bottom: 1px solid var(--border);

      .logo-mark {
        color: var(--accent);
        font-size: 20px;
      }

      .logo-text {
        font-family: 'Syne', sans-serif;
        font-size: 16px;
        font-weight: 800;
        color: var(--text-1);

        span { color: var(--accent-2); }
      }
    }

    .template-name-section { padding: 10px 16px; }

    .template-name-input {
      font-weight: 600;
      font-size: 13px;
      background: transparent;
      border-color: transparent;
      padding: 4px 0;
      &:focus { border-color: var(--accent-border); background: var(--bg-3); padding: 4px 8px; }
    }

    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-3);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .layer-count {
      background: var(--bg-4);
      color: var(--text-2);
      font-size: 10px;
      font-weight: 600;
      border-radius: 10px;
      padding: 1px 6px;
    }

    .custom-size {
      display: flex;
      gap: 6px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    .size-display {
      font-size: 11px;
      color: var(--text-3);
      font-family: 'JetBrains Mono', monospace;
      margin-top: 6px;
    }

    .upload-area {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px;
      border: 1.5px dashed var(--border-2);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
      color: var(--text-3);
      text-align: center;
      transition: all 0.15s;

      &:hover { border-color: var(--accent-border); color: var(--accent-3); background: var(--accent-dim); }
      &.has-image { border-color: var(--success); color: var(--success); background: rgba(34,211,160,0.06); }

      .upload-icon { font-weight: 700; font-size: 14px; }
    }

    .has-bg {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .remove-bg-btn {
      background: none;
      border: none;
      color: var(--error);
      cursor: pointer;
      font-size: 12px;
      padding: 0 2px;
      &:hover { opacity: 0.7; }
    }

    .element-types {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }

    .el-type-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 10px 6px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-2);
      font-size: 11px;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: all 0.15s;

      .el-icon {
        font-size: 18px;
        font-weight: 700;
        color: var(--accent-2);
      }

      &:hover {
        background: var(--bg-hover);
        border-color: var(--accent-border);
        color: var(--text-1);
      }
    }

    .layers-section { overflow: hidden; }

    .layers-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .layer-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.1s;
      border: 1px solid transparent;

      &:hover { background: var(--bg-3); }
      &.active { background: var(--accent-dim); border-color: var(--accent-border); }
      &.locked { opacity: 0.6; }
    }

    .layer-type-icon { font-size: 12px; flex-shrink: 0; }

    .layer-label {
      flex: 1;
      font-size: 12px;
      color: var(--text-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .layer-actions {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }

    .la-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      padding: 2px;
      border-radius: 3px;
      color: var(--text-3);
      line-height: 1;
      &:hover { color: var(--text-1); background: var(--bg-4); }
      &.muted { opacity: 0.3; }
      &.danger:hover { color: var(--error); }
    }

    .empty-layers {
      text-align: center;
      padding: 20px;
      color: var(--text-3);
      font-size: 12px;
      line-height: 1.8;
    }

    .palette-footer {
      display: flex;
      gap: 4px;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
    }

    .hidden-file-input {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class ElementsPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  template!: Template;
  selectedId: string | null = null;
  pageSizes = PAGE_SIZES;
  selectedPageSizeLabel = 'A4 Portrait';
  customWidth = 595;
  customHeight = 842;

  private subs = new Subscription();

  get currentElements(): any[] {
    return this.editorService.elements;
  }

  constructor(
    public editorService: EditorService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.subs.add(this.editorService.template$.subscribe(t => {
      this.template = t;
      // Update selected page size dropdown when template changes
      const currentSize = PAGE_SIZES.find(ps =>
        ps.width === this.editorService.page.width && ps.height === this.editorService.page.height
      );
      this.selectedPageSizeLabel = currentSize ? currentSize.label : 'Custom';
      this.customWidth = this.editorService.page.width;
      this.customHeight = this.editorService.page.height;
      this.cdr.markForCheck();
    }));
    this.subs.add(this.editorService.selectedId$.subscribe(id => {
      this.selectedId = id;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  addElement(type: ElementType) { this.editorService.addElement(type); }
  selectEl(id: string) { this.editorService.selectElement(id); }
  deleteEl(id: string) { this.editorService.deleteElement(id); }
  moveUp(id: string) { this.editorService.moveElementUp(id); }
  moveDown(id: string) { this.editorService.moveElementDown(id); }

  toggleVisible(el: EditorElement) { this.editorService.updateElement(el.id, { visible: !el.visible }); }
  toggleLocked(el: EditorElement) { this.editorService.updateElement(el.id, { locked: !el.locked }); }

  getTypeIcon(type: string) {
    return type === 'text' ? 'T' : type === 'image' ? '🖼' : type === 'roundrect' ? '⧫' : '▭';
  }

  onPageSizeChange(label: string) {
    const ps = PAGE_SIZES.find(p => p.label === label);
    if (ps && ps.label !== 'Custom') {
      this.editorService.updatePage({ width: ps.width, height: ps.height });
    }
  }

  applyCustomSize() {
    this.editorService.updatePage({ width: this.customWidth, height: this.customHeight });
  }

  onBgUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        this.editorService.setBackgroundImage(ev.target.result);
      }
      // Reset input so same file can be selected again
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
    };
    reader.readAsDataURL(file);
  }

  removeBg(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.editorService.setBackgroundImage('');
  }

  toggleBackPage(enabled: boolean) {
    this.editorService.toggleBackPage(enabled);
  }
}
