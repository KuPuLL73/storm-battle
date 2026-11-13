import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import type { SavedData } from "../src/platform.ts";

let Platform: typeof import("../src/platform.ts").Platform;
let AudioManager: typeof import("../src/audio.ts").AudioManager;

type RewardCallbacks = {
  onOpen(): void;
  onRewarded(): void;
  onClose(): void;
  onError(error?: unknown): void;
};
const globalKeys = [
  "window",
  "document",
  "navigator",
  "location",
  "localStorage",
] as const;
const original = new Map(
  globalKeys.map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);
let storage: Map<string, string>;
let browserWindow: EventTarget & {
  YaGames?: { init(): Promise<unknown> };
  AudioContext?: unknown;
};
let browserDocument: EventTarget & { hidden: boolean };
let browserLocation: { hostname: string; protocol: string; search: string };

function setGlobal(key: string, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });
}

beforeEach(async () => {
  storage = new Map();
  browserWindow = new EventTarget();
  browserDocument = Object.assign(new EventTarget(), { hidden: false });
  browserLocation = { hostname: "localhost", protocol: "http:", search: "" };
  setGlobal("window", browserWindow);
  setGlobal("document", browserDocument);
  setGlobal("navigator", { language: "ru-RU" });
  setGlobal("location", browserLocation);
  setGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
  ({ Platform } = await import("../src/platform.ts"));
  ({ AudioManager } = await import("../src/audio.ts"));
});

afterEach(() => {
  for (const key of globalKeys) {
    const descriptor = original.get(key);
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function mockPlatform(options: { getPlayer?: () => Promise<unknown> } = {}) {
  browserLocation.search = "?platform=1";
  const events = new Map<string, () => void>();
  let ad: RewardCallbacks | undefined;
  let fullscreen:
    | { onOpen(): void; onClose(shown?: boolean): void; onError(): void }
    | undefined;
  const metrics = { ready: 0, starts: 0, stops: 0, initializations: 0 };
  const sdk = {
    environment: { i18n: { lang: "ru" } },
    features: {
      LoadingAPI: {
        ready: () => {
          metrics.ready += 1;
        },
      },
      GameplayAPI: {
        start: () => {
          metrics.starts += 1;
        },
        stop: () => {
          metrics.stops += 1;
        },
      },
    },
    on: (event: string, callback: () => void) => {
      events.set(event, callback);
    },
    adv: {
      showFullscreenAdv: ({
        callbacks,
      }: {
        callbacks: NonNullable<typeof fullscreen>;
      }) => {
        fullscreen = callbacks;
      },
      showRewardedVideo: ({ callbacks }: { callbacks: RewardCallbacks }) => {
        ad = callbacks;
      },
    },
    ...(options.getPlayer ? { getPlayer: options.getPlayer } : {}),
  };
  browserWindow.YaGames = {
    init: async () => {
      metrics.initializations += 1;
      return sdk;
    },
  };
  return {
    platform: new Platform(),
    metrics,
    emit: (event: "game_api_pause" | "game_api_resume") =>
      events.get(event)?.(),
    get ad() {
      assert.ok(ad, "The SDK must receive the advertisement request");
      return ad;
    },
    get fullscreen() {
      assert.ok(fullscreen);
      return fullscreen;
    },
  };
}

test("localhost plays without the SDK or a simulated reward", async () => {
  browserWindow.YaGames = {
    init: async () => {
      throw new Error("Local mode must not load the SDK");
    },
  };
  const platform = new Platform();
  assert.deepEqual(await platform.init(), { lang: "ru", connected: false });
  assert.equal(platform.canReward, false);
  assert.equal(await platform.rewarded(), false);
});

test("Fullscreen pauses, excludes rewarded requests, respects SDK focus and settles once", async () => {
  const mock = mockPlatform();
  await mock.platform.init();
  let resumes = 0;
  mock.platform.onResume = () => resumes++;
  const request = mock.platform.interstitial();
  assert.equal(mock.platform.canReward, false);
  assert.equal(mock.platform.canInterstitial, false);
  assert.equal(await mock.platform.rewarded(), false);
  assert.equal(await mock.platform.interstitial(), false);
  mock.fullscreen.onOpen();
  mock.emit("game_api_pause");
  mock.fullscreen.onClose(true);
  assert.equal(await request, true);
  assert.equal(resumes, 0);
  mock.emit("game_api_resume");
  assert.equal(resumes, 1);
  mock.fullscreen.onError();
  mock.fullscreen.onClose();
  assert.equal(resumes, 1);
  assert.equal(mock.platform.canReward, true);
  const failed = mock.platform.interstitial();
  mock.fullscreen.onError();
  assert.equal(await failed, false);
  assert.equal(mock.platform.canInterstitial, true);
  const rewarded = mock.platform.rewarded();
  assert.equal(await mock.platform.interstitial(), false);
  mock.ad.onClose();
  assert.equal(await rewarded, false);
});

test("scores and settings survive a reload; invalid numeric data and corrupt JSON are safe", () => {
  const platform = new Platform();
  const saved: SavedData = {
    bestScore: 45,
    bestWave: 2,
    wins: 1,
    sound: false,
    music: true,
    run: { wave: 3 },
  };
  platform.save(saved);
  const restored = new Platform();
  assert.deepEqual(restored.load(), saved);
  const copy = restored.load();
  (copy.run as { wave: number }).wave = 100;
  assert.equal(
    (restored.load().run as { wave: number }).wave,
    3,
    "Loaded runs cannot mutate the persisted checkpoint",
  );

  platform.save({
    bestScore: NaN,
    bestWave: -2,
    wins: Infinity,
    sound: undefined as unknown as boolean,
    music: false,
  });
  assert.deepEqual(new Platform().load(), {
    bestScore: 45,
    bestWave: 2,
    wins: 1,
    sound: true,
    music: false,
  });
  for (const key of storage.keys()) storage.set(key, "{damaged JSON");
  assert.deepEqual(new Platform().load(), {
    bestScore: 0,
    bestWave: 0,
    wins: 0,
    sound: true,
    music: true,
  });
});

test("blocked or exhausted localStorage leaves a working in-memory save", () => {
  setGlobal("localStorage", {
    getItem() {
      throw new Error("Storage denied");
    },
    setItem() {
      throw new Error("Quota exceeded");
    },
  });
  const platform = new Platform();
  platform.save({
    bestScore: 12,
    bestWave: 1,
    wins: 0,
    sound: true,
    music: false,
  });
  assert.equal(platform.load().bestScore, 12);
});

test("master mute persists independently from the sound and music preferences", () => {
  const platform = new Platform();
  const preferences: SavedData = {
    bestScore: 0,
    bestWave: 0,
    wins: 0,
    sound: true,
    music: false,
    muted: true,
  };
  platform.save(preferences);
  assert.deepEqual(new Platform().load(), preferences);
  platform.save({ ...preferences, muted: false });
  assert.deepEqual(new Platform().load(), { ...preferences, muted: false });
  platform.save({ ...preferences, muted: "invalid" as unknown as boolean });
  const restored = new Platform().load();
  assert.equal(restored.sound, true);
  assert.equal(restored.music, false);
  assert.equal(
    Object.hasOwn(restored, "muted"),
    false,
    "Only an explicit boolean may enter the optional mute field",
  );
});

test("production initialization errors reach the app and the same instance can retry", async () => {
  const mock = mockPlatform();
  browserLocation.hostname = "game.yandex.test";
  const workingSDK = browserWindow.YaGames!;
  browserWindow.YaGames = {
    init: async () => {
      throw new Error("Network unavailable");
    },
  };
  await assert.rejects(() => mock.platform.init(), /Network unavailable/);
  assert.equal(mock.platform.canReward, false);
  browserWindow.YaGames = workingSDK;
  assert.deepEqual(await mock.platform.init(), { lang: "ru", connected: true });
});

test("ready and gameplay telemetry are idempotent and paused games do not start", async () => {
  const mock = mockPlatform();
  await mock.platform.init();
  await mock.platform.init();
  assert.equal(mock.metrics.initializations, 1);
  mock.platform.ready();
  mock.platform.ready();
  assert.equal(mock.metrics.ready, 1);
  mock.platform.gameplayStart();
  mock.platform.gameplayStart();
  mock.platform.gameplayStop();
  mock.platform.gameplayStop();
  assert.equal(mock.metrics.starts, 1);
  assert.equal(mock.metrics.stops, 1);
  mock.emit("game_api_pause");
  mock.platform.gameplayStart();
  assert.equal(mock.metrics.starts, 1);
  mock.emit("game_api_resume");
  mock.platform.gameplayStart();
  assert.equal(mock.metrics.starts, 2);
});

test("closing a video without onRewarded never awards a continue", async () => {
  const mock = mockPlatform();
  await mock.platform.init();
  let pauses = 0;
  let resumes = 0;
  mock.platform.onPause = () => {
    pauses += 1;
  };
  mock.platform.onResume = () => {
    resumes += 1;
  };
  const request = mock.platform.rewarded();
  assert.equal(mock.platform.canReward, false);
  assert.equal(
    await mock.platform.rewarded(),
    false,
    "Duplicate requests must not open a second ad",
  );
  mock.ad.onOpen();
  mock.ad.onClose();
  assert.equal(await request, false);
  assert.equal(mock.platform.canReward, true);
  assert.equal(pauses, 1);
  assert.equal(resumes, 1);
});

test("a genuine rewarded event grants exactly one success after the video closes", async () => {
  const mock = mockPlatform();
  await mock.platform.init();
  let resumes = 0;
  mock.platform.onResume = () => {
    resumes += 1;
  };
  const request = mock.platform.rewarded();
  let completed = false;
  void request.then(() => {
    completed = true;
  });
  mock.ad.onOpen();
  mock.ad.onRewarded();
  await Promise.resolve();
  assert.equal(
    completed,
    false,
    "A rewarded callback must not resume the game over an open advertisement",
  );
  mock.ad.onClose();
  assert.equal(await request, true);
  mock.ad.onRewarded();
  mock.ad.onClose();
  assert.equal(
    resumes,
    1,
    "Late callbacks cannot produce a second resume or reward",
  );
});

test("overlapping SDK focus pauses and ad pauses resume only after both end", async () => {
  const mock = mockPlatform();
  await mock.platform.init();
  let pauses = 0;
  let resumes = 0;
  mock.platform.onPause = () => {
    pauses += 1;
  };
  mock.platform.onResume = () => {
    resumes += 1;
  };

  let request = mock.platform.rewarded();
  mock.ad.onOpen();
  mock.emit("game_api_pause");
  mock.ad.onRewarded();
  mock.ad.onClose();
  assert.equal(await request, true);
  assert.equal(pauses, 1);
  assert.equal(
    resumes,
    0,
    "Closing an ad cannot resume a game while the SDK is still paused",
  );
  mock.emit("game_api_resume");
  assert.equal(resumes, 1);

  mock.emit("game_api_pause");
  request = mock.platform.rewarded();
  mock.ad.onOpen();
  mock.emit("game_api_resume");
  assert.equal(
    resumes,
    1,
    "Returning focus cannot resume a game over an open ad",
  );
  mock.ad.onClose();
  assert.equal(await request, false);
  assert.equal(pauses, 2);
  assert.equal(resumes, 2);
});

test("ad errors award nothing, restore availability, and tolerate repeated terminal callbacks", async () => {
  const mock = mockPlatform();
  await mock.platform.init();
  let resumes = 0;
  mock.platform.onResume = () => {
    resumes += 1;
  };
  const request = mock.platform.rewarded();
  mock.ad.onError(new Error("No available video"));
  mock.ad.onClose();
  assert.equal(await request, false);
  assert.equal(mock.platform.canReward, true);
  assert.equal(resumes, 1);
});

test("cloud restoration preserves higher local records and restores newer settings without login", async () => {
  const local = new Platform();
  local.save({
    bestScore: 500,
    bestWave: 2,
    wins: 0,
    sound: true,
    music: true,
  });
  const cloudData: SavedData = {
    bestScore: 100,
    bestWave: 7,
    wins: 3,
    sound: false,
    music: false,
    run: { wave: 6 },
  };
  let argumentsReceived: unknown[] | undefined;
  const mock = mockPlatform({
    getPlayer: async (...args: unknown[]) => {
      argumentsReceived = args;
      return {
        getData: async () => ({
          lastWagonV1: {
            version: 1,
            updatedAt: Date.now() + 1000,
            data: cloudData,
          },
        }),
        setData: async () => {},
      };
    },
  });
  await mock.platform.init();
  assert.deepEqual(
    argumentsReceived,
    [],
    "Initializing guest storage does not request authorization",
  );
  assert.deepEqual(mock.platform.load(), { ...cloudData, bestScore: 500 });
});

test("unavailable cloud storage does not prevent SDK initialization or local saves", async () => {
  const mock = mockPlatform({
    getPlayer: async () => {
      throw new Error("Guest storage unavailable");
    },
  });
  assert.equal((await mock.platform.init()).connected, true);
  mock.platform.save({
    bestScore: 10,
    bestWave: 1,
    wins: 0,
    sound: true,
    music: true,
  });
  assert.equal(new Platform().load().bestScore, 10);
});

test("saving an older caller snapshot never reduces records or wins", () => {
  const platform = new Platform();
  const older = platform.load();
  platform.save({
    bestScore: 9999,
    bestWave: 8,
    wins: 3,
    sound: true,
    music: true,
  });
  platform.save({ ...older, sound: false, music: false });
  assert.deepEqual(platform.load(), {
    bestScore: 9999,
    bestWave: 8,
    wins: 3,
    sound: false,
    music: false,
  });
  assert.deepEqual(new Platform().load(), platform.load());
});

test(
  "a cloud response after the boot timeout cannot change loaded settings or overwrite local records",
  { timeout: 6000 },
  async () => {
    const localData: SavedData = {
      bestScore: 400,
      bestWave: 4,
      wins: 2,
      sound: true,
      music: true,
      run: { wave: 4 },
    };
    new Platform().save(localData);
    let resolveCloud!: (value: Record<string, unknown>) => void;
    const delayedCloud = new Promise<Record<string, unknown>>((resolve) => {
      resolveCloud = resolve;
    });
    let cloudWrites = 0;
    const mock = mockPlatform({
      getPlayer: async () => ({
        getData: () => delayedCloud,
        setData: async () => {
          cloudWrites += 1;
        },
      }),
    });
    assert.equal((await mock.platform.init()).connected, true);
    const loadedAtBoot = mock.platform.load();
    assert.deepEqual(loadedAtBoot, localData);

    resolveCloud({
      lastWagonV1: {
        version: 1,
        updatedAt: Date.now() + 10_000,
        data: {
          bestScore: 9999,
          bestWave: 8,
          wins: 3,
          sound: false,
          music: false,
        },
      },
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.deepEqual(
      mock.platform.load(),
      loadedAtBoot,
      "An expired request must not mutate data after the app has loaded its clone",
    );
    mock.platform.save({ ...loadedAtBoot, bestScore: 0, bestWave: 0, wins: 0 });
    assert.deepEqual(
      mock.platform.load(),
      localData,
      "The next save must preserve existing local records and the boot-time settings",
    );
    assert.deepEqual(new Platform().load(), localData);
    assert.equal(
      cloudWrites,
      0,
      "An expired restore must not enable a late cloud writer",
    );
  },
);

class FakeAudioParam {
  value = 0;
  cancelScheduledValues() {}
  setValueAtTime(value: number) {
    this.value = value;
  }
  setTargetAtTime(value: number) {
    this.value = value;
  }
}
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = "suspended";
  currentTime = 0;
  sampleRate = 100;
  destination = {};
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  createGain() {
    return { gain: new FakeAudioParam(), connect() {} };
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(this.sampleRate) };
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
}
async function audioSettled() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test("audio stays lazy and suspends on blur, hidden tabs, pause, and disabled settings", async () => {
  FakeAudioContext.instances = [];
  browserWindow.AudioContext = FakeAudioContext;
  const audio = new AudioManager();
  assert.equal(
    FakeAudioContext.instances.length,
    0,
    "The menu must not create an autoplaying audio context",
  );
  await audio.unlock();
  await audioSettled();
  const context = FakeAudioContext.instances[0];
  assert.equal(context.state, "running");

  browserWindow.dispatchEvent(new Event("blur"));
  await audioSettled();
  assert.equal(context.state, "suspended");
  browserWindow.dispatchEvent(new Event("focus"));
  await audioSettled();
  assert.equal(context.state, "running");

  browserDocument.hidden = true;
  browserDocument.dispatchEvent(new Event("visibilitychange"));
  await audioSettled();
  assert.equal(context.state, "suspended");
  browserDocument.hidden = false;
  browserDocument.dispatchEvent(new Event("visibilitychange"));
  await audioSettled();
  assert.equal(context.state, "running");

  audio.setActive(false);
  await audioSettled();
  assert.equal(context.state, "suspended");
  audio.setActive(true);
  audio.setSettings(false, false);
  await audioSettled();
  assert.equal(context.state, "suspended");
});
