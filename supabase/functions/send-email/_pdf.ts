// Minimal PDF generator for PPSU event tickets
// Generates a valid single-page PDF without external dependencies.

function escapePdfText(s: string): string {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
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

export function generateTicketPdf(
  data: TicketPdfData,
): Uint8Array {

  const lines: string[] = [];

  const navy = "0.027 0.102 0.169";
  const gold = "0.788 0.635 0.153";
  const ivory = "0.973 0.961 0.941";
  const dark = "0.13 0.13 0.13";
  const muted = "0.42 0.42 0.42";

  let y = 780;


  // Header
  lines.push(`0.027 0.102 0.169 rg`);
  lines.push(`0 740 595 100 re f`);

  lines.push(
    `BT ${gold} rg /F2 12 Tf 40 ${y} Tm (PPSU EVENTS) Tj ET`
  );

  y -= 25;

  lines.push(
    `BT 1 1 1 rg /F1 9 Tf 40 ${y} Tm (Digital Event Ticket) Tj ET`
  );

  y -= 55;


  // Event title
  lines.push(
    `BT ${navy} rg /F2 20 Tf 40 ${y} Tm (${escapePdfText(
      data.eventTitle,
    )}) Tj ET`,
  );

  y -= 35;


  // Ticket number
  lines.push(
    `BT ${gold} rg /F2 10 Tf 40 ${y} Tm (TICKET NUMBER) Tj ET`,
  );

  y -= 18;

  lines.push(
    `BT ${navy} rg /F2 16 Tf 40 ${y} Tm (${escapePdfText(
      data.ticketNumber,
    )}) Tj ET`,
  );

  y -= 45;


  // Info box
  lines.push(
    `${ivory} rg 40 ${y - 160} 515 170 re f`,
  );


  const rows: [string, string][] = [
    ["ATTENDEE", data.attendeeName],
    ["STUDENT ID", data.studentId],
    ["DATE", data.eventDate],
    ["TIME", data.eventTime],
    ["VENUE", data.venue],
    ["BOOKING", data.bookingNumber],
  ];


  let rowY = y - 25;


  for (const [label, value] of rows) {

    lines.push(
      `BT ${muted} rg /F2 8 Tf 60 ${rowY} Tm (${escapePdfText(
        label,
      )}) Tj ET`,
    );


    lines.push(
      `BT ${dark} rg /F1 11 Tf 190 ${rowY} Tm (${escapePdfText(
        value,
      )}) Tj ET`,
    );


    rowY -= 22;
  }


  rowY -= 10;


  // QR token
  lines.push(
    `BT ${muted} rg /F2 8 Tf 60 ${rowY} Tm (QR TOKEN) Tj ET`,
  );


  lines.push(
    `BT ${dark} rg /F1 8 Tf 190 ${rowY} Tm (${escapePdfText(
      data.qrToken,
    )}) Tj ET`,
  );


  // Footer

  lines.push(
    `BT ${muted} rg /F1 8 Tf 40 50 Tm (Present this ticket at the entry gate.) Tj ET`,
  );


  lines.push(
    `BT ${muted} rg /F1 8 Tf 40 35 Tm (PPSU Events - P. P. Savani University) Tj ET`,
  );



  const content =
    lines.join("\n");


  const contentBytes =
    new TextEncoder().encode(content);



  const header =
    "%PDF-1.4\n";



  const objects: string[] = [];



  objects.push(
`1 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
`,
  );


  objects.push(
`2 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj
`,
  );



  const streamObj =
`3 0 obj
<<
/Length ${contentBytes.length}
>>
stream
${content}
endstream
endobj
`;

  objects.push(streamObj);



  objects.push(
`4 0 obj
<<
/Type /Page
/Parent 5 0 R
/MediaBox [0 0 595 842]
/Contents 3 0 R
/Resources <<
/Font <<
/F1 1 0 R
/F2 2 0 R
>>
>>
>>
endobj
`,
  );



  objects.push(
`5 0 obj
<<
/Type /Pages
/Kids [4 0 R]
/Count 1
>>
endobj
`,
  );



  objects.push(
`6 0 obj
<<
/Type /Catalog
/Pages 5 0 R
>>
endobj
`,
  );



  let pdf =
    header;



  const offsets:number[] = [];



  for (
    const obj of objects
  ) {

    offsets.push(
      pdf.length,
    );

    pdf += obj;

  }



  const xrefPosition =
    pdf.length;



  pdf +=
`xref
0 7
0000000000 65535 f 
`;



  for (
    const offset of offsets
  ) {

    pdf +=
`${String(offset).padStart(10,"0")} 00000 n 
`;

  }



  pdf +=
`trailer
<<
/Size 7
/Root 6 0 R
>>
startxref
${xrefPosition}
%%EOF`;



  return new TextEncoder()
    .encode(pdf);

}