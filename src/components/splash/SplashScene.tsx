import { BEATS, GROUND, at, clamp01, easeInOut, easeOut } from "./timeline";

/**
 * The opening. One scene, drawn from a single progress value.
 *
 * See timeline.ts for why nothing here animates itself.
 *
 * ## What it is trying to say
 *
 * "Entering a new world" is a brief that invites a spaceship. This resists that:
 * it is a bank. A dark ground lifting into brand purple, motes of value rising
 * through it, and the MINT mark tracing its own outline before its two halves
 * slide together and fill. The feeling wanted is arrival and steadiness, not
 * launch.
 *
 * Four seconds is the ceiling. A client sees this before every session and cannot
 * skip it, so it has to survive the fiftieth viewing as well as the first — which
 * is the argument against anything that reads as a trick.
 *
 * ## Only `opacity` and `transform` change between frames
 *
 * This is a hard rule here, not a preference. The first version built the wash as
 * one element whose `background` was a template string with the gradient's own
 * position inside it, and put the motes on an animated `top`. Both look completely
 * correct and both are ruinous: the first repaints two viewport-sized radial
 * gradients sixty times a second, the second runs layout on twenty-six elements
 * just as often. On the frames where the app is mounting behind it, the browser
 * has no chance, and the animation visibly stalls half way through — which is
 * exactly what it did.
 *
 * So every moving part is a static layer whose opacity or transform changes. The
 * gradients are strings the browser rasterises once per size. Anything that needs
 * to move is composited. A test renders two frames, diffs every inline style, and
 * fails on any property outside `opacity` and `transform`.
 */

export interface SplashSceneProps {
  /** 0 to 1 through the scene. */
  readonly t: number;
  /** Rendered size. Everything scales from the smaller dimension. */
  readonly width: number;
  readonly height: number;
  /**
   * Draw the finished frame with no motion.
   *
   * For `prefers-reduced-motion`. Not a faster version of the animation: someone
   * who has asked their system for less movement is not asking for the same
   * movement sooner. They get the last frame, held.
   */
  readonly still?: boolean;
  /**
   * The three words under the rule.
   *
   * Defaulted rather than required, so a Remotion render and every existing call
   * site keep the canonical line without passing anything.
   *
   * It is a prop because the words have to be true of the surface they appear on.
   * "Invest · Borrow · Protect" is accurate on Android and the web, where the
   * secured credit product is offered. On iOS it is not: credit is withheld there
   * (src/lib/creditAvailability.js), so a splash promising BORROW was the first
   * thing an App Store reviewer read — before login, on every launch — while the
   * app behind it offers no such thing. AppSplash picks the line to match.
   */
  readonly tagline?: string;
  /**
   * Wordmark prefix (the lighter half). Defaulted to `"my"` so a Remotion
   * render and every existing call site keep the canonical wordmark
   * without passing anything.
   *
   * It is a prop because the suite morph ("@mint/mint-suite") reuses this
   * scene inside the morph panel and shows `mint WEALTH` / `mint ADVISOR`
   * / `mint INSURANCE` / `mint AI` instead of `my MINT` — same reading-order
   * choreography, different words. The brand mark and the rule below stay
   * the same; only the wordmark changes.
   */
  readonly wordmarkPrefix?: string;
  /**
   * Wordmark suffix (the heavier half). Defaulted to `"MINT"` for the same
   * reason as `wordmarkPrefix`. The suite morph overrides this with the
   * suite name in extrabold.
   */
  readonly wordmarkSuffix?: string;
  /**
   * The colour of whatever this is about to reveal.
   *
   * The reason the hand-off ever looked like a cut. A dark purple splash over a
   * light app is a brightness step, and easing the opacity of one does not soften
   * the other — measured on a cold start, the destination is
   * `min-h-dvh bg-card`, which computes to pure white. Matching the login
   * screen's aurora was the wrong target: the screen a logged-out client actually
   * lands on is the welcome page, and it is not on the aurora.
   *
   * So the last beat blooms the ground to this colour, and the host passes the
   * app's own `--background` token. By the final frame the splash is 94% the
   * colour of the page underneath it, and the dissolve has almost no step left to
   * cross — in either theme, and whichever screen the session opens on.
   *
   * Left undefined in a video render, where there is nothing underneath and the
   * scene should end on its own ground.
   */
  // Nullable, not just optional: the host reads a CSS token that can legitimately
  // come back empty, and `exactOptionalPropertyTypes` makes `landing?: string` a
  // property you have to conditionally spread rather than pass. Saying `null` is
  // what a caller actually means.
  readonly landing?: string | null;
}

/**
 * Deterministic pseudo-random.
 *
 * `Math.random()` would make every render of the video differ, and would break
 * Remotion outright — it draws frames out of order and in parallel, so a mote
 * would be somewhere else on each one. Same seed, same scene, every time.
 */
const rand = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Motes rising through the ground.
 *
 * Was twenty-six. Fourteen now, and each takes roughly twice as long to cross.
 * The count and the speed were doing the same damage from two directions: enough
 * points moving fast enough that the ground read as static rather than as depth,
 * and the mark had to compete with it while drawing itself.
 *
 * Fewer and slower is not less — a mote that takes three seconds to cross is
 * legible as a single travelling thing, where one that takes one second is a
 * flicker at the edge of vision.
 */
const MOTES = 14;

/**
 * Beams, as arcs orbiting the mark.
 *
 * These were seven straight streaks rising from the bottom of the frame, and
 * they were wrong twice over. Vertical risers move against the composition
 * rather than around it, so the eye tracked them past the logo instead of
 * settling on it; and seven of them crossing twenty-six motes made the ground
 * busy at exactly the moment the mark is trying to draw itself.
 *
 * Four now, and they wrap. Each is a ring centred on the composition with only
 * its top border coloured, which renders as an arc — the standard CSS spinner
 * shape, and free: no gradient, no filter, one element. Rotating it sweeps the
 * arc around behind the mark. The right border carries a third of the alpha, so
 * the arc tapers off rather than ending on a cut edge.
 *
 * They are slow on purpose. Each turns 40-70 degrees across the WHOLE four
 * seconds, which is barely perceptible frame to frame and unmistakable across
 * the scene — the difference between light moving and light travelling. The
 * previous version crossed the entire frame in about a second.
 *
 * Same rules as everything else here: position and opacity are functions of `t`,
 * only `transform` and `opacity` change between frames, and there is no filter.
 * A border needs no gradient at all, which makes this cheaper than the streaks
 * it replaces as well as calmer.
 */
const BEAMS = 4;
const DISPLAY_STACK =
  '"Plus Jakarta Sans", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
const BODY_STACK = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * The ground, sized to the composition.
 *
 * Two false starts got here, and both are worth recording.
 *
 * The first wrote the gradient's own vertical position into a template string and
 * animated it, which repainted two viewport-sized radial gradients on every frame.
 * That is the stall.
 *
 * The fix for it was to make the image static and animate the layer instead —
 * correct — but the same edit also copied `.auth-aurora` from auth.css verbatim,
 * `rem` units and all, on the theory that landing on the login screen's exact
 * ground would make the hand-off invisible. It does the opposite. A `80rem` radial
 * is 1280px whatever it is drawn into, so on a phone its bright centre covers the
 * whole frame and the scene becomes a flat lavender field with no depth in it at
 * all. The login screen gets away with that because it has a card on top and the
 * wash is only a backdrop; here the ground *is* the subject.
 *
 * So it is sized from `s` like everything else, and the seam is closed by the
 * `landing` colour instead — which is a better mechanism anyway, because it works
 * for whichever screen the session opens on and in either theme, where matching one
 * specific screen's background never could.
 */
const auroraImage = (s: number): string =>
  [
    `radial-gradient(${Math.round(s * 1.5)}px ${Math.round(s * 1.1)}px at 22% 92%,`,
    "rgba(150,102,220,0.62) 0%, rgba(150,102,220,0) 62%),",
    `radial-gradient(${Math.round(s * 1.2)}px ${Math.round(s * 0.9)}px at 82% 102%,`,
    "rgba(96,52,190,0.5) 0%, rgba(96,52,190,0) 60%)",
  ].join(" ");

/**
 * The MINT mark, verbatim.
 *
 * These two paths and this viewBox are copied unchanged from
 * `public/assets/mint-logo.svg` — the same two interlocking chevrons that
 * `src/components/icons/MintMark.tsx` inlines for the navigation. An opening
 * sequence is the one place a brand mark absolutely must be the real one, so
 * nothing here is redrawn or approximated.
 *
 * `MARK_A` is the upper-left chevron and `MARK_B` its 180° twin. They overlap
 * across the middle of the viewBox, which is what makes them interlock, and is
 * why the two halves can be moved independently and still meet exactly.
 */
const MARK_VIEWBOX = "0 0 1826.64 722.72";
const MARK_ASPECT = 1826.64 / 722.72;
const MARK_A =
  "M1089.47,265.13c25.29,12.34,16.69,50.37-11.45,50.63h0s-512.36,0-512.36,0c-14.73,0-26.67,11.94-26.67,26.67v227.94c0,14.73-11.94,26.67-26.67,26.67H26.67c-14.73,0-26.67-11.94-26.67-26.67v-248.55c0-9.54,5.1-18.36,13.38-23.12L526.75,3.55c7.67-4.41,17.03-4.73,24.99-.85l537.73,262.43Z";
const MARK_B =
  "M737.17,457.58c-25.29-12.34-16.69-50.37,11.45-50.63h0s512.36,0,512.36,0c14.73,0,26.67-11.94,26.67-26.67v-227.94c0-14.73,11.94-26.67,26.67-26.67h485.66c14.73,0,26.67,11.94,26.67,26.67v248.55c0,9.54-5.1,18.36-13.38,23.12l-513.38,295.15c-7.67,4.41-17.03,4.73-24.99.85l-537.73-262.43Z";

export function SplashScene({
  t: rawT,
  width,
  height,
  still = false,
  landing,
  tagline = "Invest · Borrow · Protect",
  wordmarkPrefix = "my",
  wordmarkSuffix = "MINT",
}: SplashSceneProps) {
  // For `still`, the moment the composition is complete — not t = 1, which is
  // part-way through the exit. Someone who asked for no motion should be shown the
  // finished thing, not the finished thing already leaving.
  const t = still ? BEATS.handoff[0] : clamp01(rawT);
  // Sized from the smaller edge, so it is the same composition on a 375px phone
  // and a 1920px render rather than a wide crop of one.
  const s = Math.min(width, height);

  const wash = easeOut(at(t, ...BEATS.wash));
  const ruleIn = easeInOut(at(t, ...BEATS.rule));
  const tagIn = easeOut(at(t, ...BEATS.tagline));
  const handoff = easeInOut(at(t, ...BEATS.handoff));

  // Eased over a longer window than the opacity, so the ground is still moving
  // after it has finished brightening rather than arriving and stopping.
  const rise = easeOut(at(t, BEATS.wash[0], BEATS.wash[1] + 0.18));

  // The outline draws, then the fill arrives. Each half traces on its own slightly
  // offset window, so the stroke reads as one continuous gesture across the whole
  // mark rather than two lines appearing at once.
  const traceA = easeInOut(at(t, BEATS.trace[0], BEATS.trace[0] + 0.26));
  const traceB = easeInOut(at(t, BEATS.trace[0] + 0.08, BEATS.trace[1]));
  const lockIn = easeOut(at(t, ...BEATS.lock));

  // "my" lands first and "MINT" follows, which is the order they are read in.
  const myIn = easeOut(at(t, BEATS.wordmark[0], BEATS.wordmark[0] + 0.14));
  const mintIn = easeOut(at(t, BEATS.wordmark[0] + 0.06, BEATS.wordmark[1]));

  // ── The exit is staged, and this is the first half of it ──────────────────
  //
  // By t = 1 the mark and the wordmark have very nearly left: lifted and down to a
  // tenth of their opacity. Only then does the host dissolve the ground, which by
  // that point is the login screen's own ground. Two things leaving at once is what
  // made the old exit read as a cut — you cannot tell what is going away when
  // everything goes at the same moment.
  const lift = -handoff * s * 0.07;
  // Written this way round because `1 - handoff * 0.9` is 0.09999999999999998 at
  // the end, and that lands in the DOM verbatim.
  const compositionOut = 0.1 + (1 - handoff) * 0.9;

  // How far the ground has bloomed toward the page underneath. Capped short of 1:
  // a trace of the room has to remain or the last beat reads as a flash to white,
  // and 6% of a residual tint is well under what anyone can see across a dissolve.
  const landed = handoff * 0.94;

  const markWidth = s * 0.4;
  // The halves converge along the brand gradient's own diagonal: up-and-right for
  // the upper chevron, down-and-left for its twin. They slide past each other and
  // lock, which is the one piece of motion the mark's own construction suggests.
  // Measured in viewBox units, so it scales with the mark.
  const slide = (1 - lockIn) * 210;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        // GROUND, not the settled colour: at t = 0 this is the only thing on
        // screen, and index.html paints exactly this before any JavaScript runs.
        backgroundColor: GROUND,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* The ground lifting into brand purple, and rising as it does.
          Two radials rather than one, so the light has a direction instead of
          sitting in the middle like a vignette. Both are below the frame to begin
          with, which is where the sense of arrival comes from.

          The image is a constant for a given size; only the opacity and the
          translate change between frames. Exposing the dark top edge while the
          layer is still low is free, because it is still near-transparent then. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: auroraImage(s),
          backgroundRepeat: "no-repeat",
          opacity: wash,
          transform: `translate3d(0, ${(1 - rise) * height * 0.24}px, 0)`,
        }}
      />

      {/* Motes rising.
          Value accruing, if you like — but their real job is the second at the
          start where the mark is still only an outline. A near-still frame for
          that long reads as a stalled app.

          A radial gradient rather than a circle with `filter: blur()`: identical
          at this size and it does not cost twenty-six filter passes a frame. */}
      {/* Arcs, behind the composition so they read as light around it. */}
      {Array.from({ length: BEAMS }, (_, i) => {
        const seed = i + 41; // offset from the motes' seeds so they do not correlate
        // Concentric and centred on the composition, the outer ones running past
        // the frame so they read as arcs passing behind rather than as rings
        // drawn around it.
        const d = s * (0.78 + i * 0.3 + rand(seed * 13) * 0.08);
        // Thick enough to read as a band of light rather than a drawn line. A
        // hairline arc looks like a loading spinner; the softness has to come
        // from weight and low alpha, since `blur()` is not available here.
        const ring = Math.max(1, Math.round(s * 0.007));
        // Alternating direction. Two arcs turning the same way is a mechanism;
        // turning against each other is weather.
        const spin = i % 2 === 0 ? 1 : -1;
        const from = rand(seed * 19) * 360;
        // 40-70 degrees across the whole scene. Barely visible frame to frame,
        // unmistakable across four seconds.
        const sweep = 40 + rand(seed * 23) * 30;
        const turn = easeInOut(at(t, BEATS.beams[0], BEATS.beams[1]));
        // Staggered so they do not arrive together, and out on the same sine as
        // everything else so none of them ends on a cut.
        const delay = i * 0.05;
        const alpha =
          Math.sin(Math.PI * clamp01(at(t, BEATS.beams[0] + delay, BEATS.beams[1]))) * 0.22;
        const tint = i % 2 === 0 ? "233,213,255" : "176,132,240";
        return (
          <div
            key={`beam-${i}`}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: d,
              height: d,
              marginTop: -d / 2,
              marginLeft: -d / 2,
              borderRadius: "50%",
              /*
               * A ring with one coloured border is an arc, and costs nothing —
               * no gradient to rebuild, no filter pass. The right border carries
               * a third of the alpha so the arc tapers instead of ending on a cut
               * edge; the other two stay transparent.
               *
               * Static, all of it. Only `transform` and `opacity` move.
               */
              border: `${ring}px solid transparent`,
              borderTopColor: `rgba(${tint},0.55)`,
              borderRightColor: `rgba(${tint},0.16)`,
              opacity: alpha * (1 - handoff),
              transform: `rotate(${from + spin * sweep * turn}deg)`,
            }}
          />
        );
      })}

      {Array.from({ length: MOTES }, (_, i) => {
        const seed = i + 1;
        const size = s * (0.006 + rand(seed * 3) * 0.011);
        const delay = rand(seed * 7) * 0.42;
        // ~2x the old 0.55-1.05: the same distance over more of the scene.
        const travel = 0.95 + rand(seed * 11) * 0.45;
        const p = clamp01(at(t, BEATS.motes[0] + delay, BEATS.motes[0] + delay + travel));
        // Fades in and out across its own travel, so none of them pops.
        const alpha = Math.sin(Math.PI * p) * 0.6;
        const tint = i % 5 === 0 ? "233,213,255" : "196,166,245";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${tint},1) 0%, rgba(${tint},0) 72%)`,
              opacity: alpha * (1 - handoff),
              // One composited property. `top` was a percentage here, which put
              // twenty-six elements through layout on every single frame.
              transform: `translate3d(${rand(seed) * width}px, ${(1.04 - p * 0.96) * height}px, 0)`,
            }}
          />
        );
      })}

      {/* The page underneath, arriving as light.
          Only `opacity` changes, and only during the last beat. Above the ground
          and the motes so it takes the whole room with it, below the composition so
          the mark fades out over it instead of being covered by it. */}
      {landing ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: landing,
            opacity: landed,
          }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translate3d(0, ${lift}px, 0)`,
          opacity: compositionOut,
        }}
      >
        {/* The mark: outline first, then the halves slide together and fill.
            `pathLength={1}` normalises each path so the dash offset is a plain 0–1
            fraction rather than a number that has to be measured — which also means
            the mark can be swapped without re-deriving the animation. Stroking a
            filled path traces its silhouette, so this works on the real logo
            geometry rather than on a single-stroke stand-in drawn to be drawable. */}
        <svg
          width={markWidth}
          height={markWidth / MARK_ASPECT}
          viewBox={MARK_VIEWBOX}
          fill="none"
          style={{
            overflow: "visible",
            transform: `scale(${0.94 + lockIn * 0.06})`,
            // Constant radius. Animating a filter re-rasterises the mark every
            // frame; the glow follows the artwork's own alpha, so it appears with
            // the stroke and strengthens with the fill for free.
            filter: `drop-shadow(0 0 ${s * 0.05}px rgba(150,100,240,0.45))`,
          }}
          aria-hidden="true"
        >
          {/*
            The brand ramp, lifted off black.

            The source file fills with #000 to #581ba4, which on this ground makes
            the bottom-left end of each chevron disappear into the background. These
            keep the source's gradient geometry exactly — same coordinates, one ramp
            per half so each chevron gets the full sweep — and raise the dark stop
            to a violet that reads. It is the gradient the brand specifies, on a
            ground the brand file was not drawn for.
          */}
          <defs>
            <linearGradient
              id="mint-splash-a"
              x1="138.19"
              y1="719.6"
              x2="842.17"
              y2="15.62"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#5b21b6" />
              <stop offset="1" stopColor="#ddd0ff" />
            </linearGradient>
            <linearGradient
              id="mint-splash-b"
              x1="984.46"
              y1="707.1"
              x2="1688.45"
              y2="3.11"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#5b21b6" />
              <stop offset="1" stopColor="#ddd0ff" />
            </linearGradient>
          </defs>

          <g transform={`translate(${-slide} ${slide * 0.4})`}>
            <path d={MARK_A} fill="url(#mint-splash-a)" fillOpacity={lockIn} />
            <path
              d={MARK_A}
              stroke="#c4a6f5"
              strokeWidth={19}
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - traceA}
              // Fades out as the fill takes over, so the finished mark is clean
              // rather than a filled shape still wearing an outline.
              strokeOpacity={traceA * (1 - lockIn)}
            />
          </g>
          <g transform={`translate(${slide} ${-slide * 0.4})`}>
            <path d={MARK_B} fill="url(#mint-splash-b)" fillOpacity={lockIn} />
            <path
              d={MARK_B}
              stroke="#c4a6f5"
              strokeWidth={19}
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - traceB}
              strokeOpacity={traceB * (1 - lockIn)}
            />
          </g>
        </svg>

        <div
          style={{
            marginTop: s * 0.05,
            display: "flex",
            alignItems: "baseline",
            fontFamily: DISPLAY_STACK,
            fontSize: s * 0.098,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: "#ffffff",
          }}
        >
          <span
            style={{
              fontWeight: 400,
              fontFamily: 'Manrope, sans-serif',
              fontSize: '0.5em',
              opacity: myIn,
              transform: `translate3d(0, ${(1 - myIn) * s * 0.03}px, 0)`,
            }}
          >
            {wordmarkPrefix}
          </span>
          <span
            style={{
              fontWeight: 800,
              fontFamily: '"Future Earth", sans-serif',
              fontSize: '1em',
              opacity: mintIn,
              transform: `translate3d(0, ${(1 - mintIn) * s * 0.03}px, 0)`,
            }}
          >
            {wordmarkSuffix}
          </span>
        </div>

        {/* A rule sweeping out from the centre.
            `scaleX` rather than an animated width: one transform, composited, and
            it cannot cause a reflow on a screen that is already busy loading. */}
        <div
          style={{
            marginTop: s * 0.035,
            width: s * 0.26,
            height: Math.max(1, s * 0.0025),
            background:
              "linear-gradient(90deg, rgba(196,166,245,0) 0%, rgba(196,166,245,0.9) 50%, rgba(196,166,245,0) 100%)",
            transform: `scaleX(${ruleIn})`,
          }}
        />

        <div
          style={{
            marginTop: s * 0.032,
            fontFamily: BODY_STACK,
            fontSize: s * 0.026,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "rgba(233,213,255,0.82)",
            opacity: tagIn,
            transform: `translate3d(0, ${(1 - tagIn) * s * 0.018}px, 0)`,
          }}
        >
          {tagline}
        </div>
      </div>
    </div>
  );
}
