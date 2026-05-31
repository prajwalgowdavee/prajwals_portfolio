import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rateLimiter";
import { getClientIp, isLikelyLegitimateRequest } from "@/lib/scrapingPrevention";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req.headers);

    if (!isLikelyLegitimateRequest(req.headers)) {
      return NextResponse.json({ error: "Security check failed" }, { status: 403 });
    }

    if (process.env.NODE_ENV !== "development") {
      const { limited } = checkRateLimit(clientIp, {
        windowMs: 60 * 60 * 1000, 
        maxRequests: 100, 
      });

      if (limited) {
        return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
      }
    }

    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "Portfolio Contact <onboarding@resend.dev>",
      to: "prajwalgowdads2709@gmail.com",
      replyTo: email,
      subject: `New message from ${name} — Portfolio`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 2rem; background: #f9f9f9; border-radius: 12px; color: #333;">
          <h2 style="margin: 0 0 1rem; color: #111;">New Portfolio Contact</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid #ddd;">${message}</p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error: "Failed to send email." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}