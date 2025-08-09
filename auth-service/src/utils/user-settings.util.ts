// auth-service/src/utils/user-settings.util.ts

export function isNotificationEnabled(value: any): boolean {
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on';
}