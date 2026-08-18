// Minimal PDF generator for PPSU event tickets
// Produces a single-page PDF with event details and a QR placeholder
// Uses raw PDF syntax (no external deps) to keep the edge function lightweight

function escapePdfText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface TicketPdfData {
  ticketNumber: string;
  bookingNumber: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  attendeeName: string;
  studentId: string;
  qrToken: string;
}

export function generateTicketPdf(data: TicketPdfData): Uint8Array {
  const lines: string[] = [];
  const navy = "0.027 0.102 0.169";
  const gold = "0.788 0.635 0.153";
  const ivory = "0.973 0.961 0.941";
  const dark = "0.13 0.13 0.13";
  const muted = "0.42 0.42 0.42";

  let y = 780;

  // Header band (navy)
  lines.push(`0.027 0.102 0.169 rg`);
  lines.push(`0 760 595 80 re f`);
  lines.push(`BT 0.788 0.635 0.153 rg /F2 9 Tf 40 ${y} Tm (PPSU EVENTS) Tj ET`);
  y -= 16;
  lines.push(`BT 1 1 1 rg /F1 7 Tf 40 ${y} Tm (Experience more. Connect more. Celebrate more.) Tj ET`);
  y -= 40;

  // Title
  lines.push(`BT ${navy} rg /F1 20 Tf 40 ${y} Tm (${escapePdfText(data.eventTitle)}) Tj ET`);
  y -= 28;

  // Ticket number
  lines.push(`BT ${gold} rg /F2 9 Tf 40 ${y} Tm (TICKET) Tj ET`);
  y -= 14;
  lines.push(`BT ${navy} rg /F2 14 Tf 40 ${y} Tm (${escapePdfText(data.ticketNumber)}) Tj ET`);
  y -= 28;

  // Info box background
  lines.push(`${ivory} rg 40 ${y - 110} 515 120 re f`);
  y -= 20;

  const rows: [string, string][] = [
    ["Attendee", data.attendeeName],
    ["Student ID", data.studentId],
    ["Date", data.eventDate],
    ["Time", data.eventTime],
    ["Venue", data.venue],
    ["Booking", data.bookingNumber],
  ];

  for (const [label, value] of rows) {
    lines.push(`BT ${muted} rg /F2 8 Tf 55 ${y} Tm (${escapePdfText(label.toUpperCase())}) Tj ET`);
    lines.push(`BT ${dark} rg /F1 11 Tf 180 ${y} Tm (${escapePdfText(value)}) Tj ET`);
    y -= 16;
  }

  y -= 10;
  lines.push(`BT ${muted} rg /F2 8 Tf 55 ${y} Tm (QR TOKEN) Tj ET`);
  lines.push(`BT ${dark} rg /F1 9 Tf 180 ${y} Tm (${escapePdfText(data.qrToken)}) Tj ET`);
  y -= 24;

  // Footer
  lines.push(`BT ${muted} rg /F2 7 Tf 40 40 Tm (Present this ticket at the entry gate. This ticket is valid only for the named attendee.) Tj ET`);
  lines.push(`BT ${muted} rg /F2 7 Tf 40 28 Tm (PPSU Events - P. P. Savani University, Surat, Gujarat) Tj ET`);

  // Build PDF
  const content = lines.join("\n");

  const header = `%PDF-1.4\n`;
  const fontObjs = [
    `1 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    `2 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
  ];

  const objects: string[] = [];
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\n`);

  const pdfParts: string[] = [header];

  // Font objects
  pdfParts.push(fontObjs[0]);
  pdfParts.push(fontObjs[1]);

  // Content stream object (obj 3)
  const streamObj = `3 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;
  pdfParts.push(streamObj);

  // Page object (obj 4)
  const pageObj = `4 0 obj\n<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Contents 3 0 R /Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> >>\nendobj\n`;
  pdfParts.push(pageObj);

  // Pages object (obj 5)
  const pagesObj = `5 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n`;
  pdfParts.push(pagesObj);

  // Catalog (obj 6)
  const catalogObj = `6 0 obj\n<< /Type /Catalog /Pages 5 0 R >>\nendobj\n`;
  pdfParts.push(catalogObj);

  // Build xref
  let offset = 0;
  const offsets: number[] = [];
  let body = "";
  for (const part of pdfParts) {
    offsets.push(header.length + body.length);
    body += part;
  }

  const xrefStart = header.length + body.length;
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size 7 /Root 6 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const fullPdf = header + body + xref;
  return new TextEncoder().encode(fullPdf);
}
