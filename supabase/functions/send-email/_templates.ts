// Professional HTML email templates for PPSU Events
// All templates use a consistent navy/ivory/gold design system

const ORG = "PPSU Events";
const NAVY = "#071A2B";
const GOLD = "#C9A227";
const IVORY = "#F8F5F0";

function shell(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
</head>

<body style="margin:0;padding:0;background:${IVORY};font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#222;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};padding:32px 16px;">
<tr>
<td align="center">

<table width="600" cellpadding="0" cellspacing="0"
style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(7,26,43,.06);">

<tr>
<td style="background:${NAVY};padding:28px 40px;">
<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:${GOLD};text-transform:uppercase;">
${ORG}
</p>

<p style="margin:4px 0 0;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,.4);text-transform:uppercase;">
Experience more. Connect more. Celebrate more.
</p>
</td>
</tr>


<tr>
<td style="padding:36px 40px 16px;">
${inner}
</td>
</tr>


<tr>
<td style="padding:16px 40px 28px;">
<p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
This email was sent by ${ORG}. If you believe this was sent in error, please contact our support team.
</p>
</td>
</tr>


</table>

</td>
</tr>
</table>

</body>
</html>`;
}


function infoRow(label: string, value: string): string {
  return `
<tr>
<td style="padding:6px 0;font-size:14px;color:#666;width:40%;">
${label}
</td>

<td style="padding:6px 0;font-size:14px;font-weight:600;color:${NAVY};">
${value}
</td>
</tr>`;
}


function button(href: string, label: string): string {
  return `
<a href="${href}"
style="
display:inline-block;
background:${GOLD};
color:${NAVY};
font-size:14px;
font-weight:700;
text-decoration:none;
padding:14px 32px;
border-radius:50px;
">
${label}
</a>`;
}



export function bookingSubmittedAdminHtml(d: {
  bookingId: string;
  customerName: string;
  email: string;
  amount: string;
  paymentReference: string;
  adminUrl: string;
}): string {

const inner = `

<h1 style="margin:0 0 4px;font-size:24px;color:${NAVY};font-weight:700;">
New Booking Payment Awaiting Approval
</h1>


<p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
A new booking and payment request has been submitted and is waiting for your approval.
</p>


<table width="100%" cellpadding="0" cellspacing="0"
style="background:${IVORY};border-radius:12px;padding:20px;margin-bottom:28px;">

${infoRow("Booking ID", d.bookingId)}
${infoRow("Customer Name", d.customerName)}
${infoRow("Email", d.email)}
${infoRow("Amount", d.amount)}
${infoRow("Payment Reference", d.paymentReference)}

</table>


<p style="font-size:14px;color:#444;margin-bottom:20px;">
Please log in to the admin dashboard to review this request.
</p>


${button(d.adminUrl,"Review Booking")}

`;

return shell(
"New Booking Payment Awaiting Approval",
inner
);

}




export function bookingSubmittedCustomerHtml(d:{
customerName:string;
bookingId:string;
}):string {


const inner = `

<h1 style="margin:0 0 4px;font-size:24px;color:${NAVY};font-weight:700;">
Booking &amp; Payment Request Received
</h1>


<p style="margin:0 0 20px;font-size:14px;color:#444;">
Dear ${d.customerName},
</p>


<p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6;">
Thank you for submitting your booking and payment request.
Your request has been received and is currently
<strong style="color:${NAVY};">
pending administrative approval
</strong>.
</p>


<table width="100%" cellpadding="0" cellspacing="0"
style="background:${IVORY};border-radius:12px;padding:20px;margin-bottom:20px;">

${infoRow("Booking ID",d.bookingId)}
${infoRow("Payment Status","Pending")}

</table>


<p style="font-size:14px;color:#444;">
We will notify you once your request has been approved or rejected.
</p>

`;

return shell(
"Booking & Payment Request Received",
inner
);

}





export function paymentApprovedHtml(d:{
customerName:string;
bookingId:string;
orgName:string;
ticketUrl:string;
}):string {


const inner = `


<h1 style="margin:0 0 4px;font-size:24px;color:${NAVY};font-weight:700;">
Booking Confirmed — Payment Approved
</h1>


<p style="margin:0 0 20px;font-size:14px;color:#444;">
Dear ${d.customerName},
</p>


<p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6;">
We are pleased to inform you that your booking and payment have been successfully reviewed and approved.
</p>



<table width="100%" cellpadding="0" cellspacing="0"
style="background:${IVORY};border-radius:12px;padding:20px;margin-bottom:20px;">

${infoRow("Booking ID",d.bookingId)}
${infoRow("Payment Status","Approved")}
${infoRow("Booking Status","Confirmed")}

</table>



<p style="margin:0 0 20px;font-size:14px;color:#444;line-height:1.6;">
Your digital ticket is now ready.
Click the button below to open your ticket.
</p>


${button(d.ticketUrl,"View Digital Ticket")}



<p style="margin-top:24px;font-size:14px;color:#444;">
Thank you for choosing ${d.orgName}.
</p>


`;

return shell(
"Booking Confirmed — Payment Approved",
inner
);

}





export function paymentRejectedHtml(d:{
customerName:string;
bookingId:string;
rejectionReason:string;
}):string {


const inner = `


<h1 style="margin:0 0 4px;font-size:24px;color:${NAVY};font-weight:700;">
Booking Payment Request — Rejected
</h1>


<p style="margin:0 0 20px;font-size:14px;color:#444;">
Dear ${d.customerName},
</p>


<p style="margin:0 0 20px;font-size:14px;color:#444;">
We regret to inform you that your booking and payment request could not be approved.
</p>


<table width="100%" cellpadding="0" cellspacing="0"
style="background:${IVORY};border-radius:12px;padding:20px;margin-bottom:20px;">

${infoRow("Booking ID",d.bookingId)}
${infoRow("Payment Status","Rejected")}

</table>



<p style="font-size:14px;color:#444;">
<strong>Reason for rejection:</strong>
</p>


<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;">

<p style="margin:0;color:#991b1b;">
${d.rejectionReason}
</p>

</div>



<p style="font-size:14px;color:#444;">
If you believe this decision was made in error, please contact support.
</p>


`;

return shell(
"Booking Payment Request — Rejected",
inner
);

}