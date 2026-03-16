// ─── Element Types ────────────────────────────────────────────────────────────
export type ElementType = 'text' | 'image' | 'rectangle' | 'roundrect';

export interface ElementStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  lineHeight: number;
}

export interface EditorElement {
  id: string;
  type: ElementType;
  label: string;         // display name in layers panel
  x: number;             // PDF pts from left
  y: number;             // PDF pts from top
  width: number;         // PDF pts
  height: number;        // PDF pts
  content: string;       // text content (may have {{vars}}), or base64 image data
  style: ElementStyle;
  locked: boolean;
  visible: boolean;
}

// ─── Page / Template ──────────────────────────────────────────────────────────
export interface PageSize {
  label: string;
  width: number;   // pts
  height: number;  // pts
}

export const PAGE_SIZES: PageSize[] = [
  { label: 'A4 Portrait', width: 595, height: 842 },
  { label: 'A4 Landscape', width: 842, height: 595 },
  { label: 'ID Card (CR80)', width: 243, height: 153 },
  { label: 'Letter', width: 612, height: 792 },
  { label: 'Certificate', width: 842, height: 595 },
  { label: 'Custom', width: 595, height: 842 },
];

export interface PageSettings {
  width: number;
  height: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  backgroundImage: string;  // base64 data URL or ''
}

export interface PageData {
  settings: PageSettings;
  elements: EditorElement[];
  name: string; // "Front" or "Back"
}

export interface Template {
  name: string;
  page: PageSettings; // Keep for backward compatibility
  elements: EditorElement[]; // Keep for backward compatibility
  pages?: PageData[]; // Optional for multi-page support
  currentPageIndex?: number; // Optional, defaults to 0
  hasBackPage?: boolean; // Optional, defaults to false
}

// ─── Bulk Data ────────────────────────────────────────────────────────────────
export type DataRecord = Record<string, string>;

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_STYLE: ElementStyle = {
  fontSize: 14,
  fontFamily: 'Helvetica',
  color: '#1a1a2e',
  bold: false,
  italic: false,
  alignment: 'left',
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 0,
  opacity: 1,
  lineHeight: 1.3,
};

export const DEFAULT_PAGE: PageSettings = {
  width: 595,
  height: 842,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  backgroundImage: '',
};

export const DEFAULT_TEMPLATE: Template = {
  name: 'Untitled Template',
  page: { ...DEFAULT_PAGE }, // Keep for backward compatibility
  elements: [], // Keep for backward compatibility
  pages: [{
    name: 'Front',
    settings: { ...DEFAULT_PAGE },
    elements: []
  }],
  currentPageIndex: 0,
  hasBackPage: false,
};

export const FONT_FAMILIES = [
  'Helvetica', 'Times', 'Courier',
  'Helvetica-Bold', 'Times-Bold', 'Courier-Bold',
];

export const PDFMAKE_FONTS: Record<string, string> = {
  'Helvetica': 'Helvetica',
  'Helvetica-Bold': 'Helvetica',
  'Times': 'Times',
  'Times-Bold': 'Times',
  'Courier': 'Courier',
  'Courier-Bold': 'Courier',
};
