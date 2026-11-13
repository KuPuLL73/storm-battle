export type OrientationPreference = "auto" | "portrait" | "landscape";
export type OrientationResult = "auto" | "locked" | "manual";
export async function chooseOrientation(
  preference: OrientationPreference,
  fullscreen: () => Promise<void>,
): Promise<OrientationResult> {
  const orientation = screen.orientation as
    | (ScreenOrientation & {
        lock?: (value: "portrait" | "landscape") => Promise<void>;
      })
    | undefined;
  if (preference === "auto") {
    try {
      orientation?.unlock?.();
    } catch {}
    return "auto";
  }
  if (!orientation?.lock) return "manual";
  try {
    await fullscreen();
    await orientation.lock(preference);
    return "locked";
  } catch {
    return "manual";
  }
}
