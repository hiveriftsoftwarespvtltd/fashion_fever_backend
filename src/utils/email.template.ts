
export const emailWrapper = (
  title: string,
  subtitle: string,
  content: string,
) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>

  <body style="
    margin:0;
    padding:0;
    background:#f4f7fb;
    font-family:Arial,Helvetica,sans-serif;
  ">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 20px;">

          <table width="600" cellpadding="0" cellspacing="0"
            style="
              background:#ffffff;
              border-radius:16px;
              overflow:hidden;
              box-shadow:0 10px 30px rgba(0,0,0,0.08);
            ">

            <tr>
              <td style="
                background:linear-gradient(135deg,#ff4d6d,#ff758f);
                padding:35px;
                text-align:center;
              ">
                <h1 style="
                  margin:0;
                  color:white;
                  font-size:30px;
                ">
                  FashionFever
                </h1>

                <p style="
                  margin-top:10px;
                  color:white;
                  font-size:15px;
                ">
                  Beauty Marketplace Platform
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:40px;">
                <h2 style="
                  margin-top:0;
                  color:#111827;
                ">
                  ${title}
                </h2>

                <p style="
                  color:#6b7280;
                  line-height:1.8;
                ">
                  ${subtitle}
                </p>

                ${content}
              </td>
            </tr>

            <tr>
              <td style="
                background:#f9fafb;
                padding:20px;
                text-align:center;
                border-top:1px solid #e5e7eb;
              ">
                <p style="
                  margin:0;
                  color:#9ca3af;
                  font-size:13px;
                ">
                  © ${new Date().getFullYear()} FashionFever. All Rights Reserved.
                </p>

                <p style="
                  margin-top:8px;
                  color:#9ca3af;
                  font-size:12px;
                ">
                  If you didn't request this email, you can safely ignore it.
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
// export const verificationTemplate = (
//   name: string,
//   otp: string,
// ) => {
//   return `
//     <div style="font-family:Arial;padding:20px">
//       <h2>Email Verification</h2>

//       <p>Hello ${name},</p>

//       <p>Your verification OTP is:</p>

//       <div style="
//         font-size:32px;
//         font-weight:bold;
//         color:#2563eb;
//         letter-spacing:5px;
//         margin:20px 0;
//       ">
//         ${otp}
//       </div>

//       <p>This OTP expires in 10 minutes.</p>
//     </div>
//   `;
// };

// export const loginOtpTemplate = (
//   name: string,
//   otp: string,
// ) => {
//   return `
//     <div style="font-family:Arial;padding:20px">
//       <h2>Two Factor Authentication</h2>

//       <p>Hello ${name},</p>

//       <p>Your login OTP is:</p>

//       <div style="
//         font-size:32px;
//         font-weight:bold;
//         color:#16a34a;
//         letter-spacing:5px;
//         margin:20px 0;
//       ">
//         ${otp}
//       </div>

//       <p>This OTP expires in 5 minutes.</p>
//     </div>
//   `;
// };

// export const forgotPasswordTemplate = (
//   name: string,
//   otp: string,
// ) => {
//   return `
//     <div style="font-family:Arial;padding:20px">
//       <h2>Reset Password OTP</h2>

//       <p>Hello ${name},</p>

//       <p>Your password reset OTP is:</p>

//       <div style="
//         font-size:32px;
//         font-weight:bold;
//         color:#dc2626;
//         letter-spacing:5px;
//         margin:20px 0;
//       ">
//         ${otp}
//       </div>

//       <p>This OTP expires in 10 minutes.</p>

//       <p>If you did not request this, please ignore this email.</p>
//     </div>
//   `;
// };


export const verificationTemplate = (
  name: string,
  otp: string,
) => {
  return emailWrapper(
    'Email Verification',
    `Hello ${name}, please verify your email address using the OTP below.`,
    `
      <div style="text-align:center;margin:30px 0;">
        <div style="
          display:inline-block;
          background:#eff6ff;
          border:2px dashed #2563eb;
          border-radius:12px;
          padding:20px 40px;
        ">
          <div style="
            font-size:36px;
            font-weight:700;
            color:#2563eb;
            letter-spacing:8px;
          ">
            ${otp}
          </div>
        </div>
      </div>

      <p style="color:#4b5563;">
        This verification code will expire in
        <strong>10 minutes</strong>.
      </p>
    `,
  );
};

export const loginOtpTemplate = (
  name: string,
  otp: string,
) => {
  return emailWrapper(
    'Two-Factor Authentication',
    `Hello ${name}, use the following OTP to complete your login.`,
    `
      <div style="text-align:center;margin:30px 0;">
        <div style="
          display:inline-block;
          background:#f0fdf4;
          border:2px dashed #16a34a;
          border-radius:12px;
          padding:20px 40px;
        ">
          <div style="
            font-size:36px;
            font-weight:700;
            color:#16a34a;
            letter-spacing:8px;
          ">
            ${otp}
          </div>
        </div>
      </div>

      <p style="color:#4b5563;">
        This login code will expire in
        <strong>5 minutes</strong>.
      </p>
    `,
  );
};

export const forgotPasswordTemplate = (
  name: string,
  otp: string,
) => {
  return emailWrapper(
    'Reset Your Password',
    `Hello ${name}, we received a request to reset your password.`,
    `
      <div style="text-align:center;margin:30px 0;">
        <div style="
          display:inline-block;
          background:#fef2f2;
          border:2px dashed #dc2626;
          border-radius:12px;
          padding:20px 40px;
        ">
          <div style="
            font-size:36px;
            font-weight:700;
            color:#dc2626;
            letter-spacing:8px;
          ">
            ${otp}
          </div>
        </div>
      </div>

      <p style="color:#4b5563;">
        This password reset code will expire in
        <strong>10 minutes</strong>.
      </p>

      <p style="
        margin-top:25px;
        color:#dc2626;
        font-size:14px;
      ">
        If you did not request a password reset,
        please ignore this email.
      </p>
    `,
  );
};

const commissionSlabsUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://fashionfever.in/influencer/commission-slabs'
    : 'http://localhost:5173/influencer/commission-slabs';


export const influencerInvitationTemplate = (
  name: string,
  registrationUrl: string,
) => {
  const commissionSlabsUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://fashionfever.in/influencer/commission-slabs'
      : 'http://localhost:5173/influencer/commission-slabs';

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FashionFever Influencer Invitation</title>
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

          <!-- Header -->
          <tr>
            <td style="
              background:linear-gradient(135deg,#ff4d6d,#ff758f);
              padding:45px 40px;
              text-align:center;
            ">
              <h1 style="
                margin:0;
                color:#ffffff;
                font-size:34px;
                font-weight:700;
              ">
                FashionFever
              </h1>

              <p style="
                margin:12px 0 0;
                color:#ffffff;
                font-size:16px;
                opacity:0.95;
              ">
                Influencer Partnership Program
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">

              <h2 style="
                margin-top:0;
                color:#111827;
                font-size:28px;
              ">
                Hello ${name} 👋
              </h2>

              <p style="
                color:#4b5563;
                font-size:16px;
                line-height:1.8;
                margin-bottom:20px;
              ">
                We're excited to invite you to become an official
                <strong>FashionFever Influencer Partner</strong>.
                Join our growing beauty marketplace and earn rewards by promoting
                products you genuinely love.
              </p>

              <!-- Validity Notice -->
              <div style="
                background:#fff7ed;
                border-left:5px solid #f97316;
                border-radius:10px;
                padding:18px;
                margin:30px 0;
              ">
                <p style="
                  margin:0;
                  color:#9a3412;
                  font-size:14px;
                  line-height:1.8;
                ">
                  ⏳ <strong>Invitation Valid for 7 Days</strong><br>
                  This registration link will remain active for
                  <strong>7 days</strong> from the date it was sent.
                  If it expires, you'll need a new invitation from the
                  FashionFever team.
                </p>
              </div>

              <p style="
                color:#4b5563;
                font-size:16px;
                line-height:1.8;
              ">
                As a FashionFever influencer, you'll be able to:
              </p>

              <ul style="
                color:#4b5563;
                font-size:15px;
                line-height:2;
                padding-left:20px;
              ">
                <li>Promote beauty and makeup products.</li>
                <li>Earn commissions from successful referrals.</li>
                <li>Track orders, sales, and earnings.</li>
                <li>Collaborate with trusted brands and vendors.</li>
                <li>Unlock higher commission slabs as your sales grow.</li>
              </ul>

              <!-- Commission Section -->
              <div style="
                background:#f8fafc;
                border:1px solid #e5e7eb;
                border-radius:12px;
                padding:24px;
                margin:35px 0;
              ">
                <h3 style="
                  margin-top:0;
                  color:#111827;
                  font-size:20px;
                ">
                  💰 Commission Structure
                </h3>

                <p style="
                  color:#4b5563;
                  font-size:15px;
                  line-height:1.8;
                  margin-bottom:20px;
                ">
                  Your commission rate depends on your performance and total
                  sales achieved through the platform.
                  You can review all commission slabs before completing
                  your registration.
                </p>

                <div style="text-align:center;">
                  <a href="${commissionSlabsUrl}" style="
                    display:inline-block;
                    background:#111827;
                    color:#ffffff;
                    text-decoration:none;
                    padding:14px 28px;
                    border-radius:8px;
                    font-size:14px;
                    font-weight:600;
                  ">
                    View Commission Slabs
                  </a>
                </div>
              </div>

              <!-- Registration CTA -->
              <div style="text-align:center;margin:40px 0;">
                <a href="${registrationUrl}" style="
                  display:inline-block;
                  background:#ff4d6d;
                  color:#ffffff;
                  text-decoration:none;
                  padding:16px 36px;
                  border-radius:10px;
                  font-size:16px;
                  font-weight:600;
                ">
                  Complete Registration
                </a>
              </div>

              <p style="
                color:#6b7280;
                font-size:14px;
                line-height:1.8;
              ">
                If the button above doesn't work, copy and paste the following
                link into your browser:
              </p>

              <p style="
                background:#f9fafb;
                padding:12px;
                border-radius:8px;
                word-break:break-all;
                color:#ff4d6d;
                font-size:13px;
                border:1px solid #e5e7eb;
              ">
                ${registrationUrl}
              </p>

              <p style="
                color:#4b5563;
                font-size:15px;
                line-height:1.8;
                margin-top:30px;
              ">
                We're excited to partner with you and help you grow your
                influence while earning rewards through the
                FashionFever platform.
              </p>

              <p style="
                color:#111827;
                font-size:15px;
                margin-top:30px;
              ">
                Best Regards,<br>
                <strong>FashionFever Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background:#f9fafb;
              border-top:1px solid #e5e7eb;
              padding:24px;
              text-align:center;
            ">
              <p style="
                margin:0;
                color:#9ca3af;
                font-size:13px;
              ">
                © ${new Date().getFullYear()} FashionFever. All rights reserved.
              </p>

              <p style="
                margin-top:8px;
                color:#9ca3af;
                font-size:12px;
                line-height:1.6;
              ">
                This invitation was sent because you were selected to join the
                FashionFever Influencer Partnership Program.
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

export const adminPendingRequestNotificationTemplate = (
  roleName: string,
  userName: string,
  userEmail: string,
  details: Record<string, any>,
) => {
  let detailsHtml = '';
  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined && value !== null && value !== '') {
      detailsHtml += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 0; color: #4b5563; font-weight: 600; width: 40%;">${key.charAt(0).toUpperCase() + key.slice(1)}</td>
          <td style="padding: 10px 0; color: #111827;">${value}</td>
        </tr>
      `;
    }
  }

  return emailWrapper(
    'New Pending Request',
    `A new ${roleName} onboarding request has been submitted.`,
    `
      <div style="margin-bottom: 30px;">
        <p style="color:#4b5563; font-size:16px; line-height:1.6; margin-bottom:10px;">
          <strong>Name:</strong> ${userName}
        </p>
        <p style="color:#4b5563; font-size:16px; line-height:1.6; margin-bottom:20px;">
          <strong>Email:</strong> ${userEmail}
        </p>
      </div>

      <div style="
        background:#f8fafc;
        border:1px solid #e5e7eb;
        border-radius:12px;
        padding:24px;
        margin:30px 0;
      ">
        <h3 style="
          margin-top:0;
          color:#111827;
          font-size:18px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 15px;
        ">
          Submitted Details
        </h3>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
          ${detailsHtml}
        </table>
      </div>

      <p style="
        color:#6b7280;
        font-size:15px;
        line-height:1.8;
        margin-top:20px;
      ">
        Please review the request in the admin dashboard to approve or reject it.
      </p>
    `,
  );
};

export const campaignEmailTemplate = (
  userName: string,
  title: string,
  body: string,
  actionUrl?: string,
) => {
  let actionHtml = '';
  if (actionUrl) {
    actionHtml = `
      <div style="text-align:center;margin:40px 0;">
        <a href="${actionUrl}" style="
          display:inline-block;
          background:#ff4d6d;
          color:#ffffff;
          text-decoration:none;
          padding:16px 36px;
          border-radius:10px;
          font-size:16px;
          font-weight:600;
        ">
          View Details
        </a>
      </div>
    `;
  }

  return emailWrapper(
    title,
    `Hello ${userName},`,
    `
      <div style="
        background:#ffffff;
        padding:10px 0;
        margin:20px 0;
      ">
        <p style="
          color:#4b5563;
          font-size:16px;
          line-height:1.8;
          white-space: pre-wrap;
        ">
          ${body}
        </p>

        ${actionHtml}
      </div>
    `,
  );
};