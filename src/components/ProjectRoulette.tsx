import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import type { Project } from '../lib/projects';

// A roulette of project covers: the covers sit on a wheel that turns (arrows,
// dots, arrow keys, drag or swipe), the one at the front is the chosen
// project, and its words show below the dots, one project at a time.
//
// The wheel always has at least MIN_SLOTS covers (short lists repeat), so
// the seam where it wraps round stays out of sight behind the side covers.
const MIN_SLOTS = 7;
// How far apart neighbouring covers sit, as a share of the cover's width
const STEP_X = 0.62;

const wrap = (value: number, size: number) => ((value % size) + size) % size;
// Signed distance from the front, in slots, wrapped to (-size/2, size/2]
const offsetFrom = (slot: number, pos: number, size: number) => {
  let d = wrap(slot - pos, size);
  if (d > size / 2) d -= size;
  return d;
};

// A project's words: what it is, its name, one line on it, and its links
function ProjectDetails({ project }: { project: Project }) {
  return (
    <>
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ui-accent)',
        }}
      >
        {project.kind}
      </p>
      <h2
        className='type-display'
        style={{ margin: 0, fontSize: '1.3rem', lineHeight: 1.5, color: 'var(--ui-ink)' }}
      >
        {project.title}
      </h2>
      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4 }}>{project.summary}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
        {project.links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`${project.title}: ${link.label} (opens in a new tab)`}
            onClick={(e) => e.stopPropagation()}
            className='roulette-link'
          >
            {link.label} <span aria-hidden='true'>↗</span>
          </a>
        ))}
      </div>
    </>
  );
}

function Cover({
  project,
  slot,
  slots,
  pos,
  width,
  height,
  isFront,
  onPick,
}: {
  project: Project;
  slot: number;
  slots: number;
  pos: MotionValue<number>;
  width: number;
  height: number;
  isFront: boolean;
  onPick: () => void;
}) {
  // Place, tilt and fade each cover from its distance to the front
  const x = useTransform(pos, (p) => offsetFrom(slot, p, slots) * width * STEP_X);
  const z = useTransform(pos, (p) => -Math.abs(offsetFrom(slot, p, slots)) * width * 0.55);
  const rotateY = useTransform(pos, (p) => offsetFrom(slot, p, slots) * -34);
  const scale = useTransform(pos, (p) => 1 - Math.min(Math.abs(offsetFrom(slot, p, slots)), 2.5) * 0.07);
  const opacity = useTransform(pos, (p) => {
    const d = Math.abs(offsetFrom(slot, p, slots));
    return d <= 1.6 ? 1 : Math.max(0, 1 - (d - 1.6) * 1.4);
  });
  const zIndex = useTransform(pos, (p) => 100 - Math.round(Math.abs(offsetFrom(slot, p, slots)) * 10));
  const shade = useTransform(pos, (p) => Math.min(Math.abs(offsetFrom(slot, p, slots)), 1.5) * 0.35);

  return (
    <motion.div
      // The front cover is announced; the others are there to look at, and
      // clicking one turns the wheel to it
      role='group'
      aria-roledescription='slide'
      aria-label={project.title}
      aria-hidden={!isFront}
      onClick={() => !isFront && onPick()}
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        width,
        height,
        marginLeft: -width / 2,
        x,
        z,
        rotateY,
        scale,
        opacity,
        zIndex,
        borderRadius: '1rem',
        overflow: 'hidden',
        cursor: isFront ? 'default' : 'pointer',
        pointerEvents: 'auto',
        boxShadow: '0 1.25rem 2.5rem rgba(0, 0, 0, 0.3)',
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        outline: 'none',
      }}
    >
      <img
        src={project.image}
        alt=''
        draggable={false}
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* side covers sit a little in shadow */}
      <motion.div
        aria-hidden='true'
        style={{ position: 'absolute', inset: 0, backgroundColor: '#000', opacity: shade, pointerEvents: 'none' }}
      />
    </motion.div>
  );
}

export default function ProjectRoulette({
  projects,
  onPlayClickSound,
}: {
  projects: Project[];
  onPlayClickSound?: () => void;
}) {
  const n = projects.length;
  const slots = n * Math.ceil(MIN_SLOTS / n);
  const pos = useMotionValue(0);
  const [front, setFront] = useState(0); // slot at the front
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(360);

  // Cover size follows the drawer's width
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const width = Math.round(Math.min(380, Math.max(230, stageWidth * 0.78)));
  // tall enough for the words on narrow screens (the image is cropped to fit)
  const height = Math.round(width * 0.625); // 16:10, landscape

  // A new list (switching Web / Design) starts again from the first
  useEffect(() => {
    pos.set(0);
    setFront(0);
  }, [projects, pos]);

  const settle = (target: number) => {
    // the dots (and which cover counts as the front) move straight away
    setFront(wrap(Math.round(target), slots));
    animate(pos, target, { type: 'spring', stiffness: 170, damping: 24 }).then(() => {
      pos.set(wrap(target, slots)); // keep the number small
    });
  };

  const step = (by: number) => {
    onPlayClickSound?.();
    settle(Math.round(pos.get()) + by);
  };

  const pick = (slot: number) => {
    onPlayClickSound?.();
    settle(Math.round(pos.get()) + offsetFrom(slot, pos.get(), slots));
  };

  // Turn to project k the short way round
  const goTo = (k: number) => {
    const delta = wrap(k - wrap(front, n), n);
    const by = delta > n / 2 ? delta - n : delta;
    if (by === 0) return;
    onPlayClickSound?.();
    settle(Math.round(pos.get()) + by);
  };

  // Drag or swipe to turn the wheel
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, start: pos.get(), moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6 && !d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (d.moved) pos.set(d.start - dx / (width * STEP_X));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) settle(Math.round(pos.get()));
  };

  const current = projects[wrap(front, n)];
  // The arrows sit on either side of the wheel, level with the covers'
  // middle, over the edges of the side covers
  const arrowStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 8 + height / 2,
    [side]: '0.25rem',
    transform: 'translateY(-50%)',
    zIndex: 200,
    width: '2.75rem',
    height: '2.75rem',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(6, 22, 48, 0.8)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.25)',
  });

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100%' }}>
        <div
          ref={stageRef}
          role='region'
          aria-roledescription='carousel'
          aria-label='Projects'
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'relative',
            width: '100%',
            height: height + 24,
            perspective: width * 3.2,
            overflow: 'hidden',
            touchAction: 'pan-y',
            userSelect: 'none',
            paddingTop: 8,
          }}
        >
          {/* the wheel itself lets the pointer through to its covers (in 3D it
              shares a plane with the front cover and would otherwise win) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              top: 8,
              transformStyle: 'preserve-3d',
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: slots }, (_, slot) => (
              <Cover
                key={slot}
                project={projects[slot % n]}
                slot={slot}
                slots={slots}
                pos={pos}
                width={width}
                height={height}
                isFront={slot === front}
                onPick={() => pick(slot)}
              />
            ))}
          </div>
        </div>
        <button
          type='button'
          aria-label='Previous project'
          onClick={() => step(-1)}
          className='roulette-arrow'
          style={arrowStyle('left')}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <button
          type='button'
          aria-label='Next project'
          onClick={() => step(1)}
          className='roulette-arrow'
          style={arrowStyle('right')}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Where you are: one dot per project, the current one a pill; each
          dot turns the wheel to its project. Screen readers hear the
          project's name instead. */}
      <div
        role='group'
        aria-label='Choose a project'
        style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginTop: '0.75rem' }}
      >
        {projects.map((project, k) => {
          const active = wrap(front, n) === k;
          return (
            <button
              key={project.title}
              type='button'
              aria-label={project.title}
              aria-current={active ? 'true' : undefined}
              onClick={() => goTo(k)}
              style={{
                width: '1.75rem',
                height: '1.75rem',
                border: 'none',
                padding: 0,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: active ? 'default' : 'pointer',
              }}
            >
              <span
                aria-hidden='true'
                style={{
                  display: 'block',
                  width: active ? '1.4rem' : '0.55rem',
                  height: '0.55rem',
                  borderRadius: '999px',
                  backgroundColor: active ? 'var(--ui-accent)' : 'var(--ui-ink-muted)',
                  opacity: active ? 1 : 0.55,
                  transition: 'width 0.25s ease, background-color 0.25s ease, opacity 0.25s ease',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* The front project's words, below the dots */}
      <AnimatePresence mode='wait' initial={false}>
        <motion.div
          key={current.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            width: '100%',
            maxWidth: '26rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            marginTop: '1rem',
            textAlign: 'left',
          }}
        >
          <ProjectDetails project={current} />
        </motion.div>
      </AnimatePresence>

      <p aria-live='polite' className='sr-only'>
        {`${wrap(front, n) + 1} of ${n}: ${current.title}`}
      </p>
    </div>
  );
}
