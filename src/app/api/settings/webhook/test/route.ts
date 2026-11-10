import { NextRequest, NextResponse } from "next/server";
import { getSessionOrDefault } from "@/lib/auth/session";
import { validateSafeUrl, SSRFError } from "@/lib/monitoring/ssrf-guard";

export async function POST(request: NextRequest) {
  try {
    await getSessionOrDefault();

    const body = await request.json();
    const { webhookUrl, channelType = "DISCORD" } = body;

    if (!webhookUrl || typeof webhookUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Please provide a valid Webhook URL" },
        { status: 400 }
      );
    }

    // SSRF validation
    await validateSafeUrl(webhookUrl);

    // Build payload according to channel type
    let payload: Record<string, unknown>;

    if (channelType === "SLACK") {
      payload = {
        text: "🚨 *[APIWatch Test Alert]* Your webhook channel has been connected successfully!",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*APIWatch Outage Alert Channel Connected*\nThis is a live test notification verifying your webhook integration.",
            },
          },
        ],
      };
    } else if (channelType === "DISCORD") {
      payload = {
        content: "🚨 **[APIWatch Test Alert]** Webhook notification channel is online!",
        embeds: [
          {
            title: "APIWatch Incident Notification Test",
            description: "Your Discord webhook channel is correctly configured and ready to receive real-time outage alerts.",
            color: 40960, // Green
            timestamp: new Date().toISOString(),
            footer: {
              text: "APIWatch Automated Monitoring",
            },
          },
        ],
      };
    } else {
      // Generic Webhook
      payload = {
        event: "TEST_NOTIFICATION",
        message: "APIWatch webhook test successful",
        timestamp: new Date().toISOString(),
        service: "APIWatch",
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const startTime = performance.now();
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Webhook server responded with HTTP status ${response.status} (${response.statusText})`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test alert dispatched successfully (${latencyMs}ms)`,
      latencyMs,
    });
  } catch (error: unknown) {
    if (error instanceof SSRFError) {
      return NextResponse.json(
        { success: false, error: `Security validation blocked this URL: ${error.message}` },
        { status: 400 }
      );
    }

    const errorMsg = error instanceof Error ? error.message : "Failed to dispatch test webhook";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
