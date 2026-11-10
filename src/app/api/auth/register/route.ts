import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    // Sybil defense: Max 5 registration requests per minute per IP
    const clientIp = getClientIp(request.headers);
    const rateCheck = checkRateLimit(`register_rate_limit:${clientIp}`, 5, 60);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Registration rate limit exceeded. Please wait ${rateCheck.resetSeconds}s.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetSeconds),
          },
        }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    const { email, password, name } = body;

    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 255) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address (max 255 characters)" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8 || password.length > 255) {
      return NextResponse.json(
        { success: false, error: "Password must be between 8 and 255 characters long" },
        { status: 400 }
      );
    }

    if (name && (typeof name !== "string" || name.length > 100)) {
      return NextResponse.json(
        { success: false, error: "Name cannot exceed 100 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 12 rounds bcrypt salt for hardened password hashing
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and initial workspace in a transaction
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        passwordHash,
        workspaces: {
          create: {
            name: `${name || email.split("@")[0]}'s Workspace`,
          },
        },
      },
      include: {
        workspaces: true,
      },
    });

    const workspaceId = user.workspaces[0].id;

    // Set authenticated session cookie
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST /api/auth/register]", error);
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
