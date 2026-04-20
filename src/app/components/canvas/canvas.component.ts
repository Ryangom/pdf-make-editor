import {
  Component, OnInit, OnDestroy, HostListener, ViewChild,
  ElementRef, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { EditorElement, Template, PageSettings } from '../../models/editor.models';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="canvas-area" #canvasArea
      [class.tool-hand]="activeTool === 'hand'"
      [class.is-panning]="isPanning"
      (mousedown)="onCanvasAreaMouseDown($event)"
      (dragover)="onDragOver($event)" (drop)="onDrop($event)">
      <!-- Rulers -->
      <div class="ruler ruler-top">
        <span *ngFor="let mark of horizontalMarks" [style.left.px]="mark.pos" class="ruler-mark">{{mark.label}}</span>
      </div>
      <div class="ruler ruler-left">
        <span *ngFor="let mark of verticalMarks" [style.top.px]="mark.pos" class="ruler-mark">{{mark.label}}</span>
      </div>

      <!-- Page canvas wrapper (handles the scaling) -->
      <div class="page-wrapper" [style.transform]="'translate(' + panOffsetX + 'px, ' + panOffsetY + 'px)'">
        <div
          class="page"
          #pageEl
          [class.no-select]="isDragging || isResizing"
          [style.width.px]="currentPageSettings.width"
          [style.height.px]="currentPageSettings.height"
          [style.transform]="'scale(' + scale + ')'"
          [style.transformOrigin]="'center center'"
          (mousedown)="onPageMouseDown($event)"
          (click)="onPageClick($event)"
          [class.hand-cursor]="activeTool === 'hand'">

          <!-- Background image -->
          <img *ngIf="currentPageSettings.backgroundImage"
               [src]="currentPageSettings.backgroundImage"
               class="bg-image"
               alt="background" />

          <!-- Empty state hint -->
          <div *ngIf="!currentPageSettings.backgroundImage && currentElements.length === 0" class="empty-hint">
            <div class="empty-icon">⊕</div>
            <p>Upload a background image</p>
            <p class="sub">or add elements from the left panel</p>
          </div>

          <!-- Elements -->
          <div
            *ngFor="let el of currentElements; trackBy: trackById"
            class="element"
            [class.selected]="selectedId === el.id"
            [class.locked]="el.locked"
            [class.hidden-el]="!el.visible"
            [style.left.px]="el.x"
            [style.top.px]="el.y"
            [style.width.px]="el.width"
            [style.height.px]="el.height"
            [style.opacity]="el.style.opacity"
            [style.zIndex]="currentElements.indexOf(el)"
            (mousedown)="onElementMouseDown($event, el)"
            (click)="$event.stopPropagation()"
            [style.cursor]="activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : (el.locked ? 'not-allowed' : 'move')">

            <!-- TEXT -->
             <div *ngIf="el.type === 'text'"
                  class="el-text"
                  [style.fontSize.px]="el.style.fontSize"
                  [style.fontWeight]="el.style.bold ? 700 : 400"
                  [style.fontStyle]="el.style.italic ? 'italic' : 'normal'"
                  [style.textAlign]="el.style.alignment"
                  [style.color]="el.style.color"
                  [style.lineHeight]="el.style.lineHeight"
                  [style.backgroundColor]="el.style.backgroundColor"
                  [style.fontFamily]="getFontFamily(el.style.fontFamily)"
                  style="padding: 0; margin: 0; white-space: pre; line-height: 1.2;">
               {{ resolvePreview(el.content) }}
             </div>

            <!-- IMAGE -->
            <div *ngIf="el.type === 'image'" class="el-image-wrap">
              <img *ngIf="el.content" [src]="el.content" class="el-image" alt="element image" />
              <div *ngIf="!el.content" class="el-image-placeholder">
                <span>🖼️</span>
                <small>No image</small>
              </div>
            </div>

            <!-- RECTANGLE -->
            <div *ngIf="el.type === 'rectangle'"
                 class="el-rect"
                 [style.backgroundColor]="el.style.backgroundColor"
                 [style.borderWidth.px]="el.style.borderWidth"
                 [style.borderColor]="el.style.borderColor"
                 [style.borderStyle]="el.style.borderWidth > 0 ? 'solid' : 'none'">
            </div>

            <!-- ROUND RECTANGLE -->
            <div *ngIf="el.type === 'roundrect'"
                 class="el-rect"
                 [style.backgroundColor]="el.style.backgroundColor"
                 [style.borderWidth.px]="el.style.borderWidth"
                 [style.borderColor]="el.style.borderColor"
                 [style.borderStyle]="el.style.borderWidth > 0 ? 'solid' : 'none'"
                 [style.borderRadius.px]="el.style.borderRadius">
            </div>

            <!-- LINE -->
            <div *ngIf="el.type === 'line'"
                 class="el-line"
                 [style.backgroundColor]="el.style.lineColor"
                 [style.height.px]="el.style.lineWidth || 2"
                 [style.borderTop]="el.style.lineDash > 0 ? el.style.lineDash + 'px dashed ' + el.style.lineColor : 'none'">
            </div>

            <!-- ELLIPSE -->
            <div *ngIf="el.type === 'ellipse'"
                 class="el-ellipse"
                 [style.backgroundColor]="el.style.backgroundColor"
                 [style.borderWidth.px]="el.style.borderWidth"
                 [style.borderColor]="el.style.borderColor"
                 [style.borderStyle]="el.style.borderWidth > 0 ? 'solid' : 'none'">
            </div>

            <!-- TABLE -->
            <div *ngIf="el.type === 'table'" class="el-table">
              <table>
                <tr *ngFor="let row of el.tableData?.cells; let ri = index">
                  <td *ngFor="let cell of row"
                      [style.fontSize.px]="cell.fontSize || 10"
                      [style.fontWeight]="cell.bold ? 'bold' : 'normal'"
                      [style.textAlign]="cell.alignment || 'center'">
                    {{ cell.text }}
                  </td>
                </tr>
              </table>
            </div>

            <!-- QR CODE -->
            <div *ngIf="el.type === 'qrcode'" class="el-qrcode">
              <div class="qr-placeholder">▣</div>
              <span class="qr-label">{{ resolvePreview(el.content) }}</span>
            </div>

            <!-- LIST -->
            <div *ngIf="el.type === 'list'" class="el-list">
              <ul *ngIf="el.listType === 'ul'" [style.listStyleType]="el.listStyle || 'disc'" [style.color]="el.listMarkerColor">
                <li *ngFor="let item of el.listItems">{{ item.text }}</li>
              </ul>
              <ol *ngIf="el.listType === 'ol'" [style.listStyleType]="el.listStyle || 'decimal'" [style.color]="el.listMarkerColor">
                <li *ngFor="let item of el.listItems">{{ item.text }}</li>
              </ol>
            </div>

            <!-- COLUMNS -->
            <div *ngIf="el.type === 'columns'" class="el-columns" [style.gap.px]="el.columnGap || 20">
              <div *ngFor="let col of el.columnDefs" class="el-col">
                <span [style.fontSize.px]="col.fontSize" [style.color]="col.color" [style.fontWeight]="col.bold ? 'bold' : 'normal'">{{ resolvePreview(col.text) }}</span>
              </div>
            </div>

            <!-- SVG -->
            <div *ngIf="el.type === 'svg'" class="el-svg" [innerHTML]="el.content"></div>

            <!-- Selection handles (only when selected and not locked) -->
            <ng-container *ngIf="selectedId === el.id && !el.locked">
              <div class="resize-handle nw" (mousedown)="onResizeMouseDown($event, el, 'nw')"></div>
              <div class="resize-handle n"  (mousedown)="onResizeMouseDown($event, el, 'n')"></div>
              <div class="resize-handle ne" (mousedown)="onResizeMouseDown($event, el, 'ne')"></div>
              <div class="resize-handle e"  (mousedown)="onResizeMouseDown($event, el, 'e')"></div>
              <div class="resize-handle se" (mousedown)="onResizeMouseDown($event, el, 'se')"></div>
              <div class="resize-handle s"  (mousedown)="onResizeMouseDown($event, el, 's')"></div>
              <div class="resize-handle sw" (mousedown)="onResizeMouseDown($event, el, 'sw')"></div>
              <div class="resize-handle w"  (mousedown)="onResizeMouseDown($event, el, 'w')"></div>
              <!-- Element label -->
              <div class="el-label">{{ el.label }}</div>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Zoom controls -->
      <div class="zoom-controls">
        <button class="btn btn-icon zoom-btn" (click)="zoomOut()" title="Zoom out">−</button>
        <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
        <button class="btn btn-icon zoom-btn" (click)="zoomIn()" title="Zoom in">+</button>
        <button class="btn btn-icon zoom-btn" (click)="fitToView()" title="Fit to view" style="font-size:10px">FIT</button>
      </div>

      <!-- Page Navigation (when multi-page) -->
      <div *ngIf="template.hasBackPage" class="page-navigation">
        <button class="page-nav-btn" [class.active]="currentPageIndex === 0" (click)="switchToPage(0)">
          <span class="page-icon">📄</span>
          <span>Front</span>
        </button>
        <button class="page-nav-btn" [class.active]="currentPageIndex === 1" (click)="switchToPage(1)">
          <span class="page-icon">📄</span>
          <span>Back</span>
        </button>
      </div>

      <!-- Page info bar -->
      <div class="page-info">
        <span>{{ template.name }}</span>
        <span class="sep">·</span>
        <span *ngIf="template.hasBackPage">{{ currentPageName }} · </span>
        <span>{{ currentPageSettings.width }} × {{ currentPageSettings.height }} pts</span>
        <span *ngIf="selectedElement" class="sep">·</span>
        <span *ngIf="selectedElement">
          x:{{ Math.round(selectedElement.x) }} y:{{ Math.round(selectedElement.y) }}
          w:{{ Math.round(selectedElement.width) }} h:{{ Math.round(selectedElement.height) }}
        </span>
      </div>
    </div>
  `,
  styles: [`
    .canvas-area {
      flex: 1;
      position: relative;
      overflow: auto;
      background: linear-gradient(135deg, #0b0b12 0%, #0f0f18 50%, #11111b 100%);
      background-image:
        radial-gradient(circle at 24px 24px, rgba(124,90,245,0.04) 1px, transparent 0);
      background-size: 24px 24px;
      cursor: default;

      &.tool-hand {
        cursor: grab;
      }
      &.is-panning {
        cursor: grabbing !important;
        user-select: none;
      }
    }

    .ruler {
      position: absolute;
      background: #141420;
      border-color: rgba(255,255,255,0.08);
      z-index: 10;
      font-size: 9px;
      color: rgba(255,255,255,0.3);
      font-family: 'JetBrains Mono', monospace;
      pointer-events: none;
    }

    .ruler-top {
      top: 0;
      left: 20px;
      right: 0;
      height: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      z-index: 15;
    }

    .ruler-left {
      position: absolute;
      left: 0;
      top: 24px;
      bottom: 0;
      width: 24px;
      border-right: 1px solid rgba(255,255,255,0.08);
      z-index: 15;
    }

    .ruler-mark {
      position: absolute;
      transform: translateX(-50%);
    }

    .page-wrapper {
      position: absolute;
      top: 24px;
      left: 24px;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      will-change: transform;
    }

    .page {
      position: relative;
      background: #ffffff;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.1),
        0 8px 32px rgba(0,0,0,0.4),
        0 32px 100px rgba(0,0,0,0.55);
      flex-shrink: 0;
      overflow: hidden;
      cursor: default;
      border-radius: 4px;
      transition: box-shadow 0.3s ease;
    }

    .bg-image {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: fill;
      pointer-events: none;
      user-select: none;
    }

    .empty-hint {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: rgba(0,0,0,0.2);
      pointer-events: none;

      .empty-icon {
        font-size: 48px;
        opacity: 0.4;
      }

      p {
        font-size: 14px;
        font-weight: 500;
      }

      .sub {
        font-size: 12px;
        opacity: 0.6;
      }
    }

    .element {
      position: absolute;
      cursor: move;
      user-select: none;
      box-sizing: border-box;

      &.selected {
        outline: 2px solid #7c5af5;
        outline-offset: 1px;
      }

      &.locked { cursor: not-allowed; opacity: 0.7; }
      &.hidden-el { opacity: 0.3; }
    }

    .hand-cursor {
      cursor: grab;
    }

    .el-text {
      width: 100%;
      height: 100%;
      overflow: hidden;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .el-image-wrap {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .el-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .el-image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(124,90,245,0.1);
      border: 2px dashed rgba(124,90,245,0.4);
      gap: 4px;
      font-size: 24px;
      color: rgba(124,90,245,0.5);

      small { font-size: 10px; }
    }

    .el-rect {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    /* Line element */
    .el-line {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
    }

    /* Ellipse element */
    .el-ellipse {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      box-sizing: border-box;
    }

    /* Table element */
    .el-table {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-size: 10px;
    }
    .el-table table {
      width: 100%;
      height: 100%;
      border-collapse: collapse;
    }
    .el-table td {
      border: 1px solid #ccc;
      padding: 4px;
    }

    /* QR Code element */
    .el-qrcode {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f8f8f8;
    }
    .el-qrcode .qr-placeholder {
      font-size: 48px;
      color: #ccc;
    }
    .el-qrcode .qr-label {
      font-size: 10px;
      color: #666;
      margin-top: 4px;
    }

    /* List element */
    .el-list {
      width: 100%;
      height: 100%;
      padding: 4px;
      font-size: 12px;
    }
    .el-list ul, .el-list ol {
      margin: 0;
      padding-left: 20px;
    }

    /* Columns element */
    .el-columns {
      width: 100%;
      height: 100%;
      display: flex;
    }
    .el-col {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      font-size: 12px;
    }

    /* SVG element */
    .el-svg {
      width: 100%;
      height: 100%;
    }
    .el-svg svg {
      width: 100%;
      height: 100%;
    }

    /* Resize handles */
    .resize-handle {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #fff;
      border: 2px solid #7c5af5;
      border-radius: 3px;
      z-index: 100;
      box-shadow: 0 2px 6px rgba(124,90,245,0.4);
      transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);

      &:hover {
        transform: scale(1.3);
        box-shadow: 0 3px 10px rgba(124,90,245,0.5);
      }

      &.nw { top: -6px; left: -6px; cursor: nw-resize; }
      &.n  { top: -6px; left: calc(50% - 6px); cursor: n-resize; }
      &.ne { top: -6px; right: -6px; cursor: ne-resize; }
      &.e  { top: calc(50% - 6px); right: -6px; cursor: e-resize; }
      &.se { bottom: -6px; right: -6px; cursor: se-resize; }
      &.s  { bottom: -6px; left: calc(50% - 6px); cursor: s-resize; }
      &.sw { bottom: -6px; left: -6px; cursor: sw-resize; }
      &.w  { top: calc(50% - 6px); left: -6px; cursor: w-resize; }
    }

    .el-label {
      position: absolute;
      top: -22px;
      left: 0;
      background: #7c5af5;
      color: #fff;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px 4px 0 0;
      white-space: nowrap;
      pointer-events: none;
    }

    .no-select { user-select: none; }

    /* Zoom controls */
    .zoom-controls {
      position: fixed;
      bottom: 28px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 4px;
      background: rgba(15, 15, 24, 0.9);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 4px 8px;
    }

    .zoom-btn {
      width: 28px;
      height: 28px;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.6);
      cursor: pointer;
      &:hover { background: rgba(255,255,255,0.1); color: #fff; }
    }

    .zoom-label {
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      color: rgba(255,255,255,0.5);
      min-width: 42px;
      text-align: center;
    }

    /* Page info */
    /* Page Navigation */
    .page-navigation {
      position: fixed;
      top: 20px;
      right: 280px;
      display: flex;
      gap: 4px;
      background: rgba(15, 15, 24, 0.9);
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 4px;
      z-index: 1000;
    }

    .page-nav-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: rgba(255,255,255,0.6);
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: all 0.15s;

      &:hover { background: rgba(255,255,255,0.1); color: #fff; }
      &.active {
        background: var(--accent);
        color: #fff;
      }

      .page-icon { font-size: 14px; }
    }

    .page-info {
      position: fixed;
      bottom: 12px;
      left: 276px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      font-family: 'JetBrains Mono', monospace;
      pointer-events: none;
      background: rgba(15, 15, 24, 0.8);
      backdrop-filter: blur(8px);
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);

      .sep { opacity: 0.3; }
    }
  `]
})
export class CanvasComponent implements OnInit, OnDestroy {
  @ViewChild('canvasArea', { static: true }) canvasAreaRef!: ElementRef<HTMLDivElement>;
  @ViewChild('pageEl') pageElRef?: ElementRef<HTMLDivElement>;

  template!: Template;
  selectedId: string | null = null;
  scale = 1;
  Math = Math;
  activeTool: 'select' | 'hand' = 'select';
  isPanning = false;
  panOffsetX = 0;
  panOffsetY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private panOriginX = 0;
  private panOriginY = 0;

  get currentPageIndex(): number {
    return this.template.currentPageIndex || 0;
  }

  get currentPageName(): string {
    if (this.template.pages && this.template.pages[this.currentPageIndex]) {
      return this.template.pages[this.currentPageIndex].name;
    }
    return 'Front';
  }

  get currentElements(): EditorElement[] {
    return this.editorService.elements;
  }

  get currentPageSettings(): PageSettings {
    if (this.template.pages && this.template.pages[this.currentPageIndex]) {
      return this.template.pages[this.currentPageIndex].settings;
    }
    return this.template.page; // fallback for backward compatibility
  }

  get currentBackgroundImage(): string {
    return this.currentPageSettings.backgroundImage;
  }

  pagePaddingV = 40;
  pagePaddingH = 40;

  // Drag state
  isDragging = false;
  private dragEl: EditorElement | null = null;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartElX = 0;
  private dragStartElY = 0;

  // Resize state
  isResizing = false;
  private resizeEl: EditorElement | null = null;
  private resizeHandle: ResizeHandle | null = null;
  private resizeStartMouseX = 0;
  private resizeStartMouseY = 0;
  private resizeStartEl = { x: 0, y: 0, w: 0, h: 0 };

  private subs = new Subscription();
  private previewRecord: Record<string, string> = {};

  get selectedElement(): EditorElement | null {
    return this.currentElements.find(e => e.id === this.selectedId) ?? null;
  }

  get horizontalMarks() {
    const marks = [];
    for (let i = 0; i <= this.currentPageSettings.width; i += 50) {
      marks.push({ pos: this.pagePaddingH + 20 + i * this.scale, label: i });
    }
    return marks;
  }

  get verticalMarks() {
    const marks = [];
    for (let i = 0; i <= this.currentPageSettings.height; i += 50) {
      marks.push({ pos: this.pagePaddingV + 20 + i * this.scale, label: i });
    }
    return marks;
  }

  constructor(
    private editorService: EditorService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.subs.add(this.editorService.template$.subscribe(t => {
      this.template = t;
      this.cdr.markForCheck();
    }));
    this.subs.add(this.editorService.selectedId$.subscribe(id => {
      this.selectedId = id;
      this.cdr.markForCheck();
    }));
    this.subs.add(this.editorService.bulkData$.subscribe(records => {
      this.previewRecord = records[0] ?? {};
      this.cdr.markForCheck();
    }));

    setTimeout(() => this.fitToView(), 100);

    this.subs.add(this.editorService.activeTool$.subscribe(tool => {
      this.activeTool = tool;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // ─── Zoom ──────────────────────────────────────────────────────────────────
  fitToView() {
    const area = this.canvasAreaRef.nativeElement;
    const viewW = area.clientWidth - 24;
    const viewH = area.clientHeight - 24;
    const scaleX = (viewW - 80) / this.currentPageSettings.width;
    const scaleY = (viewH - 80) / this.currentPageSettings.height;
    this.scale = Math.min(scaleX, scaleY, 1.5);
    this.panOffsetX = 0;
    this.panOffsetY = 0;
    this.cdr.markForCheck();
  }

  zoomIn() { this.scale = Math.min(this.scale * 1.2, 3); this.cdr.markForCheck(); }
  zoomOut() { this.scale = Math.max(this.scale / 1.2, 0.1); this.cdr.markForCheck(); }

  @HostListener('wheel', ['$event'])
  onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const area = this.canvasAreaRef.nativeElement;
      const rect = area.getBoundingClientRect();
      const viewW = rect.width - 24;
      const viewH = rect.height - 24;
      // Cursor position relative to the page center (in screen pixels)
      const relX = (e.clientX - rect.left - 24 - viewW / 2) - this.panOffsetX;
      const relY = (e.clientY - rect.top - 24 - viewH / 2) - this.panOffsetY;
      const oldScale = this.scale;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.scale = Math.min(Math.max(this.scale * factor, 0.1), 5);
      const ratio = this.scale / oldScale;
      // Shift pan so the point under the cursor stays fixed
      this.panOffsetX -= relX * (ratio - 1);
      this.panOffsetY -= relY * (ratio - 1);
      this.cdr.markForCheck();
    }
  }

  // ─── Canvas Area MouseDown (hand panning on empty area) ──────────────────
  onCanvasAreaMouseDown(e: MouseEvent) {
    // Only start pan if clicking directly on canvas backdrop (not on page/elements)
    if (this.activeTool === 'hand') {
      this.startPan(e);
    }
  }

  // ─── Canvas Click (deselect) ───────────────────────────────────────────────
  onPageClick(e: MouseEvent) {
    if (this.activeTool === 'hand') return; // hand tool: never deselect
    if (!this.isDragging && !this.isResizing) {
      this.editorService.selectElement(null);
    }
  }

  onPageMouseDown(e: MouseEvent) {
    if (this.activeTool === 'hand') {
      e.stopPropagation(); // prevent canvas-area from firing twice
      this.startPan(e);
    }
  }

  // ─── Pan Helpers ───────────────────────────────────────────────────────────
  private startPan(e: MouseEvent) {
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.panOriginX = this.panOffsetX;
    this.panOriginY = this.panOffsetY;
    e.preventDefault();
  }

  // ─── Element Drag ──────────────────────────────────────────────────────────
  onElementMouseDown(e: MouseEvent, el: EditorElement) {
    // In hand mode, pan instead of selecting
    if (this.activeTool === 'hand') {
      e.stopPropagation();
      this.startPan(e);
      return;
    }

    e.stopPropagation();
    this.editorService.selectElement(el.id);
    if (el.locked) return;

    this.isDragging = true;
    this.dragEl = el;
    this.dragStartMouseX = e.clientX;
    this.dragStartMouseY = e.clientY;
    this.dragStartElX = el.x;
    this.dragStartElY = el.y;
    e.preventDefault();
  }

  // ─── Resize ────────────────────────────────────────────────────────────────
  onResizeMouseDown(e: MouseEvent, el: EditorElement, handle: ResizeHandle) {
    e.stopPropagation();
    this.isResizing = true;
    this.resizeEl = el;
    this.resizeHandle = handle;
    this.resizeStartMouseX = e.clientX;
    this.resizeStartMouseY = e.clientY;
    this.resizeStartEl = { x: el.x, y: el.y, w: el.width, h: el.height };
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    // Pan (hand tool)
    if (this.isPanning) {
      this.panOffsetX = this.panOriginX + (e.clientX - this.panStartX);
      this.panOffsetY = this.panOriginY + (e.clientY - this.panStartY);
      this.cdr.markForCheck();
      return;
    }

    if (this.isDragging && this.dragEl) {
      const dx = (e.clientX - this.dragStartMouseX) / this.scale;
      const dy = (e.clientY - this.dragStartMouseY) / this.scale;
      const newX = Math.max(0, Math.min(this.dragStartElX + dx, this.currentPageSettings.width - this.dragEl.width));
      const newY = Math.max(0, Math.min(this.dragStartElY + dy, this.currentPageSettings.height - this.dragEl.height));
      this.editorService.updateElement(this.dragEl.id, { x: newX, y: newY });
      return;
    }

    if (this.isResizing && this.resizeEl && this.resizeHandle) {
      const dx = (e.clientX - this.resizeStartMouseX) / this.scale;
      const dy = (e.clientY - this.resizeStartMouseY) / this.scale;
      const s = this.resizeStartEl;
      const MIN = 20;
      let { x, y, w, h } = s;

      const h_str = this.resizeHandle;
      if (h_str.includes('e')) { w = Math.max(MIN, s.w + dx); }
      if (h_str.includes('w')) { x = s.x + dx; w = Math.max(MIN, s.w - dx); if (w === MIN) x = s.x + s.w - MIN; }
      if (h_str.includes('s')) { h = Math.max(MIN, s.h + dy); }
      if (h_str.includes('n')) { y = s.y + dy; h = Math.max(MIN, s.h - dy); if (h === MIN) y = s.y + s.h - MIN; }

      this.editorService.updateElement(this.resizeEl.id, { x, y, width: w, height: h });
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isPanning = false;
    if (this.isDragging) { this.editorService['snapshot']?.(); }
    this.isDragging = false;
    this.isResizing = false;
    this.dragEl = null;
    this.resizeEl = null;
    this.resizeHandle = null;
    this.cdr.markForCheck();
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Tool switching — like Figma
    if (e.key === 'v' || e.key === 'V') { this.editorService.setActiveTool('select'); return; }
    if (e.key === 'h' || e.key === 'H') { this.editorService.setActiveTool('hand'); return; }

    // Space bar = temporary hand tool (Figma behaviour)
    if (e.code === 'Space' && !e.repeat && this.activeTool === 'select') {
      this._previousTool = 'select';
      this.editorService.setActiveTool('hand');
      e.preventDefault();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedId) {
        e.preventDefault();
        this.editorService.deleteElement(this.selectedId);
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); this.editorService.undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); this.editorService.redo(); }

    // Arrow keys to nudge
    if (this.selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const el = this.selectedElement;
      if (!el) return;
      const step = e.shiftKey ? 10 : 1;
      const updates: Partial<EditorElement> = {};
      if (e.key === 'ArrowUp') updates.y = el.y - step;
      if (e.key === 'ArrowDown') updates.y = el.y + step;
      if (e.key === 'ArrowLeft') updates.x = el.x - step;
      if (e.key === 'ArrowRight') updates.x = el.x + step;
      this.editorService.updateElement(this.selectedId, updates);
    }
  }

  // Release Space bar → restore previous tool
  @HostListener('document:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space' && this._previousTool) {
      this.editorService.setActiveTool(this._previousTool);
      this._previousTool = null;
    }
  }

  private _previousTool: 'select' | 'hand' | null = null;

  // ─── Drag-over for file drop ───────────────────────────────────────────────
  onDragOver(e: DragEvent) { e.preventDefault(); }

  onDrop(e: DragEvent) {
    e.preventDefault();

    // Check if it's an element being dragged from palette (data transfer has element type)
    const elementType = e.dataTransfer?.getData('text/plain');
    if (elementType && ['text', 'image', 'rectangle', 'roundrect', 'line', 'ellipse', 'table', 'qrcode', 'list', 'columns', 'svg'].includes(elementType)) {
      // Calculate correct drop position on page, accounting for scale and pan
      const pageRect = this.pageElRef?.nativeElement.getBoundingClientRect();
      if (pageRect) {
        const dropX = (e.clientX - pageRect.left) / this.scale;
        const dropY = (e.clientY - pageRect.top) / this.scale;

        // Add element at correct position
        this.editorService.addElementAt(elementType as any, Math.max(0, dropX), Math.max(0, dropY));
      }
      return;
    }

    // Handle background image file drop
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => {
        if (typeof ev.target?.result === 'string') {
          this.editorService.setBackgroundImage(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  trackById(_: number, el: EditorElement) { return el.id; }

  resolvePreview(content: string): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, k) => this.previewRecord[k] ?? `{${k}}`);
  }

  getFontFamily(font: string): string {
    const map: Record<string, string> = {
      'Helvetica': 'Helvetica, Arial, sans-serif',
      'Helvetica-Bold': 'Helvetica, Arial, sans-serif',
      'Times': 'Times New Roman, serif',
      'Times-Bold': 'Times New Roman, serif',
      'Courier': 'Courier New, monospace',
      'Courier-Bold': 'Courier New, monospace',
    };
    return map[font] ?? font;
  }

  switchToPage(index: number) {
    this.editorService.switchToPage(index);
  }
}
