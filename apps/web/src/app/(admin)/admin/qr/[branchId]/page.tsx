'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { BranchResponse, TableResponse } from '@qrmenu/shared';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Printer, Settings, RefreshCw, Palette, Wifi } from 'lucide-react';

type TemplateStyle = 'mesob' | 'modern' | 'royal' | 'botanical' | 'night';
type LanguageMode = 'en' | 'am' | 'dual';

const APP_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.hostname}`
    : 'http://localhost:3000';

// ─── SVG decorative patterns (inline, zero network requests) ──────────────────

const EthiopianBorder = ({ color = '#d4af37', size = 4 }: { color?: string; size?: number }) => (
  <svg width="100%" height={size * 8} viewBox={`0 0 400 ${size * 8}`} preserveAspectRatio="none">
    <defs>
      <pattern id={`diamond-${color.replace('#', '')}`} x="0" y="0" width={size * 4} height={size * 4} patternUnits="userSpaceOnUse">
        <polygon points={`${size * 2},0 ${size * 4},${size * 2} ${size * 2},${size * 4} 0,${size * 2}`} fill={color} opacity="0.9" />
        <polygon points={`${size * 2},${size} ${size * 3},${size * 2} ${size * 2},${size * 3} ${size},${size * 2}`} fill="transparent" stroke={color} strokeWidth="0.5" opacity="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#diamond-${color.replace('#', '')})`} />
  </svg>
);

const CornerFlourish = ({ color = '#d4af37', flip = false }: { color?: string; flip?: boolean }) => (
  <svg
    width="48" height="48" viewBox="0 0 48 48"
    style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
  >
    <path d="M4,4 Q4,20 20,20 Q12,12 4,4Z" fill={color} opacity="0.8" />
    <path d="M4,4 L4,16" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
    <path d="M4,4 L16,4" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
    <circle cx="4" cy="4" r="2" fill={color} />
    <circle cx="4" cy="10" r="1" fill={color} opacity="0.5" />
    <circle cx="10" cy="4" r="1" fill={color} opacity="0.5" />
    <path d="M8,8 Q14,10 18,18" stroke={color} strokeWidth="1" fill="none" opacity="0.4" />
  </svg>
);

const CoffeeBotanical = () => (
  <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="xMidYMid meet">
    {/* Coffee leaves left */}
    <ellipse cx="30" cy="40" rx="22" ry="10" fill="#5a7a4a" opacity="0.7" transform="rotate(-30,30,40)" />
    <ellipse cx="15" cy="30" rx="18" ry="8" fill="#4a6a3a" opacity="0.5" transform="rotate(-50,15,30)" />
    <ellipse cx="50" cy="55" rx="20" ry="8" fill="#6a8a5a" opacity="0.6" transform="rotate(-10,50,55)" />
    {/* Coffee beans left */}
    <ellipse cx="25" cy="20" rx="5" ry="3" fill="#8B5E3C" opacity="0.8" transform="rotate(20,25,20)" />
    <path d="M23,20 Q25,17 27,20" stroke="#6B3F1C" strokeWidth="0.8" fill="none" opacity="0.7" />
    {/* Coffee leaves right */}
    <ellipse cx="270" cy="40" rx="22" ry="10" fill="#5a7a4a" opacity="0.7" transform="rotate(30,270,40)" />
    <ellipse cx="285" cy="30" rx="18" ry="8" fill="#4a6a3a" opacity="0.5" transform="rotate(50,285,30)" />
    <ellipse cx="250" cy="55" rx="20" ry="8" fill="#6a8a5a" opacity="0.6" transform="rotate(10,250,55)" />
    {/* Coffee beans right */}
    <ellipse cx="275" cy="20" rx="5" ry="3" fill="#8B5E3C" opacity="0.8" transform="rotate(-20,275,20)" />
    <path d="M273,20 Q275,17 277,20" stroke="#6B3F1C" strokeWidth="0.8" fill="none" opacity="0.7" />
    {/* Center motif */}
    <circle cx="150" cy="40" r="8" fill="none" stroke="#8B5E3C" strokeWidth="1.5" opacity="0.6" />
    <circle cx="150" cy="40" r="4" fill="#8B5E3C" opacity="0.4" />
    {/* Vine lines */}
    <path d="M60,40 Q100,20 140,38" stroke="#5a7a4a" strokeWidth="1.2" fill="none" opacity="0.5" />
    <path d="M240,40 Q200,20 162,38" stroke="#5a7a4a" strokeWidth="1.2" fill="none" opacity="0.5" />
  </svg>
);

const NeonGlowFrame = ({ color = '#f59e0b' }: { color?: string }) => (
  <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
    <defs>
      <filter id="neon-glow">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect x="8" y="8" width="calc(100% - 16px)" height="calc(100% - 16px)"
      rx="12" ry="12"
      fill="none"
      stroke={color}
      strokeWidth="2"
      filter="url(#neon-glow)"
      opacity="0.9"
    />
    {/* Corner accents */}
    <line x1="8" y1="30" x2="8" y2="8" stroke={color} strokeWidth="3" filter="url(#neon-glow)" />
    <line x1="8" y1="8" x2="30" y2="8" stroke={color} strokeWidth="3" filter="url(#neon-glow)" />
  </svg>
);

// ─── Template configs ─────────────────────────────────────────────────────────

interface TemplateConfig {
  name: string;
  bg: string;
  color: string;
  accent: string;
  accentText: string;
  fontFamily: string;
  boxShadow: string;
  subColor: string;
  qrBorder: string;
}

const TEMPLATES: Record<TemplateStyle, TemplateConfig> = {
  mesob: {
    name: '☕ Mesob Heritage',
    bg: '#1c1008',
    color: '#f5e6c8',
    accent: '#d4af37',
    accentText: '#1c1008',
    fontFamily: '"Palatino Linotype","Georgia",serif',
    boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.3)',
    subColor: 'rgba(245,230,200,0.7)',
    qrBorder: '3px solid #d4af37',
  },
  modern: {
    name: '🌿 Modern Café',
    bg: '#ffffff',
    color: '#111827',
    accent: '#2563eb',
    accentText: '#ffffff',
    fontFamily: '"Inter","Helvetica Neue",sans-serif',
    boxShadow: '0 20px 50px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
    subColor: '#6b7280',
    qrBorder: '2px solid #e5e7eb',
  },
  royal: {
    name: '👑 Royal Abyssinia',
    bg: '#3d0812',
    color: '#fdf0d5',
    accent: '#d4af37',
    accentText: '#3d0812',
    fontFamily: '"Palatino Linotype","Book Antiqua",serif',
    boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
    subColor: 'rgba(253,240,213,0.75)',
    qrBorder: '3px double #d4af37',
  },
  botanical: {
    name: '🌱 Botanical Garden',
    bg: '#f5f0e8',
    color: '#2d3e1e',
    accent: '#5a7a4a',
    accentText: '#f5f0e8',
    fontFamily: '"Georgia","Times New Roman",serif',
    boxShadow: '0 16px 40px rgba(50,70,30,0.2)',
    subColor: '#5a6e44',
    qrBorder: '2px solid #8aaa6a',
  },
  night: {
    name: '🌙 Night Addis',
    bg: '#050505',
    color: '#f5f5f5',
    accent: '#f59e0b',
    accentText: '#050505',
    fontFamily: '"Inter","Helvetica Neue",sans-serif',
    boxShadow: '0 0 40px rgba(245,158,11,0.25), 0 20px 40px rgba(0,0,0,0.9)',
    subColor: 'rgba(245,245,245,0.6)',
    qrBorder: '2px solid rgba(245,158,11,0.5)',
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function QRAdmin() {
  const params = useParams();
  const branchId = params.branchId as string;

  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [tables, setTables] = useState<TableResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  const [template, setTemplate] = useState<TemplateStyle>('mesob');
  const [greeting, setGreeting] = useState('Welcome to our Restaurant');
  const [subtitle, setSubtitle] = useState('Scan to View Menu & Order');
  const [showTableBadge, setShowTableBadge] = useState(true);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [languageMode, setLanguageMode] = useState<LanguageMode>('dual');
  const [previewTable, setPreviewTable] = useState('01');

  const generateQrDataUrls = useCallback(async (
    branchSlug: string,
    tableList: TableResponse[],
    qrMode: string
  ) => {
    const opts: QRCode.QRCodeToDataURLOptions = {
      type: 'image/png',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    };
    const urls: Record<string, string> = {};
    if (qrMode === 'SINGLE') {
      urls['single'] = await QRCode.toDataURL(`${APP_URL}/${branchSlug}`, opts);
    } else {
      for (const t of tableList) {
        urls[t.id] = await QRCode.toDataURL(
          `${APP_URL}/${branchSlug}?table=${encodeURIComponent(t.label)}`,
          opts
        );
      }
    }
    setQrDataUrls(urls);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const branches = await apiClient.fetchBranches();
        const found = branches.find(b => b.id === branchId);
        if (found) {
          setBranch(found);
          setGreeting(`Welcome to ${found.name}`);
        }
        const fetchedTables = await apiClient.fetchTables(branchId);
        setTables(fetchedTables);
        if (fetchedTables.length > 0) setPreviewTable(fetchedTables[0].label);
        if (found) await generateQrDataUrls(found.slug, fetchedTables, found.qrMode);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [branchId, generateQrDataUrls]);

  const getQrSrc = (tableId?: string) =>
    branch?.qrMode === 'SINGLE' ? qrDataUrls['single'] : (tableId ? qrDataUrls[tableId] : '');

  // ─── Card renderer ─────────────────────────────────────────────────────────

  const TableCard = ({
    tableLabel, tableId, isPreview,
  }: { tableLabel: string; tableId?: string; isPreview: boolean }) => {
    const cfg = TEMPLATES[template];
    const qrSrc = getQrSrc(tableId);
    const isAmharic = languageMode === 'am';
    const isDual = languageMode === 'dual';

    const labelText = isAmharic
      ? `ጠረጴዛ ${tableLabel}`
      : isDual
      ? `TABLE ${tableLabel}  ·  ጠረጴዛ ${tableLabel}`
      : `TABLE ${tableLabel}`;

    // ── MESOB HERITAGE ──────────────────────────────────────────────────────
    if (template === 'mesob') {
      return (
        <div className="table-card" style={{
          width: '4in', height: '6in',
          background: cfg.bg,
          color: cfg.color,
          fontFamily: cfg.fontFamily,
          boxShadow: isPreview ? cfg.boxShadow : 'none',
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxSizing: 'border-box', textAlign: 'center',
          overflow: 'hidden',
          margin: isPreview ? '0 auto' : '0',
          pageBreakInside: 'avoid',
        }}>
          {/* Top tilet border */}
          <div style={{ width: '100%', flexShrink: 0 }}>
            <EthiopianBorder color="#d4af37" size={5} />
          </div>

          {/* Gold outer frame lines */}
          <div style={{
            position: 'absolute', inset: '28px',
            border: '1px solid rgba(212,175,55,0.35)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: '32px',
            border: '1px solid rgba(212,175,55,0.15)',
            pointerEvents: 'none',
          }} />

          {/* Corner flourishes */}
          <div style={{ position: 'absolute', top: 28, left: 28 }}>
            <CornerFlourish color="#d4af37" />
          </div>
          <div style={{ position: 'absolute', top: 28, right: 28, transform: 'scaleX(-1)' }}>
            <CornerFlourish color="#d4af37" />
          </div>
          <div style={{ position: 'absolute', bottom: 28, left: 28, transform: 'scaleY(-1)' }}>
            <CornerFlourish color="#d4af37" />
          </div>
          <div style={{ position: 'absolute', bottom: 28, right: 28, transform: 'scale(-1,-1)' }}>
            <CornerFlourish color="#d4af37" />
          </div>

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.5in 0.6in', gap: '0.18in' }}>
            {/* Decorative top divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1in', width: '100%' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.5)' }} />
              <span style={{ color: '#d4af37', fontSize: '0.18in' }}>✦</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.5)' }} />
            </div>

            <div>
              <div style={{ fontSize: '0.26in', fontWeight: '700', letterSpacing: '0.03em', lineHeight: 1.25, marginBottom: '0.06in', color: '#f5e6c8' }}>
                {greeting}
              </div>
              <div style={{ fontSize: '0.12in', color: cfg.subColor, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {isAmharic ? 'ሜኑ ለማየት ያንቡ' : subtitle}
              </div>
              {isDual && (
                <div style={{ fontSize: '0.11in', color: 'rgba(212,175,55,0.8)', marginTop: '0.04in', letterSpacing: '0.04em' }}>
                  ሜኑ ለማየት QR ኮዱን ያንቡ
                </div>
              )}
            </div>

            {/* Table badge */}
            {showTableBadge && (
              <div style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #d4af37 100%)',
                color: cfg.accentText,
                padding: '0.06in 0.22in',
                borderRadius: '2px',
                fontWeight: '800',
                fontSize: '0.14in',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {labelText}
              </div>
            )}

            {/* QR Code */}
            <div style={{
              background: '#ffffff',
              padding: '0.12in',
              border: cfg.qrBorder,
              boxShadow: '0 0 0 4px rgba(212,175,55,0.15)',
              lineHeight: 0,
            }}>
              {qrSrc
                ? <img src={qrSrc} alt="QR Code" style={{ width: '1.5in', height: '1.5in', display: 'block' }} />
                : <div style={{ width: '1.5in', height: '1.5in', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.1in', color: '#9ca3af' }}>Loading…</div>
              }
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', gap: '0.05in' }}>
              {[
                { n: '1', en: 'Open Camera', am: 'ካሜራ ክፈት' },
                { n: '2', en: 'Scan QR', am: 'QR ያንቡ' },
                { n: '3', en: 'Browse & Order', am: 'መርጠው ይዘዙ' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.03in', flex: 1 }}>
                  <div style={{ width: '0.2in', height: '0.2in', borderRadius: '50%', background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.1in', color: '#d4af37', fontWeight: '700' }}>
                    {step.n}
                  </div>
                  <div style={{ fontSize: '0.09in', color: cfg.subColor, lineHeight: 1.3, textAlign: 'center' }}>
                    {isAmharic ? step.am : step.en}
                    {isDual && <div style={{ fontSize: '0.085in', color: 'rgba(212,175,55,0.7)' }}>{step.am}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Wi-Fi */}
            {wifiSsid && (
              <div style={{ border: '1px dashed rgba(212,175,55,0.5)', padding: '0.08in 0.12in', width: '100%', boxSizing: 'border-box', fontSize: '0.1in', color: cfg.subColor }}>
                <div style={{ color: '#d4af37', fontWeight: '700', marginBottom: '0.03in' }}>📶 {isAmharic ? 'ነፃ ዋይፋይ' : 'Free Wi-Fi'}</div>
                <div>{isAmharic ? 'አውታር' : 'Network'}: <strong style={{ color: cfg.color }}>{wifiSsid}</strong></div>
                {wifiPass && <div>{isAmharic ? 'የለፍ ቃል' : 'Password'}: <strong style={{ color: cfg.color }}>{wifiPass}</strong></div>}
              </div>
            )}

            {/* Bottom divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1in', width: '100%' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.5)' }} />
              <span style={{ color: '#d4af37', fontSize: '0.14in' }}>✦</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(212,175,55,0.5)' }} />
            </div>
          </div>

          {/* Bottom tilet border */}
          <div style={{ width: '100%', flexShrink: 0, transform: 'scaleY(-1)' }}>
            <EthiopianBorder color="#d4af37" size={5} />
          </div>
        </div>
      );
    }

    // ── MODERN CAFÉ ────────────────────────────────────────────────────────
    if (template === 'modern') {
      return (
        <div className="table-card" style={{
          width: '4in', height: '6in',
          background: cfg.bg, color: cfg.color,
          fontFamily: cfg.fontFamily,
          boxShadow: isPreview ? cfg.boxShadow : 'none',
          borderRadius: '0.14in',
          border: '1px solid #e5e7eb',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0.4in 0.45in', boxSizing: 'border-box',
          textAlign: 'center', overflow: 'hidden',
          margin: isPreview ? '0 auto' : '0',
          pageBreakInside: 'avoid', position: 'relative',
        }}>
          {/* Top accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5px', background: 'linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)', borderRadius: '0.14in 0.14in 0 0' }} />

          {/* Brand dot */}
          <div style={{ width: '0.35in', height: '0.35in', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #06b6d4)', marginBottom: '0.15in', marginTop: '0.1in' }} />

          {/* Greeting */}
          <div style={{ marginBottom: '0.2in' }}>
            <div style={{ fontSize: '0.22in', fontWeight: '800', letterSpacing: '-0.01em', color: '#111827', marginBottom: '0.06in' }}>
              {greeting}
            </div>
            <div style={{ fontSize: '0.12in', color: '#6b7280', letterSpacing: '0.02em' }}>
              {isAmharic ? 'ሜኑ ለማየት ያንቡ' : subtitle}
            </div>
            {isDual && <div style={{ fontSize: '0.11in', color: '#9ca3af', marginTop: '0.03in' }}>ሜኑ ለማየት QR ኮዱን ያንቡ</div>}
          </div>

          {/* Table badge */}
          {showTableBadge && (
            <div style={{
              background: '#eff6ff', border: '1.5px solid #bfdbfe',
              color: '#2563eb', padding: '0.06in 0.2in',
              borderRadius: '999px', fontWeight: '700',
              fontSize: '0.13in', letterSpacing: '0.06em',
              marginBottom: '0.2in',
            }}>
              {labelText}
            </div>
          )}

          {/* QR Code */}
          <div style={{
            background: '#fff', padding: '0.14in',
            borderRadius: '0.1in', border: '1.5px solid #e5e7eb',
            boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
            marginBottom: '0.22in', lineHeight: 0,
          }}>
            {qrSrc
              ? <img src={qrSrc} alt="QR Code" style={{ width: '1.5in', height: '1.5in', display: 'block', borderRadius: '0.04in' }} />
              : <div style={{ width: '1.5in', height: '1.5in', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.1in', color: '#9ca3af' }}>Loading…</div>
            }
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: '1px', background: '#f3f4f6', marginBottom: '0.2in' }} />

          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.2in', gap: '0.05in' }}>
            {[
              { emoji: '📱', en: 'Point Camera', am: 'ካሜራ ክፈት' },
              { emoji: '↔️', en: '', am: '' },
              { emoji: '🔍', en: 'Scan Code', am: 'QR ያንቡ' },
              { emoji: '↔️', en: '', am: '' },
              { emoji: '🛒', en: 'Order', am: 'ይዘዙ' },
            ].map((s, i) =>
              s.en === '' ? (
                <div key={i} style={{ fontSize: '0.14in', color: '#d1d5db', alignSelf: 'center' }}>→</div>
              ) : (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.04in', flex: 1 }}>
                  <span style={{ fontSize: '0.2in' }}>{s.emoji}</span>
                  <span style={{ fontSize: '0.09in', color: '#6b7280', fontWeight: '600' }}>{isAmharic ? s.am : s.en}</span>
                  {isDual && <span style={{ fontSize: '0.085in', color: '#9ca3af' }}>{s.am}</span>}
                </div>
              )
            )}
          </div>

          {/* No App Needed */}
          <div style={{ fontSize: '0.095in', color: '#9ca3af', marginBottom: '0.15in' }}>
            ✓ {isAmharic ? 'መተግበሪያ አያስፈልግም' : 'No app download required'}
          </div>

          {/* Wi-Fi */}
          {wifiSsid && (
            <div style={{ width: '100%', background: '#f9fafb', borderRadius: '0.08in', padding: '0.1in 0.12in', boxSizing: 'border-box', fontSize: '0.1in', color: '#374151', marginTop: 'auto' }}>
              <div style={{ fontWeight: '700', color: '#2563eb', marginBottom: '0.03in' }}>📶 {isAmharic ? 'ነፃ ዋይፋይ' : 'Free Wi-Fi'}</div>
              <div>{isAmharic ? 'አውታር' : 'Network'}: <strong>{wifiSsid}</strong>
                {wifiPass && <span> · {isAmharic ? 'የለፍ ቃል' : 'Pass'}: <strong>{wifiPass}</strong></span>}
              </div>
            </div>
          )}

          {/* Bottom accent */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #06b6d4 0%, #2563eb 100%)', borderRadius: '0 0 0.14in 0.14in' }} />
        </div>
      );
    }

    // ── ROYAL ABYSSINIA ────────────────────────────────────────────────────
    if (template === 'royal') {
      return (
        <div className="table-card" style={{
          width: '4in', height: '6in',
          background: `radial-gradient(ellipse at 50% 10%, #5c0a18 0%, #3d0812 60%, #2a0509 100%)`,
          color: cfg.color,
          fontFamily: cfg.fontFamily,
          boxShadow: isPreview ? cfg.boxShadow : 'none',
          border: '3px double #d4af37',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0', boxSizing: 'border-box',
          textAlign: 'center', overflow: 'hidden',
          margin: isPreview ? '0 auto' : '0',
          pageBreakInside: 'avoid', position: 'relative',
        }}>
          {/* Inner double border */}
          <div style={{ position: 'absolute', inset: '6px', border: '1px solid rgba(212,175,55,0.4)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: '10px', border: '1px solid rgba(212,175,55,0.15)', pointerEvents: 'none' }} />

          {/* Corner flourishes */}
          <div style={{ position: 'absolute', top: 6, left: 6 }}><CornerFlourish color="#d4af37" /></div>
          <div style={{ position: 'absolute', top: 6, right: 6, transform: 'scaleX(-1)' }}><CornerFlourish color="#d4af37" /></div>
          <div style={{ position: 'absolute', bottom: 6, left: 6, transform: 'scaleY(-1)' }}><CornerFlourish color="#d4af37" /></div>
          <div style={{ position: 'absolute', bottom: 6, right: 6, transform: 'scale(-1,-1)' }}><CornerFlourish color="#d4af37" /></div>

          {/* Gold top strip */}
          <div style={{ width: '100%', height: '0.06in', background: 'linear-gradient(90deg, transparent, #d4af37, transparent)', flexShrink: 0, marginTop: '0.55in' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.15in 0.55in', gap: '0.15in' }}>

            {/* Crown icon */}
            <div style={{ fontSize: '0.28in', lineHeight: 1, marginBottom: '0.02in' }}>♛</div>

            {/* Greeting */}
            <div>
              <div style={{ fontSize: '0.24in', fontWeight: '700', letterSpacing: '0.04em', color: '#fdf0d5', lineHeight: 1.2 }}>
                {greeting}
              </div>
              <div style={{ width: '60%', height: '1px', background: 'rgba(212,175,55,0.6)', margin: '0.08in auto' }} />
              <div style={{ fontSize: '0.11in', color: 'rgba(253,240,213,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {isAmharic ? 'ሜኑ ለማየት ያንቡ' : subtitle}
              </div>
              {isDual && <div style={{ fontSize: '0.1in', color: 'rgba(212,175,55,0.75)', marginTop: '0.03in', fontStyle: 'italic' }}>ሜኑ ለማየት QR ኮዱን ያንቡ</div>}
            </div>

            {/* Table Badge */}
            {showTableBadge && (
              <div style={{
                border: '1px solid rgba(212,175,55,0.7)',
                color: '#d4af37', padding: '0.05in 0.18in',
                fontSize: '0.12in', letterSpacing: '0.15em',
                textTransform: 'uppercase', fontWeight: '600',
              }}>
                {labelText}
              </div>
            )}

            {/* QR Code */}
            <div style={{
              background: '#fff', padding: '0.12in',
              border: '2px solid rgba(212,175,55,0.5)',
              boxShadow: '0 0 20px rgba(212,175,55,0.2)',
              lineHeight: 0,
            }}>
              {qrSrc
                ? <img src={qrSrc} alt="QR Code" style={{ width: '1.45in', height: '1.45in', display: 'block' }} />
                : <div style={{ width: '1.45in', height: '1.45in', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.1in', color: '#9ca3af' }}>Loading…</div>
              }
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', gap: '0.04in' }}>
              {[
                { n: 'I', en: 'Open Camera', am: 'ካሜራ ክፈት' },
                { n: 'II', en: 'Scan', am: 'ያንቡ' },
                { n: 'III', en: 'Order', am: 'ይዘዙ' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.03in', flex: 1 }}>
                  <div style={{ fontSize: '0.1in', color: '#d4af37', fontStyle: 'italic', letterSpacing: '0.05em' }}>{step.n}</div>
                  <div style={{ fontSize: '0.085in', color: 'rgba(253,240,213,0.65)', lineHeight: 1.3, textAlign: 'center' }}>
                    {isAmharic ? step.am : step.en}
                    {isDual && <div style={{ color: 'rgba(212,175,55,0.6)' }}>{step.am}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Wi-Fi */}
            {wifiSsid && (
              <div style={{ border: '1px solid rgba(212,175,55,0.4)', padding: '0.07in 0.1in', width: '100%', boxSizing: 'border-box', fontSize: '0.095in', color: 'rgba(253,240,213,0.7)' }}>
                <div style={{ color: '#d4af37', fontWeight: '700', marginBottom: '0.02in' }}>📶 Wi-Fi</div>
                <div>{wifiSsid} {wifiPass && `· ${wifiPass}`}</div>
              </div>
            )}
          </div>

          {/* Gold bottom strip */}
          <div style={{ width: '100%', height: '0.06in', background: 'linear-gradient(90deg, transparent, #d4af37, transparent)', flexShrink: 0, marginBottom: '0.55in' }} />
        </div>
      );
    }

    // ── BOTANICAL GARDEN ────────────────────────────────────────────────────
    if (template === 'botanical') {
      return (
        <div className="table-card" style={{
          width: '4in', height: '6in',
          background: 'linear-gradient(180deg, #eef4e8 0%, #f5f0e8 60%, #eee8da 100%)',
          color: cfg.color,
          fontFamily: cfg.fontFamily,
          boxShadow: isPreview ? cfg.boxShadow : 'none',
          border: '2px solid #b5c9a0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          boxSizing: 'border-box', textAlign: 'center', overflow: 'hidden',
          margin: isPreview ? '0 auto' : '0',
          pageBreakInside: 'avoid', position: 'relative',
        }}>
          {/* Top botanical strip */}
          <div style={{ width: '100%', flexShrink: 0, paddingTop: '0.05in' }}>
            <CoffeeBotanical />
          </div>

          {/* Dotted inner border */}
          <div style={{ position: 'absolute', inset: '12px', border: '1px dashed #8aaa6a', opacity: 0.5, pointerEvents: 'none' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.15in 0.5in', gap: '0.14in' }}>
            {/* Leaf divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1in', width: '100%' }}>
              <div style={{ flex: 1, height: '1px', background: '#8aaa6a', opacity: 0.5 }} />
              <span style={{ fontSize: '0.16in' }}>🌿</span>
              <div style={{ flex: 1, height: '1px', background: '#8aaa6a', opacity: 0.5 }} />
            </div>

            {/* Greeting */}
            <div>
              <div style={{ fontSize: '0.22in', fontWeight: '700', color: '#2d3e1e', letterSpacing: '0.01em', lineHeight: 1.25 }}>
                {greeting}
              </div>
              <div style={{ fontSize: '0.115in', color: '#5a6e44', marginTop: '0.05in', fontStyle: 'italic' }}>
                {isAmharic ? 'ሜኑ ለማየት ያንቡ' : subtitle}
              </div>
              {isDual && <div style={{ fontSize: '0.105in', color: '#6a8a5a', marginTop: '0.03in', fontStyle: 'italic' }}>ሜኑ ለማየት QR ኮዱን ያንቡ</div>}
            </div>

            {/* Table badge */}
            {showTableBadge && (
              <div style={{
                background: '#5a7a4a', color: '#f5f0e8',
                padding: '0.06in 0.2in', borderRadius: '2px',
                fontWeight: '700', fontSize: '0.125in',
                letterSpacing: '0.1em',
              }}>
                {labelText}
              </div>
            )}

            {/* QR Code */}
            <div style={{
              background: '#fff', padding: '0.12in',
              border: '2px solid #8aaa6a',
              boxShadow: '0 4px 12px rgba(90,122,74,0.15)',
              lineHeight: 0,
            }}>
              {qrSrc
                ? <img src={qrSrc} alt="QR Code" style={{ width: '1.5in', height: '1.5in', display: 'block' }} />
                : <div style={{ width: '1.5in', height: '1.5in', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.1in', color: '#9ca3af' }}>Loading…</div>
              }
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', gap: '0.04in', background: 'rgba(90,122,74,0.08)', borderRadius: '0.08in', padding: '0.1in 0.05in' }}>
              {[
                { emoji: '📱', en: 'Scan Camera', am: 'ካሜራ ክፈት' },
                { emoji: '📖', en: 'View Menu', am: 'ሜኑ ይቃኙ' },
                { emoji: '☕', en: 'Enjoy', am: 'ይደሰቱ' },
              ].map(step => (
                <div key={step.en} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.04in', flex: 1 }}>
                  <span style={{ fontSize: '0.18in' }}>{step.emoji}</span>
                  <span style={{ fontSize: '0.09in', color: '#4a6a3a', fontWeight: '600' }}>{isAmharic ? step.am : step.en}</span>
                  {isDual && <span style={{ fontSize: '0.083in', color: '#5a7a4a', fontStyle: 'italic' }}>{step.am}</span>}
                </div>
              ))}
            </div>

            {/* Wi-Fi */}
            {wifiSsid && (
              <div style={{ border: '1px dashed #8aaa6a', padding: '0.08in 0.12in', width: '100%', boxSizing: 'border-box', fontSize: '0.1in', color: '#4a6a3a' }}>
                📶 {wifiSsid} {wifiPass && `· ${wifiPass}`}
              </div>
            )}

            {/* Bottom leaf divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1in', width: '100%' }}>
              <div style={{ flex: 1, height: '1px', background: '#8aaa6a', opacity: 0.5 }} />
              <span style={{ fontSize: '0.16in' }}>☕</span>
              <div style={{ flex: 1, height: '1px', background: '#8aaa6a', opacity: 0.5 }} />
            </div>
          </div>

          {/* Bottom botanical strip */}
          <div style={{ width: '100%', flexShrink: 0, transform: 'scaleY(-1)', paddingBottom: '0.05in' }}>
            <CoffeeBotanical />
          </div>
        </div>
      );
    }

    // ── NIGHT ADDIS ─────────────────────────────────────────────────────────
    return (
      <div className="table-card" style={{
        width: '4in', height: '6in',
        background: '#050505',
        color: cfg.color,
        fontFamily: cfg.fontFamily,
        boxShadow: isPreview ? cfg.boxShadow : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0.45in 0.5in', boxSizing: 'border-box',
        textAlign: 'center', overflow: 'hidden',
        margin: isPreview ? '0 auto' : '0',
        pageBreakInside: 'avoid', position: 'relative',
      }}>
        {/* Neon corner lines */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '35px', height: '35px', borderTop: '2px solid #f59e0b', borderLeft: '2px solid #f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)' }} />
        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '35px', height: '35px', borderTop: '2px solid #f59e0b', borderRight: '2px solid #f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)' }} />
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '35px', height: '35px', borderBottom: '2px solid #f59e0b', borderLeft: '2px solid #f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)' }} />
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '35px', height: '35px', borderBottom: '2px solid #f59e0b', borderRight: '2px solid #f59e0b', filter: 'drop-shadow(0 0 4px #f59e0b)' }} />

        {/* Neon top glow line */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', background: '#f59e0b', filter: 'blur(3px) drop-shadow(0 0 6px #f59e0b)', opacity: 0.9 }} />

        {/* City skyline watermark (pure CSS) */}
        <div style={{ position: 'absolute', bottom: '0.6in', left: 0, right: 0, height: '0.5in', opacity: 0.04, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', padding: '0 20px' }}>
          {[20, 35, 28, 45, 22, 38, 30, 50, 25, 40, 18, 32, 44, 26, 38].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}px`, background: '#f59e0b' }} />
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15in', width: '100%' }}>
          {/* Greeting */}
          <div>
            <div style={{ fontSize: '0.22in', fontWeight: '900', letterSpacing: '0.05em', color: '#f5f5f5', textTransform: 'uppercase', marginBottom: '0.04in' }}>
              {greeting}
            </div>
            <div style={{ fontSize: '0.11in', color: 'rgba(245,158,11,0.8)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {isAmharic ? 'ሜኑ ለማየት ያንቡ' : subtitle}
            </div>
            {isDual && (
              <div style={{ fontSize: '0.1in', color: 'rgba(245,245,245,0.4)', marginTop: '0.03in', letterSpacing: '0.08em' }}>
                ሜኑ ለማየት QR ኮዱን ያንቡ
              </div>
            )}
          </div>

          {/* Neon divider */}
          <div style={{ width: '80%', height: '1px', background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', filter: 'drop-shadow(0 0 3px #f59e0b)' }} />

          {/* Table badge */}
          {showTableBadge && (
            <div style={{
              border: '1.5px solid #f59e0b',
              color: '#f59e0b', padding: '0.05in 0.2in',
              fontSize: '0.13in', fontWeight: '700',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.5))',
            }}>
              {labelText}
            </div>
          )}

          {/* QR Code with neon glow frame */}
          <div style={{
            position: 'relative', lineHeight: 0,
            padding: '0.12in',
            background: '#fff',
            boxShadow: '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)',
            border: '2px solid rgba(245,158,11,0.7)',
          }}>
            {qrSrc
              ? <img src={qrSrc} alt="QR Code" style={{ width: '1.5in', height: '1.5in', display: 'block' }} />
              : <div style={{ width: '1.5in', height: '1.5in', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.1in', color: '#f59e0b' }}>Loading…</div>
            }
          </div>

          {/* Neon divider */}
          <div style={{ width: '80%', height: '1px', background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', filter: 'drop-shadow(0 0 3px #f59e0b)' }} />

          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', gap: '0.04in' }}>
            {[
              { icon: '📸', en: 'Scan QR', am: 'QR ያንቡ' },
              { icon: '📋', en: 'Browse', am: 'ይቃኙ' },
              { icon: '🛒', en: 'Order', am: 'ይዘዙ' },
            ].map(step => (
              <div key={step.en} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.04in', flex: 1 }}>
                <span style={{ fontSize: '0.18in', filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.5))' }}>{step.icon}</span>
                <span style={{ fontSize: '0.09in', color: 'rgba(245,245,245,0.75)', fontWeight: '600', letterSpacing: '0.04em' }}>{isAmharic ? step.am : step.en}</span>
                {isDual && <span style={{ fontSize: '0.083in', color: 'rgba(245,158,11,0.7)' }}>{step.am}</span>}
              </div>
            ))}
          </div>

          {/* Wi-Fi */}
          {wifiSsid && (
            <div style={{ border: '1px solid rgba(245,158,11,0.4)', padding: '0.07in 0.1in', width: '100%', boxSizing: 'border-box', fontSize: '0.095in', color: 'rgba(245,245,245,0.6)', borderRadius: '2px' }}>
              <span style={{ color: '#f59e0b', fontWeight: '700' }}>📶</span> {wifiSsid}{wifiPass && ` · ${wifiPass}`}
            </div>
          )}
        </div>

        {/* Neon bottom glow */}
        <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '2px', background: '#f59e0b', filter: 'blur(3px)', opacity: 0.9 }} />
      </div>
    );
  };

  const previewTableData = tables.find(t => t.label === previewTable);
  const previewTableId = previewTableData?.id || '';
  const qrReady = Object.keys(qrDataUrls).length > 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', width: 32, height: 32, color: 'var(--color-primary)' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Generating QR codes…</p>
      </div>
    );
  }
  if (!branch) return <div style={{ padding: '2rem' }}>Branch not found.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'var(--color-text)' }}>

      {/* ─── Page Header ─── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={26} /> QR Table Stand Studio
          </h1>
          <p style={{ margin: '0.4rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {branch.name} ·
            <span style={{ padding: '0.15rem 0.5rem', background: 'var(--color-surface)', borderRadius: '4px', fontSize: '0.78rem', fontWeight: '700' }}>{branch.qrMode}</span>
            {qrReady
              ? <span style={{ color: '#10b981', fontSize: '0.82rem' }}>✓ {Object.keys(qrDataUrls).length} QR codes embedded & print-ready</span>
              : <span style={{ color: '#f59e0b', fontSize: '0.82rem' }}>⏳ Generating QR codes…</span>
            }
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
          disabled={!qrReady}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', opacity: qrReady ? 1 : 0.5 }}
        >
          <Printer size={18} /> Print All Table Stands (A4)
        </button>
      </div>

      {/* ─── Controls + Preview ─── */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', alignItems: 'start' }}>

        {/* Controls panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
            <Palette size={16} /> Design Settings
          </h2>

          {/* Template picker */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>Card Template</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(Object.entries(TEMPLATES) as [TemplateStyle, TemplateConfig][]).map(([key, cfg]) => (
                <label key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  padding: '0.55rem 0.75rem',
                  border: `1.5px solid ${template === key ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '6px',
                  background: template === key ? 'rgba(59,130,246,0.05)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <input type="radio" name="tpl" value={key} checked={template === key} onChange={() => setTemplate(key)} />
                  {/* Color swatch */}
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.accent}`, flexShrink: 0, boxShadow: `0 0 0 1px ${cfg.accent}33` }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: template === key ? '600' : '400' }}>{cfg.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>Language Mode</label>
            <select value={languageMode} onChange={e => setLanguageMode(e.target.value as LanguageMode)}
              style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
              <option value="en">🇬🇧 English Only</option>
              <option value="am">🇪🇹 Amharic Only (አማርኛ)</option>
              <option value="dual">🌍 Dual-Language (EN + አማ)</option>
            </select>
          </div>

          {/* Greeting */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>Header Greeting</label>
            <input type="text" value={greeting} onChange={e => setGreeting(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.6rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>Subtitle / Tagline</label>
            <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.6rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', boxSizing: 'border-box' }} />
          </div>

          {/* Table badge toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={showTableBadge} onChange={e => setShowTableBadge(e.target.checked)} />
            Show Table Number Badge
          </label>

          {/* Wi-Fi */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <Wifi size={15} /> Wi-Fi Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input type="text" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} placeholder="Network name (SSID)"
                style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
              <input type="text" value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="Password (optional)"
                style={{ width: '100%', padding: '0.4rem 0.6rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', boxSizing: 'border-box', fontSize: '0.85rem' }} />
            </div>
          </div>

          {/* Preview table picker */}
          {branch.qrMode === 'PER_TABLE' && tables.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>Preview Table</label>
              <select value={previewTable} onChange={e => setPreviewTable(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                {tables.map(t => <option key={t.id} value={t.label}>Table {t.label}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div style={{
          background: 'repeating-conic-gradient(#00000015 0% 25%, transparent 0% 50%) 0 0 / 20px 20px, var(--color-surface)',
          padding: '2.5rem 2rem',
          borderRadius: '12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '0.35rem 1rem', borderRadius: '999px', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
            📐 Live Preview · 4 × 6 inch
          </div>
          <TableCard
            tableLabel={branch.qrMode === 'SINGLE' ? '—' : previewTable}
            tableId={branch.qrMode === 'SINGLE' ? undefined : previewTableId}
            isPreview={true}
          />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
            QR codes are embedded as base64 images — prints perfectly in PDF.<br />
            {branch.qrMode === 'PER_TABLE'
              ? `${tables.length} card${tables.length !== 1 ? 's' : ''} will be printed (2 per A4 sheet).`
              : '1 card will be printed (single QR mode).'}
          </p>
        </div>
      </div>

      {/* ─── Print-only: all cards rendered offscreen, images pre-loaded ─── */}
      <div className="print-only">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5mm', justifyContent: 'flex-start' }}>
          {branch.qrMode === 'PER_TABLE'
            ? tables.map(t => <TableCard key={t.id} tableLabel={t.label} tableId={t.id} isPreview={false} />)
            : <TableCard tableLabel="ANY" isPreview={false} />
          }
        </div>
      </div>

      {/* ─── Global styles ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .print-only {
          position: absolute; left: -9999px; top: -9999px; pointer-events: none;
        }
        @media print {
          body * { visibility: hidden !important; }
          .no-print { display: none !important; }
          .print-only {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 100% !important; height: auto !important;
            pointer-events: auto !important;
            visibility: visible !important;
          }
          .print-only * { visibility: visible !important; }
          .table-card { page-break-inside: avoid; break-inside: avoid; }
          @page { size: A4 portrait; margin: 8mm; }
        }
      `}} />
    </div>
  );
}
