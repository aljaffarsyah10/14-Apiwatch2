import db from "../db";

const DEFAULT_USER_EMAIL = "admin@apiwatch.local";

/**
 * Ensures a default user and workspace exist for development/local execution.
 * Returns the default workspace ID.
 */
export async function getOrCreateDefaultWorkspaceId(): Promise<string> {
  try {
    const existing = await db.workspace.findFirst();

    if (existing) {
      return existing.id;
    }

    // Find or create default user
    let user = await db.user.findUnique({
      where: { email: DEFAULT_USER_EMAIL },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          email: DEFAULT_USER_EMAIL,
          name: "Admin User",
        },
      });
    }

    // Create workspace
    const workspace = await db.workspace.create({
      data: {
        name: "Default Workspace",
        ownerId: user.id,
      },
    });

    return workspace.id;
  } catch {
    // If DB is unreachable or during build evaluation, fallback gracefully
    console.warn("[WorkspaceHelper] DB unavailable, using fallback workspace id");
    return "00000000-0000-0000-0000-000000000001";
  }
}
