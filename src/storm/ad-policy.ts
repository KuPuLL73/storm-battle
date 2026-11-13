/** A time gate; the caller still chooses a legal pause or a long-session countdown. */
export class AdBreakPolicy {
  constructor(private readonly startedAt: number) {}
  due(now: number, lastAdAt: number) {
    return (
      Number.isFinite(now) &&
      now - this.startedAt >= 180_000 &&
      now - lastAdAt >= 180_000
    );
  }
}
