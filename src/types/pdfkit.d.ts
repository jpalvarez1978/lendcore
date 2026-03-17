declare module '@react-pdf/pdfkit' {
  interface PDFDocumentOptions {
    margin?: number
    size?: string | [number, number]
    layout?: 'portrait' | 'landscape'
    info?: {
      Title?: string
      Author?: string
      Subject?: string
      Keywords?: string
      CreationDate?: Date
      ModDate?: Date
    }
  }

  interface PdfTextOptions {
    align?: 'left' | 'center' | 'right' | 'justify'
    characterSpacing?: number
    lineGap?: number
    width?: number
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions)
    page: {
      width: number
      height: number
    }
    pipe(destination: NodeJS.WritableStream): this
    fontSize(size: number): this
    font(name: string): this
    text(text: string, x?: number, y?: number, options?: PdfTextOptions): this
    moveDown(lines?: number): this
    rect(x: number, y: number, w: number, h: number): this
    roundedRect(x: number, y: number, w: number, h: number, radius: number): this
    circle(x: number, y: number, radius: number): this
    fill(color?: string): this
    stroke(color?: string): this
    fillAndStroke(fillColor: string, strokeColor: string): this
    lineWidth(width: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    fillColor(color: string): this
    strokeColor(color: string): this
    image(src: string | Buffer, x?: number, y?: number, options?: object): this
    addPage(options?: PDFDocumentOptions): this
    end(): void
    save(): this
    restore(): this
    widthOfString(text: string): number
    heightOfString(text: string, options?: PdfTextOptions): number
    on(event: 'data', handler: (chunk: Uint8Array) => void): this
    on(event: 'end', handler: () => void): this
    on(event: 'error', handler: (error: unknown) => void): this
    y: number
    x: number
  }

  export default PDFDocument
}
