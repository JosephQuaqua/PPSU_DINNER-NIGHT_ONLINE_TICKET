import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "./_cors.ts";

import {
  bookingSubmittedAdminHtml,
  bookingSubmittedCustomerHtml,
  paymentApprovedHtml,
  paymentRejectedHtml,
} from "./_templates.ts";


// =========================
// Types
// =========================

interface BookingDetail {
  booking_id: string;
  booking_number: string;
  total_amount: number;
  status: string;

  customer_name: string;
  customer_email: string;
  student_id: string;

  event_title: string;
  event_date: string;
  event_time: string;
  event_venue: string;

  ticket_id: string | null;
  ticket_number: string | null;
  qr_token: string | null;

  transaction_reference: string | null;
  admin_note: string | null;
}


interface RequestBody {
  type:
    | "booking_submitted"
    | "payment_approved"
    | "payment_rejected";

  booking_id: string;

  rejection_reason?: string;
}


// =========================
// Environment
// =========================

const RESEND_API_KEY =
  Deno.env.get("RESEND_API_KEY")!;


const RESEND_FROM_EMAIL =
  Deno.env.get("RESEND_FROM_EMAIL") ||
  "events@ppsu.ac.in";


const APP_URL =
  Deno.env.get("APP_URL") ||
  "http://localhost:5173";


const ORG_NAME =
  "PPSU Events";


const ADMIN_ROLE_NAMES = [
  "super_admin",
  "event_admin",
] as const;



const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL");


const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY",
  );


if (!SUPABASE_URL) {
  throw new Error(
    "SUPABASE_URL missing",
  );
}


if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY missing",
  );
}



const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);



// =========================
// Database
// =========================


async function fetchBookingDetail(
  bookingId: string,
): Promise<BookingDetail> {


  const { data: booking, error } =
    await supabase
      .from("bookings")
      .select(`
        id,
        booking_number,
        total_amount,
        status,
        event_id
      `)
      .eq(
        "id",
        bookingId,
      )
      .single();



  if (error || !booking) {

    console.error(
      "[email] booking lookup failed",
      error,
    );

    throw new Error(
      "Booking not found",
    );
  }



  const { data:event } =
    await supabase
      .from("events")
      .select(`
        title,
        event_date,
        start_time,
        venue
      `)
      .eq(
        "id",
        booking.event_id,
      )
      .single();



  const { data:attendee } =
    await supabase
      .from("attendees")
      .select(`
        full_name,
        email,
        student_id
      `)
      .eq(
        "booking_id",
        bookingId,
      )
      .eq(
        "is_self",
        true,
      )
      .single();



  const { data:payment } =
    await supabase
      .from("payments")
      .select(`
        transaction_reference,
        admin_note
      `)
      .eq(
        "booking_id",
        bookingId,
      )
      .order(
        "created_at",
        {
          ascending:false,
        },
      )
      .limit(1)
      .single();



  const { data:ticket } =
    await supabase
      .from("tickets")
      .select(`
        id,
        ticket_number,
        qr_token
      `)
      .eq(
        "booking_id",
        bookingId,
      )
      .limit(1)
      .single();



  return {

    booking_id:
      booking.id,

    booking_number:
      booking.booking_number,


    total_amount:
      Number(
        booking.total_amount,
      ),


    status:
      booking.status,


    customer_name:
      attendee?.full_name ||
      "Student",


    customer_email:
      attendee?.email ||
      "",


    student_id:
      attendee?.student_id ||
      "",



    event_title:
      event?.title ||
      "PPSU Event",


    event_date:
      event?.event_date ||
      "",


    event_time:
      event?.start_time ||
      "",


    event_venue:
      event?.venue ||
      "",



    ticket_id:
      ticket?.id ||
      null,


    ticket_number:
      ticket?.ticket_number ||
      null,


    qr_token:
      ticket?.qr_token ||
      null,



    transaction_reference:
      payment?.transaction_reference ||
      null,


    admin_note:
      payment?.admin_note ||
      null,

  };
}




async function getAdminEmails()
: Promise<string[]> {


  const { data, error } =
    await supabase
      .from("staff_roles")
      .select(
        "user_id",
      )
      .in(
        "role",
        ADMIN_ROLE_NAMES,
      );



  if(error){

    console.error(
      "[email] admin role error",
      error,
    );

    return [];
  }



  const emails:string[] = [];



  for(
    const staff of data ?? []
  ){

    const { data:user } =
      await supabase.auth.admin
      .getUserById(
        staff.user_id,
      );


    if(
      user.user?.email
    ){
      emails.push(
        user.user.email,
      );
    }

  }



  return [
    ...new Set(emails),
  ];

}
// =========================
// Email Logs
// =========================


async function hasEmailBeenSent(
  bookingId:string,
  emailType:string,
):Promise<boolean>{

  const {data}=await supabase
    .from("email_logs")
    .select("id")
    .eq(
      "booking_id",
      bookingId,
    )
    .eq(
      "email_type",
      emailType,
    )
    .eq(
      "status",
      "sent",
    )
    .maybeSingle();


  return !!data;
}




async function logEmail(
  bookingId:string,
  emailType:string,
  recipient:string,
  resendId:string|null,
  error:string|null,
){

  await supabase
    .from("email_logs")
    .insert({

      booking_id:
        bookingId,

      email_type:
        emailType,

      recipient_email:
        recipient,

      status:
        error
          ? "failed"
          : "sent",

      resend_id:
        resendId,

      error,

    });

}




// =========================
// Resend
// =========================


async function sendViaResend(
  to:string,
  subject:string,
  html:string,
){

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method:"POST",

        headers:{
          Authorization:
            `Bearer ${RESEND_API_KEY}`,

          "Content-Type":
            "application/json",
        },


        body:JSON.stringify({

          from:
            RESEND_FROM_EMAIL,

          to:[
            to,
          ],

          subject,

          html,

        }),

      },
    );



  const result =
    await response.json();



  if(!response.ok){

    return {

      id:null,

      error:
        result.message ||
        "Email failed",

    };

  }



  return {

    id:
      result.id ||
      null,

    error:null,

  };

}




function formatAmount(
  value:number,
){

 return new Intl.NumberFormat(
   "en-IN",
   {
    style:"currency",
    currency:"INR",
    maximumFractionDigits:0,
   },
 ).format(value);

}




// =========================
// Booking Submitted
// =========================


async function handleBookingSubmitted(
 bookingId:string,
){

 const detail =
   await fetchBookingDetail(
     bookingId,
   );



 const admins =
   await getAdminEmails();



 for(
   const email of admins
 ){


   const emailType =
    `booking_submitted_admin_${email}`;



   if(
     await hasEmailBeenSent(
       bookingId,
       emailType,
     )
   ){
     continue;
   }



   const html =
    bookingSubmittedAdminHtml({

      bookingId:
        detail.booking_number,

      customerName:
        detail.customer_name,

      email:
        detail.customer_email,


      amount:
        formatAmount(
          detail.total_amount,
        ),


      paymentReference:
        detail.transaction_reference ||
        "Not provided",


      adminUrl:
        `${APP_URL}/admin/payments`,

    });



   const {id,error} =
    await sendViaResend(
      email,
      "New Booking Payment Awaiting Approval",
      html,
    );



   await logEmail(
     bookingId,
     emailType,
     email,
     id,
     error,
   );

 }



 const customerType =
   "booking_submitted_customer";



 if(
  !(await hasEmailBeenSent(
    bookingId,
    customerType,
  ))
 ){

  const html =
   bookingSubmittedCustomerHtml({

    customerName:
      detail.customer_name,

    bookingId:
      detail.booking_number,

   });



  const {id,error} =
    await sendViaResend(
      detail.customer_email,
      "Booking & Payment Request Received",
      html,
    );



  await logEmail(
    bookingId,
    customerType,
    detail.customer_email,
    id,
    error,
  );

 }


 return json({
   success:true,
 });

}



// =========================
// Payment Approved
// =========================


async function handlePaymentApproved(
 bookingId:string,
){


 const detail =
   await fetchBookingDetail(
     bookingId,
   );



 if(
  await hasEmailBeenSent(
    bookingId,
    "payment_approved",
  )
 ){

  return json({
    success:true,
    message:"Already sent",
  });

 }



 if(
   !detail.ticket_id
 ){

  return json(
   {
    error:
    "Ticket not generated",
   },
   400,
  );

 }



 const ticketUrl =
   `${APP_URL}/dashboard/tickets/${detail.ticket_id}`;



 const html =
   paymentApprovedHtml({

    customerName:
      detail.customer_name,


    bookingId:
      detail.booking_number,


    orgName:
      ORG_NAME,


    ticketUrl,

   });



 const {id,error} =
   await sendViaResend(
    detail.customer_email,
    "Booking Confirmed - Payment Approved",
    html,
   );



 await logEmail(
   bookingId,
   "payment_approved",
   detail.customer_email,
   id,
   error,
 );



 if(error){

  return json(
   {
    error,
   },
   500,
  );

 }



 return json({
   success:true,
 });

}



// =========================
// Payment Rejected
// =========================


async function handlePaymentRejected(
 bookingId:string,
 reason:string,
){


 const detail =
   await fetchBookingDetail(
    bookingId,
   );



 if(
 await hasEmailBeenSent(
   bookingId,
   "payment_rejected",
 )
 ){

 return json({
   success:true,
 });

 }



 const html =
  paymentRejectedHtml({

    customerName:
      detail.customer_name,


    bookingId:
      detail.booking_number,


    rejectionReason:
      reason,

  });



 const {id,error} =
  await sendViaResend(
    detail.customer_email,
    "Booking Payment Request Rejected",
    html,
  );



 await logEmail(
  bookingId,
  "payment_rejected",
  detail.customer_email,
  id,
  error,
 );



 return json({
  success:
    !error,
 });

}




// =========================
// API Endpoint
// =========================


Deno.serve(
 async(req:Request)=>{


 if(req.method==="OPTIONS"){

  return new Response(
   null,
   {
    headers:corsHeaders,
   },
  );

 }



 if(req.method!=="POST"){

  return json(
   {
    error:
    "Method not allowed",
   },
   405,
  );

 }



 try{


 const body = await req.json() as RequestBody;



 switch(body.type){


 case "booking_submitted":

  return await handleBookingSubmitted(
    body.booking_id,
  );



 case "payment_approved":

  return await handlePaymentApproved(
    body.booking_id,
  );



 case "payment_rejected":

  return await handlePaymentRejected(
    body.booking_id,
    body.rejection_reason ||
    "No reason provided",
  );


 default:

  return json(
   {
    error:
    "Unknown email type",
   },
   400,
  );

 }


 }catch(error){


 console.error(
   "[email] error",
   error,
 );


 return json(
  {
   error:
   error instanceof Error
    ? error.message
    : String(error),
  },
  500,
 );


 }


});