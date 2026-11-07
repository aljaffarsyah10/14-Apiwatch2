import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
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
