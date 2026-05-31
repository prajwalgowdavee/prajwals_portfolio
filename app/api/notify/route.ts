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

    // Rate Limiting
    if (process.env.NODE_ENV !== "development") {
      const { limited } = checkRateLimit(clientIp, {
        windowMs: 60 * 60 * 1000, 
        maxRequests: 20, 
      });

      if (limited) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    const { name, email } = await req.json();

    const { error } = await resend.emails.send({
      from: "Portfolio <onboarding@resend.dev>",
      to: "prajwalgowdads2709@gmail.com",
      replyTo: email,
      subject: `🎮 Konami Easter Egg Claimed — ${name || 'Unknown User'}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #111; color: #fff; border-radius: 10px;">
          <h2 style="color: #ba5b38;">🎮 Konami Code Cracked!</h2>
          <p><strong>User:</strong> ${name || 'Anonymous'}</p>
          <p><strong>Email:</strong> ${email || 'Not provided'}</p>
          <p>They have successfully triggered an Easter Egg on your portfolio.</p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error: "Failed to send." }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}