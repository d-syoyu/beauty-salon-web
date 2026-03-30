// /line-preview - LP用 LINE ミニアプリ プレビューページ
// LINE Design System (LDSM) 準拠: https://designsystem.line.me/LDSM

// ━━ LINE カラー定義 ━━━━━━━━━━━━━━━━━━━━━━━━━
// Primary green: #06C755
// Text primary:  #1E1E1E
// Border:        #EFEFEF
// Bg chat:       #FFFFFF (白)
// Received bubble: #FFFFFF + shadow
// Sent bubble:   #B5F0B7 (グリーン薄色)
// Timestamp:     #999999

const MOCK_CATEGORIES = [
  { name: 'カット',         color: '#6B8E6B', price: '¥5,500〜',  textColor: '#fff' },
  { name: 'カラー',         color: '#9F86C0', price: '¥8,800〜',  textColor: '#fff' },
  { name: 'パーマ',         color: '#E0B1CB', price: '¥15,400〜', textColor: '#5A5550' },
  { name: 'トリートメント', color: '#98C1D9', price: '¥6,600〜',  textColor: '#5A5550' },
];

// ━━ iPhone ステータスバー ━━━━━━━━━━━━━━━━━━━━
function StatusBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#fff', height: 44, padding: '0 22px 0 26px', flexShrink: 0,
    }}>
      {/* 時刻 */}
      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: '"SF Pro Text", system-ui, -apple-system', color: '#1E1E1E', letterSpacing: '-0.4px' }}>
        9:41
      </span>

      {/* 右側アイコン群 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* セルラー 4本バー */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#1E1E1E">
          <rect x="0"    y="8"  width="3" height="4"  rx="0.8" />
          <rect x="4.5"  y="5"  width="3" height="7"  rx="0.8" />
          <rect x="9"    y="2"  width="3" height="10" rx="0.8" />
          <rect x="13.5" y="0"  width="3" height="12" rx="0.8" />
        </svg>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 20 15" fill="none" stroke="#1E1E1E" strokeLinecap="round">
          <path d="M10 12 L11.2 13.5 L10 13.5 L8.8 13.5Z" fill="#1E1E1E" stroke="none"/>
          <path d="M5.5 9 Q10 5.5 14.5 9"  strokeWidth="2"/>
          <path d="M1.5 5.5 Q10 0 18.5 5.5" strokeWidth="2"/>
        </svg>
        {/* バッテリー */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 25, height: 12, border: '1.5px solid #1E1E1E', borderRadius: 3.5, padding: '1.5px 2px', display: 'flex', alignItems: 'center' }}>
            <div style={{ height: '100%', width: '80%', background: '#1E1E1E', borderRadius: 1.5 }} />
          </div>
          {/* バッテリー端子 */}
          <div style={{ width: 2, height: 5, background: 'rgba(30,30,30,0.5)', borderRadius: '0 1px 1px 0', marginLeft: 1 }} />
        </div>
      </div>
    </div>
  );
}

// ━━ LINE チャットヘッダー ━━━━━━━━━━━━━━━━━━━━
function ChatHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#fff',
      borderBottom: '1px solid #EFEFEF',
      height: 52, flexShrink: 0,
    }}>
      {/* 戻るボタン（iOS スタイル） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 6, minWidth: 70, color: '#1E1E1E' }}>
        <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
          <path d="M8.5 1L1.5 9L8.5 17" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 14, fontFamily: 'system-ui, -apple-system', color: '#1E1E1E', letterSpacing: '-0.1px' }}>トーク</span>
      </div>

      {/* 中央: OA アイコン + アカウント名 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        {/* LINE OA アイコン（角丸正方形 8px） */}
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(140deg, #4A6B4A 0%, #6B8E6B 50%, #B8956E 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>L</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1E1E1E', fontFamily: 'system-ui, -apple-system', letterSpacing: '-0.1px', lineHeight: 1 }}>
          LUMINA HAIR STUDIO
        </span>
      </div>

      {/* 右アイコン */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingRight: 14, minWidth: 70, justifyContent: 'flex-end' }}>
        {/* 検索 */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7.5"/>
          <line x1="17" y1="17" x2="22" y2="22"/>
        </svg>
        {/* 縦三点リーダー */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#1E1E1E">
          <circle cx="12" cy="5"  r="2.2"/>
          <circle cx="12" cy="12" r="2.2"/>
          <circle cx="12" cy="19" r="2.2"/>
        </svg>
      </div>
    </div>
  );
}

// ━━ OA アバター（角丸正方形 38px） ━━━━━━━━━━━━
function OaAvatar() {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(140deg, #4A6B4A 0%, #6B8E6B 50%, #B8956E 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'Georgia, serif' }}>L</span>
    </div>
  );
}

// ━━ テキスト受信バブル（白） ━━━━━━━━━━━━━━━━━━
function ReceivedBubble({ text, time }: { text: string; time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 48px 0 12px' }}>
      <OaAvatar />
      <div>
        <div style={{
          background: '#fff',
          borderRadius: '4px 18px 18px 18px',
          padding: '9px 13px',
          maxWidth: 220,
          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
        }}>
          <p style={{ fontSize: 13.5, color: '#1E1E1E', lineHeight: 1.55, fontFamily: 'system-ui, -apple-system', margin: 0, whiteSpace: 'pre-wrap' }}>
            {text}
          </p>
        </div>
        <span style={{ fontSize: 10, color: '#999', fontFamily: 'system-ui', marginTop: 3, display: 'block', paddingLeft: 2 }}>
          {time}
        </span>
      </div>
    </div>
  );
}

// ━━ Flex メッセージカード ━━━━━━━━━━━━━━━━━━━━
function FlexCard({ time }: { time: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 30px 0 12px' }}>
      <OaAvatar />
      <div>
        <div style={{
          background: '#fff',
          borderRadius: 14,
          overflow: 'hidden',
          width: 232,
          boxShadow: '0 2px 10px rgba(0,0,0,0.13)',
        }}>
          {/* ヒーロー */}
          <div style={{
            height: 88,
            background: 'linear-gradient(150deg, #4A6B4A 0%, #6B8E6B 45%, #B8956E 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 3,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily: 'system-ui', margin: 0 }}>
              Omotesando
            </p>
            <p style={{ color: '#fff', fontSize: 15.5, letterSpacing: '0.07em', fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400, margin: 0 }}>
              LUMINA HAIR STUDIO
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 8.5, letterSpacing: '0.04em', fontFamily: 'system-ui', margin: 0 }}>
              表参道のビューティーサロン
            </p>
          </div>

          {/* 本文 */}
          <div style={{ padding: '11px 14px 10px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E1E1E', fontFamily: 'system-ui', margin: '0 0 4px' }}>
              ご予約受付中
            </p>
            <p style={{ fontSize: 11.5, color: '#666', lineHeight: 1.55, fontFamily: 'system-ui', margin: 0, whiteSpace: 'pre-wrap' }}>
              {'LINEから24時間かんたんに\nご予約いただけます。'}
            </p>
          </div>

          {/* セパレーター */}
          <div style={{ height: 1, background: '#EFEFEF', margin: '0 0' }} />

          {/* ボタン（LINE Flex Message スタイル: テキストのみ） */}
          <div style={{
            padding: '12px 14px',
            textAlign: 'center',
            fontSize: 13.5,
            fontWeight: 600,
            color: '#06C755',
            fontFamily: 'system-ui, -apple-system',
          }}>
            予約する
          </div>
        </div>

        <span style={{ fontSize: 10, color: '#999', fontFamily: 'system-ui', marginTop: 3, display: 'block', paddingLeft: 2 }}>
          {time}
        </span>
      </div>
    </div>
  );
}

// ━━ 日付区切り ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DateDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
      <span style={{
        background: 'rgba(0,0,0,0.14)',
        color: '#fff',
        fontSize: 10.5,
        fontFamily: 'system-ui, -apple-system',
        padding: '3px 12px',
        borderRadius: 12,
      }}>
        {label}
      </span>
    </div>
  );
}

// ━━ チャットエリア ━━━━━━━━━━━━━━━━━━━━━━━━━━
function ChatArea() {
  return (
    <div style={{ background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0 14px', flexShrink: 0 }}>
      <DateDivider label="3月18日(水)" />
      <ReceivedBubble
        text={"こんにちは！LUMINA HAIR STUDIOです。\nいつもご利用ありがとうございます✨"}
        time="午後 3:45"
      />
      <FlexCard time="午後 3:46" />
    </div>
  );
}

// ━━ ミニアプリ ステップバー ━━━━━━━━━━━━━━━━━━━━
function StepBar() {
  const steps = ['メニュー', '日付', '時間', 'お客様', '確認'];
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      background: '#fff', padding: '10px 8px 8px',
      borderBottom: '0.5px solid #EFEFEF',
    }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 46 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, fontFamily: 'system-ui',
              background: i === 0 ? '#B8956E' : '#EFEFEF',
              color: i === 0 ? '#fff' : '#999',
            }}>
              {i + 1}
            </div>
            <span style={{
              fontSize: 8, fontFamily: 'system-ui', whiteSpace: 'nowrap',
              color: i === 0 ? '#B8956E' : '#999',
            }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 10, height: 1, background: i === 0 ? '#D4B896' : '#EFEFEF', marginBottom: 13 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ━━ LINE LIFF ボトムシート ━━━━━━━━━━━━━━━━━━━━
function LiffSheet() {
  return (
    <div style={{
      background: '#FDFCFA',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -6px 28px rgba(0,0,0,0.16)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* ドラッグハンドル */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: '#D1D1D6' }} />
      </div>

      {/* ミニアプリラベル */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3px 14px 5px',
        borderBottom: '0.5px solid #EFEFEF',
      }}>
        <span style={{ fontSize: 9, color: '#999', fontFamily: 'system-ui', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Mini App
        </span>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#06C755' }} />
      </div>

      {/* ステップバー */}
      <StepBar />

      {/* コンテンツ */}
      <div style={{ padding: '14px 14px 20px' }}>
        {/* 見出し */}
        <p style={{
          textAlign: 'center', margin: '0 0 12px',
          fontFamily: 'Georgia, "Cormorant Garamond", serif',
          fontSize: 15.5, fontWeight: 400, color: '#1A1A1A', letterSpacing: '0.04em',
        }}>
          メニューをお選びください
        </p>

        {/* カテゴリーグリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 12 }}>
          {MOCK_CATEGORIES.map((cat) => (
            <div key={cat.name} style={{
              background: cat.color,
              borderRadius: 11,
              padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <span style={{ color: cat.textColor, fontSize: 13, fontWeight: 500, fontFamily: 'system-ui', letterSpacing: '0.02em' }}>
                {cat.name}
              </span>
              <span style={{ color: cat.textColor, fontSize: 9.5, opacity: 0.85, fontFamily: 'system-ui' }}>
                {cat.price}
              </span>
            </div>
          ))}
        </div>

        {/* 次へボタン */}
        <button style={{
          display: 'block', width: '100%',
          padding: '12px 0',
          borderRadius: 9999,
          background: 'linear-gradient(135deg, #B8956E 0%, #D4B896 100%)',
          color: '#fff',
          fontSize: 12.5, fontWeight: 500, letterSpacing: '0.16em',
          textTransform: 'uppercase', fontFamily: 'system-ui, -apple-system',
          border: 'none', cursor: 'pointer',
        }}>
          次へ
        </button>
      </div>
    </div>
  );
}

// ━━ ページ本体 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function LinePreviewPage() {
  return (
    <main style={{
      flex: 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 28% 38%, #d8ead8 0%, #FDFCFA 48%, #F2ECE5 100%)',
    }}>
      {/* スマホ画面コンテンツ（フレームなし・1200×900最適化） */}
      <div style={{
        width: 390,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 32px 88px rgba(0,0,0,0.22), 0 8px 28px rgba(0,0,0,0.10)',
      }}>
        <StatusBar />
        <ChatHeader />
        <ChatArea />
        <LiffSheet />
      </div>
    </main>
  );
}
