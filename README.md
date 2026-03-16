# ⬡ PDFMake Visual Editor

A sophisticated Angular 17 standalone application that provides a powerful drag-and-drop interface for designing PDF templates. Generate production-ready pdfmake JavaScript code for dynamic documents like ID cards, certificates, badges, invoices, and reports — all through an intuitive WYSIWYG editor.

---

## 🚀 Quick Start

```bash
npm install
npm start
# → Opens at http://localhost:4200
```

---

## ✨ Core Features

### 🎨 Advanced Visual Canvas Editor

- **Precise Element Manipulation**: Drag-and-drop positioning with 8-point resize handles
- **Professional Navigation**: Zoom controls (Ctrl+Scroll, buttons, fit-to-view), rulers with pt measurements
- **Multi-Page Support**: Design front/back pages for double-sided documents (ID cards, business cards)
- **Smart Interactions**: Arrow key nudging (1pt/10pt), undo/redo (50 steps), keyboard shortcuts
- **Real-Time Preview**: Live rendering with variable substitution from bulk data
- **Layer Management**: Z-index ordering, visibility toggles, element locking

### 📐 Comprehensive Element System

| Element             | Capabilities                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Text**            | Rich typography (fonts, sizes, colors, alignment), `{{variable}}` placeholders, multi-line support |
| **Image**           | Static uploads or dynamic `{{variable}}` binding with base64 data, aspect ratio preservation       |
| **Rectangle**       | Background/border colors, configurable border width, opacity controls                              |
| **Round Rectangle** | All rectangle features plus adjustable border radius                                               |

### 📄 Flexible Page Configuration

- **Preset Sizes**: A4/Letter Portrait/Landscape, ID Card (CR80), Certificate, Custom dimensions
- **Background Images**: Drag-and-drop upload with automatic scaling
- **Multi-Page Templates**: Toggle double-sided mode for complex documents
- **Precise Measurements**: All dimensions in PDF points (pts) for pixel-perfect output

### 🔄 Dynamic Data Integration

**Three Input Methods**:

1. **JSON Arrays** — Direct paste or programmatic generation
2. **CSV Files** — Upload `.csv` or paste delimited text with auto-parsing
3. **Interactive Table** — Visual column/row editing with validation

**Bulk Processing**: Generate one PDF page per data record — perfect for batch printing certificates, ID cards, or personalized documents.

### 🧑‍💻 Intelligent Code Generation

- **Syntax-Highlighted Output**: Real-time pdfmake JavaScript generation
- **Dual Modes**: Single-record preview or bulk processing code
- **Developer-Friendly**: Includes setup instructions, helper functions, and comprehensive comments
- **Export Options**: Copy to clipboard or download as `.js` file
- **Variable Detection**: Automatically identifies `{{variables}}` and generates resolve logic

### 💾 Template Management

- **JSON Export/Import**: Save designs as human-readable `.json` files
- **Version Compatibility**: Backward-compatible with legacy single-page templates
- **Quick Reset**: Start fresh with default template

---

## 🏗️ Technical Architecture

### Application Structure

```
src/app/
├── models/editor.models.ts      # TypeScript interfaces, constants, and defaults
├── services/
│   ├── editor.service.ts        # Reactive state management (RxJS BehaviorSubjects)
│   └── pdf.service.ts           # PDF generation and code export logic
├── components/
│   ├── app.component.ts         # Root layout with resizable 3-panel design
│   ├── canvas/canvas.component.ts      # Interactive visual editor (718 lines)
│   ├── elements-palette/               # Left sidebar: elements, layers, settings
│   ├── properties-panel/               # Right sidebar: detailed property editors
│   ├── data-panel/                     # Bottom: bulk data input (JSON/CSV/Table)
│   ├── code-viewer/code-viewer.component.ts  # Bottom: generated code viewer
│   └── toolbar/toolbar.component.ts    # Top: file operations and export actions
├── pipes/reverse.pipe.ts        # Utility for layer z-order display
```

### Key Technologies

- **Framework**: Angular 17 with standalone components and OnPush change detection
- **State**: RxJS BehaviorSubjects for reactive, immutable state updates
- **PDF Engine**: pdfmake v0.2.10 with full TypeScript integration
- **UI**: Custom CSS with CSS variables for theming and consistency
- **Performance**: Efficient rendering, lazy evaluation, and memory management

### Design Patterns

- **Reactive State Management**: Service-based architecture with observable streams
- **Component Composition**: Standalone components with explicit dependency injection
- **Immutability**: Deep cloning for undo/redo history snapshots
- **Separation of Concerns**: Clear boundaries between UI, business logic, and PDF generation

---

## 🧩 Dynamic Content with Variables

Use `{{variableName}}` syntax in any Text element for dynamic content:

```javascript
// Text Element Content
"Hello, {{name}}!";
"Student ID: {{studentId}}";
"Grade: {{grade}}";
"Photo: {{photo}}"; // For image elements
```

**Variable Resolution**:

- Automatically detects all variables in your template
- Generates `resolveVars()` helper function in exported code
- Supports nested object access: `{{user.name}}`
- Graceful fallbacks for missing variables

---

## 📦 Complete Workflow Example

### 1. Design Your Template

Create a student ID card layout:

- Background image upload
- Text elements: `{{name}}`, `{{id}}`, `{{department}}`
- Image element: `{{photo}}` (dynamic per student)
- Rectangle elements for borders/design

### 2. Prepare Bulk Data

```json
[
  {
    "name": "Alice Smith",
    "id": "STU001",
    "department": "Computer Science",
    "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  },
  {
    "name": "Bob Johnson",
    "id": "STU002",
    "department": "Mathematics",
    "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
  }
]
```

### 3. Generate & Export

- **Preview**: Single PDF with first record
- **Bulk Print**: Multi-page PDF (one per student)
- **Code Export**: Production-ready JavaScript for your application

---

## 🛠️ Integration & Usage

### Using Generated Code

```bash
npm install pdfmake
```

```javascript
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// For single record
const docDefinition = {
  pageSize: { width: 243, height: 153 },
  pageMargins: [10, 10, 10, 10],
  content: [
    // Generated content here...
  ],
};

pdfMake.createPdf(docDefinition).open();

// For bulk processing
const records = [
  /* your data array */
];
const pdfs = records.map((record) => {
  const resolvedContent = buildPageContent(record, true);
  return pdfMake.createPdf({
    pageSize: { width: 243, height: 153 },
    content: resolvedContent,
  });
});
```

### Backend Integration

Replace static data with API calls:

```typescript
// In data-panel.component.ts
async loadFromDatabase(apiEndpoint: string) {
  try {
    const response = await fetch(apiEndpoint);
    const records = await response.json();
    this.editorService.setBulkData(records);
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}
```

---

## ⌨️ Keyboard Shortcuts & Controls

| Shortcut               | Action                        |
| ---------------------- | ----------------------------- |
| `Ctrl+Z` / `Ctrl+Y`    | Undo / Redo (50-step history) |
| `Delete` / `Backspace` | Delete selected element       |
| `Arrow Keys`           | Nudge element by 1pt          |
| `Shift + Arrow Keys`   | Nudge element by 10pt         |
| `Ctrl + Scroll`        | Zoom in/out                   |
| `Click Canvas`         | Deselect element              |

---

## 🔧 Extension & Customization

### Adding New Element Types

1. **Extend Types** (`editor.models.ts`):

   ```typescript
   export type ElementType =
     | "text"
     | "image"
     | "rectangle"
     | "roundrect"
     | "circle";
   ```

2. **Implement Creation** (`editor.service.ts`):

   ```typescript
   case 'circle':
     el = { /* circle-specific properties */ };
     break;
   ```

3. **Add Rendering** (`canvas.component.ts`):

   ```html
   <div *ngIf="el.type === 'circle'" class="el-circle"></div>
   ```

4. **PDF Generation** (`pdf.service.ts`):
   ```typescript
   case 'circle':
     content.push({ canvas: [{ type: 'ellipse', /* ... */ }] });
     break;
   ```

### Custom Fonts

Extend `FONT_FAMILIES` in `editor.models.ts` and follow [pdfmake font documentation](https://pdfmake.github.io/docs/fonts/custom-fonts-client-side/).

### Theming

Modify CSS variables in `styles.scss` for custom branding:

```scss
:root {
  --accent: #your-brand-color;
  --panel: #your-bg-color;
  /* ... */
}
```

---

## 📊 Performance & Limitations

**Optimized For**:

- Complex templates with 50+ elements
- Bulk processing of 1000+ records
- Large background images and embedded assets

**Current Limitations**:

- Single font family per text element (pdfmake constraint)
- No gradient fills or advanced shapes
- Client-side PDF generation (large datasets may impact browser performance)

---

## 📄 License

MIT — Free to use, modify, and distribute. Built with ❤️ using Angular and pdfmake.
