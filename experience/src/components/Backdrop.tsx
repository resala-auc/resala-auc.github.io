import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * Drop a looping film into experience/public/media/hero.mp4 (or point this at a
 * CDN URL) and it becomes the hero background. Until then the aurora layers
 * below carry the mood on their own — no layout shift either way, because the
 * base colour already matches the darkest gradient stop.
 */
const HERO_VIDEO_URL = "";

const DUST_COUNT = 10;

type BackdropProps = {
  /** 0 = calm intro, 1 = focused form state (the aurora dims and settles). */
  intensity?: number;
};

export function Backdrop({ intensity = 1 }: BackdropProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Pointer parallax: the light pools lag behind the cursor, so the page is
  // never completely still even when nothing is animating on its own.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 40, damping: 20, mass: 1.2 });
  const smoothY = useSpring(pointerY, { stiffness: 40, damping: 20, mass: 1.2 });

  const blueX = useTransform(smoothX, [-1, 1], [-34, 34]);
  const blueY = useTransform(smoothY, [-1, 1], [-22, 22]);
  const warmX = useTransform(smoothX, [-1, 1], [26, -26]);
  const warmY = useTransform(smoothY, [-1, 1], [17, -17]);
  const mauveX = useTransform(smoothX, [-1, 1], [-15, 15]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointerX.set((event.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [pointerX, pointerY]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Autoplay can still be refused on low-power mode; the aurora is the fallback.
    video.play().catch(() => setVideoReady(false));
  }, []);

  const dust = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, (_, index) => ({
        left: `${(index * 37) % 100}%`,
        top: `${(index * 61) % 100}%`,
        size: 1 + ((index * 7) % 3),
        delay: -(index * 1.7),
        duration: 14 + ((index * 5) % 13)
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {HERO_VIDEO_URL ? (
        <video
          ref={videoRef}
          className={`h-full w-full scale-105 object-cover transition-opacity duration-1000 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          src={HERO_VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideoReady(true)}
        />
      ) : null}

      {/*
        Sky wash: the same drifting pools, but at tint strength on a light
        ground. Alphas are an order of magnitude lower than the dark theme
        used — anything stronger turns the page into a coloured haze and
        eats the contrast the text depends on.
      */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: 1 - intensity * 0.2 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute top-[-30%] left-[-20%] h-[95vh] w-[85vw] rounded-full blur-[110px]"
          style={{
            x: blueX,
            y: blueY,
            background: "radial-gradient(circle, rgba(167,212,242,0.55) 0%, rgba(167,212,242,0) 70%)",
            animation: "drift-a 15s ease-in-out infinite"
          }}
        />
        <motion.div
          className="absolute right-[-25%] bottom-[-35%] h-[90vh] w-[80vw] rounded-full blur-[120px]"
          style={{
            x: warmX,
            y: warmY,
            background: "radial-gradient(circle, rgba(234,194,98,0.20) 0%, rgba(234,194,98,0) 70%)",
            animation: "drift-b 19s ease-in-out infinite"
          }}
        />
        <motion.div
          className="absolute top-[20%] right-[10%] h-[60vh] w-[55vw] rounded-full blur-[130px]"
          style={{
            x: mauveX,
            background: "radial-gradient(circle, rgba(224,240,250,0.85) 0%, rgba(224,240,250,0) 70%)",
            animation: "drift-a 23s ease-in-out infinite reverse"
          }}
        />
      </motion.div>

      {/* Motes: the rising specks, now Royal Blue at low alpha so they read as
          light catching dust rather than white pinpricks on black. */}
      <div className="absolute inset-0">
        {dust.map((speck, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-brand-blue/20"
            style={{
              left: speck.left,
              top: speck.top,
              width: speck.size,
              height: speck.size,
              animation: `float-dust ${speck.duration}s linear ${speck.delay}s infinite`
            }}
          />
        ))}
      </div>

      {/* Legibility stack — the mirror of the dark theme's: ivory washing back
          in from the left and bottom, so text always sits on near-solid paper
          while the wash stays visible at the edges. */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-cream/95 via-brand-cream/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-cream/80 via-transparent to-transparent" />

      {/* Paper grain keeps the flat gradients from banding on wide screens.
          Multiply, not overlay: on a light ground overlay lifts the grain into
          a visible white sparkle instead of settling into the paper. */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")"
        }}
      />
    </div>
  );
}
