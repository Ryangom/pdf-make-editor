// ─── Element Types ────────────────────────────────────────────────────────────
export type ElementType = 'text' | 'image' | 'rectangle' | 'roundrect' | 'line' | 'ellipse' | 'table' | 'qrcode' | 'list' | 'columns' | 'svg';

export interface ElementStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify';
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  lineHeight: number;

  // Text enhancements
  underline: boolean;
  strike: boolean;
  characterSpacing: number;
  decoration: 'underline' | 'lineThrough' | 'overline' | 'none';
  decorationStyle: 'dashed' | 'dotted' | 'double' | 'wavy' | 'none';
  decorationColor: string;
  linkUrl: string;
  noWrap: boolean;

  // Line element
  lineColor: string;
  lineWidth: number;
  lineDash: number;
  lineCapStyle: 'butt' | 'round' | 'square';
  lineAngle: number;

  // QR Code
  qrFit: number;
  qrForeground: string;
  qrBackground: string;
  qrEcc: 'L' | 'M' | 'Q' | 'H';
}

// ─── Table Cell Interface ────────────────────────────────────────────────────────────
export interface TableCell {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  fillColor?: string;
  color?: string;
  bold?: boolean;
  italic?: number;
  fontSize?: number;
  alignment?: string;
  borderColor?: [string, string, string, string];
  border?: [boolean, boolean, boolean, boolean];
}

export interface TableData {
  rows: number;
  cols: number;
  cells: TableCell[][];
  colWidths: (number | string)[];
  headerRows: number;
  alternateRowFill: string;
  defaultBorderColor: string;
  defaultFontSize: number;
}

// ─── Column Definition ────────────────────────────────────────────────────────────
export interface ColumnDef {
  text: string;
  width: number | string;
  fontSize: number;
  color: string;
  bold: boolean;
  alignment: string;
}

// ─── List Item Interface ────────────────────────────────────────────────────────────
export interface ListItem {
  text: string;
  bold?: boolean;
  fontSize?: number;
  color?: string;
}

export interface EditorElement {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: ElementStyle;
  locked: boolean;
  visible: boolean;

  // Table data
  tableData?: TableData;

  // Columns
  columnDefs?: ColumnDef[];
  columnGap?: number;

  // List
  listItems?: ListItem[];
  listType?: 'ul' | 'ol';
  listStyle?: string;
  listMarkerColor?: string;
  itemSpacing?: number;
}

// ─── Page / Template ──────────────────────────────────────────────────────────
export interface PageSize {
  label: string;
  width: number;
  height: number;
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
  backgroundImage: string;

  // Header & Footer
  headerText: string;
  footerText: string;
  headerFontSize: number;
  footerFontSize: number;
  headerAlignment: string;
  footerAlignment: string;
  headerMarginTop: number;
  footerMarginBottom: number;
  showPageNumbers: boolean;
  pageNumberAlignment: string;
  pageNumberFormat: string;

  // Watermark
  watermark: string;
  watermarkOpacity: number;
  watermarkColor: string;
  watermarkAngle: number;
  watermarkFontSize: number;
  watermarkBold: boolean;
}

export interface PageData {
  settings: PageSettings;
  elements: EditorElement[];
  name: string;
}

export interface Template {
  name: string;
  page: PageSettings;
  elements: EditorElement[];
  pages?: PageData[];
  currentPageIndex?: number;
  hasBackPage?: boolean;
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
  // Text enhancements
  underline: false,
  strike: false,
  characterSpacing: 0,
  decoration: 'none',
  decorationStyle: 'none',
  decorationColor: '',
  linkUrl: '',
  noWrap: false,
  // Line
  lineColor: '#000000',
  lineWidth: 1,
  lineDash: 0,
  lineCapStyle: 'butt',
  lineAngle: 0,
  // QR Code
  qrFit: 100,
  qrForeground: '#000000',
  qrBackground: '#ffffff',
  qrEcc: 'M',
};

export const DEFAULT_PAGE: PageSettings = {
  width: 595,
  height: 842,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  backgroundImage: '',
  // Header & Footer defaults
  headerText: '',
  footerText: '',
  headerFontSize: 12,
  footerFontSize: 12,
  headerAlignment: 'center',
  footerAlignment: 'center',
  headerMarginTop: 10,
  footerMarginBottom: 10,
  showPageNumbers: true,
  pageNumberAlignment: 'center',
  pageNumberFormat: 'Page {{page}} of {{total}}',
  // Watermark defaults
  watermark: '',
  watermarkOpacity: 0.3,
  watermarkColor: '#cccccc',
  watermarkAngle: 45,
  watermarkFontSize: 80,
  watermarkBold: false,
};

export const DEFAULT_TEMPLATE: Template = {
  name: 'Untitled Template',
  page: { ...DEFAULT_PAGE },
  elements: [],
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
