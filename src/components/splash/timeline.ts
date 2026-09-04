/**
 * The splash, as a function of one number.
 *
 * ## Why a number and not an animation
 *
 * This scene has to run in two places that animate in incompatible ways. The app
 * plays it live, driven by a clock. Remotion renders it to video, and does that by
 * asking a component to draw frame 37 out of 120 — with no clock, no CSS
 * animations and no `requestAnimationFrame`, because a renderer that took a real
 * second to produce a second of video would be useless.
 *
 * So nothing here animates. Every value is computed from `t`, a single number from
 * 0 to 1, and the two hosts differ only in where `t` comes from: `performance.now`
 * in the app, `useCurrentFrame() / durationInFrames` in Remotion.
 *
 * The point is not elegance. It is that the app's opening and the video on the App
 * Store listing cannot drift, because there is one scene and it is this file.
 *
 * ## Why not just ship the video as the splash
 *
 * Because a loading screen exists to cover a wait, and a 4-second video at a
 * quality worth showing is megabytes. Playing it as the splash would mean
 * downloading it before the screen that hides the download can appear. The app
 * draws the scene live — a few kilobytes of arithmetic — and the video is for
 * places that want a file: store listings, social, a pitch.
 */

/** Total length. Four seconds, which is the ceiling for something a client sees
 *  before every session and cannot skip. */
export const DURATION_MS = 4000;
export const FPS = 30;
export const DURATION_FRAMES = Math.round((DURATION_MS / 1000) * FPS);

/** Clamp to 0…1. */
/**
 * The ground the scene sits on.
 *
 * Exported rather than inlined because `index.html` paints this same colour
 * before any JavaScript runs — see the pre-React shell there. At t = 0 the scene
 * is a flat field of exactly this colour and nothing else, so the shell and the
 * first animated frame are indistinguishable and the client never sees a
 * hand-off. A test asserts the two stay equal.
 */
export const GROUND = "#0b0616";

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Progress through a segment of the timeline, as 0…1.
 *
 * `at(t, 0.2, 0.5)` is 0 before 20%, 1 after 50%, and a straight ramp between.
 * Every element below is placed with this, so the timeline reads as a list of
 * "from here to here" rather than as arithmetic.
 */
export const at = (t: number, from: number, to: number): number =>
  clamp01((t - from) / (to - from));

/**
 * Ease-out cubic.
 *
 * Everything in this scene arrives — nothing leaves under its own power — and
 * `easing` says ease-out for something entering. Deliberately not a spring or an
 * overshoot: this is a brand opening, and a logo that bounces reads as a toy.
 */
export const easeOut = (v: number): number => 1 - Math.pow(1 - clamp01(v), 3);

/** Ease-in-out, for things that travel rather than arrive. */
export const easeInOut = (v: number): number => {
  const x = clamp01(v);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * The one place the scene's shape is written down.
 *
 * Segments overlap on purpose. A sequence where each beat waits for the last is
 * four seconds that feel like eight; overlapping them means the eye is always
 * following something, which is what makes a short opening feel unhurried rather
 * than rushed.
 */
export const BEATS = {
  /** The ground lifting into brand purple. */
  wash: [0.0, 0.42] as const,
  /**
   * Light beams sweeping up through the ground.
   *
   * Starts before everything, including the motes, and runs almost the whole
   * scene. They are the deepest layer and the slowest thing in it: something has
   * to be already moving when the client's eye arrives, or the first beat reads
   * as a still image that then starts. Long and early is what makes them
   * atmosphere rather than an event.
   */
  beams: [0.02, 0.9] as const,
  /** Motes rising. Deliberately the longest beat — see SplashScene. */
  motes: [0.04, 0.86] as const,
  /** The mark's outline drawing itself. */
  trace: [0.08, 0.42] as const,
  /**
   * The two halves sliding together and filling.
   *
   * Overlaps `trace` on purpose: the fill starts arriving before the outline has
   * finished, so the mark never sits still as a completed wireframe.
   */
  lock: [0.3, 0.56] as const,
  wordmark: [0.5, 0.74] as const,
  rule: [0.62, 0.8] as const,
  /**
   * Ends before `handoff` starts, with a beat to spare.
   *
   * This overran into the hand-off at first, so the tagline was still arriving
   * while the composition had already begun to leave. The gap between the two is
   * the only moment in the four seconds where the finished thing is simply held —
   * which is what makes the exit read as leaving rather than as an interruption.
   */
  tagline: [0.68, 0.85] as const,
  /**
   * The composition beginning to leave.
   *
   * In the app this runs straight into the hand-off to the real screen, which
   * continues the same upward drift — so nothing ever stops moving. See
   * AppSplash. In a video render it is simply the outro.
   */
  handoff: [0.88, 1.0] as const,
};
