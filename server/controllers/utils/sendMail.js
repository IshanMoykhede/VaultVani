import transporter from "../../config/nodemailer.js";

const sendMail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.COMPANY_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });

    return true;
  } catch (error) {
    console.error("Mail sending failed:", error.message);
    return false;
  }
};

export default sendMail;
