import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EditorService } from '../../services/editor.service';
import { EditorElement, ElementStyle, FONT_FAMILIES } from '../../models/editor.models';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="props-panel">
      <div class="props-header">
        <span>Properties</span>
        <span *ngIf="el" class="el-type-badge">{{ el.type }}</span>
      </div>

      <!-- No element selected -->
      <div *ngIf="!el" class="no-selection">
        <div class="no-sel-icon">✦</div>
        <p>Select an element</p>
        <p class="sub">to edit its properties</p>

        <!-- Page Settings when no element selected -->
        <div class="page-settings-section">
          <div class="section-title" style="margin-top: 20px;">Page Settings</div>

          <!-- Header -->
          <div class="panel-section" style="padding-bottom: 8px;">
            <div class="form-group full">
              <label>Header Text</label>
              <input type="text" [ngModel]="pageSettings.headerText || ''"
                (ngModelChange)="updatePage({headerText: $event})"
                placeholder="{{varPlaceholder}} - My Header" />
            </div>
            <div class="prop-grid">
              <div class="form-group">
                <label>Font Size</label>
                <input type="number" [ngModel]="pageSettings.headerFontSize || 12"
                  (ngModelChange)="updatePage({headerFontSize: +$event})" min="6" max="36" />
              </div>
              <div class="form-group">
                <label>Align</label>
                <select [ngModel]="pageSettings.headerAlignment || 'center'"
                  (ngModelChange)="updatePage({headerAlignment: $event})">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="panel-section" style="padding-bottom: 8px;">
            <div class="form-group full">
              <label>Footer Text</label>
              <input type="text" [ngModel]="pageSettings.footerText || ''"
                (ngModelChange)="updatePage({footerText: $event})"
                placeholder="Footer text" />
            </div>
            <div class="prop-grid">
              <div class="form-group">
                <label>Font Size</label>
                <input type="number" [ngModel]="pageSettings.footerFontSize || 12"
                  (ngModelChange)="updatePage({footerFontSize: +$event})" min="6" max="36" />
              </div>
              <div class="form-group">
                <label>Align</label>
                <select [ngModel]="pageSettings.footerAlignment || 'center'"
                  (ngModelChange)="updatePage({footerAlignment: $event})">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <div class="toggle-row" style="margin-top: 8px;">
              <span>Show Page Numbers</span>
              <label class="toggle">
                <input type="checkbox" [ngModel]="pageSettings.showPageNumbers !== false"
                  (ngModelChange)="updatePage({showPageNumbers: $event})">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- Watermark -->
          <div class="panel-section" style="padding-bottom: 8px;">
            <div class="form-group full">
              <label>Watermark Text</label>
              <input type="text" [ngModel]="pageSettings.watermark || ''"
                (ngModelChange)="updatePage({watermark: $event})"
                placeholder="DRAFT" />
            </div>
            <div class="prop-grid">
              <div class="form-group">
                <label>Font Size</label>
                <input type="number" [ngModel]="pageSettings.watermarkFontSize || 80"
                  (ngModelChange)="updatePage({watermarkFontSize: +$event})" min="20" max="200" />
              </div>
              <div class="form-group">
                <label>Angle</label>
                <input type="number" [ngModel]="pageSettings.watermarkAngle || 45"
                  (ngModelChange)="updatePage({watermarkAngle: +$event})" min="-180" max="180" />
              </div>
            </div>
            <div class="color-row" style="margin-top: 8px;">
              <span class="color-label">Color</span>
              <div class="color-picker-wrap">
                <input type="color" [ngModel]="toHex(pageSettings.watermarkColor || '#cccccc')"
                  (ngModelChange)="updatePage({watermarkColor: $event})" />
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label>Opacity: {{ pct(pageSettings.watermarkOpacity || 0.3) }}%</label>
              <input type="range" min="0" max="1" step="0.05"
                [ngModel]="pageSettings.watermarkOpacity || 0.3"
                (ngModelChange)="updatePage({watermarkOpacity: +$event})"
                class="range-input" />
            </div>
          </div>
        </div>
      </div>

      <!-- Element properties -->
      <ng-container *ngIf="el">
        <!-- Identity -->
        <div class="panel-section">
          <div class="section-title">Identity</div>
          <div class="prop-grid">
            <div class="form-group full">
              <label>Label</label>
              <input type="text" [ngModel]="el.label"
                (ngModelChange)="update({label: $event})" />
            </div>
          </div>
        </div>

        <!-- Position & Size -->
        <div class="panel-section">
          <div class="section-title">Position & Size</div>
          <div class="prop-grid-4">
            <div class="form-group">
              <label>X (pts)</label>
              <input type="number" [ngModel]="round(el.x)"
                (ngModelChange)="update({x: +$event})" />
            </div>
            <div class="form-group">
              <label>Y (pts)</label>
              <input type="number" [ngModel]="round(el.y)"
                (ngModelChange)="update({y: +$event})" />
            </div>
            <div class="form-group">
              <label>W (pts)</label>
              <input type="number" [ngModel]="round(el.width)"
                (ngModelChange)="update({width: +$event})" min="10" />
            </div>
            <div class="form-group">
              <label>H (pts)</label>
              <input type="number" [ngModel]="round(el.height)"
                (ngModelChange)="update({height: +$event})" min="10" />
            </div>
          </div>
          <div class="toggle-row" style="margin-top: 10px;">
            <span>Locked</span>
            <label class="toggle">
              <input type="checkbox" [ngModel]="el.locked" (ngModelChange)="update({locked: $event})">
              <span class="slider"></span>
            </label>
          </div>
          <div class="toggle-row" style="margin-top: 8px;">
            <span>Visible</span>
            <label class="toggle">
              <input type="checkbox" [ngModel]="el.visible" (ngModelChange)="update({visible: $event})">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- Content (text / image) -->
        <div class="panel-section" *ngIf="el.type === 'text'">
          <div class="section-title">
            Content
            <span class="vars-hint" [title]="varHintTitle">{{ varHintLabel }}</span>
          </div>
          <textarea
            [ngModel]="el.content"
            (ngModelChange)="update({content: $event})"
            rows="3"
            [placeholder]="varPlaceholder"></textarea>
          <div class="vars-detected" *ngIf="detectedVars.length">
            <span class="vars-label">Variables:</span>
            <span class="var-tag" *ngFor="let v of detectedVars">{{ formatVar(v) }}</span>
          </div>
        </div>

        <div class="panel-section" *ngIf="el.type === 'image'">
          <div class="section-title">Image Source</div>
          <div class="img-source-tabs">
            <button class="img-tab" [class.active]="imgSourceMode === 'upload'" (click)="imgSourceMode = 'upload'">Upload</button>
            <button class="img-tab" [class.active]="imgSourceMode === 'var'" (click)="imgSourceMode = 'var'">Variable</button>
          </div>
          <div *ngIf="imgSourceMode === 'upload'" style="margin-top: 8px">
            <label class="upload-btn">
              <input type="file" accept="image/*" (change)="onImageUpload($event)" hidden />
              {{ el.content ? '✓ Image set — click to change' : '↑ Upload Image' }}
            </label>
          </div>
          <div *ngIf="imgSourceMode === 'var'" style="margin-top: 8px">
            <input type="text" [ngModel]="el.content"
              (ngModelChange)="update({content: $event})"
              [placeholder]="photoPlaceholder" />
            <p class="hint">Use a variable name. The bulk data should contain base64 image data for this key.</p>
          </div>
        </div>

        <!-- Text Style -->
        <div class="panel-section" *ngIf="el.type === 'text'">
          <div class="section-title">Text Style</div>
          <div class="prop-grid">
            <div class="form-group">
              <label>Font</label>
              <select [ngModel]="el.style.fontFamily" (ngModelChange)="updateStyle({fontFamily: $event})">
                <option *ngFor="let f of fonts" [value]="f">{{ f }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Size (pts)</label>
              <input type="number" [ngModel]="el.style.fontSize"
                (ngModelChange)="updateStyle({fontSize: +$event})" min="6" max="200" />
            </div>
            <div class="form-group">
              <label>Alignment</label>
              <select [ngModel]="el.style.alignment" (ngModelChange)="updateStyle({alignment: $event})">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </div>
            <div class="form-group">
              <label>Line Height</label>
              <input type="number" [ngModel]="el.style.lineHeight"
                (ngModelChange)="updateStyle({lineHeight: +$event})" min="0.8" max="3" step="0.1" />
            </div>
          </div>
          <div class="style-toggles">
            <button class="style-btn" [class.active]="el.style.bold"
              (click)="updateStyle({bold: !el.style.bold})"><b>B</b></button>
            <button class="style-btn" [class.active]="el.style.italic"
              (click)="updateStyle({italic: !el.style.italic})"><i>I</i></button>
            <button class="style-btn" [class.active]="el.style.underline"
              (click)="updateStyle({underline: !el.style.underline})"><u>U</u></button>
            <button class="style-btn" [class.active]="el.style.strike"
              (click)="updateStyle({strike: !el.style.strike})"><s>S</s></button>
          </div>
          <div class="prop-grid" style="margin-top: 8px;">
            <div class="form-group">
              <label>Char Spacing</label>
              <input type="number" [ngModel]="el.style.characterSpacing || 0"
                (ngModelChange)="updateStyle({characterSpacing: +$event})" min="0" max="20" />
            </div>
            <div class="form-group">
              <label>Link URL</label>
              <input type="text" [ngModel]="el.style.linkUrl || ''"
                (ngModelChange)="updateStyle({linkUrl: $event})"
                placeholder="https://..." />
            </div>
          </div>
        </div>

        <!-- Colors -->
        <div class="panel-section">
          <div class="section-title">Colors</div>
          <div class="color-grid">
            <div class="color-row" *ngIf="el.type === 'text'">
              <span class="color-label">Text</span>
              <div class="color-picker-wrap">
                <input type="color" [ngModel]="toHex(el.style.color)"
                  (ngModelChange)="updateStyle({color: $event})" />
                <input type="text" [ngModel]="el.style.color"
                  (ngModelChange)="updateStyle({color: $event})"
                  class="color-text-input" placeholder="#000000" />
              </div>
            </div>
            <div class="color-row">
              <span class="color-label">Fill</span>
              <div class="color-picker-wrap">
                <input type="color" [ngModel]="toHex(el.style.backgroundColor)"
                  (ngModelChange)="updateStyle({backgroundColor: $event})" />
                <input type="text" [ngModel]="el.style.backgroundColor"
                  (ngModelChange)="updateStyle({backgroundColor: $event})"
                  class="color-text-input" placeholder="transparent" />
                <button class="clear-btn" (click)="updateStyle({backgroundColor: 'transparent'})" title="Clear">✕</button>
              </div>
            </div>
            <div class="color-row" *ngIf="el.type === 'rectangle' || el.type === 'roundrect'">
              <span class="color-label">Border</span>
              <div class="color-picker-wrap">
                <input type="color" [ngModel]="toHex(el.style.borderColor)"
                  (ngModelChange)="updateStyle({borderColor: $event})" />
                <input type="text" [ngModel]="el.style.borderColor"
                  (ngModelChange)="updateStyle({borderColor: $event})"
                  class="color-text-input" placeholder="#000000" />
              </div>
            </div>
            <div class="form-group" *ngIf="el.type === 'rectangle' || el.type === 'roundrect'" style="margin-top: 8px">
              <label>Border Width (pts)</label>
              <input type="number" [ngModel]="el.style.borderWidth"
                (ngModelChange)="updateStyle({borderWidth: +$event})" min="0" max="20" />
            </div>
            <div class="form-group" *ngIf="el.type === 'roundrect'" style="margin-top: 8px">
              <label>Corner Radius (pts)</label>
              <input type="number" [ngModel]="el.style.borderRadius"
                (ngModelChange)="updateStyle({borderRadius: +$event})" min="0" max="100" />
            </div>
          </div>
        </div>

        <!-- Opacity -->
        <div class="panel-section">
          <div class="section-title">Opacity: {{ pct(el.style.opacity) }}%</div>
          <input type="range" min="0" max="1" step="0.01"
            [ngModel]="el.style.opacity"
            (ngModelChange)="updateStyle({opacity: +$event})"
            class="range-input" />
        </div>

        <!-- Line Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'line'">
          <div class="section-title">Line Style</div>
          <div class="color-row">
            <span class="color-label">Color</span>
            <div class="color-picker-wrap">
              <input type="color" [ngModel]="toHex(el.style.lineColor)"
                (ngModelChange)="updateStyle({lineColor: $event})" />
              <input type="text" [ngModel]="el.style.lineColor"
                (ngModelChange)="updateStyle({lineColor: $event})"
                class="color-text-input" />
            </div>
          </div>
          <div class="prop-grid" style="margin-top: 8px;">
            <div class="form-group">
              <label>Width</label>
              <input type="number" [ngModel]="el.style.lineWidth"
                (ngModelChange)="updateStyle({lineWidth: +$event})" min="1" max="50" />
            </div>
            <div class="form-group">
              <label>Dash</label>
              <input type="number" [ngModel]="el.style.lineDash || 0"
                (ngModelChange)="updateStyle({lineDash: +$event})" min="0" max="20" />
            </div>
          </div>
        </div>

        <!-- Ellipse Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'ellipse'">
          <div class="section-title">Ellipse Style</div>
          <div class="color-row" style="margin-bottom: 8px;">
            <span class="color-label">Fill</span>
            <div class="color-picker-wrap">
              <input type="color" [ngModel]="toHex(el.style.backgroundColor)"
                (ngModelChange)="updateStyle({backgroundColor: $event})" />
              <input type="text" [ngModel]="el.style.backgroundColor"
                (ngModelChange)="updateStyle({backgroundColor: $event})"
                class="color-text-input" placeholder="transparent" />
            </div>
          </div>
          <div class="color-row">
            <span class="color-label">Border</span>
            <div class="color-picker-wrap">
              <input type="color" [ngModel]="toHex(el.style.borderColor)"
                (ngModelChange)="updateStyle({borderColor: $event})" />
              <input type="text" [ngModel]="el.style.borderColor"
                (ngModelChange)="updateStyle({borderColor: $event})"
                class="color-text-input" />
            </div>
          </div>
          <div class="form-group" style="margin-top: 8px;">
            <label>Border Width</label>
            <input type="number" [ngModel]="el.style.borderWidth"
              (ngModelChange)="updateStyle({borderWidth: +$event})" min="0" max="20" />
          </div>
        </div>

        <!-- Table Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'table'">
          <div class="section-title">Table Settings</div>
          <div class="prop-grid">
            <div class="form-group">
              <label>Rows</label>
              <input type="number" [ngModel]="el.tableData?.rows || 3"
                (ngModelChange)="updateTableRows($event)" min="1" max="20" />
            </div>
            <div class="form-group">
              <label>Cols</label>
              <input type="number" [ngModel]="el.tableData?.cols || 3"
                (ngModelChange)="updateTableCols($event)" min="1" max="10" />
            </div>
            <div class="form-group">
              <label>Header Rows</label>
              <input type="number" [ngModel]="el.tableData?.headerRows || 1"
                (ngModelChange)="updateTableData({headerRows: +$event})" min="0" max="5" />
            </div>
            <div class="form-group">
              <label>Alt Row Fill</label>
              <input type="color" [ngModel]="toHex(el.tableData?.alternateRowFill || '#f5f5f5')"
                (ngModelChange)="updateTableData({alternateRowFill: $event})" />
            </div>
          </div>
          <div class="form-group" style="margin-top: 8px;">
            <label>Default Border</label>
            <input type="color" [ngModel]="toHex(el.tableData?.defaultBorderColor || '#cccccc')"
              (ngModelChange)="updateTableData({defaultBorderColor: $event})" />
          </div>
        </div>

        <!-- QR Code Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'qrcode'">
          <div class="section-title">QR Code</div>
          <div class="form-group full">
            <label>Content (supports {{varPlaceholder}})</label>
            <input type="text" [ngModel]="el.content"
              (ngModelChange)="update({content: $event})"
              placeholder="https://example.com" />
          </div>
          <div class="prop-grid" style="margin-top: 8px;">
            <div class="form-group">
              <label>ECC Level</label>
              <select [ngModel]="el.style.qrEcc || 'M'"
                (ngModelChange)="updateStyle({qrEcc: $event})">
                <option value="L">Low (7%)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </div>
          </div>
          <div class="color-row" style="margin-top: 8px;">
            <span class="color-label">Foreground</span>
            <div class="color-picker-wrap">
              <input type="color" [ngModel]="toHex(el.style.qrForeground)"
                (ngModelChange)="updateStyle({qrForeground: $event})" />
            </div>
          </div>
          <div class="color-row" style="margin-top: 8px;">
            <span class="color-label">Background</span>
            <div class="color-picker-wrap">
              <input type="color" [ngModel]="toHex(el.style.qrBackground)"
                (ngModelChange)="updateStyle({qrBackground: $event})" />
            </div>
          </div>
        </div>

        <!-- List Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'list'">
          <div class="section-title">List Settings</div>
          <div class="prop-grid">
            <div class="form-group">
              <label>Type</label>
              <select [ngModel]="el.listType || 'ul'"
                (ngModelChange)="update({listType: $event})">
                <option value="ul">Bullet</option>
                <option value="ol">Numbered</option>
              </select>
            </div>
            <div class="form-group">
              <label>Style</label>
              <select [ngModel]="el.listStyle || 'disc'"
                (ngModelChange)="update({listStyle: $event})">
                <option *ngIf="el.listType === 'ul'" value="disc">Disc</option>
                <option *ngIf="el.listType === 'ul'" value="circle">Circle</option>
                <option *ngIf="el.listType === 'ul'" value="square">Square</option>
                <option *ngIf="el.listType === 'ol'" value="decimal">Decimal</option>
                <option *ngIf="el.listType === 'ol'" value="lower-alpha">a, b, c</option>
                <option *ngIf="el.listType === 'ol'" value="upper-alpha">A, B, C</option>
              </select>
            </div>
          </div>
          <div class="color-row" style="margin-top: 8px;">
            <span class="color-label">Marker</span>
            <div class="color-picker-wrap">
              <input type="color" [ngModel]="toHex(el.listMarkerColor || '#7c5af5')"
                (ngModelChange)="update({listMarkerColor: $event})" />
            </div>
          </div>
          <div class="form-group" style="margin-top: 8px;">
            <label>Item Spacing</label>
            <input type="number" [ngModel]="el.itemSpacing || 8"
              (ngModelChange)="update({itemSpacing: +$event})" min="0" max="20" />
          </div>
        </div>

        <!-- Columns Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'columns'">
          <div class="section-title">Columns</div>
          <div class="form-group">
            <label>Column Gap</label>
            <input type="number" [ngModel]="el.columnGap || 20"
              (ngModelChange)="update({columnGap: +$event})" min="0" max="50" />
          </div>
        </div>

        <!-- SVG Element Properties -->
        <div class="panel-section" *ngIf="el.type === 'svg'">
          <div class="section-title">SVG Source</div>
          <div class="form-group full">
            <textarea
              [ngModel]="el.content"
              (ngModelChange)="update({content: $event})"
              rows="5"
              placeholder="<svg>...</svg>"></textarea>
          </div>
        </div>

        <!-- Delete -->
        <div class="panel-section">
          <button class="btn btn-danger" style="width:100%" (click)="deleteEl()">
            🗑 Delete Element
          </button>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .props-panel {
      height: 100%;
      width: 260px;
      min-width: 200px;
      max-width: 320px;
      flex-shrink: 0;
      background: var(--panel);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .props-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      max-height: 80vh;
    }

    .props-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-3);
      flex-shrink: 0;
    }

    .el-type-badge {
      background: var(--accent-dim);
      color: var(--accent-3);
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 20px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.06em;
      border: 1px solid var(--accent-border);
    }

    .no-selection {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text-3);
      padding: 40px 20px;
      text-align: center;

      .no-sel-icon { font-size: 32px; opacity: 0.4; }
      p { font-size: 13px; font-weight: 500; }
      .sub { font-size: 11px; opacity: 0.6; }
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

    .vars-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      background: var(--accent-dim);
      color: var(--accent-3);
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid var(--accent-border);
      cursor: help;
    }

    .vars-detected {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
      align-items: center;

      .vars-label { font-size: 10px; color: var(--text-3); }
    }

    .var-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      background: var(--accent-dim);
      color: var(--accent-3);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid var(--accent-border);
    }

    .prop-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;

      .full { grid-column: 1 / -1; }
    }

    .prop-grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .style-toggles {
      display: flex;
      gap: 4px;
      margin-top: 8px;
    }

    .style-btn {
      padding: 6px 12px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-2);
      cursor: pointer;
      font-size: 13px;
      font-family: 'Outfit', sans-serif;
      transition: all 0.15s;

      &.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent-3); }
      &:hover { background: var(--bg-hover); }
    }

    .color-grid { display: flex; flex-direction: column; gap: 8px; }

    .color-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .color-label { font-size: 11px; color: var(--text-3); min-width: 36px; }
    }

    .color-picker-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;

      input[type="color"] {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
        padding: 2px;
        border-radius: 4px;
      }
    }

    .color-text-input { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 11px; }

    .clear-btn {
      background: none;
      border: none;
      color: var(--text-3);
      cursor: pointer;
      font-size: 12px;
      padding: 2px;
      &:hover { color: var(--error); }
    }

    .range-input {
      width: 100%;
      accent-color: var(--accent);
      cursor: pointer;
    }

    .img-source-tabs {
      display: flex;
      gap: 2px;
      background: var(--bg-3);
      padding: 3px;
      border-radius: var(--radius-sm);
    }

    .img-tab {
      flex: 1;
      padding: 5px;
      border: none;
      background: transparent;
      color: var(--text-3);
      font-size: 11px;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;

      &.active { background: var(--bg-4); color: var(--text-1); }
    }

    .upload-btn {
      display: block;
      padding: 8px;
      text-align: center;
      border: 1.5px dashed var(--border-2);
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--text-3);
      cursor: pointer;
      &:hover { border-color: var(--accent-border); color: var(--accent-3); }
    }

    .hint {
      font-size: 11px;
      color: var(--text-3);
      margin-top: 6px;
      line-height: 1.5;
    }

    .panel-section {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .page-settings-section {
      width: 100%;
      padding: 0 16px;
    }

    .page-settings-section .form-group {
      margin-bottom: 8px;
    }

    .page-settings-section .form-group.full {
      grid-column: 1 / -1;
    }

    .page-settings-section .prop-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .page-settings-section .color-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .page-settings-section .color-label {
      font-size: 11px;
      color: var(--text-3);
      min-width: 36px;
    }

    .page-settings-section .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .page-settings-section .toggle-row span {
      font-size: 12px;
      color: var(--text-2);
    }
  `]
})
export class PropertiesPanelComponent implements OnInit, OnDestroy {
  el: EditorElement | null = null;
  fonts = FONT_FAMILIES;
  imgSourceMode: 'upload' | 'var' = 'upload';
  readonly varHintTitle = 'Use {{variable}} for dynamic fields';
  readonly varHintLabel = '{{var}}';
  readonly varPlaceholder = 'Hello {{name}}!';
  readonly photoPlaceholder = '{{photo}}';
  private subs = new Subscription();

  constructor(
    private editorService: EditorService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.subs.add(this.editorService.selectedId$.subscribe(() => {
      this.el = this.editorService.selectedElement;
      this.cdr.markForCheck();
    }));
    this.subs.add(this.editorService.template$.subscribe(() => {
      this.el = this.editorService.selectedElement;
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  update(changes: Partial<EditorElement>) {
    if (this.el) this.editorService.updateElement(this.el.id, changes);
  }

  updateStyle(changes: Partial<ElementStyle>) {
    if (this.el) this.editorService.updateElementStyle(this.el.id, changes);
  }

  deleteEl() {
    if (this.el) this.editorService.deleteElement(this.el.id);
  }

  get detectedVars(): string[] {
    if (!this.el) return [];
    return [...(this.el.content.matchAll(/\{\{(\w+)\}\}/g))].map(m => m[1]);
  }

  onImageUpload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.el) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (typeof ev.target?.result === 'string') {
        this.update({ content: ev.target.result });
      }
    };
    reader.readAsDataURL(file);
  }

  toHex(color: string): string {
    if (!color || color === 'transparent') return '#000000';
    if (color.startsWith('#')) return color;
    return '#000000';
  }

  round(n: number) { return Math.round(n); }
  pct(n: number) { return Math.round(n * 100); }
  formatVar(v: string) { return '{{' + v + '}}'; }

  updateTableRows(rows: number) {
    if (!this.el) return;
    const current = this.el.tableData || { rows: 3, cols: 3, cells: [], colWidths: ['*', '*', '*'], headerRows: 1, alternateRowFill: '#f5f5f5', defaultBorderColor: '#cccccc', defaultFontSize: 10 };
    const newCells = Array(rows).fill(null).map((_, r) =>
      Array(current.cols).fill(null).map((__, c) => {
        if (r < current.cells.length && c < current.cells[r].length) {
          return current.cells[r][c];
        }
        return { text: r === 0 ? `Header ${c + 1}` : `Cell ${r}-${c + 1}`, bold: r === 0, fontSize: r === 0 ? 10 : 9, alignment: 'center' };
      })
    );
    this.update({ tableData: { ...current, rows, cells: newCells } });
  }

  updateTableCols(cols: number) {
    if (!this.el) return;
    const current = this.el.tableData || { rows: 3, cols: 3, cells: [], colWidths: ['*', '*', '*'], headerRows: 1, alternateRowFill: '#f5f5f5', defaultBorderColor: '#cccccc', defaultFontSize: 10 };
    const newCells = Array(current.rows).fill(null).map((_, r) =>
      Array(cols).fill(null).map((__, c) => {
        if (r < current.cells.length && c < current.cells[r].length) {
          return current.cells[r][c];
        }
        return { text: r === 0 ? `Header ${c + 1}` : `Cell ${r}-${c + 1}`, bold: r === 0, fontSize: r === 0 ? 10 : 9, alignment: 'center' };
      })
    );
    const newColWidths = Array(cols).fill('*');
    this.update({ tableData: { ...current, cols, cells: newCells, colWidths: newColWidths } });
  }

  updateTableData(updates: any) {
    if (!this.el) return;
    const current = this.el.tableData || { rows: 3, cols: 3, cells: [], colWidths: ['*', '*', '*'], headerRows: 1, alternateRowFill: '#f5f5f5', defaultBorderColor: '#cccccc', defaultFontSize: 10 };
    this.update({ tableData: { ...current, ...updates } });
  }

  get pageSettings(): any {
    return this.editorService.page;
  }

  updatePage(updates: any) {
    this.editorService.updatePage(updates);
  }
}
