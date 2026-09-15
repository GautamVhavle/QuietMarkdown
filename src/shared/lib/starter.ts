/**
 * The starter document every new visitor sees. Kept in its own module so the
 * Vite build (vite.config.ts) can prerender it into index.html for crawlers
 * and the app can load it as the first library document.
 */
export const STARTER_TITLE = 'Welcome to QuietMarkdown'

export const starterMarkdown = `# Welcome to QuietMarkdown

*A private Markdown editor that turns plain text into polished PDFs, web pages, and image pages.*

This starter note doubles as a tour. Read it, edit it, delete it. Everything here demonstrates a feature you can use right away.

> Good tools make room for good thinking. Keep the words, remove the noise.

## Write in plain text

A sentence can be **important**, *considered*, or ~~unnecessary~~. Use inline code like \`npm run build\` when precision matters, and turn a useful reference into a [helpful link](https://www.markdownguide.org/).

Headings give your document shape. This note uses them to walk you through the app, one section at a time.

## Stay organized

- **Audience:** the person who needs to understand this
- **Decision:** the action this document should support
- **Evidence:** the details that make the decision easier
- **Next step:** the smallest useful action after reading

Lists, tables, and checklists all work:

| View | Best for | Tradeoff |
| --- | --- | --- |
| Write | Focused drafting | Source only |
| Split | Editing with context | Less room on small screens |
| Preview | Reading and presenting | No visible source |

### A practical checklist

- [x] The opening explains why this matters
- [x] The document has a clear hierarchy
- [ ] The final reader has reviewed the closing section
- [ ] The export style and watermark fit the audience

## Add visuals and code

![QuietMarkdown document illustration](/quietmarkdown-example.svg)

*Paste screenshots straight into the editor. They stay local and export reliably.*

Fenced code blocks stay readable everywhere: editor, preview, HTML, PDF, and PNG.

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

> A blockquote fits a guiding principle, a source excerpt, or a short pull quote that deserves a pause.

---

## Export with confidence

1. Define the outcome and audience.
2. Draft headings and write a first pass.
3. Review with the reader in mind, then revise until the next step is obvious.
4. Open **Export**, pick a template, fine tune fonts and layout, then download PDF, HTML, or PNG.

Your Markdown remains the source of truth. Everything else is presentation.

---

## Frequently asked questions

### Does QuietMarkdown upload my document?

No. QuietMarkdown runs entirely in your browser. Drafts and preferences stay on this device unless you download or share a file yourself.

### Which export should I choose?

Use **PDF** for a print-ready document, **HTML** for a portable styled page, and **PNG pages** for high-resolution image pages. PNGs are rendered from the PDF itself, so page breaks always match.

### Can I use images in a document?

Yes. Pasting images keeps them local, which is the most dependable choice for privacy and export. Images hosted elsewhere can be blocked by browser permissions.

QuietMarkdown is open source on [GitHub](https://github.com/GautamVhavle/QuietMarkdown).`
