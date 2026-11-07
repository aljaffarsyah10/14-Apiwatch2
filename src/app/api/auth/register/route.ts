import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
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

    const passwordHash = await bcrypt.hash(password, 10);

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
