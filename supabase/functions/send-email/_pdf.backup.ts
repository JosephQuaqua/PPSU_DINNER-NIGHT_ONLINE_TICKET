// PPSU Event Ticket PDF Generator
// Pure Deno implementation - no browser dependencies

function escapePdfText(value: string): string {
  return String(value)
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


function createText(
  text: string,
  x: number,
  y: number,
  size: number,
  font = "F1",
): string {
  return `
BT
/${font} ${size} Tf
${x} ${y} Td
(${escapePdfText(text)}) Tj
ET
`;
}


export function generateTicketPdf(
  data: TicketPdfData,
): Uint8Array {


  const content: string[] = [];


  // Background
  content.push(`
q
0.97 0.96 0.94 rg
0 0 595 842 re
f
Q
`);


  // Header navy
  content.push(`
q
0.027 0.102 0.169 rg
0 720 595 122 re
f
Q
`);


  // Header text
  content.push(
    createText(
      "PPSU EVENTS",
      40,
      790,
      18,
      "F2",
    ),
  );


  content.push(
    createText(
      "Digital Event Ticket",
      40,
      760,
      11,
      "F1",
    ),
  );


  // Event title

  content.push(
    createText(
      data.eventTitle,
      40,
      670,
      22,
      "F2",
    ),
  );


  // Ticket number box

  content.push(`
q
0.788 0.635 0.153 rg
40 580 515 55 re
f
Q
`);


  content.push(
    createText(
      "TICKET NUMBER",
      55,
      615,
      9,
      "F2",
    ),
  );


  content.push(
    createText(
      data.ticketNumber,
      55,
      592,
      16,
      "F2",
    ),
  );



  // Details section

  let y = 520;


  const details = [
    [
      "ATTENDEE",
      data.attendeeName,
    ],

    [
      "STUDENT ID",
      data.studentId,
    ],

    [
      "DATE",
      data.eventDate,
    ],

    [
      "TIME",
      data.eventTime,
    ],

    [
      "VENUE",
      data.venue,
    ],

    [
      "BOOKING",
      data.bookingNumber,
    ],
  ];



  for (const [label, value] of details) {


    content.push(
      createText(
        label,
        55,
        y,
        9,
        "F2",
      ),
    );


    content.push(
      createText(
        value || "-",
        200,
        y,
        11,
        "F1",
      ),
    );


    y -= 35;
  }



  // QR placeholder area
  // (QR token printed for validation)

  content.push(`
q
0.92 0.90 0.85 rg
390 300 150 150 re
f
Q
`);


  content.push(
    createText(
      "QR CODE",
      425,
      380,
      12,
      "F2",
    ),
  );


  content.push(
    createText(
      data.qrToken.substring(
        0,
        22,
      ),
      405,
      340,
      8,
      "F1",
    ),
  );



  // Footer

  content.push(
    createText(
      "Present this ticket at the entry gate.",
      40,
      80,
      9,
      "F1",
    ),
  );


  content.push(
    createText(
      "PPSU Events - P. P. Savani University",
      40,
      60,
      8,
      "F1",
    ),
  );



  const stream =
    content.join("\n");



  const encoder =
    new TextEncoder();


  const streamLength =
    encoder.encode(stream).length;



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



  objects.push(
`3 0 obj
<<
/Length ${streamLength}
>>
stream
${stream}
endstream
endobj
`,
  );



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
`%PDF-1.4
`;

  const offsets:number[] = [];


  for(
    const obj of objects
  ){

    offsets.push(
      encoder.encode(pdf).length,
    );

    pdf += obj;
  }



  const xrefPosition =
    encoder.encode(pdf).length;



  pdf +=
`xref
0 7
0000000000 65535 f 
`;



  for(
    const offset of offsets
  ){

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



  return encoder.encode(pdf);
}