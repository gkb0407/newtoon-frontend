import { useState, useEffect } from 'react'
import mainCharImg from '@/imports/image.png'
import splashCharImg from '@/imports/image-removebg-preview-1.png'
import splashLogoImg from '@/imports/image-removebg-preview__2_.png'
import eggLevelsImg from '@/imports/image-2.png'

// ─── Design tokens ────────────────────────────────────────────────────────��[...]
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

// ─── Shared atoms ────────────────────────────────────────────────────────��[...]

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

// ─── SCREEN 1 — Splash ──────────────────────────────────────────────────────[...]
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

// ... (rest of file unchanged until requestInitialRecommendations) ...

// For brevity the rest of the file content remains identical except for the updated requestInitialRecommendations implementation below.

// ─── ROOT APP ─────────────────────────────────────────────────────────�[...]
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

    try {
      const response = await fetch(`${baseUrl}/api/v1/recommendations/initial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, session_id: sessionId, interests, limit: 4 }),
      })

      if (!response.ok) {
        throw new Error('맞춤 뉴스를 불러오지 못했어요. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.')
      }

      let data: InitialRecommendationResponse
      try {
        // parse JSON safely
        data = await response.json()
      } catch (e) {
        throw new Error('서버 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.')
      }

      const items = (data as any)?.items
      if (!Array.isArray(items)) {
        throw new Error('추천 뉴스 응답 형식이 올바르지 않습니다.')</p>
      }

      // Expect exactly 4 items in the precise roles and order defined by backend contract
      const expectedRoles: LayoutRole[] = ['MAIN', 'RELATED', 'RELATED', 'EXPLORE']
      if (items.length !== 4) {
        throw new Error('추천 뉴스를 준비하지 못했어요. 잠시 후 다시 시도해주세요.')
      }

      // Validate each item's minimal required fields to avoid runtime crashes
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const role = item?.layout_role
        if (typeof role !== 'string' || role !== expectedRoles[i]) {
          throw new Error('추천 뉴즈의 형식이 예기치 않습니다. 잠시 후 다시 시도해주세요.')
        }

        const news = item?.news
        if (!news || typeof news.title !== 'string' || typeof news.news_url !== 'string') {
          throw new Error('추천 뉴스 항목에 필수 정보가 없습니다.')</p>
        }

        // source and thum_url are allowed to be null per contract; no further checks
      }

      // All validations passed — update UI state
      setSelectedCategories(interests)
      setRecommendations(items as RecommendationItem[])
      setTab('home')
      setScreen('home')

    } catch (err) {
      // Re-throw Error object so the caller (CategorySelectScreen) can show its error UI.
      if (err instanceof Error) throw err
      throw new Error('맞춤 뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
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
