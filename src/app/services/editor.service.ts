import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  Template, EditorElement, ElementType, ElementStyle, PageData, PageSettings,
  DEFAULT_TEMPLATE, DEFAULT_STYLE, DataRecord
} from '../models/editor.models';

let elementCounter = 0;

@Injectable({ providedIn: 'root' })
export class EditorService {
  private _template = new BehaviorSubject<Template>(
    JSON.parse(JSON.stringify(DEFAULT_TEMPLATE))
  );
  private _selectedId = new BehaviorSubject<string | null>(null);
  private _bulkData = new BehaviorSubject<DataRecord[]>([]);
  private _history: Template[] = [];
  private _historyIndex = -1;

  template$ = this._template.asObservable();
  selectedId$ = this._selectedId.asObservable();
  bulkData$ = this._bulkData.asObservable();

  get template(): Template { return this._template.value; }
  get selectedId(): string | null { return this._selectedId.value; }
  get bulkData(): DataRecord[] { return this._bulkData.value; }

  // Multi-page support helpers
  get currentPage(): PageData {
    if (this.template.pages) {
      const index = this.template.currentPageIndex || 0;
      return this.template.pages[index] || this.template.pages[0];
    }
    // Fallback to legacy single-page format
    return {
      name: 'Front',
      settings: this.template.page,
      elements: this.template.elements
    };
  }

  get elements(): EditorElement[] {
    return this.currentPage.elements;
  }

  get page(): PageSettings {
    return this.currentPage.settings;
  }

  get selectedElement(): EditorElement | null {
    return this.elements.find(e => e.id === this.selectedId) ?? null;
  }

  // ─── Snapshot / Undo ───────────────────────────────────────────────────────
  private snapshot() {
    const clone = JSON.parse(JSON.stringify(this.template));
    this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(clone);
    if (this._history.length > 50) this._history.shift();
    this._historyIndex = this._history.length - 1;
  }

  undo() {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      this._template.next(JSON.parse(JSON.stringify(this._history[this._historyIndex])));
      this._selectedId.next(null);
    }
  }

  redo() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      this._template.next(JSON.parse(JSON.stringify(this._history[this._historyIndex])));
    }
  }

  // ─── Element Operations ────────────────────────────────────────────────────
  addElement(type: ElementType): EditorElement {
    this.snapshot();
    const id = `el_${++elementCounter}_${Date.now()}`;
    const baseStyle: ElementStyle = { ...DEFAULT_STYLE };

    let el: EditorElement;
    const cx = this.page.width / 2;
    const cy = this.page.height / 2;

    switch (type) {
      case 'text':
        el = {
          id, type, label: `Text ${elementCounter}`,
          x: cx - 100, y: cy - 15,
          width: 200, height: 30,
          content: '{{name}}',
          style: { ...baseStyle, fontSize: 18, color: '#1a1a2e', alignment: 'center' },
          locked: false, visible: true
        };
        break;

      case 'image':
        el = {
          id, type, label: `Image ${elementCounter}`,
          x: cx - 50, y: cy - 50,
          width: 100, height: 100,
          content: '',
          style: { ...baseStyle },
          locked: false, visible: true
        };
        break;

      case 'rectangle':
        el = {
          id, type, label: `Rectangle ${elementCounter}`,
          x: cx - 60, y: cy - 30,
          width: 120, height: 60,
          content: '',
          style: {
            ...baseStyle,
            backgroundColor: 'rgba(124,90,245,0.15)',
            borderColor: '#7c5af5',
            borderWidth: 2,
          },
          locked: false, visible: true
        };
        break;

      case 'roundrect':
        el = {
          id, type, label: `Round Shape ${elementCounter}`,
          x: cx - 60, y: cy - 30,
          width: 120, height: 60,
          content: '',
          style: {
            ...baseStyle,
            backgroundColor: 'rgba(124,90,245,0.15)',
            borderColor: '#7c5af5',
            borderWidth: 2,
            borderRadius: 20,
          },
          locked: false, visible: true
        };
        break;

      default:
        throw new Error(`Unknown element type: ${type}`);
    }

    if (this.template.pages) {
      // Multi-page mode
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) =>
        index === currentIndex
          ? { ...page, elements: [...page.elements, el] }
          : page
      );
      const t = { ...this.template, pages: updatedPages };
      this._template.next(t);
    } else {
      // Legacy single-page mode
      const t = { ...this.template, elements: [...this.template.elements, el] };
      this._template.next(t);
    }
    this._selectedId.next(id);
    return el;
  }

  updateElement(id: string, updates: Partial<EditorElement>) {
    if (this.template.pages) {
      // Multi-page mode
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) =>
        index === currentIndex
          ? { ...page, elements: page.elements.map(el => el.id === id ? { ...el, ...updates } : el) }
          : page
      );
      this._template.next({ ...this.template, pages: updatedPages });
    } else {
      // Legacy single-page mode
      const elements = this.template.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      );
      this._template.next({ ...this.template, elements });
    }
  }

  updateElementStyle(id: string, styleUpdates: Partial<ElementStyle>) {
    if (this.template.pages) {
      // Multi-page mode
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) =>
        index === currentIndex
          ? {
            ...page, elements: page.elements.map(el =>
              el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
            )
          }
          : page
      );
      this._template.next({ ...this.template, pages: updatedPages });
    } else {
      // Legacy single-page mode
      const elements = this.template.elements.map(el =>
        el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
      );
      this._template.next({ ...this.template, elements });
    }
  }

  deleteElement(id: string) {
    this.snapshot();
    if (this.template.pages) {
      // Multi-page mode
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) =>
        index === currentIndex
          ? { ...page, elements: page.elements.filter(e => e.id !== id) }
          : page
      );
      this._template.next({ ...this.template, pages: updatedPages });
    } else {
      // Legacy single-page mode
      const elements = this.template.elements.filter(e => e.id !== id);
      this._template.next({ ...this.template, elements });
    }
    if (this.selectedId === id) this._selectedId.next(null);
  }

  moveElementUp(id: string) {
    this.snapshot();
    if (this.template.pages) {
      // Multi-page mode
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) => {
        if (index === currentIndex) {
          const els = [...page.elements];
          const idx = els.findIndex(e => e.id === id);
          if (idx < els.length - 1) {
            [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
          }
          return { ...page, elements: els };
        }
        return page;
      });
      this._template.next({ ...this.template, pages: updatedPages });
    } else {
      // Legacy single-page mode
      const els = [...this.template.elements];
      const idx = els.findIndex(e => e.id === id);
      if (idx < els.length - 1) {
        [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
        this._template.next({ ...this.template, elements: els });
      }
    }
  }

  moveElementDown(id: string) {
    this.snapshot();
    if (this.template.pages) {
      // Multi-page mode
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) => {
        if (index === currentIndex) {
          const els = [...page.elements];
          const idx = els.findIndex(e => e.id === id);
          if (idx > 0) {
            [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]];
          }
          return { ...page, elements: els };
        }
        return page;
      });
      this._template.next({ ...this.template, pages: updatedPages });
    } else {
      // Legacy single-page mode
      const els = [...this.template.elements];
      const idx = els.findIndex(e => e.id === id);
      if (idx > 0) {
        [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]];
        this._template.next({ ...this.template, elements: els });
      }
    }
  }

  // ─── Page Operations ───────────────────────────────────────────────────────
  updatePage(updates: Partial<typeof this.template.page>) {
    this._template.next({ ...this.template, page: { ...this.template.page, ...updates } });
  }

  setBackgroundImage(dataUrl: string) {
    this.snapshot();
    if (this.template.pages) {
      // Multi-page mode - update current page's background
      const currentIndex = this.template.currentPageIndex || 0;
      const updatedPages = this.template.pages.map((page, index) =>
        index === currentIndex
          ? { ...page, settings: { ...page.settings, backgroundImage: dataUrl } }
          : page
      );
      this._template.next({ ...this.template, pages: updatedPages });
    } else {
      // Legacy single-page mode
      this.updatePage({ backgroundImage: dataUrl });
    }
  }

  updateTemplateName(name: string) {
    this._template.next({ ...this.template, name });
  }

  toggleBackPage(enabled: boolean) {
    this.snapshot();
    if (enabled) {
      // Enable back page - initialize pages array if not exists
      const frontPage = this.template.pages ? this.template.pages[0] : {
        name: 'Front',
        settings: { ...this.template.page },
        elements: [...this.template.elements]
      };
      const backPage = {
        name: 'Back',
        settings: { ...this.template.page },
        elements: []
      };
      const t = {
        ...this.template,
        pages: [frontPage, backPage],
        currentPageIndex: this.template.currentPageIndex || 0,
        hasBackPage: true
      };
      this._template.next(t);
    } else {
      // Disable back page - switch to single page mode
      const frontPage = this.template.pages ? this.template.pages[0] : null;
      const t = {
        ...this.template,
        page: frontPage ? frontPage.settings : this.template.page,
        elements: frontPage ? frontPage.elements : this.template.elements,
        pages: undefined,
        currentPageIndex: undefined,
        hasBackPage: false
      };
      this._template.next(t);
    }
  }

  switchToPage(index: number) {
    if (this.template.pages && index >= 0 && index < this.template.pages.length) {
      const t = { ...this.template, currentPageIndex: index };
      this._template.next(t);
      this._selectedId.next(null); // Clear selection when switching pages
    }
  }

  // ─── Selection ─────────────────────────────────────────────────────────────
  selectElement(id: string | null) {
    this._selectedId.next(id);
  }

  // ─── Bulk Data ─────────────────────────────────────────────────────────────
  setBulkData(records: DataRecord[]) {
    this._bulkData.next(records);
  }

  // ─── Import / Export ───────────────────────────────────────────────────────
  exportTemplate(): string {
    return JSON.stringify(this.template, null, 2);
  }

  importTemplate(json: string) {
    try {
      const t = JSON.parse(json) as Template;
      this._template.next(t);
      this._selectedId.next(null);
    } catch {
      throw new Error('Invalid template JSON');
    }
  }

  resetTemplate() {
    this.snapshot();
    this._template.next(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)));
    this._selectedId.next(null);
  }
}
