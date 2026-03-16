# ⬡ PDFMake Visual Editor

A powerful Angular 17 drag-and-drop PDF template designer that generates ready-to-use **pdfmake** code. Design ID cards, certificates, badges, invoices — anything — visually, then export the PDF or copy the developer code.

---

## 🚀 Quick Start

```bash
npm install
npm start
# → Opens at http://localhost:4200
```

---

## ✨ Features

### 🎨 Visual Canvas Editor
- **Drag & drop** elements anywhere on the page
- **8-point resize handles** for precise sizing
- **Arrow key nudging** (1pt / 10pt with Shift)
- **Zoom** (Ctrl+Scroll, + / − buttons, Fit to View)
- **Rulers** with pt measurements
- **Undo / Redo** (Ctrl+Z / Ctrl+Y, up to 50 steps)
- **Delete** selected element with Delete / Backspace key

### 📐 Element Types

| Element | Description |
|---------|-------------|
| **Text** | Supports `{{variable}}` placeholders, font/size/bold/italic/color/alignment |
| **Image** | Upload static image or bind to a `{{variable}}` for per-record photos |
| **Rectangle** | Fill color, border color, border width — great for backgrounds/dividers |

### 📄 Page Settings
- Presets: A4 Portrait/Landscape, ID Card (CR80), Letter, Certificate, Custom
- Upload a **background image** (drag & drop onto canvas or use button)
- Configurable page margins

### 🔢 Bulk Data & Loop

Three ways to enter data:

1. **JSON** — paste or type a JSON array, or click "Generate Sample" to auto-populate from your template variables
2. **CSV** — paste CSV text or upload a `.csv` file; first row is headers
3. **Table** — add columns and rows interactively

**Bulk loop** generates one PDF with one page per record — perfect for printing batches of ID cards, certificates, etc.

### 🧑‍💻 Code Viewer
- Real-time **syntax-highlighted** pdfmake JavaScript code
- Toggle between **single-record** and **bulk loop** modes
- **Copy to clipboard** or **download as `.js` file**
- Includes setup instructions and usage guide

### 💾 Template Management
- **Save** template to `.json` file
- **Load** any saved `.json` template
- **Reset** to blank canvas

---

## 📁 Project Structure

```
src/app/
├── models/
│   └── editor.models.ts          # Types: EditorElement, Template, PageSettings
├── services/
│   ├── editor.service.ts         # Central state (BehaviorSubjects, undo/redo)
│   └── pdf.service.ts            # PDF generation + code generation
├── components/
│   ├── canvas/                   # Visual drag/resize editor canvas
│   ├── elements-palette/         # Left panel: add elements, layers, page size
│   ├── properties-panel/         # Right panel: element properties editor
│   ├── data-panel/               # Bottom: JSON/CSV/Table bulk data input
│   ├── code-viewer/              # Bottom: syntax-highlighted PDFMake code
│   └── toolbar/                  # Top: save/load/preview/export actions
├── pipes/
│   └── reverse.pipe.ts           # Reverses arrays (for layers z-order display)
└── app.component.ts              # Root layout: 3-column + resizable bottom panel
```

---

## 🧩 Using `{{variables}}` for Dynamic Content

In any **Text** element, use `{{variableName}}` syntax:

```
Hello, {{name}}!
Student ID: {{studentId}}
Grade: {{grade}}
```

For **Image** elements, switch to "Variable" mode and enter `{{photo}}` — then supply base64 image data in your records.

The **Code Viewer** automatically detects all variables and generates the correct `resolveVars()` helper function.

---

## 📦 Bulk PDF Example

### 1. Design your template
Create an ID card with Text elements like:
- `{{name}}` — student name
- `{{id}}` — student ID number
- `{{department}}` — department

### 2. Enter bulk data (JSON tab)
```json
[
  { "name": "Alice Smith",  "id": "STU001", "department": "Computer Science" },
  { "name": "Bob Johnson",  "id": "STU002", "department": "Mathematics" },
  { "name": "Carol White",  "id": "STU003", "department": "Physics" }
]
```

### 3. Generate
Click **"🖨 Print All (3)"** → opens a PDF with 3 pages (one ID card per student).

---

## 🛠 Using the Generated Code

```bash
npm install pdfmake
```

```javascript
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// Paste the generated code here...
// Then call:
pdfMake.createPdf(docDefinition).open();
// or:
pdfMake.createPdf(docDefinition).download('output.pdf');
```

The generated code is self-contained and includes:
- The full `docDefinition` object
- A `resolveVars()` helper function (for bulk mode)
- Comments explaining each element
- Setup instructions

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Delete` / `Backspace` | Delete selected element |
| `Arrow keys` | Nudge element by 1pt |
| `Shift+Arrow` | Nudge element by 10pt |
| `Ctrl+Scroll` | Zoom in/out |

---

## 🔧 Customization & Extension

### Adding new element types
1. Add to `ElementType` union in `editor.models.ts`
2. Handle in `editor.service.ts` `addElement()` switch
3. Render in `canvas.component.ts` template
4. Generate pdfmake node in `pdf.service.ts` `buildPageContent()`

### Integrating with a backend
Replace the JSON textarea with an API call:
```typescript
// In data-panel.component.ts
async loadFromApi(endpoint: string) {
  const response = await fetch(endpoint);
  this.records = await response.json();
  this.editorService.setBulkData(this.records);
}
```

### Custom fonts in pdfmake
To use custom fonts, follow the [pdfmake custom fonts guide](https://pdfmake.github.io/docs/fonts/custom-fonts-client-side/) and extend the `FONT_FAMILIES` array in `editor.models.ts`.

---

## 📄 License

MIT — free to use and modify.
