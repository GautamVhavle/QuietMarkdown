import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from 'framer-motion'
import {
  ArrowRight,
  Check,
  Files,
  FileText,
  ImagePlus,
  Moon,
  Search,
  ShieldCheck,
  WifiOff,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Shared motion vocabulary                                            */
/* ------------------------------------------------------------------ */

const EASE_OUT: [number, number, number, number] = [0.22, 0.9, 0.35, 1]

const sceneVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 44 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -44 }),
}

const stack: Variants = {
  center: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
}

const rise: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
}

interface SceneProps {
  reduced: boolean
}

function SceneFrame({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string
  title: string
  lead: string
  children?: React.ReactNode
}) {
  return (
    <motion.div variants={stack} initial="enter" animate="center" className="welcome-copy">
      <motion.p variants={rise} className="eyebrow">{eyebrow}</motion.p>
      <motion.h2 id="welcome-title" variants={rise}>{title}</motion.h2>
      <motion.p variants={rise} className="welcome-lead">{lead}</motion.p>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 1 visual — a miniature editor typing its own preview          */
/* ------------------------------------------------------------------ */

const DEMO_LINES = [
  { md: '# Quiet mornings', kind: 'h1' as const },
  { md: 'Write in *plain* text…', kind: 'p' as const, emphasis: 'em' as const },
  { md: '…and keep every **big** idea.', kind: 'p' as const, emphasis: 'strong' as const },
]

/** Total keystrokes across the demo script. */
const TOTAL_CHARS = DEMO_LINES.reduce((sum, line) => sum + line.md.length, 0)

/** Character offset where each demo line begins. */
const LINE_STARTS = (() => {
  const starts: number[] = []
  let cursor = 0
  for (const line of DEMO_LINES) {
    starts.push(cursor)
    cursor += line.md.length
  }
  return starts
})()

function MiniEditorDemo({ reduced }: SceneProps) {
  const [typed, setTyped] = useState(reduced ? TOTAL_CHARS : 0)

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => {
      setTyped((value) => (value >= TOTAL_CHARS + 14 ? 0 : value + 1))
    }, 85)
    return () => window.clearInterval(timer)
  }, [reduced])

  // Which characters belong to which line.
  const progress = DEMO_LINES.map((line, index) => {
    const start = LINE_STARTS[index]
    return { ...line, shown: Math.max(0, Math.min(line.md.length, typed - start)) }
  })
  const doneChars = Math.max(0, Math.min(TOTAL_CHARS, typed))

  return (
    <div className="mini-demo" aria-hidden="true">
      <div className="mini-pane">
        <span className="mini-pane-label">Markdown</span>
        <div className="mini-code">
          {progress.map((line, index) => (
            <div key={index} className={`mini-line ${line.kind}`}>
              {line.md.slice(0, line.shown)}
              {line.shown > 0 && line.shown < line.md.length && <span className="caret" />}
            </div>
          ))}
          {doneChars >= TOTAL_CHARS && <div className="mini-line idle">&nbsp;</div>}
        </div>
      </div>
      <div className="mini-arrow">
        <svg viewBox="0 0 40 24" width="34" height="20">
          <motion.path
            d="M2 12h30m0 0-7-7m7 7-7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          />
        </svg>
      </div>
      <div className="mini-pane preview">
        <span className="mini-pane-label">Preview</span>
        <div className="mini-render">
          {progress.map((line, index) => {
            if (line.shown < line.md.length) return <div key={index} className="mini-out pending">&nbsp;</div>
            if (line.kind === 'h1') return <h4 key={index} className="mini-h1">{line.md.slice(2)}</h4>
            if (index === 1) {
              return (
                <p key={index} className="mini-p">
                  Write in <em>plain</em> text…
                </p>
              )
            }
            return (
              <p key={index} className="mini-p">
                …and keep every <strong>big</strong> idea.
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 2 visual — the privacy seal                                   */
/* ------------------------------------------------------------------ */

function PrivacySeal({ reduced }: SceneProps) {
  return (
    <div className="seal-panel" aria-hidden="true">
      <svg viewBox="0 0 220 138" width="222" height="139">
        {/* dashed boundary of "this browser" */}
        <motion.rect
          x="18" y="10" width="184" height="112" rx="16"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.6"
          strokeDasharray="5 7"
          initial={reduced ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.75 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />

        {/* the document */}
        <motion.g
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <rect x="82" y="30" width="56" height="62" rx="8" fill="var(--surface-solid)" stroke="var(--ink-faint)" strokeWidth="1.4" />
          <rect x="90" y="42" width="40" height="5" rx="2.5" fill="var(--ink-faint)" opacity=".55" />
          <rect x="90" y="53" width="32" height="5" rx="2.5" fill="var(--ink-faint)" opacity=".4" />
          <rect x="90" y="64" width="38" height="5" rx="2.5" fill="var(--ink-faint)" opacity=".4" />
          <rect x="90" y="75" width="26" height="5" rx="2.5" fill="var(--accent)" opacity=".65" />
        </motion.g>

        {/* the lock */}
        <motion.g
          initial={reduced ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 1.25 }}
          style={{ transformOrigin: '110px 92px' }}
        >
          <rect x="98" y="84" width="24" height="19" rx="5" fill="var(--accent)" />
          <path d="M102 84v-5a8 8 0 0 1 16 0v5" fill="none" stroke="var(--accent)" strokeWidth="3.4" />
        </motion.g>
      </svg>
      <motion.span
        className="seal-caption"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.7 }}
      >
        this browser
      </motion.span>
      <motion.ul
        className="seal-points"
        initial={reduced ? false : 'enter'}
        animate="center"
        variants={{ center: { transition: { staggerChildren: 0.28, delayChildren: 1.9 } } }}
      >
        {['No account', 'No uploads', 'No analytics'].map((point) => (
          <motion.li key={point} variants={{ enter: { opacity: 0, y: 8 }, center: { opacity: 1, y: 0 } }}>
            <Check size={12} /> {point}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 3 visual — capability grid with a self-drawing diagram        */
/* ------------------------------------------------------------------ */

function MermaidSpark({ reduced }: SceneProps) {
  const draw = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 0.7, delay, repeat: Infinity, repeatType: 'loop' as const, repeatDelay: 2.4 },
        }

  const pop = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, scale: 0.5 },
          animate: { opacity: 1, scale: 1 },
          transition: { duration: 0.55, delay, ease: EASE_OUT, repeat: Infinity, repeatType: 'loop' as const, repeatDelay: 2.55 },
        }

  return (
    <svg viewBox="0 0 190 74" width="180" height="70" className="mermaid-spark" aria-hidden="true">
      {[{ x: 6, label: 'A' }, { x: 72, label: 'B' }, { x: 138, label: 'C' }].map((node, index) => (
        <g key={node.label}>
          <motion.rect
            x={node.x} y="22" width="46" height="30" rx="8"
            fill="var(--surface-solid)" stroke="var(--accent)" strokeWidth="1.5"
            {...pop(index * 0.45)}
          />
          <motion.text
            x={node.x + 23} y="41" textAnchor="middle" className="spark-node"
            {...pop(index * 0.45)}
          >
            {node.label}
          </motion.text>
        </g>
      ))}
      <motion.path d="M52 37h18m0 0-4.5-4.5M70 37l-4.5 4.5" fill="none" stroke="var(--ink-faint)" strokeWidth="1.6" strokeLinecap="round" {...draw(0.55)} />
      <motion.path d="M118 37h18m0 0-4.5-4.5M136 37l-4.5 4.5" fill="none" stroke="var(--ink-faint)" strokeWidth="1.6" strokeLinecap="round" {...draw(1)} />
    </svg>
  )
}

const CAPABILITIES = [
  { icon: Files, title: 'Many documents', note: 'Keep a whole library' },
  { icon: Search, title: 'Find & replace', note: 'Across everything' },
  { icon: ImagePlus, title: 'Paste images', note: 'Embeds locally' },
]

const CAPABILITIES_ROW_TWO = [
  { icon: WifiOff, title: 'Works offline', note: 'Installs as an app' },
  { icon: Moon, title: 'Light & dark', note: 'Follows your mood' },
  { icon: ShieldCheck, title: 'Zero tracking', note: 'Nothing phones home' },
]

function CapabilityTile({ icon: Icon, title, note }: { icon: typeof Files; title: string; note: string }) {
  return (
    <motion.div variants={rise} className="capability-tile">
      <Icon size={15} />
      <div>
        <strong>{title}</strong>
        <span>{note}</span>
      </div>
    </motion.div>
  )
}

function SceneCapabilities({ reduced }: SceneProps) {
  return (
    <SceneFrame
      eyebrow="Quietly capable"
      title="Small surface, deep tools."
      lead="Everything a writer reaches for, without the dashboard sprawl."
    >
      <div className="capability-grid">
        {CAPABILITIES.map((item) => <CapabilityTile key={item.title} {...item} />)}
      </div>
      <motion.div variants={rise} className="mermaid-row">
        <MermaidSpark reduced={reduced} />
        <div className="mermaid-note">
          <strong>Live Mermaid diagrams</strong>
          <span>Flowcharts render as you type — and export perfectly.</span>
        </div>
      </motion.div>
      <div className="capability-grid">
        {CAPABILITIES_ROW_TWO.map((item) => <CapabilityTile key={item.title} {...item} />)}
      </div>
    </SceneFrame>
  )
}

/* ------------------------------------------------------------------ */
/* Scene 4 visual — export formats fanning out                         */
/* ------------------------------------------------------------------ */

const EXPORT_CARDS = [
  { id: 'pdf', label: 'PDF', note: 'Multipage, watermarked', rotate: -7, x: -108 },
  { id: 'html', label: 'HTML', note: 'Portable & styled', rotate: 0, x: 0 },
  { id: 'png', label: 'PNG', note: 'Sharp 2× pages', rotate: 7, x: 108 },
]

function ExportFan({ reduced }: SceneProps) {
  return (
    <div className="export-fan" aria-hidden="true">
      {EXPORT_CARDS.map((card, index) => (
        <motion.div
          key={card.id}
          className={`export-card card-${card.id}`}
          initial={reduced ? false : { opacity: 0, y: 26, rotate: 0, x: 0 }}
          animate={{ opacity: 1, y: 0, rotate: card.rotate, x: card.x }}
          transition={{ type: 'spring', stiffness: 170, damping: 18, delay: 0.25 + index * 0.16 }}
        >
          <FileText size={20} />
          <strong>{card.label}</strong>
          <span>{card.note}</span>
          {!reduced && (
            <motion.span
              className="watermark-sweep"
              animate={{ x: [-62, 62] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.9 + index * 0.45, repeatDelay: 1.6 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The tour                                                            */
/* ------------------------------------------------------------------ */

const SCENE_COUNT = 4

export function WelcomeTour({ onClose }: { onClose: () => void }) {
  const [scene, setScene] = useState(0)
  const [direction, setDirection] = useState(1)
  const reduced = Boolean(useReducedMotion())
  const isLast = scene === SCENE_COUNT - 1
  const nextRef = useRef<HTMLButtonElement>(null)

  // Keyboard entry point: the footer persists across scenes, so focus stays.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setScene((s) => Math.min(SCENE_COUNT - 1, s + 1))
      if (event.key === 'ArrowLeft') setScene((s) => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const scenes = useMemo(() => [
    <SceneFrame
      key="s0"
      eyebrow="Welcome"
      title="A quiet place to write."
      lead="QuietMarkdown turns plain Markdown into polished documents — entirely inside your browser."
    >
      <motion.div variants={rise}><MiniEditorDemo reduced={reduced} /></motion.div>
    </SceneFrame>,
    <SceneFrame
      key="s1"
      eyebrow="Private by design"
      title="Your words stay yours."
      lead="No account. No cloud. Drafts live in this browser alone — download a file any time you like."
    >
      <motion.div variants={rise}><PrivacySeal reduced={reduced} /></motion.div>
    </SceneFrame>,
    <SceneCapabilities key="s2" reduced={reduced} />,
    <SceneFrame
      key="s3"
      eyebrow="Export with confidence"
      title="From draft to done."
      lead="What the preview shows is exactly what you get."
    >
      <motion.div variants={rise}><ExportFan reduced={reduced} /></motion.div>
    </SceneFrame>,
  ], [reduced])

  const goNext = () => {
    if (isLast) onClose()
    else {
      setDirection(1)
      setScene((s) => s + 1)
    }
  }

  const goBack = () => {
    setDirection(-1)
    setScene((s) => Math.max(0, s - 1))
  }

  return (
    <div className="modal-backdrop welcome-backdrop" onMouseDown={onClose}>
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="welcome-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        initial={reduced ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <header className="welcome-header">
          <span className="brand-mark welcome-mark">Q</span>
          <button className="welcome-skip" onClick={onClose}>
            Skip intro
          </button>
        </header>

        <div className="welcome-stage">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={scene}
              className="welcome-scene"
              custom={direction}
              variants={sceneVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: EASE_OUT }}
            >
              {scenes[scene]}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="welcome-footer">
          <button
            className="quiet-button welcome-back"
            onClick={goBack}
            style={{ visibility: scene === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          <div className="welcome-dots" role="tablist" aria-label="Tour progress">
            {scenes.map((_, index) => (
              <button
                key={index}
                role="tab"
                aria-selected={index === scene}
                aria-label={`Step ${index + 1}`}
                className={`welcome-dot ${index === scene ? 'active' : ''}`}
                onClick={() => { setDirection(index > scene ? 1 : -1); setScene(index) }}
              />
            ))}
          </div>
          <button ref={nextRef} className="primary-button welcome-next" onClick={goNext}>
            {isLast ? <>Start writing <Check size={15} /></> : <>Next <ArrowRight size={15} /></>}
          </button>
        </footer>
      </motion.section>
    </div>
  )
}
