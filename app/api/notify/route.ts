import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email required." }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "Portfolio <onboarding@resend.dev>", // change to your verified domain later
      to: "prajwalgowdads2709@gmail.com",
      replyTo: email,
      subject: `🎮 Konami Easter Egg Claimed — ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 2rem; background: #f9f9f9; border-radius: 12px;">
          <h2 style="margin: 0 0 0.5rem; color: #111;">🎮 Someone cracked the Konami code!</h2>
          <p style="color: #555; margin: 0 0 1.5rem;">They&apos;re claiming the gift card.</p>
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
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}