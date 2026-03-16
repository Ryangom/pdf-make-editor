import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ElementsPaletteComponent } from './components/elements-palette/elements-palette.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { DataPanelComponent } from './components/data-panel/data-panel.component';
import { CodeViewerComponent } from './components/code-viewer/code-viewer.component';
import { ReversePipe } from './pipes/reverse.pipe';

type BottomTab = 'data' | 'code';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolbarComponent,
    ElementsPaletteComponent,
    CanvasComponent,
    PropertiesPanelComponent,
    DataPanelComponent,
    CodeViewerComponent,
    ReversePipe,
  ],
  template: `
    <div class="app-shell">
      <!-- Top Toolbar -->
      <app-toolbar></app-toolbar>

      <!-- Main Content -->
      <div class="app-body">
        <!-- Left: Elements Palette + Layers -->
        <app-elements-palette></app-elements-palette>

        <!-- Center: Canvas + Bottom Panel -->
        <div class="center-column">
          <app-canvas class="canvas-flex"></app-canvas>

          <!-- Bottom Panel (resizable) -->
          <div class="bottom-panel" [class.collapsed]="bottomCollapsed" [style.height.px]="bottomCollapsed ? 40 : bottomHeight">
            <!-- Resize handle -->
            <div class="resize-bar" (mousedown)="startBottomResize($event)"></div>

            <!-- Tab bar -->
            <div class="bottom-tabs">
              <button class="btab" [class.active]="activeTab === 'data'" (click)="setTab('data')">
                <span class="btab-icon">⚙</span> Bulk Data
              </button>
              <button class="btab" [class.active]="activeTab === 'code'" (click)="setTab('code')">
                <span class="btab-icon">&lt;/&gt;</span> Code
              </button>
              <div class="btabs-spacer"></div>
              <button class="btab collapse-btn" (click)="toggleBottomPanel()" [title]="bottomCollapsed ? 'Expand' : 'Collapse'">
                {{ bottomCollapsed ? '▲' : '▼' }}
              </button>
            </div>

            <!-- Tab content -->
            <div class="bottom-content" *ngIf="!bottomCollapsed">
              <app-data-panel *ngIf="activeTab === 'data'"></app-data-panel>
              <app-code-viewer *ngIf="activeTab === 'code'"></app-code-viewer>
            </div>
          </div>
        </div>

        <!-- Right: Properties Panel -->
        <app-properties-panel></app-properties-panel>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }

    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-0);
    }

    .app-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }

    .center-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .canvas-flex {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    /* Bottom panel */
    .bottom-panel {
      flex-shrink: 0;
      background: var(--panel);
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      transition: height 0.2s ease;

      &.collapsed { height: 40px !important; }
    }

    .resize-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      cursor: row-resize;
      z-index: 10;

      &::after {
        content: '';
        display: block;
        position: absolute;
        top: 1px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 2px;
        background: var(--border-2);
        border-radius: 1px;
      }

      &:hover::after { background: var(--accent); }
    }

    .bottom-tabs {
      display: flex;
      align-items: center;
      height: 40px;
      padding: 0 4px 0 8px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .btab {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      height: 32px;
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-3);
      font-size: 12px;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      position: relative;

      .btab-icon {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--accent-2);
      }

      &:hover { color: var(--text-2); background: var(--bg-hover); }

      &.active {
        color: var(--text-1);
        background: var(--accent-dim);

        &::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent);
          border-radius: 1px 1px 0 0;
        }
      }

      &.collapse-btn {
        color: var(--text-3);
        font-size: 10px;
        width: 32px;
        padding: 0;
        justify-content: center;
      }
    }

    .btabs-spacer { flex: 1; }

    .bottom-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AppComponent {
  activeTab: BottomTab = 'data';
  bottomHeight = 320;
  bottomCollapsed = false;
  private resizingBottom = false;
  private resizeStartY = 0;
  private resizeStartHeight = 0;

  setTab(tab: BottomTab) {
    if (this.bottomCollapsed) {
      this.bottomCollapsed = false;
    }
    this.activeTab = tab;
  }

  toggleBottomPanel() {
    this.bottomCollapsed = !this.bottomCollapsed;
  }

  startBottomResize(e: MouseEvent) {
    e.preventDefault();
    this.resizingBottom = true;
    this.resizeStartY = e.clientY;
    this.resizeStartHeight = this.bottomHeight;

    const onMove = (ev: MouseEvent) => {
      if (!this.resizingBottom) return;
      const dy = this.resizeStartY - ev.clientY;
      this.bottomHeight = Math.max(100, Math.min(600, this.resizeStartHeight + dy));
    };

    const onUp = () => {
      this.resizingBottom = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }
}
