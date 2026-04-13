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


      <!-- Template Name -->
      <div class="panel-section template-name-section">
        <input
          type="text"
          [ngModel]="template?.name"
          (ngModelChange)="editorService.updateTemplateName($event)"
          placeholder="Template name"
          class="template-name-input" />
      </div>

       <!-- Tools -->
      <div class="panel-section">
        <div class="section-title">Tools</div>
        <div class="tools-row">
          <button
            class="tool-btn"
            [class.active]="editorService.activeTool === 'select'"
            (click)="editorService.setActiveTool('select')"
            title="Select Tool (V)">
            <span class="tool-icon">⚲</span>
            <span>Select</span>
          </button>
          <button
            class="tool-btn"
            [class.active]="editorService.activeTool === 'hand'"
            (click)="editorService.setActiveTool('hand')"
            title="Hand Tool (H)">
            <span class="tool-icon">✋</span>
            <span>Hand</span>
          </button>
        </div>
      </div>

      <!-- Page Size -->
       <div class="panel-section">
         <div class="section-title">Page Size</div>
         <select [(ngModel)]="selectedPageSizeLabel" (ngModelChange)="onPageSizeChange($event)">
           <option *ngFor="let ps of pageSizes" [value]="ps.label">{{ps.label}}</option>
         </select>
         <div class="orientation-buttons">
           <button
             class="orient-btn"
             [class.active]="!isLandscape"
             (click)="setOrientation('portrait')"
             title="Portrait">
             <div class="orient-icon portrait"></div>
             <span>Portrait</span>
           </button>
           <button
             class="orient-btn"
             [class.active]="isLandscape"
             (click)="setOrientation('landscape')"
             title="Landscape">
             <div class="orient-icon landscape"></div>
             <span>Landscape</span>
           </button>
         </div>
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
          <button class="el-type-btn" (click)="addElement('line')">
            <span class="el-icon">─</span>
            <span>Line</span>
          </button>
          <button class="el-type-btn" (click)="addElement('ellipse')">
            <span class="el-icon">◯</span>
            <span>Ellipse</span>
          </button>
          <button class="el-type-btn" (click)="addElement('table')">
            <span class="el-icon">▦</span>
            <span>Table</span>
          </button>
          <button class="el-type-btn" (click)="addElement('qrcode')">
            <span class="el-icon">▣</span>
            <span>QR Code</span>
          </button>
          <button class="el-type-btn" (click)="addElement('list')">
            <span class="el-icon">☰</span>
            <span>List</span>
          </button>
          <button class="el-type-btn" (click)="addElement('columns')">
            <span class="el-icon">≡</span>
            <span>Columns</span>
          </button>
          <button class="el-type-btn" (click)="addElement('svg')">
            <span class="el-icon">◇</span>
            <span>SVG</span>
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
      width: 260px;
      flex-shrink: 0;
      background: linear-gradient(180deg, var(--panel) 0%, var(--bg-0) 100%);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      backdrop-filter: blur(12px);
      height: 100vh;
    }

    .palette-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, rgba(124,90,245,.08) 0%, transparent 100%);

      .logo-mark {
        color: var(--accent);
        font-size: 24px;
        filter: drop-shadow(0 0 12px rgba(124,90,245,.4));
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

        &:hover {
          transform: scale(1.1) rotate(5deg);
        }
      }

      .logo-text {
        font-family: 'Syne', sans-serif;
        font-size: 17px;
        font-weight: 800;
        color: var(--text-1);
        letter-spacing: -0.02em;

        span {
          color: var(--accent-2);
          background: linear-gradient(90deg, var(--accent-2), var(--accent-3));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      }
    }

    .panel-section {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }
    }

    .template-name-section {
      padding: 12px 20px 16px;
    }

    .template-name-input {
      font-weight: 600;
      font-size: 14px;
      background: var(--bg-2);
      border: 1px solid transparent;
      padding: 8px 12px;
      border-radius: 8px;
      width: 100%;
      transition: all 0.2s ease;

      &:hover {
        background: var(--bg-3);
        border-color: var(--border);
      }

      &:focus {
        border-color: var(--accent-border);
        background: var(--bg-3);
        box-shadow: 0 0 0 3px rgba(124,90,245,.15);
        outline: none;
      }
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-3);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    select {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-1);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 16px;

      &:hover {
        border-color: var(--accent-border);
        background-color: var(--bg-hover);
      }

      &:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(124,90,245,.15);
      }
    }

    .layer-count {
      background: linear-gradient(135deg, var(--accent-dim), var(--bg-4));
      color: var(--accent-3);
      font-size: 10px;
      font-weight: 700;
      border-radius: 12px;
      padding: 2px 7px;
      margin-left: auto;
    }

    .custom-size {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;

      input {
        flex: 1;
        min-width: 80px;
        padding: 9px 10px;
        background: var(--bg-3);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-1);
        font-size: 13px;
        transition: all 0.2s ease;

        &:hover { border-color: var(--accent-border); }
        &:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(124,90,245,.15);
        }
      }
    }

    .orientation-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-top: 8px;
    }

    .orient-btn {
      padding: 10px 6px 8px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-2);
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      font-weight: 500;

      &:hover {
        background: var(--bg-hover);
        border-color: var(--accent-border);
        transform: translateY(-1px);
      }

      &.active {
        background: var(--accent-dim);
        border-color: var(--accent-border);
        color: var(--accent-3);
        box-shadow: 0 2px 6px rgba(124,90,245,.15);
      }
    }

    .orient-icon {
      width: 24px;
      border: 2px solid currentColor;
      border-radius: 3px;
      opacity: 0.7;

      &.portrait {
        height: 34px;
      }

      &.landscape {
        height: 18px;
      }
    }

    .size-display {
      font-size: 12px;
      color: var(--text-3);
      font-family: 'JetBrains Mono', monospace;
      margin-top: 8px;
      text-align: center;
      padding: 6px;
      background: var(--bg-2);
      border-radius: 6px;
    }

    .upload-area {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      border: 2px dashed var(--border-2);
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-3);
      text-align: center;
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

      &:hover {
        border-color: var(--accent-border);
        color: var(--accent-3);
        background: var(--accent-dim);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(124,90,245,.1);
      }

      &.has-image {
        border-color: var(--success);
        color: var(--success);
        background: rgba(34,211,160,0.08);
        border-style: solid;
      }

      .upload-icon {
        font-weight: 700;
        font-size: 16px;
      }
    }

    .has-bg {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      justify-content: space-between;
      width: 100%;
    }

    .remove-bg-btn {
      background: var(--bg-4);
      border: none;
      color: var(--error);
      cursor: pointer;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;

      &:hover {
        background: rgba(248,113,113,.15);
        transform: scale(1.05);
      }
    }

    .tools-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .tool-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 8px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-2);
      font-size: 11px;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-weight: 500;

      .tool-icon {
        font-size: 18px;
        font-weight: 700;
        color: var(--accent-2);
        transition: transform 0.2s ease;
      }

      &:hover {
        background: var(--bg-hover);
        border-color: var(--accent-border);
        color: var(--text-1);
        transform: translateY(-1px);

        .tool-icon {
          transform: scale(1.15);
        }
      }

      &.active {
        background: var(--accent-dim);
        border-color: var(--accent-border);
        color: var(--accent-3);
        box-shadow: 0 2px 8px rgba(124,90,245,.15);
      }
    }

    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;

      span {
        font-size: 13px;
        color: var(--text-2);
        font-weight: 500;
      }
    }

    .toggle {
      position: relative;
      width: 46px;
      height: 24px;
      display: inline-block;

      input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-4);
        transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border-radius: 24px;

        &:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      }

      input:checked + .slider {
        background-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(124,90,245,.2);
      }

      input:checked + .slider:before {
        transform: translateX(22px);
      }
    }

    .element-types {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .el-type-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-2);
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-weight: 500;

      .el-icon {
        font-size: 20px;
        font-weight: 700;
        color: var(--accent-2);
        transition: transform 0.2s ease;
      }

      &:hover {
        background: var(--bg-hover);
        border-color: var(--accent-border);
        color: var(--text-1);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(124,90,245,.12);

        .el-icon {
          transform: scale(1.15);
        }
      }

      &:active {
        transform: translateY(0);
      }
    }

    .layers-section {
      overflow: hidden;
      flex: 1;
      padding-bottom: 0;
    }

    .layers-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 2px 0 8px;
      margin: 0 -4px;
    }

    .layer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      margin: 0 4px;

      &:hover {
        background: var(--bg-3);
        transform: translateX(2px);
      }

      &.active {
        background: linear-gradient(135deg, var(--accent-dim), rgba(124,90,245,.1));
        border-color: var(--accent-border);
        box-shadow: 0 2px 8px rgba(124,90,245,.1);
      }

      &.locked {
        opacity: 0.6;
      }
    }

    .layer-type-icon {
      font-size: 14px;
      flex-shrink: 0;
      width: 20px;
      text-align: center;
    }

    .layer-label {
      flex: 1;
      font-size: 13px;
      color: var(--text-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .layer-actions {
      display: flex;
      gap: 3px;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .layer-item:hover .layer-actions,
    .layer-item.active .layer-actions {
      opacity: 1;
    }

    .la-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
      border-radius: 6px;
      color: var(--text-3);
      line-height: 1;
      transition: all 0.15s ease;

      &:hover {
        color: var(--text-1);
        background: var(--bg-4);
        transform: scale(1.1);
      }

      &.muted {
        opacity: 0.3;
      }

      &.danger:hover {
        color: var(--error);
        background: rgba(248,113,113,.1);
      }
    }

    .empty-layers {
      text-align: center;
      padding: 32px 20px;
      color: var(--text-3);
      font-size: 13px;
      line-height: 1.8;

      p:first-child {
        font-size: 14px;
        color: var(--text-2);
        font-weight: 500;
        margin-bottom: 4px;
      }
    }

    .palette-footer {
      display: flex;
      gap: 6px;
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-2);

      .btn {
        flex: 1;
        padding: 10px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-1px);
        }

        &:active {
          transform: translateY(0);
        }
      }
    }

    .hint {
      font-size: 12px;
      color: var(--text-3);
      line-height: 1.5;
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

    /* Scrollbar styling */
    .layers-list::-webkit-scrollbar {
      width: 6px;
    }

    .layers-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .layers-list::-webkit-scrollbar-thumb {
      background: var(--border);
      border-radius: 3px;

      &:hover {
        background: var(--text-3);
      }
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

  get isLandscape(): boolean {
    return this.editorService.page.width > this.editorService.page.height;
  }

  setOrientation(mode: 'portrait' | 'landscape') {
    const currentW = this.editorService.page.width;
    const currentH = this.editorService.page.height;
    if ((mode === 'landscape' && currentW < currentH) || (mode === 'portrait' && currentW > currentH)) {
      this.editorService.updatePage({ width: currentH, height: currentW });
    }
  }

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
    this.subs.add(this.editorService.activeTool$.subscribe(() => {
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
    const icons: Record<string, string> = {
      'text': 'T',
      'image': '🖼',
      'rectangle': '▭',
      'roundrect': '⧫',
      'line': '─',
      'ellipse': '◯',
      'table': '▦',
      'qrcode': '▣',
      'list': '☰',
      'columns': '≡',
      'svg': '◇',
    };
    return icons[type] || '?';
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
