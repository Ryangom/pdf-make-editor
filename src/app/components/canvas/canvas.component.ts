import {
  Component, OnInit, OnDestroy, HostListener, ViewChild,
  ElementRef, ChangeDetectorRef, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { EditorElement, Template } from '../../models/editor.models';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="canvas-area" #canvasArea (dragover)="onDragOver($event)" (drop)="onDrop($event)">
      <!-- Rulers -->
      <div class="ruler ruler-top">
        <span *ngFor="let mark of horizontalMarks" [style.left.px]="mark.pos" class="ruler-mark">{{mark.label}}</span>
      </div>
      <div class="ruler ruler-left">
        <span *ngFor="let mark of verticalMarks" [style.top.px]="mark.pos" class="ruler-mark">{{mark.label}}</span>
      </div>

      <!-- Page canvas wrapper (handles the scaling) -->
      <div class="page-wrapper" [style.paddingTop.px]="pagePaddingV" [style.paddingLeft.px]="pagePaddingH">
        <div
          class="page"
          #pageEl
          [class.no-select]="isDragging || isResizing"
          [style.width.px]="template.page.width"
          [style.height.px]="template.page.height"
          [style.transform]="'scale(' + scale + ')'"
          [style.transformOrigin]="'top left'"
          (mousedown)="onPageMouseDown($event)"
          (click)="onPageClick($event)">

          <!-- Background image -->
          <img *ngIf="template.page.backgroundImage"
               [src]="template.page.backgroundImage"
               class="bg-image"
               alt="background" />

          <!-- Empty state hint -->
          <div *ngIf="!template.page.backgroundImage && template.elements.length === 0" class="empty-hint">
            <div class="empty-icon">⊕</div>
            <p>Upload a background image</p>
            <p class="sub">or add elements from the left panel</p>
          </div>

          <!-- Elements -->
          <div
            *ngFor="let el of template.elements; trackBy: trackById"
            class="element"
            [class.selected]="selectedId === el.id"
            [class.locked]="el.locked"
            [class.hidden-el]="!el.visible"
            [style.left.px]="el.x"
            [style.top.px]="el.y"
            [style.width.px]="el.width"
            [style.height.px]="el.height"
            [style.opacity]="el.style.opacity"
            [style.zIndex]="template.elements.indexOf(el)"
            (mousedown)="onElementMouseDown($event, el)"
            (click)="$event.stopPropagation()">

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
                 [style.fontFamily]="getFontFamily(el.style.fontFamily)">
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

      <!-- Page info bar -->
      <div class="page-info">
        <span>{{ template.name }}</span>
        <span class="sep">·</span>
        <span>{{ template.page.width }} × {{ template.page.height }} pts</span>
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
      background: #0f0f18;
      background-image:
        radial-gradient(circle at 20px 20px, rgba(255,255,255,0.025) 1px, transparent 0);
      background-size: 20px 20px;
    }

    .ruler {
      position: sticky;
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
      left: 0;
      right: 0;
      height: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .ruler-left {
      position: absolute;
      left: 0;
      top: 20px;
      bottom: 0;
      width: 20px;
      border-right: 1px solid rgba(255,255,255,0.08);
    }

    .ruler-mark {
      position: absolute;
      transform: translateX(-50%);
    }

    .page-wrapper {
      min-width: 100%;
      min-height: 100%;
      display: flex;
      align-items: flex-start;
      justify-content: flex-start;
    }

    .page {
      position: relative;
      background: #ffffff;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 20px 80px rgba(0,0,0,0.8);
      flex-shrink: 0;
      overflow: hidden;
      cursor: default;
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

    /* Resize handles */
    .resize-handle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: #fff;
      border: 2px solid #7c5af5;
      border-radius: 2px;
      z-index: 100;

      &.nw { top: -5px; left: -5px; cursor: nw-resize; }
      &.n  { top: -5px; left: calc(50% - 5px); cursor: n-resize; }
      &.ne { top: -5px; right: -5px; cursor: ne-resize; }
      &.e  { top: calc(50% - 5px); right: -5px; cursor: e-resize; }
      &.se { bottom: -5px; right: -5px; cursor: se-resize; }
      &.s  { bottom: -5px; left: calc(50% - 5px); cursor: s-resize; }
      &.sw { bottom: -5px; left: -5px; cursor: sw-resize; }
      &.w  { top: calc(50% - 5px); left: -5px; cursor: w-resize; }
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
    .page-info {
      position: fixed;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      font-family: 'JetBrains Mono', monospace;
      pointer-events: none;

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
    return this.template?.elements.find(e => e.id === this.selectedId) ?? null;
  }

  get horizontalMarks() {
    const marks = [];
    for (let i = 0; i <= this.template.page.width; i += 50) {
      marks.push({ pos: this.pagePaddingH + 20 + i * this.scale, label: i });
    }
    return marks;
  }

  get verticalMarks() {
    const marks = [];
    for (let i = 0; i <= this.template.page.height; i += 50) {
      marks.push({ pos: this.pagePaddingV + 20 + i * this.scale, label: i });
    }
    return marks;
  }

  constructor(
    private editorService: EditorService,
    private cdr: ChangeDetectorRef
  ) {}

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
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  // ─── Zoom ──────────────────────────────────────────────────────────────────
  fitToView() {
    const area = this.canvasAreaRef.nativeElement;
    const w = area.clientWidth - this.pagePaddingH * 2 - 40;
    const h = area.clientHeight - this.pagePaddingV * 2 - 40;
    const scaleX = w / this.template.page.width;
    const scaleY = h / this.template.page.height;
    this.scale = Math.min(scaleX, scaleY, 1.5);
    this.cdr.markForCheck();
  }

  zoomIn() { this.scale = Math.min(this.scale * 1.2, 3); this.cdr.markForCheck(); }
  zoomOut() { this.scale = Math.max(this.scale / 1.2, 0.1); this.cdr.markForCheck(); }

  @HostListener('wheel', ['$event'])
  onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) this.zoomIn(); else this.zoomOut();
    }
  }

  // ─── Canvas Click (deselect) ───────────────────────────────────────────────
  onPageClick(e: MouseEvent) {
    if (!this.isDragging && !this.isResizing) {
      this.editorService.selectElement(null);
    }
  }

  onPageMouseDown(e: MouseEvent) {
    // Only if direct click on page bg
  }

  // ─── Element Drag ──────────────────────────────────────────────────────────
  onElementMouseDown(e: MouseEvent, el: EditorElement) {
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
    if (this.isDragging && this.dragEl) {
      const dx = (e.clientX - this.dragStartMouseX) / this.scale;
      const dy = (e.clientY - this.dragStartMouseY) / this.scale;
      const newX = Math.max(0, Math.min(this.dragStartElX + dx, this.template.page.width - this.dragEl.width));
      const newY = Math.max(0, Math.min(this.dragStartElY + dy, this.template.page.height - this.dragEl.height));
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
    if (this.isDragging) { this.editorService['snapshot']?.(); }
    this.isDragging = false;
    this.isResizing = false;
    this.dragEl = null;
    this.resizeEl = null;
    this.resizeHandle = null;
  }

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
      if (e.key === 'ArrowUp')    updates.y = el.y - step;
      if (e.key === 'ArrowDown')  updates.y = el.y + step;
      if (e.key === 'ArrowLeft')  updates.x = el.x - step;
      if (e.key === 'ArrowRight') updates.x = el.x + step;
      this.editorService.updateElement(this.selectedId, updates);
    }
  }

  // ─── Drag-over for file drop ───────────────────────────────────────────────
  onDragOver(e: DragEvent) { e.preventDefault(); }

  onDrop(e: DragEvent) {
    e.preventDefault();
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
}
