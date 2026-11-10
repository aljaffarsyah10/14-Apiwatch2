import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    // Brute-force defense: Max 10 attempts per minute per IP
    const clientIp = getClientIp(request.headers);
    const rateCheck = checkRateLimit(`login_brute_force:${clientIp}`, 10, 60);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${rateCheck.resetSeconds}s before trying again.`,
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
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email and password are required" },
        { status: 400 }
      );
    }

    if (email.length > 255 || password.length > 255) {
      return NextResponse.json(
        { success: false, error: "Input exceeds allowable length" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        workspaces: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Ensure user has at least one workspace
    let workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      const newWs = await db.workspace.create({
        data: {
          name: `${user.name || "Default"}'s Workspace`,
          ownerId: user.id,
        },
      });
      workspaceId = newWs.id;
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        workspaceId,
      },
    });
  } catch (error) {
    console.error("[API POST /api/auth/login]", error);
    return NextResponse.json(
      { success: false, error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
