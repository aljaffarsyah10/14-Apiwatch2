import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import db from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      workspaces: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      workspaceId: user.workspaces[0]?.id || session.workspaceId,
      workspaces: user.workspaces,
    },
  });
}
