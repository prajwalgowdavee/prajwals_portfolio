import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "Portfolio Contact <onboarding@resend.dev>", // change to your verified domain later e.g. noreply@yourdomain.com
      to: "prajwalgowdads2709@gmail.com",
      replyTo: email,
      subject: `New message from ${name} — Portfolio`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 2rem; background: #f9f9f9; border-radius: 12px;">
          <h2 style="margin: 0 0 1rem; color: #111;">New Portfolio Contact</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0.5rem 0; color: #555; width: 80px;"><strong>Name</strong></td>
              <td style="padding: 0.5rem 0; color: #111;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 0.5rem 0; color: #555;"><strong>Email</strong></td>
              <td style="padding: 0.5rem 0; color: #111;"><a href="mailto:${email}" style="color: #ba5b38;">${email}</a></td>
            </tr>
          </table>
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #555; margin: 0 0 0.5rem;"><strong>Message</strong></p>
          <p style="color: #111; white-space: pre-wrap; background: #fff; padding: 1rem; border-radius: 8px; border: 1px solid #ddd;">${message}</p>
          <p style="margin: 1.5rem 0 0; font-size: 0.8rem; color: #aaa;">Sent from your portfolio contact form.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact route error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}