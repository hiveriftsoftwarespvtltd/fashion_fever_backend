export const serviceBookingTemplate = (
  name: string,
  booking: {
    serviceTitle: string;
    providerName: string;
    staffName?: string;
    bookingDate: string;
    slotStartTime: string;
    slotEndTime: string;
    serviceAddress: string;
    totalAmount: number;
    bookingStatus: string;
    bookingId: string;
  },
) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Booking Confirmation - WakeUp MakeUp</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f7fb;
  font-family:Arial, Helvetica, sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;">
  <tr>
    <td align="center" style="padding:40px 20px;">

      <table width="600" cellpadding="0" cellspacing="0" style="
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 10px 30px rgba(0,0,0,0.08);
      ">

        <!-- HEADER -->
        <tr>
          <td style="
            background:linear-gradient(135deg,#ff4d6d,#ff758f);
            padding:40px;
            text-align:center;
          ">
            <h1 style="margin:0;color:#fff;font-size:32px;">
              WakeUp MakeUp
            </h1>
            <p style="margin-top:8px;color:#fff;font-size:15px;">
              Booking Confirmation
            </p>
          </td>
        </tr>

        <!-- CONTENT -->
        <tr>
          <td style="padding:40px;">

            <h2 style="margin-top:0;color:#111827;">
              Hi ${name} 👋
            </h2>

            <p style="color:#4b5563;line-height:1.7;">
              Your service booking has been successfully confirmed.
              Here are your booking details:
            </p>

            <!-- BOOKING CARD -->
            <div style="
              background:#f9fafb;
              border:1px solid #e5e7eb;
              border-radius:12px;
              padding:20px;
              margin:25px 0;
            ">

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Booking ID:</strong> ${booking.bookingId}
              </p>

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Service:</strong> ${booking.serviceTitle}
              </p>

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Provider:</strong> ${booking.providerName}
              </p>

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Staff:</strong> ${booking.staffName || 'Assigned by provider'}
              </p>

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Date:</strong> ${booking.bookingDate}
              </p>

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Time:</strong> ${booking.slotStartTime} - ${booking.slotEndTime}
              </p>

              <p style="margin:0 0 10px;color:#111827;">
                <strong>Address:</strong> ${booking.serviceAddress}
              </p>

              <p style="margin:0;color:#111827;">
                <strong>Status:</strong>
                <span style="color:#16a34a;font-weight:600;">
                  ${booking.bookingStatus}
                </span>
              </p>
            </div>

            <!-- AMOUNT -->
            <div style="
              background:#ecfdf5;
              border:1px solid #bbf7d0;
              padding:15px;
              border-radius:10px;
              text-align:center;
              margin-bottom:25px;
            ">
              <p style="margin:0;color:#166534;font-size:16px;">
                Total Paid: <strong>₹${booking.totalAmount}</strong>
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin:30px 0;">
              <a href="https://wakeup-makeup.com/user/bookings" style="
                background:#ff4d6d;
                color:#fff;
                text-decoration:none;
                padding:14px 28px;
                border-radius:10px;
                font-weight:600;
                display:inline-block;
              ">
                View My Booking
              </a>
            </div>

            <p style="color:#6b7280;font-size:13px;line-height:1.6;">
              If you have any questions or need to reschedule/cancel your booking,
              please visit your dashboard or contact support.
            </p>

            <p style="margin-top:25px;color:#111827;">
              Thanks,<br/>
              <strong>WakeUp MakeUp Team</strong>
            </p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="
            background:#f9fafb;
            border-top:1px solid #e5e7eb;
            padding:20px;
            text-align:center;
          ">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              © ${new Date().getFullYear()} WakeUp MakeUp. All rights reserved.
            </p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
  `;
};

export const bookingCancelledTemplate = (
  name: string,
  booking: {
    serviceTitle: string;
    providerName: string;
    bookingDate: string;
    slotStartTime: string;
    slotEndTime: string;
    bookingId: string;
    cancellationReason?: string;
  },
) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Booking Cancelled</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial">

<table width="100%">
<tr>
<td align="center" style="padding:40px 20px;">

<table width="600" style="background:#fff;border-radius:16px;overflow:hidden;">

<tr>
<td style="background:linear-gradient(135deg,#ef4444,#f87171);padding:40px;text-align:center;">
<h1 style="color:#fff;margin:0;">WakeUp MakeUp</h1>
<p style="color:#fff;">Booking Cancelled</p>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2>Hi ${name} ❌</h2>

<p style="color:#4b5563;">
Your booking has been <strong>cancelled</strong>.
</p>

<div style="background:#fef2f2;border:1px solid #fecaca;padding:20px;border-radius:12px;">
<p><strong>Booking ID:</strong> ${booking.bookingId}</p>
<p><strong>Service:</strong> ${booking.serviceTitle}</p>
<p><strong>Provider:</strong> ${booking.providerName}</p>
<p><strong>Date:</strong> ${booking.bookingDate}</p>
<p><strong>Time:</strong> ${booking.slotStartTime} - ${booking.slotEndTime}</p>
</div>

${booking.cancellationReason
      ? `<p style="margin-top:15px;color:#991b1b;"><strong>Reason:</strong> ${booking.cancellationReason}</p>`
      : ''
    }

<p style="margin-top:20px;color:#6b7280;">
If any payment was made, refund (if applicable) will be processed as per policy.
</p>

<p>Thanks,<br/><strong>WakeUp MakeUp Team</strong></p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
  `;
};

export const bookingRescheduledTemplate = (
  name: string,
  booking: {
    serviceTitle: string;
    providerName: string;
    oldDate: string;
    oldTime: string;
    newDate: string;
    newTime: string;
    bookingId: string;
  },
) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Booking Rescheduled</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial">

<table width="100%">
<tr>
<td align="center" style="padding:40px 20px;">

<table width="600" style="background:#fff;border-radius:16px;overflow:hidden;">

<tr>
<td style="background:linear-gradient(135deg,#f59e0b,#fbbf24);padding:40px;text-align:center;">
<h1 style="color:#fff;margin:0;">WakeUp MakeUp</h1>
<p style="color:#fff;">Booking Rescheduled</p>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2>Hi ${name} 🔁</h2>

<p style="color:#4b5563;">
Your booking has been successfully <strong>rescheduled</strong>.
</p>

<div style="background:#fffbeb;border:1px solid #fde68a;padding:20px;border-radius:12px;">
<p><strong>Booking ID:</strong> ${booking.bookingId}</p>
<p><strong>Service:</strong> ${booking.serviceTitle}</p>
<p><strong>Provider:</strong> ${booking.providerName}</p>

<hr style="margin:10px 0;"/>

<p><strong>Old Slot:</strong> ${booking.oldDate} | ${booking.oldTime}</p>
<p><strong>New Slot:</strong> ${booking.newDate} | ${booking.newTime}</p>
</div>

<p style="margin-top:20px;color:#6b7280;">
Please make sure to be available at the new scheduled time.
</p>

<p>Thanks,<br/><strong>WakeUp MakeUp Team</strong></p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
  `;
};


export const bookingCompletedTemplate = (
  name: string,
  booking: {
    serviceTitle: string;
    providerName: string;
    staffName?: string;
    bookingDate: string;
    bookingId: string;
    totalAmount: number;
  },
) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Service Completed</title>
</head>

<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial">

<table width="100%">
<tr>
<td align="center" style="padding:40px 20px;">

<table width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;">

<!-- HEADER -->
<tr>
<td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:40px;text-align:center;">
<h1 style="color:#fff;margin:0;">WakeUp MakeUp</h1>
<p style="color:#fff;margin-top:8px;">Service Completed</p>
</td>
</tr>

<!-- CONTENT -->
<tr>
<td style="padding:40px;">

<h2>Hi ${name} 🎉</h2>

<p style="color:#4b5563;line-height:1.7;">
Your service has been <strong>successfully completed</strong>.
We hope you had a great experience with us.
</p>

<!-- BOOKING DETAILS -->
<div style="background:#ecfdf5;border:1px solid #bbf7d0;padding:20px;border-radius:12px;margin-top:20px;">
<p><strong>Booking ID:</strong> ${booking.bookingId}</p>
<p><strong>Service:</strong> ${booking.serviceTitle}</p>
<p><strong>Provider:</strong> ${booking.providerName}</p>
<p><strong>Staff:</strong> ${booking.staffName || 'N/A'}</p>
<p><strong>Date:</strong> ${booking.bookingDate}</p>
</div>

<!-- AMOUNT -->
<div style="margin-top:20px;text-align:center;background:#f0fdf4;padding:15px;border-radius:10px;">
<p style="margin:0;color:#166534;font-size:16px;">
<strong>Total Paid:</strong> ₹${booking.totalAmount}
</p>
</div>

<!-- THANK YOU MESSAGE -->
<p style="margin-top:25px;color:#4b5563;line-height:1.7;">
Thank you for choosing <strong>WakeUp MakeUp</strong> 💄  
Your trust means a lot to us.
</p>

<!-- REBOOK SECTION -->
<div style="
  margin-top:30px;
  background:#fff7ed;
  border:1px solid #fed7aa;
  border-radius:12px;
  padding:20px;
  text-align:center;
">

<p style="margin:0;color:#9a3412;font-size:15px;">
✨ We’d love to see you again!
</p>

<p style="margin:8px 0 15px;color:#9a3412;font-size:13px;">
Book your next beauty appointment and keep glowing.
</p>

<a href="https://wakeup-makeup.com/" style="
  display:inline-block;
  background:#ff4d6d;
  color:#ffffff;
  text-decoration:none;
  padding:12px 26px;
  border-radius:8px;
  font-weight:600;
  font-size:14px;
">
Book Again
</a>

</div>

<!-- FOOTER -->
<p style="margin-top:30px;color:#6b7280;font-size:13px;">
We appreciate your support and look forward to serving you again.
</p>

<p style="margin-top:20px;">
Best Regards,<br/>
<strong>WakeUp MakeUp Team</strong>
</p>

</td>
</tr>

<!-- FOOTER BAR -->
<tr>
<td style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#9ca3af;font-size:12px;">
© ${new Date().getFullYear()} WakeUp MakeUp. All rights reserved.
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
  `;
};