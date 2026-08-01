const wrapper = (innerHtml) => `
<div style="background:#f4f4f5; padding:32px 16px; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
    ${innerHtml}
    <div style="background:#fafafa; padding:18px 32px; text-align:center; border-top:1px solid #ececec;">
      <p style="margin:0 0 4px; font-size:12px; color:#a1a1aa;">
        Need help? Reply to this email or contact our support team.
      </p>
      <p style="margin:0; font-size:12px; color:#a1a1aa;">
        &copy; ${new Date().getFullYear()} ${process.env.ORGANIZATION_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</div>
`;

const header = (title, subtitle) => `
<div style="background:linear-gradient(135deg,#f97316,#ea580c); padding:32px; text-align:center;">
  <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px;">${title}</h1>
  <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">${subtitle}</p>
</div>
`;

const ctaButton = (label, url) => `
<div style="text-align:center; margin:24px 0 4px;">
  <a href="${url}" style="display:inline-block; background:#f97316; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; padding:12px 28px; border-radius:8px;">
    ${label}
  </a>
</div>
`;

const formatDate = (date) =>
  new Date(date || Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ── Order confirmation email ──
const orderConfirmationEmail = ({
  userName,
  order,
  address,
  totalAmount,
  savedAmount,
}) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const orderDate = formatDate(order?.createdAt);
  const orderUrl = `${process.env.CLIENT_URL || ""}/orders/${order._id}`;

  const itemsHtml = items.length
    ? `
      <div style="border-top:1px solid #ececec; padding-top:16px; margin-bottom:20px;">
        <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#a1a1aa; font-weight:600;">
          Items Ordered
        </p>
        ${items
          .map(
            (item) => `
          <div style="display:flex; align-items:center; padding:8px 0; border-bottom:1px solid #f4f4f5;">
            ${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" width="40" height="40" style="border-radius:6px; object-fit:cover; margin-right:12px;" />`
                : ""
            }
            <div style="flex:1;">
              <p style="margin:0; font-size:13px; color:#27272a; font-weight:500;">${item.name}</p>
              <p style="margin:2px 0 0; font-size:12px; color:#a1a1aa;">Qty: ${item.qty}</p>
            </div>
            <p style="margin:0; font-size:13px; color:#18181b; font-weight:600;">Rs ${(item.price * item.qty).toFixed(2)}</p>
          </div>`,
          )
          .join("")}
      </div>`
    : "";

  const body = `
    ${header("Order Confirmed 🎉", `Thank you for shopping with ${process.env.ORGANIZATION_NAME}`)}
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px; color:#27272a; font-size:15px;">
        Hi <strong>${userName}</strong>, your order has been placed successfully. Here's a quick summary:
      </p>

      <div style="background:#fafafa; border:1px solid #ececec; border-radius:10px; padding:18px 20px; margin-bottom:20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px; color:#3f3f46;">
          <tr>
            <td style="padding:6px 0; color:#71717a;">Order ID</td>
            <td style="padding:6px 0; text-align:right; font-weight:600; color:#18181b;">${order._id}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#71717a;">Order Date</td>
            <td style="padding:6px 0; text-align:right; font-weight:600; color:#18181b;">${orderDate}</td>
          </tr>
          ${
            order?.paymentId
              ? `
          <tr>
            <td style="padding:6px 0; color:#71717a;">Payment Method</td>
            <td style="padding:6px 0; text-align:right; font-weight:600; color:#18181b;">${
              order.paymentId.startsWith("COD_")
                ? "Cash on Delivery"
                : "Paid Online"
            }</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:10px 0 6px; color:#71717a; border-top:1px solid #ececec;">Total Amount</td>
            <td style="padding:10px 0 6px; text-align:right; font-weight:700; color:#18181b; font-size:16px; border-top:1px solid #ececec;">Rs ${totalAmount.toFixed(2)}</td>
          </tr>
          ${
            savedAmount > 0
              ? `
          <tr>
            <td style="padding:6px 0; color:#71717a;">You Saved</td>
            <td style="padding:6px 0; text-align:right; font-weight:600; color:#16a34a;">Rs ${savedAmount.toFixed(2)} 🎉</td>
          </tr>`
              : ""
          }
        </table>
      </div>

      ${itemsHtml}

      <div style="border-top:1px solid #ececec; padding-top:16px;">
        <p style="margin:0 0 4px; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#a1a1aa; font-weight:600;">
          Shipping To
        </p>
        <p style="margin:0; font-size:14px; color:#3f3f46; line-height:1.5;">
          <strong>${address.fullName || userName}</strong><br/>
          ${address.street}, ${address.city}${address.postalCode ? ` - ${address.postalCode}` : ""}
          ${address.phone ? `<br/>Phone: ${address.phone}` : ""}
        </p>
      </div>

      ${ctaButton("View Your Order", orderUrl)}
    </div>
  `;
  return {
    subject: `${process.env.ORGANIZATION_NAME} - Order Confirmed`,
    html: wrapper(body),
  };
};

// ── Order status update email (Pending/Shipped/Delivered/Cancelled) ──
const STATUS_CONTENT = {
  Pending: {
    emoji: "⏳",
    title: "Order Received",
    line: "Your order has been placed and is awaiting processing.",
    accent: "#f97316",
  },
  Shipped: {
    emoji: "🚚",
    title: "Order Shipped",
    line: "Good news! Your order is on its way.",
    accent: "#3b82f6",
  },
  Delivered: {
    emoji: "✅",
    title: "Order Delivered",
    line: "Your order has been delivered. We hope you love it!",
    accent: "#16a34a",
  },
  Cancelled: {
    emoji: "❌",
    title: "Order Cancelled",
    line: "Your order has been cancelled. If this wasn't expected, please reach out to support.",
    accent: "#ef4444",
  },
};

const orderStatusEmail = ({ userName, order }) => {
  const content = STATUS_CONTENT[order.status];
  if (!content) return null;

  const orderDate = formatDate(order?.createdAt);
  const orderUrl = `${process.env.CLIENT_URL || ""}/orders/${order._id}`;

  const body = `
    ${header(`${content.emoji} ${content.title}`, process.env.ORGANIZATION_NAME)}
    <div style="padding:28px 32px;">
      <p style="margin:0 0 16px; color:#27272a; font-size:15px;">
        Hi <strong>${userName}</strong>, ${content.line}
      </p>

      <div style="background:#fafafa; border:1px solid #ececec; border-radius:10px; padding:18px 20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px; color:#3f3f46;">
          <tr>
            <td style="padding:6px 0; color:#71717a;">Order ID</td>
            <td style="padding:6px 0; text-align:right; font-weight:600; color:#18181b;">${order._id}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#71717a;">Order Date</td>
            <td style="padding:6px 0; text-align:right; font-weight:600; color:#18181b;">${orderDate}</td>
          </tr>
          <tr>
            <td style="padding:6px 0; color:#71717a;">Status</td>
            <td style="padding:6px 0; text-align:right;">
              <span style="display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; background:${content.accent}1a; color:${content.accent};">
                ${order.status}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0 6px; color:#71717a; border-top:1px solid #ececec;">Total</td>
            <td style="padding:10px 0 6px; text-align:right; font-weight:700; color:#18181b; font-size:15px; border-top:1px solid #ececec;">Rs ${order.totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

    </div>
  `;
  return {
    subject: `${process.env.ORGANIZATION_NAME} - ${content.title}`,
    html: wrapper(body),
  };
};

// ── OTP / welcome email ──
const otpEmail = ({ name, otp }) => {
  const body = `
    ${header(`Welcome to ${process.env.ORGANIZATION_NAME} 👋`, `We're glad to have you, ${name}`)}
    <div style="padding:32px;">
      <p style="margin:0 0 24px; color:#27272a; font-size:15px; line-height:1.6;">
        Thank you for registering on our platform. Use the verification code below to complete your sign-up:
      </p>
      <div style="background:#fafafa; border:1px dashed #f97316; border-radius:10px; padding:24px; text-align:center; margin-bottom:20px;">
        <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#a1a1aa; font-weight:600;">
          Your Verification Code
        </p>
        <p style="margin:0; font-size:36px; font-weight:800; letter-spacing:8px; color:#f97316;">
          ${otp}
        </p>
      </div>
      <p style="margin:0; font-size:13px; color:#a1a1aa; text-align:center; line-height:1.6;">
        This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
  return {
    subject: `${process.env.ORGANIZATION_NAME} - Your Verification Code`,
    html: wrapper(body),
  };
};

module.exports = { orderConfirmationEmail, orderStatusEmail, otpEmail };
