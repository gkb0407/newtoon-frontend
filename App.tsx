import { useState, useEffect } from 'react'
import mainCharImg from '@/imports/image.png'
import splashCharImg from '@/imports/image-removebg-preview-1.png'
import splashLogoImg from '@/imports/image-removebg-preview__2_.png'
import eggLevelsImg from '@/imports/image-2.png'

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  blue:      '#71411E',
  navy:      '#382113',
  bg:        '#FCF8F2',
  white:     '#FFFFFF',
  softBlue:  '#F5E9D8',
  yellow:    '#D8AF71',
  cream:     '#FFF7E8',
  green:     '#5E7B54',
  purple:    '#7A5A3B',
  analogy:   '#B47737',
  orange:    '#C77A35',
  gray:      '#927B69',
  border:    '#E8DAC8',
  muted:     '#F6EFE7',
}

type Screen =
  | 'splash' | 'levelSelect' | 'vocabularySelect' | 'categorySelect'
  | 'home' | 'newsPreview' | 'comic'
  | 'quiz' | 'quizCorrect' | 'quizWrong'
  | 'levelUp' | 'level' | 'explore' | 'my'

type Tab = 'home' | 'explore' | 'level' | 'my'


type Category =
  | '정치' | '경제' | '사회' | '국제' | '과학, 기술'
  | '환경, 기후' | '문화, 연예' | '스포츠' | '건강, 생활' | '교육, 청소년'
type LayoutRole = 'MAIN' | 'RELATED' | 'EXPLORE'
type RecommendationType = 'INITIAL' | 'SIMILAR' | 'SERENDIPITY'

interface NewsData {
  title: string
  content: string
  news_url: string
  thum_url: string | null
  broadcast_date: string
  cluster: string
}

interface RecommendationItem {
  recommendation_type: RecommendationType
  layout_role: LayoutRole
  similarity_score: number | null
  recommendation_reason: string
  source: string | null
  news: NewsData
}

interface InitialRecommendationResponse {
  request_id: string
  items: RecommendationItem[]
  count: number
  generated_at: string
}

const makeClientId = (key: string) => {
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = window.crypto?.randomUUID?.() ?? `${key}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(key, id)
  return id
}

const formatNewsDate = (date: string) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return `${parsed.getFullYear()}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${String(parsed.getDate()).padStart(2, '0')}`
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

/** Shows one unmodified egg from the user-provided 5-stage image. */
function EggSprite({ level, size = 80, width }: { level: 1|2|3|4|5; size?: number; width?: number }) {
  // These are the actual horizontal centres of the five eggs in image-2.png.
  // Cropping from those centres (rather than equal fifths) keeps every stage centred.
  const eggCenters = [77, 195, 337, 458, 593]
  const imageWidth = 676
  const imageHeight = 369
  const frameWidth = width ?? Math.round(size * 1.15)
  const frameHeight = Math.round(size * 1.32)
  const scale = size / 130
  const renderedWidth = imageWidth * scale
  const renderedHeight = imageHeight * scale
  const left = frameWidth / 2 - eggCenters[level - 1] * scale

  return (
    <div
      aria-label={`Lv.${level} 성장 알`}
      role="img"
      style={{
        width: frameWidth,
        height: frameHeight,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <img
        src={eggLevelsImg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute',
          width: renderedWidth,
          height: renderedHeight,
          maxWidth: 'none',
          left,
          top: (frameHeight - renderedHeight) / 2,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  )
}

/** Main detective egg character */
function CharImg({ size = 120, src = mainCharImg }: { size?: number; src?: string }) {
  return (
    <img
      src={src}
      alt="뉴툰 알 캐릭터"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

function SpeechBubble({ text, dark = true }: { text: string; dark?: boolean }) {
  const bg = dark ? C.navy : C.white
  const color = dark ? '#fff' : C.navy
  return (
    <div style={{
      backgroundColor: bg, color,
      borderRadius: 14, padding: '10px 14px',
      fontSize: 13, fontWeight: 500,
      lineHeight: 1.5, maxWidth: 220,
      border: dark ? 'none' : `1px solid ${C.border}`,
      position: 'relative',
    }}>
      {text}
      <div style={{
        position: 'absolute', bottom: -8, left: 16,
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: `8px solid ${bg}`,
      }} />
    </div>
  )
}

function ProgressBar({ pct, color = C.blue, h = 4 }: { pct: number; color?: string; h?: number }) {
  return (
    <div style={{ height: h, backgroundColor: C.border, borderRadius: 999 }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        backgroundColor: color, borderRadius: 999,
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

function PrimaryBtn({ label, onClick, disabled = false, full = true }:
  { label: string; onClick: () => void; disabled?: boolean; full?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? '100%' : 'auto', padding: '15px 24px',
      backgroundColor: disabled ? '#D8C2AA' : C.blue,
      color: '#fff', border: 'none', borderRadius: 14,
      fontSize: 16, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : `0 4px 16px rgba(113,65,30,0.25)`,
    }}>
      {label}
    </button>
  )
}

function BottomNav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const items: { id: Tab; icon: string; label: string }[] = [
    { id: 'home',    icon: '🏠', label: '홈' },
    { id: 'explore', icon: '🔍', label: '탐색' },
    { id: 'level',   icon: '🥚', label: '레벨' },
    { id: 'my',      icon: '👤', label: 'MY' },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 390,
      backgroundColor: C.white, borderTop: `1px solid ${C.border}`,
      display: 'flex', zIndex: 60,
      paddingBottom: 8,
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => onTab(it.id)} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '10px 0 4px',
          gap: 3, background: 'none', border: 'none', cursor: 'pointer',
        }}>
          <span style={{ fontSize: 20 }}>{it.icon}</span>
          <span style={{
            fontSize: 11, fontWeight: tab === it.id ? 700 : 400,
            color: tab === it.id ? C.blue : C.gray,
          }}>{it.label}</span>
          {tab === it.id && (
            <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: C.blue, marginTop: 2 }} />
          )}
        </button>
      ))}
    </div>
  )
}

// ─── SCREEN 1 — Splash ────────────────────────────────────────────────────────
function SplashScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="screen-enter" style={{
      minHeight: '100vh', backgroundColor: '#FAF7F2',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px 48px',
    }}>
      {/* Logo */}
      <div style={{ width: 290, height: 98, marginBottom: 34, overflow: 'hidden', position: 'relative' }}>
        <img
          src={splashLogoImg}
          alt="NewToon"
          style={{ width: 290, maxWidth: 'none', position: 'absolute', top: -45, left: 0 }}
        />
      </div>

      <CharImg size={180} src={splashCharImg} />

      <div style={{ textAlign: 'center', margin: '32px 0 12px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1.35 }}>
          세상의 모든 뉴스,<br />내가 <span style={{ color: '#71411E', fontWeight: 800 }}>알</span>려줄게
        </h1>
      </div>
      <PrimaryBtn label="NewToon 시작하기" onClick={onNext} />

    </div>
  )
}

// ─── SCREEN 2 — 뉴스 수준 선택 ────────────────────────────────────────────────
const levels = [
  { id: 'beginner', title: '뉴스 입문', showCheck: false,
    desc: '뉴스를 거의 보지 않아요.' },
  { id: 'basic',    title: '뉴스 기본', showCheck: false,
    desc: '일주일에 3~4번 뉴스를 봐요.' },
  { id: 'advanced', title: '뉴스 탐구', showCheck: false,
    desc: '뉴스를 거의 매일 봐요.' },
]

function LevelSelectScreen({ onNext }: { onNext: () => void }) {
  const [sel, setSel] = useState('')
  return (
    <div className="screen-enter" style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '24px 20px 40px' }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: C.gray, fontWeight: 600, whiteSpace: 'nowrap' }}>1 / 2</span>
        <ProgressBar pct={50} />
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.navy, lineHeight: 1.35, marginBottom: 6 }}>
        평소 뉴스를 얼마나 자주 보나요?
      </h1>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 24, lineHeight: 1.6 }}>
        나중에 MY에서 다시 변경할 수 있어요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {levels.map(lv => (
          <button key={lv.id} onClick={() => setSel(lv.id)} style={{
            backgroundColor: sel === lv.id ? C.softBlue : C.white,
            border: `2px solid ${sel === lv.id ? C.blue : C.border}`,
            borderRadius: 18, padding: '16px 18px',
            textAlign: 'left', cursor: 'pointer',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            {lv.showCheck && (
              <div style={{
                width: 22, height: 22, borderRadius: '50%', marginTop: 1, flexShrink: 0,
                border: `2px solid ${sel === lv.id ? C.blue : C.border}`,
                backgroundColor: sel === lv.id ? C.blue : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel === lv.id && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />}
              </div>
            )}
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{lv.title}</p>
              <p style={{ fontSize: 13, color: C.gray, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{lv.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <PrimaryBtn label="다음" onClick={onNext} disabled={!sel} />
    </div>
  )
}


// ─── SCREEN 3 — Vocabulary Level Selection ───────────────────────────────────
const vocabularyLevels = [
  { id: 'easy', title: '기초 어휘', desc: '어휘에 자신이 없어요.' },
  { id: 'standard', title: '표준 어휘', desc: '일상에서 자주 쓰는 쉬운 단어를 알고 있어요.' },
  { id: 'advanced', title: '시사 어휘', desc: '뉴스·사회 이슈에서 자주 등장하는 단어를 알고 있어요.' },
]

function VocabularySelectScreen({ onNext }: { onNext: () => void }) {
  const [selectedVocabulary, setSelectedVocabulary] = useState('')
  return (
    <div className="screen-enter" style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '24px 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: C.gray, fontWeight: 600, whiteSpace: 'nowrap' }}>2 / 2</span>
        <ProgressBar pct={100} />
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: C.navy, lineHeight: 1.35, marginBottom: 6 }}>
        본인의 어휘 수준은<br />어느 정도인가요?
      </h1>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 24, lineHeight: 1.6 }}>
        선택한 수준에 맞춰 뉴스 용어를 쉽게 설명해드릴게요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {vocabularyLevels.map(level => (
          <button key={level.id} onClick={() => setSelectedVocabulary(level.id)} style={{
            backgroundColor: selectedVocabulary === level.id ? C.softBlue : C.white,
            border: `2px solid ${selectedVocabulary === level.id ? C.blue : C.border}`,
            borderRadius: 18, padding: '16px 18px',
            textAlign: 'left', cursor: 'pointer',
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{level.title}</p>
            <p style={{ fontSize: 13, color: C.gray, lineHeight: 1.5 }}>{level.desc}</p>
          </button>
        ))}
      </div>

      <PrimaryBtn label="다음" onClick={onNext} disabled={!selectedVocabulary} />
    </div>
  )
}

// ─── SCREEN 3 — 관심 카테고리 선택 ────────────────────────────────────────────
const cats: { id: Category; icon: string; label: Category }[] = [
  { id: '정치', icon: '🏛️', label: '정치' },
  { id: '경제', icon: '📈', label: '경제' },
  { id: '사회', icon: '👥', label: '사회' },
  { id: '국제', icon: '🌍', label: '국제' },
  { id: '과학, 기술', icon: '🔬', label: '과학, 기술' },
  { id: '환경, 기후', icon: '🌿', label: '환경, 기후' },
  { id: '문화, 연예', icon: '🎭', label: '문화, 연예' },
  { id: '스포츠', icon: '⚽', label: '스포츠' },
  { id: '건강, 생활', icon: '🏠', label: '건강, 생활' },
  { id: '교육, 청소년', icon: '📚', label: '교육, 청소년' },
]

function CategorySelectScreen({ onNext }: { onNext: (interests: [Category, Category, Category]) => Promise<void> }) {
  const [sel, setSel] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: Category) => {
    if (isLoading) return
    if (sel.includes(id)) {
      setSel(sel.filter(category => category !== id))
      setError(null)
    } else if (sel.length < 3) {
      setSel([...sel, id])
      setError(null)
    } else {
      setError('관심 분야는 3개까지 선택할 수 있어요. 다른 분야를 선택하려면 선택한 항목 하나를 먼저 해제해주세요.')
    }
  }

  const submit = async () => {
    if (sel.length !== 3 || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      await onNext([sel[0], sel[1], sel[2]])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '맞춤 뉴스를 불러오지 못했어요. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }
  }

  return (
    <div className="screen-enter" style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '24px 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 12, color: C.gray, fontWeight: 600, whiteSpace: 'nowrap' }}>2 / 2</span>
        <ProgressBar pct={100} />
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, lineHeight: 1.35, marginBottom: 6 }}>
        어떤 뉴스가 가장<br />궁금해요?
      </h1>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 6, lineHeight: 1.6 }}>
        관심 분야를 정확히 3개 골라주세요.<br />Home에서 선택한 뉴스를 먼저 보여드릴게요.
      </p>
      <p style={{ fontSize: 13, fontWeight: 700, color: C.blue, marginBottom: 20 }}>
        {sel.length === 3 ? '3 / 3 선택 완료 ✓' : `${sel.length} / 3 선택`}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {cats.map(cat => {
          const active = sel.includes(cat.id)
          return (
            <button key={cat.id} onClick={() => toggle(cat.id)} disabled={isLoading} style={{
              backgroundColor: active ? C.softBlue : C.white,
              border: `2px solid ${active ? C.blue : C.border}`,
              borderRadius: 16, padding: '14px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: isLoading ? 'default' : 'pointer', transition: 'all 0.15s',
              opacity: isLoading ? 0.7 : 1,
            }}>
              <span style={{ fontSize: 22 }}>{active ? '✓' : cat.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: active ? C.blue : C.navy }}>{cat.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div role="alert" style={{ backgroundColor: C.cream, border: `1px solid ${C.yellow}`, borderRadius: 14, padding: '12px 14px', marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 3 }}>{error.split(' 다른 분야')[0]}</p>
          {error.includes(' 다른 분야') && <p style={{ fontSize: 12, color: C.gray }}>다른 분야를 선택하려면 선택한 항목 하나를 먼저 해제해주세요.</p>}
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0 16px' }}>
          <span className="news-loading-spinner" aria-hidden="true" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>관심 분야에 맞는 오늘의 뉴스를 찾고 있어요.</p>
            <p style={{ fontSize: 12, color: C.gray, marginTop: 2 }}>여러 뉴스 중 지금 읽기 좋은 뉴스를 고르고 있어요.</p>
          </div>
        </div>
      )}

      <PrimaryBtn label={isLoading ? '맞춤 뉴스를 준비하고 있어요...' : '내 NewToon 시작하기'} onClick={submit} disabled={sel.length !== 3 || isLoading} />
    </div>
  )
}

// ─── SCREEN 4 — Home Lobby ────────────────────────────────────────────────────
function NewsThumbnail({ item, size = 72 }: { item: RecommendationItem; size?: number }) {
  if (!item.news.thum_url) {
    return <div aria-label="뉴스 이미지 없음" style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.softBlue, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: Math.round(size * 0.38) }}>📰</div>
  }
  return <img src={item.news.thum_url} alt="" style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', flexShrink: 0, backgroundColor: C.softBlue }} />
}

function HomeScreen({ onNewsClick, tab, onTab, xp, recommendations, selectedCategories }: {
  onNewsClick: (item: RecommendationItem) => void; tab: Tab; onTab: (t: Tab) => void; xp: number
  recommendations: RecommendationItem[] | null; selectedCategories: Category[]
}) {
  const mainNews = recommendations?.[0]
  const interestNews = recommendations?.slice(1, 4) ?? []
  return (
    <div className="screen-enter" style={{ backgroundColor: C.bg, minHeight: '100vh', paddingBottom: 88 }}>
      <div style={{ backgroundColor: C.white, padding: '14px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: C.blue, letterSpacing: '-0.5px' }}>뉴툰</span>
        <div style={{ backgroundColor: C.softBlue, borderRadius: 999, padding: '4px 10px' }}><span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{xp} XP</span></div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 4 }}>오늘은 어떤 세상을 알아볼까?</h1>
        <p style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>네가 고른 관심 뉴스부터 준비했어.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {selectedCategories.map(tag => <span key={tag} style={{ backgroundColor: C.softBlue, color: C.blue, borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600 }}>{tag}</span>)}
        </div>

        {mainNews ? <>
          <div onClick={() => onNewsClick(mainNews)} style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #5A331C 100%)`, borderRadius: 20, padding: '20px', marginBottom: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.yellow, backgroundColor: 'rgba(216,175,113,0.2)', borderRadius: 999, padding: '4px 10px', display: 'inline-block', marginBottom: 10 }}>오늘의 NewToon</span>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.4 }}>{mainNews.news.title}</h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>{mainNews.source ?? '출처 미제공'} · {formatNewsDate(mainNews.news.broadcast_date)}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mainNews.recommendation_reason}</p>
                <button onClick={(event) => { event.stopPropagation(); onNewsClick(mainNews) }} style={{ backgroundColor: C.blue, color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>6컷으로 보기 →</button>
              </div>
              <NewsThumbnail item={mainNews} size={76} />
            </div>
          </div>

          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 3 }}>관심 분야 뉴스</h2>
          <p style={{ fontSize: 12, color: C.gray, marginBottom: 12 }}>네가 선택한 관심사를 바탕으로 골라봤어.</p>
          {interestNews.map((item, index) => (
            <div key={item.news.news_url} onClick={() => onNewsClick(item)} style={{ backgroundColor: C.white, borderRadius: 16, padding: '14px', marginBottom: 10, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', gap: 12 }}>
              <NewsThumbnail item={item} size={68} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 11, color: C.blue, backgroundColor: C.softBlue, borderRadius: 999, padding: '3px 8px', fontWeight: 700 }}>{item.layout_role === 'EXPLORE' ? '새로운 주제' : `관심 뉴스 ${index + 1}`}</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.4, marginTop: 7 }}>{item.news.title}</p>
                <p style={{ fontSize: 11, color: C.gray, marginTop: 5 }}>{item.source ?? '출처 미제공'} · {formatNewsDate(item.news.broadcast_date)}</p>
                <p style={{ fontSize: 12, color: C.gray, marginTop: 5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.recommendation_reason}</p>
              </div>
            </div>
          ))}
        </> : <div style={{ backgroundColor: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: '24px 18px', textAlign: 'center' }}><p style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>맞춤 뉴스를 준비 중이에요.</p><p style={{ fontSize: 13, color: C.gray, marginTop: 6 }}>관심 분야를 선택하면 실제 추천 뉴스를 보여드릴게요.</p></div>}
      </div>
      <BottomNav tab={tab} onTab={onTab} />
    </div>
  )
}

// ─── SCREEN 5 — News Preview ──────────────────────────────────────────────────
function NewsPreviewScreen({ onNext, onBack, item }: { onNext: () => void; onBack: () => void; item: RecommendationItem }) {
  return (
    <div className="screen-enter" style={{ backgroundColor: C.bg, minHeight: '100vh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        backgroundColor: C.white, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.navy }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.navy }}>뉴스 미리보기</span>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: C.navy, lineHeight: 1.4, marginBottom: 20 }}>
          {item.news.title}
        </h1>

        {/* Hero visual */}
        <div style={{
          backgroundColor: C.softBlue, borderRadius: 20,
          padding: '24px 20px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 14, right: 14,
            backgroundColor: C.navy, color: '#fff',
            borderRadius: 12, padding: '8px 12px', fontSize: 13, fontWeight: 500,
          }}>
            "이게 나랑 무슨 상관이지?"
          </div>
          <CharImg size={140} />
        </div>

        {/* Meta chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[item.source ?? '출처 미제공', formatNewsDate(item.news.broadcast_date)].map(tag => (
            <span key={tag} style={{
              fontSize: 12, color: C.gray, backgroundColor: C.muted,
              borderRadius: 999, padding: '4px 10px',
            }}>{tag}</span>
          ))}
        </div>

        {/* Trust card */}
        <div style={{
          backgroundColor: C.white, borderRadius: 18, padding: '18px 20px',
          border: `1px solid ${C.border}`, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
            ✅ NewToon이 확인했어요
          </h3>
          <p style={{ fontSize: 13, color: C.gray, lineHeight: 1.6, marginBottom: 14 }}>
            {item.recommendation_reason}
          </p>
          <p style={{ fontSize: 12, color: C.gray, lineHeight: 1.6, marginBottom: 12 }}>
            {item.news.content}
          </p>
          <button onClick={() => window.open(item.news.news_url, '_blank', 'noopener,noreferrer')} style={{
            width: '100%', padding: '10px 0',
            backgroundColor: 'transparent', color: C.blue,
            border: `1.5px solid ${C.blue}`, borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            원문 보기
          </button>
        </div>

        <PrimaryBtn label="6컷 시작하기" onClick={onNext} />
      </div>

    </div>
  )
}

// ─── SCREEN 6 — 6컷 Comic ────────────────────────────────────────────────────
const panels = [
  {
    num: '1 / 6', title: '사건 소개',
    bg: '#E8F5EE', labelColor: C.green, label: 'FACT · 확인된 사실',
    dialog: '"기준금리가 내려갔대!"',
    caption: '한국은행이 기준금리를 낮췄어요.',
  },
  {
    num: '2 / 6', title: '질문',
    bg: '#EEF4FF', labelColor: C.analogy, label: 'ANALOGY · 이해를 위한 비유',
    dialog: '"그런데 기준금리가 뭐야?"',
    caption: '기준금리 — 여러 금리가 움직이기 전에 참고하는 기준이에요.',
    showTerm: true,
  },
  {
    num: '3 / 6', title: '쉬운 설명',
    bg: '#FFF8EC', labelColor: C.analogy, label: 'ANALOGY · 이해를 위한 비유',
    dialog: '"출발선 같은 거구나!"',
    caption: '여러 금리가 움직일 때 참고하는 출발선과 비슷해요.',
  },
  {
    num: '4 / 6', title: '작동 원리',
    bg: '#E8F5EE', labelColor: C.green, label: 'FACT · 확인된 사실',
    dialog: '"손가락으로 흐름을 설명해줄게!"',
    caption: '기준금리 ↓ → 은행금리 ↓ → 대출·예금금리 ↓',
  },
  {
    num: '5 / 6', title: '생활 영향',
    bg: '#F3E8FF', labelColor: C.purple, label: 'FORECAST · 앞으로의 영향',
    dialog: '"우리 생활에도 영향을 줄 수 있어!"',
    caption: '대출 이자가 줄고, 저축 이자도 줄어요.',
  },
  {
    num: '6 / 6', title: '주의점',
    bg: '#FFF3E0', labelColor: C.orange, label: 'CHECK · 추가 확인 필요',
    dialog: '"그런데 여기서 주의!"',
    caption: '기준금리가 내려도 대출금리가 즉시 같은 폭으로 내려가지 않아요.',
  },
]

function ComicScreen({ onQuiz, onBack }: { onQuiz: () => void; onBack: () => void }) {
  const [idx, setIdx] = useState(0)
  const [showTerm, setShowTerm] = useState(false)
  const p = panels[idx]
  const isLast = idx === panels.length - 1

  return (
    <div className="screen-enter" style={{
      backgroundColor: C.white, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.navy }}>←</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.gray }}>{p.num}</span>
        <div style={{ width: 32 }} />
      </div>
      <div style={{ height: 3, backgroundColor: C.border }}>
        <div style={{
          width: `${((idx + 1) / 6) * 100}%`, height: '100%',
          backgroundColor: C.blue, transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Comic area */}
      <div style={{
        flex: 1, backgroundColor: p.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', transition: 'background-color 0.25s ease',
        minHeight: 400,
      }}>
        <span style={{
          backgroundColor: 'rgba(255,255,255,0.75)', color: C.navy,
          borderRadius: 999, padding: '5px 16px',
          fontSize: 12, fontWeight: 700, marginBottom: 20,
        }}>{p.title}</span>

        {/* Dialog bubble */}
        <div style={{
          backgroundColor: C.navy, color: '#fff',
          borderRadius: 18, padding: '14px 20px',
          fontSize: 17, fontWeight: 700, textAlign: 'center',
          maxWidth: 290, lineHeight: 1.45, marginBottom: 20,
          position: 'relative',
        }}>
          {p.showTerm ? (
            <>
              "그런데{' '}
              <span
                onClick={() => setShowTerm(true)}
                style={{
                  textDecoration: 'underline', color: '#7DD3FC',
                  cursor: 'pointer', textDecorationColor: '#7DD3FC',
                }}
              >기준금리</span>
              가 뭐야?"
            </>
          ) : p.dialog}
        </div>

        <CharImg size={140} />

        <p style={{
          fontSize: 14, color: C.navy, textAlign: 'center',
          marginTop: 18, lineHeight: 1.6, maxWidth: 290,
          fontWeight: idx === 3 ? 700 : 400,
        }}>
          {p.caption}
        </p>
      </div>

      {/* Bottom action bar */}
      <div style={{ padding: '16px 20px 32px', backgroundColor: C.white }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#fff',
            backgroundColor: p.labelColor,
            borderRadius: 999, padding: '5px 12px',
          }}>{p.label}</span>
          <button style={{
            fontSize: 12, color: C.gray, backgroundColor: C.muted,
            borderRadius: 999, padding: '5px 12px', border: 'none', cursor: 'pointer',
          }}>
            근거 보기
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {idx > 0 && (
            <button onClick={() => setIdx(i => i - 1)} style={{
              flex: 1, padding: '14px 0',
              backgroundColor: C.muted, color: C.navy,
              borderRadius: 12, fontSize: 15, fontWeight: 600,
              border: 'none', cursor: 'pointer',
            }}>이전</button>
          )}
          <button
            onClick={isLast ? onQuiz : () => setIdx(i => i + 1)}
            style={{
              flex: 2, padding: '14px 0',
              backgroundColor: C.blue, color: '#fff',
              borderRadius: 12, fontSize: 15, fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}
          >
            {isLast ? '퀴즈로 확인하기' : '다음'}
          </button>
        </div>
      </div>

      {showTerm && <TermSheet onClose={() => setShowTerm(false)} />}
    </div>
  )
}

// ─── SCREEN 7 — Quiz ─────────────────────────────────────────────────────────
const quizChoices = [
  { id: 'A', text: '모든 대출금리가 즉시 똑같이 내려간다.' },
  { id: 'B', text: '예금과 대출금리에 영향을 줄 수 있다.' },
  { id: 'C', text: '은행의 영업시간이 줄어든다.' },
  { id: 'D', text: '뉴스 기사 수가 줄어든다.' },
]
const CORRECT_ANSWER = 'B'

function QuizScreen({ onCorrect, onWrong, onBack }: {
  onCorrect: () => void; onWrong: () => void; onBack: () => void
}) {
  const [sel, setSel] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const submit = () => {
    if (!sel || submitted) return
    setSubmitted(true)
    setTimeout(() => (sel === CORRECT_ANSWER ? onCorrect() : onWrong()), 900)
  }

  const choiceStyle = (id: string) => {
    if (!submitted) return {
      border: `2px solid ${sel === id ? C.blue : C.border}`,
      backgroundColor: sel === id ? C.softBlue : C.white,
    }
    if (id === CORRECT_ANSWER) return { border: `2px solid ${C.green}`, backgroundColor: '#E8F5EE' }
    if (id === sel) return { border: '2px solid #E25555', backgroundColor: '#FDEAEA' }
    return { border: `2px solid ${C.border}`, backgroundColor: C.white }
  }

  const badgeStyle = (id: string) => ({
    backgroundColor:
      submitted && id === CORRECT_ANSWER ? C.green :
      submitted && id === sel && id !== CORRECT_ANSWER ? '#E25555' :
      sel === id ? C.blue : C.muted,
    color: sel === id || (submitted && (id === CORRECT_ANSWER || id === sel)) ? '#fff' : C.gray,
  })

  return (
    <div className="screen-enter" style={{ backgroundColor: C.bg, minHeight: '100vh', paddingBottom: 40 }}>
      <div style={{
        backgroundColor: C.white, padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: C.navy }}>←</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.gray }}>Quiz 1 / 1</span>
      </div>
      <ProgressBar pct={100} h={3} />

      <div style={{ padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24 }}>
          <CharImg size={68} />
          <SpeechBubble text='"방금 본 내용을 확인해볼까?"' />
        </div>

        <div style={{
          backgroundColor: C.white, borderRadius: 18,
          padding: '20px', marginBottom: 20, border: `1px solid ${C.border}`,
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.navy, lineHeight: 1.55 }}>
            기준금리가 내려갈 때 나타날 수 있는 변화로 가장 알맞은 것은?
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {quizChoices.map(ch => (
            <button key={ch.id} onClick={() => !submitted && setSel(ch.id)} style={{
              padding: '14px 16px', borderRadius: 14,
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: submitted ? 'default' : 'pointer',
              textAlign: 'left', transition: 'all 0.15s',
              ...choiceStyle(ch.id),
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                transition: 'all 0.15s',
                ...badgeStyle(ch.id),
              }}>{ch.id}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.navy, lineHeight: 1.4 }}>{ch.text}</span>
            </button>
          ))}
        </div>

        <PrimaryBtn label="제출하기" onClick={submit} disabled={!sel || submitted} />
      </div>
    </div>
  )
}

// ─── SCREEN 8 — Quiz Correct ──────────────────────────────────────────────────
function QuizCorrectScreen({ onLevelUp, currentXP }: { onLevelUp: () => void; currentXP: number }) {
  const [showToast, setShowToast] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setShowToast(false), 2200)
    const t2 = setTimeout(onLevelUp, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="screen-enter" style={{
      backgroundColor: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 20px 40px',
    }}>
      {showToast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: C.navy, color: '#fff',
          borderRadius: 999, padding: '10px 22px',
          fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 200, animation: 'slideDown 0.3s ease both',
        }}>
          ⭐ 퀴즈 정답 +20XP
        </div>
      )}

      <CharImg size={150} />

      <div style={{ textAlign: 'center', margin: '24px 0 20px' }}>
        <h2 style={{ fontSize: 23, fontWeight: 800, color: C.navy, marginBottom: 10 }}>
          맞았어! 핵심을 제대로 이해했네.
        </h2>
        <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>
          기준금리는 예금과 대출 등 여러 시장금리에 영향을 줄 수 있어요.
        </p>
      </div>

      <div style={{
        backgroundColor: C.white, borderRadius: 18, padding: '20px',
        width: '100%', border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>XP 획득</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>
            {currentXP} → {currentXP + 20} XP
          </span>
        </div>
        <div style={{ height: 8, backgroundColor: C.border, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: `linear-gradient(90deg, ${C.blue}, #7DD3FC)`,
            borderRadius: 999,
            animation: 'xpFill 0.7s 0.3s ease both',
            width: '100%',
          }} />
        </div>
        <p style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>100 / 100 XP · 레벨업!</p>
      </div>
    </div>
  )
}

// ─── SCREEN 9 — Quiz Wrong ────────────────────────────────────────────────────
function QuizWrongScreen({ onRetry, onReview }: { onRetry: () => void; onReview: () => void }) {
  return (
    <div className="screen-enter" style={{
      backgroundColor: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 20px 40px',
    }}>
      <CharImg size={140} />
      <div style={{ textAlign: 'center', margin: '24px 0 16px' }}>
        <h2 style={{ fontSize: 21, fontWeight: 800, color: C.navy, marginBottom: 10 }}>
          거의 다 왔어!<br />이 부분만 다시 확인해볼까?
        </h2>
        <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>
          기준금리는 예금과 대출 같은 여러 금리에<br />영향을 줄 수 있어요.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 24 }}>
        <button onClick={onReview} style={{
          flex: 1, padding: '14px 0', backgroundColor: C.muted, color: C.navy,
          borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>4컷 다시 보기</button>
        <button onClick={onRetry} style={{
          flex: 1, padding: '14px 0', backgroundColor: C.blue, color: '#fff',
          borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>다시 풀기</button>
      </div>
    </div>
  )
}

// ─── SCREEN 10 — Level Up Celebration ────────────────────────────────────────
function LevelUpScreen({ onConfirm, newLevel }: { onConfirm: () => void; newLevel: 1|2|3|4|5 }) {
  const levelNames = ['뉴스 새싹', '뉴스 탐험가', '용어 해결사', '출처 탐정', '팩트체커']
  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, #352015 0%, #5A331C 100%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Confetti / Stars */}
      {Array.from({ length: 16 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${(i * 6.25) % 100}%`,
          top: `${(i * 11 + 8) % 70}%`,
          fontSize: 14, opacity: 0.6,
          animation: `float ${1.8 + (i % 3) * 0.6}s ease-in-out ${i * 0.15}s infinite alternate`,
          pointerEvents: 'none',
        }}>
          {['⭐', '✨', '🌟', '💫'][i % 4]}
        </div>
      ))}

      {/* Egg glow */}
      <div style={{
        position: 'relative', marginBottom: 32,
        filter: 'drop-shadow(0 0 40px rgba(216,175,113,0.5))',
      }}>
        <EggSprite level={newLevel} size={170} />
      </div>

      <h1 style={{
        fontSize: 36, fontWeight: 800, color: C.yellow,
        letterSpacing: '3px', marginBottom: 8,
        textShadow: '0 0 30px rgba(216,175,113,0.6)',
      }}>
        LEVEL UP!
      </h1>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 8, textAlign: 'center' }}>
        알이 Lv.{newLevel} <strong>{levelNames[newLevel - 1]}</strong>로 성장했어요.
      </p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 40, textAlign: 'center' }}>
        뉴스를 이해하고 퀴즈를 맞혀서 만든 결과예요!
      </p>

      <button onClick={onConfirm} style={{
        backgroundColor: C.yellow, color: C.navy,
        borderRadius: 14, padding: '16px 0', width: '100%',
        fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer',
      }}>
        성장한 알 확인하기
      </button>
    </div>
  )
}

// ─── SCREEN 11 — Level Screen ─────────────────────────────────────────────────
const levelData = [
  { lv: 1 as const, name: '뉴스 새싹',    xpMax: 100 },
  { lv: 2 as const, name: '뉴스 탐험가',  xpMax: 150 },
  { lv: 3 as const, name: '용어 해결사',  xpMax: 200 },
  { lv: 4 as const, name: '출처 탐정',    xpMax: 250 },
  { lv: 5 as const, name: '팩트체커',     xpMax: 300 },
]

function LevelScreen({ charLevel, xp, tab, onTab }: {
  charLevel: number; xp: number; tab: Tab; onTab: (t: Tab) => void
}) {
  const cur = levelData[charLevel - 1]
  return (
    <div className="screen-enter" style={{ backgroundColor: C.bg, minHeight: '100vh', paddingBottom: 88 }}>
      <div style={{
        backgroundColor: C.white, padding: '14px 20px 12px',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>알과 함께 뉴스력을 키워요</h1>
        <p style={{ fontSize: 13, color: C.gray, marginTop: 3 }}>퀴즈를 맞힐수록 알이 성장해요.</p>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        {/* Current level card */}
        <div style={{
          background: `linear-gradient(135deg, ${C.blue} 0%, #9B6534 100%)`,
          borderRadius: 20, padding: '22px',
          display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20,
        }}>
          <EggSprite level={charLevel as 1|2|3|4|5} size={100} width={100} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>현재 알</p>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
              Lv.{charLevel} {cur.name}
            </h2>
            <div style={{ width: '100%', height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, marginBottom: 4 }}>
              <div style={{
                width: `${(xp / cur.xpMax) * 100}%`, height: '100%',
                backgroundColor: C.yellow, borderRadius: 999,
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {xp} / {cur.xpMax} XP &nbsp;·&nbsp; 다음까지 {cur.xpMax - xp}XP
            </p>
          </div>
        </div>

        {/* XP Guide */}
        <div style={{
          backgroundColor: C.white, borderRadius: 18, padding: '16px 18px',
          border: `1px solid ${C.border}`, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 12 }}>XP는 이렇게 얻어요</h3>
          {[
            ['뉴스툰 완독', '+10XP'],
            ['퀴즈 정답',   '+20XP'],
            ['출처 확인',   '+5XP'],
            ['오답 복습 후 정답', '+5XP'],
          ].map(([label, badge]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14, color: C.navy }}>{label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: C.blue,
                backgroundColor: C.softBlue, borderRadius: 999, padding: '4px 10px',
              }}>{badge}</span>
            </div>
          ))}
        </div>

        {/* Growth Roadmap */}
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 12 }}>성장 로드맵</h3>
        {levelData.map(ld => {
          const unlocked = ld.lv <= charLevel
          const current  = ld.lv === charLevel
          return (
            <div key={ld.lv} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 16, marginBottom: 8,
              backgroundColor: current ? C.softBlue : unlocked ? C.white : '#FCF7F1',
              border: `2px solid ${current ? C.blue : unlocked ? C.border : '#E8DAC8'}`,
              opacity: unlocked ? 1 : 0.55,
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <EggSprite level={ld.lv} size={56} />
                {!unlocked && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: 'rgba(230,233,245,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, borderRadius: 8,
                  }}>🔒</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Lv.{ld.lv} {ld.name}</span>
                  {current && (
                    <span style={{
                      fontSize: 10, color: '#fff', backgroundColor: C.blue,
                      borderRadius: 999, padding: '2px 8px', fontWeight: 600,
                    }}>현재</span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: C.gray }}>
                  {unlocked ? (current ? `${xp} / ${ld.xpMax} XP` : '완료 ✓') : `${ld.xpMax} XP 필요`}
                </span>
              </div>
            </div>
          )
        })}

        {/* Daily missions */}
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginTop: 20, marginBottom: 12 }}>오늘의 성장 미션</h3>
        <div style={{
          backgroundColor: C.white, borderRadius: 18,
          padding: '4px 18px', border: `1px solid ${C.border}`, marginBottom: 20,
        }}>
          {[
            '뉴스 한 편 완독하기',
            '퀴즈 한 문제 맞히기',
            '출처 한 번 확인하기',
          ].map(m => (
            <div key={m} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14, color: C.navy }}>{m}</span>
              <span style={{ fontSize: 13, color: C.gray }}>0 / 1</span>
            </div>
          ))}
        </div>

        {/* Recent XP log */}
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 12 }}>최근 XP 기록</h3>
        <div style={{
          backgroundColor: C.white, borderRadius: 18,
          padding: '4px 18px', border: `1px solid ${C.border}`, marginBottom: 20,
        }}>
          {[
            ['경제 뉴스 완독', '+10XP'],
            ['출처 확인', '+5XP'],
            ['퀴즈 정답', '+20XP'],
          ].map(([label, badge]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14, color: C.navy }}>{label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: C.blue,
                backgroundColor: C.softBlue, borderRadius: 999, padding: '4px 10px',
              }}>{badge}</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav tab={tab} onTab={onTab} />
    </div>
  )
}

// ─── SCREEN 12 — Explore ─────────────────────────────────────────────────────
const exploreNews = [
  { cat: 'AI·기술', title: 'AI 규제법은 왜 만들어졌을까?',              diff: '뉴스 입문', time: '2분' },
  { cat: '경제',    title: '기준금리가 내려가면 내 생활에 어떤 변화가?', diff: '뉴스 입문', time: '3분' },
  { cat: '과학',    title: '지구 평균기온 1.5°C가 중요한 이유',         diff: '뉴스 기본', time: '3분' },
  { cat: '경제',    title: '환율이 오르면 해외여행은 왜 비싸질까?',      diff: '뉴스 탐구', time: '4분' },
  { cat: '사회',    title: '학교폭력 신고가 늘어나는 이유는?',           diff: '뉴스 기본', time: '3분' },
  { cat: '환경',    title: '탄소중립이 왜 2050년까지인 걸까?',           diff: '뉴스 탐구', time: '4분' },
  { cat: '국제',    title: '유럽과 미국은 왜 자주 무역 분쟁을 할까?',   diff: '뉴스 탐구', time: '5분' },
]
const filterList = ['전체', '경제', '사회', '과학', 'AI·기술', '환경', '국제', '교육', '진로·취업']

function ExploreScreen({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const [filter, setFilter] = useState('전체')
  const shown = filter === '전체' ? exploreNews : exploreNews.filter(n => n.cat === filter)
  return (
    <div className="screen-enter" style={{ backgroundColor: C.bg, minHeight: '100vh', paddingBottom: 88 }}>
      <div style={{
        backgroundColor: C.white, padding: '14px 20px 0',
        borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 12 }}>
          궁금한 뉴스를 찾아볼까?
        </h1>
        <div style={{
          display: 'flex', alignItems: 'center',
          backgroundColor: C.bg, borderRadius: 12, padding: '11px 16px',
          border: `1px solid ${C.border}`, marginBottom: 12,
        }}>
          <span style={{ color: C.gray, marginRight: 8 }}>🔍</span>
          <span style={{ fontSize: 14, color: C.gray }}>뉴스, 용어, 주제를 검색해보세요.</span>
        </div>
        {/* Category filter */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingBottom: 12,
          scrollbarWidth: 'none',
        }}>
          {filterList.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 999,
              border: `1.5px solid ${filter === f ? C.blue : C.border}`,
              backgroundColor: filter === f ? C.blue : C.white,
              color: filter === f ? '#fff' : C.navy,
              fontSize: 13, fontWeight: filter === f ? 700 : 400,
              cursor: 'pointer',
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {shown.map((n, i) => (
          <div key={i} style={{
            backgroundColor: C.white, borderRadius: 16, padding: '14px 16px',
            marginBottom: 10, border: `1px solid ${C.border}`, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, color: C.blue, backgroundColor: C.softBlue,
                borderRadius: 999, padding: '3px 8px', fontWeight: 600,
              }}>{n.cat}</span>
              <span style={{
                fontSize: 11, color: C.gray, backgroundColor: C.muted,
                borderRadius: 999, padding: '3px 8px',
              }}>{n.diff}</span>
              <span style={{
                fontSize: 11, color: C.gray, backgroundColor: C.muted,
                borderRadius: 999, padding: '3px 8px',
              }}>약 {n.time}</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.navy, lineHeight: 1.4 }}>{n.title}</p>
            <p style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>✅ 출처 검증</p>
          </div>
        ))}
      </div>

      <BottomNav tab={tab} onTab={onTab} />
    </div>
  )
}

// ─── SCREEN 13 — MY ──────────────────────────────────────────────────────────
function MyScreen({ charLevel, xp, tab, onTab }: {
  charLevel: number; xp: number; tab: Tab; onTab: (t: Tab) => void
}) {
  const lvNames = ['뉴스 새싹', '뉴스 탐험가', '용어 해결사', '출처 탐정', '팩트체커']
  return (
    <div className="screen-enter" style={{ backgroundColor: C.bg, minHeight: '100vh', paddingBottom: 88 }}>
      <div style={{
        backgroundColor: C.white, padding: '14px 20px 12px',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>MY NewToon</h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Profile */}
        <div style={{
          backgroundColor: C.white, borderRadius: 20, padding: '20px',
          border: `1px solid ${C.border}`, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <EggSprite level={charLevel as 1|2|3|4|5} size={80} />
          <div>
            <p style={{ fontSize: 11, color: C.gray, marginBottom: 2 }}>뉴스 탐험 중</p>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 4 }}>탐정알</h2>
            <p style={{ fontSize: 14, color: C.blue, fontWeight: 600 }}>
              Lv.{charLevel} {lvNames[charLevel - 1]}
            </p>
            <p style={{ fontSize: 12, color: C.gray, marginTop: 3 }}>🔥 연속 5일 학습</p>
          </div>
        </div>

        {/* Weekly stats */}
        <div style={{
          backgroundColor: C.white, borderRadius: 20, padding: '18px',
          border: `1px solid ${C.border}`, marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 14 }}>이번 주 기록</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['3편', '읽은 뉴스'],
              ['80%', '퀴즈 정답률'],
              [`${xp}XP`, '총 획득 XP'],
              ['2개', '확인한 출처'],
              ['4개', '배운 전문용어'],
            ].map(([val, label]) => (
              <div key={label} style={{
                backgroundColor: C.bg, borderRadius: 12, padding: '12px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 2 }}>{val}</p>
                <p style={{ fontSize: 11, color: C.gray }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* News power */}
        <div style={{
          backgroundColor: C.white, borderRadius: 20, padding: '18px',
          border: `1px solid ${C.border}`, marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 14 }}>뉴스력</h3>
          {[
            ['경제', 70],
            ['과학', 45],
            ['사회', 30],
            ['AI·기술', 60],
            ['팩트체크', 50],
          ].map(([label, pct]) => (
            <div key={label as string} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: C.navy }}>{label}</span>
                <span style={{ fontSize: 12, color: C.gray }}>{pct}%</span>
              </div>
              <ProgressBar pct={pct as number} h={6} />
            </div>
          ))}
        </div>

        {/* Settings */}
        <div style={{
          backgroundColor: C.white, borderRadius: 20,
          border: `1px solid ${C.border}`, overflow: 'hidden',
        }}>
          {[
            '뉴스 설명 수준 변경',
            '관심 카테고리 변경',
            '알림 설정',
            '잠금화면 뉴스 설정',
          ].map((item, i, arr) => (
            <div key={item} style={{
              padding: '16px 20px',
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 14, color: C.navy }}>{item}</span>
              <span style={{ color: C.gray, fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      <BottomNav tab={tab} onTab={onTab} />
    </div>
  )
}

// ─── Bottom Sheets ────────────────────────────────────────────────────────────
function SheetBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      backgroundColor: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn 0.2s ease both',
    }} onClick={onClose}>
      <div
        style={{
          backgroundColor: C.white, width: '100%', maxWidth: 390, margin: '0 auto',
          borderRadius: '24px 24px 0 0', padding: '20px 20px 40px',
          maxHeight: '85vh', overflowY: 'auto',
          animation: 'fadeIn 0.25s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 36, height: 4, backgroundColor: C.border,
          borderRadius: 999, margin: '0 auto 20px',
        }} />
        {children}
      </div>
    </div>
  )
}

function TermSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetBackdrop onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>기준금리</h2>
        <span style={{
          fontSize: 11, backgroundColor: C.softBlue, color: C.blue,
          borderRadius: 999, padding: '4px 10px', fontWeight: 600,
        }}>어려운 용어 Lv.2</span>
      </div>
      <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.7, marginBottom: 16 }}>
        한국은행이 정하는 금리의 기준이에요.
      </p>
      <div style={{
        backgroundColor: C.softBlue, borderRadius: 14, padding: '14px 16px', marginBottom: 16,
      }}>
        <p style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 6 }}>
          ANALOGY · 이해를 위한 비유입니다.
        </p>
        <p style={{ fontSize: 14, color: C.navy, lineHeight: 1.6 }}>
          여러 금리가 움직이기 전에 참고하는 '기준 자'와 비슷해요.
        </p>
      </div>
      <button style={{
        width: '100%', padding: '13px 0', marginBottom: 10,
        backgroundColor: C.softBlue, color: C.blue,
        borderRadius: 12, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
      }}>공식 정의 보기</button>
      <button onClick={onClose} style={{
        width: '100%', padding: '13px 0',
        backgroundColor: C.blue, color: '#fff',
        borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
      }}>닫기</button>
    </SheetBackdrop>
  )
}

function SourceSheet({ onClose }: { onClose: () => void }) {
  return (
    <SheetBackdrop onClose={onClose}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 6 }}>
        이 내용, 어디서 나온 걸까?
      </h2>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 16 }}>공식자료와 기사 내용이 일치해요.</p>

      <div style={{
        backgroundColor: C.softBlue, borderRadius: 14, padding: '14px 16px', marginBottom: 20,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 4 }}>웹툰 속 내용</p>
        <p style={{ fontSize: 14, color: C.navy, lineHeight: 1.6 }}>
          "한국은행이 기준금리를 0.25%p 인하했습니다."
        </p>
      </div>

      {[
        { badge: '공식기관 · 1차 출처', badgeColor: C.green, title: '한국은행', sub: '기준금리 관련 공식 발표', cta: '원문 보기' },
        { badge: '언론기사',            badgeColor: C.analogy, title: 'OO뉴스',  sub: '2026.08.10',             cta: '기사 보기' },
      ].map(src => (
        <div key={src.title} style={{
          backgroundColor: C.white, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: '16px', marginBottom: 12,
        }}>
          <span style={{
            fontSize: 11, color: '#fff', backgroundColor: src.badgeColor,
            borderRadius: 999, padding: '3px 10px', fontWeight: 600,
          }}>{src.badge}</span>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: '8px 0 4px' }}>{src.title}</h3>
          <p style={{ fontSize: 13, color: C.gray, marginBottom: 12 }}>{src.sub}</p>
          <button style={{
            width: '100%', padding: '10px 0',
            backgroundColor: C.softBlue, color: C.blue,
            borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>{src.cta}</button>
        </div>
      ))}

      <p style={{ fontSize: 12, color: C.gray, textAlign: 'center', marginBottom: 16 }}>
        FACT · 자료에서 직접 확인할 수 있는 사실이에요.
      </p>
      <button onClick={onClose} style={{
        width: '100%', padding: '13px 0',
        backgroundColor: C.blue, color: '#fff',
        borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
      }}>닫기</button>
    </SheetBackdrop>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [tab, setTab] = useState<Tab>('home')
  const [xp, setXP] = useState(80)
  const [charLevel, setCharLevel] = useState<1|2|3|4|5>(1)
  const [recommendations, setRecommendations] = useState<RecommendationItem[] | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendationItem | null>(null)

  const handleTab = (t: Tab) => {
    setTab(t)
    if (t === 'home')    setScreen('home')
    if (t === 'explore') setScreen('explore')
    if (t === 'level')   setScreen('level')
    if (t === 'my')      setScreen('my')
  }

  const handleQuizCorrect = () => {
    setXP(100)
    setScreen('quizCorrect')
  }

  const handleLevelUp = () => {
    setCharLevel(2)
    setScreen('levelUp')
  }

  const requestInitialRecommendations = async (interests: [Category, Category, Category]) => {
    const userId = makeClientId('newtoon_user_id')
    const sessionId = makeClientId('newtoon_recommendation_session_id')
    const baseUrl = (import.meta.env.VITE_ALGORITHM_AGENT_API_URL ?? '').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/v1/recommendations/initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, session_id: sessionId, interests, limit: 4 }),
    })
    if (!response.ok) throw new Error('맞춤 뉴스를 불러오지 못했어요. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.')
    const data: InitialRecommendationResponse = await response.json()
    const items = data.items
    const expectedRoles: LayoutRole[] = ['MAIN', 'RELATED', 'RELATED', 'EXPLORE']
    if (!items || items.length !== 4 || items.some((item, index) => item.layout_role !== expectedRoles[index])) {
      throw new Error('추천 뉴스를 준비하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
    setSelectedCategories(interests)
    setRecommendations(items)
    setTab('home')
    setScreen('home')
  }

  const render = () => {
    switch (screen) {
      case 'splash':
        return <SplashScreen onNext={() => setScreen('levelSelect')} />
      case 'levelSelect':
        return <LevelSelectScreen onNext={() => setScreen('vocabularySelect')} />
      case 'vocabularySelect':
        return <VocabularySelectScreen onNext={() => setScreen('categorySelect')} />
      case 'categorySelect':
        return <CategorySelectScreen onNext={requestInitialRecommendations} />
      case 'home':
        return <HomeScreen onNewsClick={(item) => { setSelectedRecommendation(item); setScreen('newsPreview') }} tab={tab} onTab={handleTab} xp={xp} recommendations={recommendations} selectedCategories={selectedCategories} />
      case 'newsPreview':
        return selectedRecommendation ? <NewsPreviewScreen item={selectedRecommendation} onNext={() => setScreen('comic')} onBack={() => setScreen('home')} /> : <HomeScreen onNewsClick={(item) => { setSelectedRecommendation(item); setScreen('newsPreview') }} tab={tab} onTab={handleTab} xp={xp} recommendations={recommendations} selectedCategories={selectedCategories} />
      case 'comic':
        return <ComicScreen onQuiz={() => setScreen('quiz')} onBack={() => setScreen('newsPreview')} />
      case 'quiz':
        return <QuizScreen onCorrect={handleQuizCorrect} onWrong={() => setScreen('quizWrong')} onBack={() => setScreen('comic')} />
      case 'quizCorrect':
        return <QuizCorrectScreen onLevelUp={handleLevelUp} currentXP={80} />
      case 'quizWrong':
        return <QuizWrongScreen onRetry={() => setScreen('quiz')} onReview={() => setScreen('comic')} />
      case 'levelUp':
        return <LevelUpScreen onConfirm={() => { setTab('level'); setScreen('level') }} newLevel={charLevel} />
      case 'level':
        return <LevelScreen charLevel={charLevel} xp={xp} tab={tab} onTab={handleTab} />
      case 'explore':
        return <ExploreScreen tab={tab} onTab={handleTab} />
      case 'my':
        return <MyScreen charLevel={charLevel} xp={xp} tab={tab} onTab={handleTab} />
      default:
        return null
    }
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#C8D4F0',
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 390,
        minHeight: '100vh', backgroundColor: C.bg,
        position: 'relative',
        fontFamily: "'Noto Sans KR', sans-serif",
        boxShadow: '0 0 60px rgba(0,0,0,0.15)',
      }}>
        {render()}
      </div>
    </div>
  )
}
