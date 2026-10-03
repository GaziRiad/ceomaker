// The editor's canvas sizes. Kept apart from the canvas so server actions can check them.

export const DEVICES = {
  desktop: { width: 1280, label: "Desktop" },
  tablet: { width: 820, label: "Tablet" },
  phone: { width: 390, label: "Phone" },
} as const;

export type Device = keyof typeof DEVICES;

export function isDevice(value: unknown): value is Device {
  return typeof value === "string" && Object.hasOwn(DEVICES, value);
}
