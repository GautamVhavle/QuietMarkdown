/**
 * The starter document every new visitor sees. Kept in its own module so the
 * Vite build (vite.config.ts) can prerender it into index.html for crawlers
 * and the app can load it as the first library document.
 */
export const STARTER_TITLE = 'QuietMarkdown editor field guide'

export const starterMarkdown = `# QuietMarkdown editor field guide

*A private Markdown editor with PDF, HTML, and PNG export, ready to become something worth sharing.*

**Updated August 2026** · QuietMarkdown is a calm place to shape an idea into a **clear, portable document**. This starter note shows the Markdown features available at your fingertips, from quick inline styling to polished export-ready structure.

> Good tools make room for good thinking. Keep the words, remove the noise.

## Who QuietMarkdown is for

- **Writers** who want a focused Markdown editor and beautiful, shareable documents
- **Students** who need a private draft space with reliable PDF export
- **Professionals** who want presentable notes, proposals, and reports without sending work to a cloud service

## 1. Start with a useful brief

Every strong document has a simple job. Define the outcome before you polish the language.

- **Audience:** the person who needs to understand this
- **Decision:** the action this document should support
- **Evidence:** the details that make the decision easier
- **Next step:** the smallest useful action after reading

A sentence can be **important**, *considered*, or ~~unnecessary~~. Use inline code like \`npm run build\` when precision matters, and turn a useful reference into a [helpful link](https://www.markdownguide.org/).

## 2. Compare the options

| Approach | Best for | Tradeoff |
| --- | --- | --- |
| Write | Focused drafting | Source only |
| Split | Editing with context | Less room on small screens |
| Preview | Reading and presenting | No visible source |

## 3. Build the work in small passes

1. Write a rough first version.
2. Give every section a useful heading.
3. Cut anything that does not move the reader forward.
4. Export only when the structure feels settled.

### A practical checklist

- [x] The opening explains why this matters
- [x] The document has a clear hierarchy
- [ ] The final reader has reviewed the closing section
- [ ] The export style and watermark fit the audience

## 4. Make the document visual

![QuietMarkdown document illustration](/quietmarkdown-example.svg)

*Use local images when you want reliable private exports. Images hosted elsewhere can be affected by browser permissions during PNG export.*

## 5. Preserve exact details

Fenced code blocks stay readable in the editor, preview, HTML export, PDF print flow, and PNG pages.

\`\`\`ts
type Draft = {
  audience: string
  purpose: string
  readyToExport: boolean
}

const draft: Draft = {
  audience: 'A thoughtful reader',
  purpose: 'Make the next step obvious',
  readyToExport: true,
}
\`\`\`

> A blockquote is useful for a guiding principle, a source excerpt, or a short pull quote that deserves a pause.

---

## 5.5. From idea to a shareable document

QuietMarkdown can turn a rough idea into a clear, polished document. This diagram shows the loop: shape the structure, refine anything that is not ready, then export when the story is easy to follow.

\`\`\`mermaid
flowchart TD
    A[Start: Define Outcome] --> B{Is scope clear?}
    B -->|No| C[Refine brief & gather evidence]
    C --> B
    B -->|Yes| D[Draft structure: headings & sections]
    D --> E[Write first pass]
    E --> F{Review with audience}
    F -->|Needs work| G[Revise & restructure]
    G --> F
    F -->|Clear| H[Polish: typography, code, tables, images]
    H --> I[Choose export preset & watermark]
    I --> J[Download PDF / HTML / PNG]
    J --> K[Share with confidence]

    style A fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#1f2937
    style B fill:#ffffff,stroke:#6b7280,stroke-width:2px,color:#1f2937
    style C fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    style D fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1f2937
    style E fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1f2937
    style F fill:#ffffff,stroke:#6b7280,stroke-width:2px,color:#1f2937
    style G fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#1f2937
    style H fill:#e0e7ff,stroke:#4f46e5,stroke-width:2px,color:#1f2937
    style I fill:#fce7f3,stroke:#db2777,stroke-width:2px,color:#1f2937
    style J fill:#ffffff,stroke:#6b7280,stroke-width:2px,color:#1f2937
    style K fill:#d1fae5,stroke:#059669,stroke-width:2px,color:#1f2937

    linkStyle default stroke:#808080,stroke-width:2px

\`\`\`

*Mermaid diagrams render in real-time as you type and are included in PDF, HTML, and PNG exports.*

---

## Frequently asked questions

### Does QuietMarkdown upload my document?

No. QuietMarkdown is frontend-only. Your draft and export preferences stay in this browser unless you download or share a file yourself.

### Which export should I choose?

Use **PDF** for a print-ready document, **HTML** for a portable styled page, and **PNG pages** when you need high-resolution image pages for sharing.

### Can I use images in a document?

Yes. Local image paths are the most dependable choice for privacy and export. Images hosted on another service can be affected by that service's browser permissions.

## 6. Finish with intent

Choose **Editorial** for a warm, expressive essay, **Minimal** for a quiet working document, or **Academic** for a formal paper with numbered sections. Then open **Export** to set paper size, typography, color, and a watermark before downloading.

Your Markdown remains the source of truth. Everything else is presentation. QuietMarkdown is open source on [GitHub](https://github.com/GautamVhavle/QuietMarkdown).`
