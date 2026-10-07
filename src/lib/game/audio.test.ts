import { describe, it, expect, beforeEach } from "vitest";
import { sfx } from "./audio";

describe("Game Audio Engine (SFX & Mute Control)", () => {
  beforeEach(() => {
    sfx.setMuted(false);
  });

  it("handles mute state toggling correctly", () => {
    expect(sfx.isMuted()).toBe(false);
    sfx.setMuted(true);
    expect(sfx.isMuted()).toBe(true);
    sfx.setMuted(false);
    expect(sfx.isMuted()).toBe(false);
  });

  it("does not throw when triggering sounds while muted or unmuted", () => {
    // Unmuted
    expect(() => sfx.pat(1)).not.toThrow();
    expect(() => sfx.ding(true)).not.toThrow();
    expect(() => sfx.ding(false)).not.toThrow();
    expect(() => sfx.slice()).not.toThrow();
    expect(() => sfx.creak()).not.toThrow();
    expect(() => sfx.hiss(0.1)).not.toThrow();
    expect(() => sfx.crackle(0.1)).not.toThrow();

    // Muted
    sfx.setMuted(true);
    expect(() => sfx.pat(1)).not.toThrow();
    expect(() => sfx.ding(true)).not.toThrow();
    expect(() => sfx.slice()).not.toThrow();
    expect(() => sfx.creak()).not.toThrow();
  });

  it("sfx.pour returns a stop callback that can be safely invoked", () => {
    const stop = sfx.pour(0.5);
    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
    // Subsequent calls to stop should be idempotent
    expect(() => stop()).not.toThrow();
  });

  it("sfx.setMuted(true) and sfx.stopAll cleans up active stoppers without throwing", () => {
    const stop1 = sfx.pour();
    const stop2 = sfx.pour(2.0);
    expect(() => sfx.stopAll()).not.toThrow();
    expect(() => stop1()).not.toThrow();
    expect(() => stop2()).not.toThrow();

    sfx.pour();
    expect(() => sfx.setMuted(true)).not.toThrow();
    expect(sfx.isMuted()).toBe(true);
  });
});
