export function safeNextPath(value: string): string {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return "";
  }

  try {
    const parsed = new URL(value, "https://realjobs.invalid");
    return parsed.origin === "https://realjobs.invalid" ? value : "";
  } catch {
    return "";
  }
}
