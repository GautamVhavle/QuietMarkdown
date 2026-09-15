// pdf-lib standard font sets per family.
import type { PDFDocument} from 'pdf-lib';
import { StandardFonts, type PDFFont } from 'pdf-lib'

import type { PdfFontFamily } from '../../lib/fonts'

export interface FontSet {
  body: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
  mono: PDFFont
  monoBold: PDFFont
}

export async function loadFonts(pdf: PDFDocument, family: PdfFontFamily): Promise<FontSet> {
  if (family === 'mono') {
    const body = await pdf.embedFont(StandardFonts.Courier)
    const bold = await pdf.embedFont(StandardFonts.CourierBold)
    const italic = await pdf.embedFont(StandardFonts.CourierOblique)
    return { body, bold, italic, boldItalic: bold, mono: body, monoBold: bold }
  }
  if (family === 'serif') {
    return {
      body: await pdf.embedFont(StandardFonts.TimesRoman),
      bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
      italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
      boldItalic: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
      mono: await pdf.embedFont(StandardFonts.Courier),
      monoBold: await pdf.embedFont(StandardFonts.CourierBold),
    }
  }
  return {
    body: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    mono: await pdf.embedFont(StandardFonts.Courier),
    monoBold: await pdf.embedFont(StandardFonts.CourierBold),
  }
}
