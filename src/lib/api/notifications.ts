import { apiFetch } from "./client";

export interface NotificationSettingItem {
  id: string;
  workspaceId: string;
  email: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotificationSettings(): Promise<NotificationSettingItem[]> {
  return apiFetch<NotificationSettingItem[]>("/api/settings/notifications");
}

export async function saveNotificationSetting(
  email: string,
  enabled = true
): Promise<NotificationSettingItem> {
  return apiFetch<NotificationSettingItem>("/api/settings/notifications", {
    method: "POST",
    body: JSON.stringify({ email, enabled }),
  });
}
