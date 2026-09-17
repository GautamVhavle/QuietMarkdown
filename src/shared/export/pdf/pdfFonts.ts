// Font sets for the real PDF typesetter. Body + heading faces are the
// actual selected Google Fonts (embedded as TTF subsets), so the PDF
// matches the HTML preview. Offline or missing faces fall back to the
// pdf-lib standard families. Code stays on Courier, matching preview mono.
import { StandardFonts, type PDFDocument, type PDFFont } from 'pdf-lib'

import type { ExportFontDef } from '../../lib/fonts'

import { embedFontFaces, type EmbeddedFaces } from './pdfFontFetch'

export interface FontSet {
  body: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
  heading: PDFFont
  headingBold: PDFFont
  headingItalic: PDFFont
  headingBoldItalic: PDFFont
  mono: PDFFont
  monoBold: PDFFont
  /** True when the body face is an embedded TTF (full Unicode). False when
   * falling back to standard fonts (WinAnsi only, needs pdfEncode). */
  unicode: boolean
}

async function standard(pdf: PDFDocument, name: (typeof StandardFonts)[keyof typeof StandardFonts]) {
  return pdf.embedFont(name)
}

export async function loadFonts(
  pdf: PDFDocument,
  bodyDef: ExportFontDef,
  headingDef: ExportFontDef,
): Promise<FontSet> {
  const [stdSerif, stdSerifBold, stdSerifItalic, stdSerifBoldItalic, stdMono, stdMonoBold] = await Promise.all([
    standard(pdf, StandardFonts.TimesRoman),
    standard(pdf, StandardFonts.TimesRomanBold),
    standard(pdf, StandardFonts.TimesRomanItalic),
    standard(pdf, StandardFonts.TimesRomanBoldItalic),
    standard(pdf, StandardFonts.Courier),
    standard(pdf, StandardFonts.CourierBold),
  ])
  const [stdSans, stdSansBold, stdSansOblique, stdSansBoldOblique] = await Promise.all([
    standard(pdf, StandardFonts.Helvetica),
    standard(pdf, StandardFonts.HelveticaBold),
    standard(pdf, StandardFonts.HelveticaOblique),
    standard(pdf, StandardFonts.HelveticaBoldOblique),
  ])
  const sans = bodyDef.pdf === 'sans'
  const fbBody = sans ? stdSans : stdSerif
  const fbBold = sans ? stdSansBold : stdSerifBold
  const fbItalic = sans ? stdSansOblique : stdSerifItalic
  const fbBoldItalic = sans ? stdSansBoldOblique : stdSerifBoldItalic

  let embedded: { body: EmbeddedFaces; heading: EmbeddedFaces } | null = null
  try {
    embedded = await embedFontFaces(pdf, bodyDef, headingDef)
  } catch {
    embedded = null
  }

  // First available face wins; fall back through regular, then standard.
  const pick = (faces: EmbeddedFaces | undefined, key: keyof EmbeddedFaces, fallback: PDFFont): PDFFont =>
    faces?.[key] ?? faces?.regular ?? fallback

  const bodyFaces = embedded?.body
  const headingFaces = embedded?.heading
  const bodyFont = pick(bodyFaces, 'regular', fbBody)
  const bodyBold = pick(bodyFaces, 'bold', fbBold)
  const bodyItalic = pick(bodyFaces, 'italic', fbItalic)
  const bodyBoldItalic = pick(bodyFaces, 'boldItalic', fbBoldItalic)
  const headFont = pick(headingFaces, 'regular', bodyFont)
  const headBold = pick(headingFaces, 'bold', bodyBold)
  const headItalic = pick(headingFaces, 'italic', bodyItalic)
  const headBoldItalic = pick(headingFaces, 'boldItalic', bodyBoldItalic)

  const isMonoBody = bodyDef.pdf === 'mono'
  return {
    body: bodyFont,
    bold: bodyBold,
    italic: bodyItalic,
    boldItalic: bodyBoldItalic,
    heading: headFont,
    headingBold: headBold,
    headingItalic: headItalic,
    headingBoldItalic: headBoldItalic,
    mono: isMonoBody ? bodyFont : stdMono,
    monoBold: isMonoBody ? bodyBold : stdMonoBold,
    unicode: bodyFaces?.regular != null,
  }
}
