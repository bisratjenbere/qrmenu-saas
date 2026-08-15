'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  MenuResponse,
  MenuItemResponse,
  OrderResponse,
  ServiceMode,
  FulfillmentType,
  formatMoney,
  calculateOrderTotals,
  DietaryLabel,
  getSpiceLabel,
  DEFAULT_THEME_ID,
  getThemeById,
} from '@qrmenu/shared';
import { useCart, cartLineToOrderPayload, lineUnitPrice } from '@/hooks/use-cart';
import { useCustomerLanguage } from '@/hooks/use-customer-language';
import { apiClient } from '@/lib/api-client';
import { useNetworkStatus } from '@/hooks/use-network-status';

type GuestFilter =
  | 'all'
  | 'popular'
  | 'fasting'
  | 'mild'
  | 'spicy'
  | 'vegan'
  | 'gluten_free';

interface TableContext {
  label: string;
  token?: string;
  locked: boolean;
}

export default function GuestMenu({
  menu,
  tableContext,
  initialTable,
}: {
  menu: MenuResponse;
  tableContext?: TableContext;
  initialTable?: string;
}) {
  const { state, dispatch, totalItems } = useCart();
  const { locale, toggleLanguage, t } = useCustomerLanguage();
  const { isOnline } = useNetworkStatus();

  const branch = menu.branch;
  const serviceMode = branch.serviceMode || ServiceMode.SINGLE_QR_SELF_ORDER;
  const canOrder = serviceMode !== ServiceMode.MENU_ONLY;
  const currency = branch.currency || 'ETB';

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItemResponse | null>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [modifierSelections, setModifierSelections] = useState<Record<string, string[]>>({});
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(
    tableContext?.locked ? FulfillmentType.DINE_IN : FulfillmentType.DINE_IN
  );
  const [tableNumber, setTableNumber] = useState(
    tableContext?.label || initialTable || ''
  );
  const [takeawayDetails, setTakeawayDetails] = useState({ name: '', phone: '', note: '', pickupTime: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState('');
  const [showExplainers, setShowExplainers] = useState(false);
  const [billRequesting, setBillRequesting] = useState(false);
  const [billRequested, setBillRequested] = useState(false);
  const [waiterRequested, setWaiterRequested] = useState(false);
  const [serviceRequestStatus, setServiceRequestStatus] = useState<'REQUESTED' | 'ACKNOWLEDGED' | 'COMPLETED' | null>(null);
  const [activeServiceRequest, setActiveServiceRequest] = useState<{ id: string; token: string } | null>(null);
  const [billTablePromptOpen, setBillTablePromptOpen] = useState(false);
  const [servicePromptType, setServicePromptType] = useState<'bill' | 'waiter'>('bill');
  const [billTableNumber, setBillTableNumber] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryNavRef = useRef<HTMLElement>(null);
  const theme = getThemeById((branch as { themeId?: string }).themeId || DEFAULT_THEME_ID);

  useEffect(() => {
    const saved = window.localStorage.getItem(`service-request:${branch.id}`);
    if (saved) {
      try { setActiveServiceRequest(JSON.parse(saved)); } catch { window.localStorage.removeItem(`service-request:${branch.id}`); }
    }
  }, [branch.id]);

  useEffect(() => {
    if (!activeServiceRequest) return;
    const refresh = () => apiClient.fetchServiceRequestStatus(activeServiceRequest.id, activeServiceRequest.token)
      .then(data => {
        setServiceRequestStatus(data.status);
        if (data.status === 'COMPLETED') window.localStorage.removeItem(`service-request:${branch.id}`);
      }).catch(() => undefined);
    refresh();
    const interval = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(interval);
  }, [activeServiceRequest, branch.id]);

  const allItems = useMemo(() => menu.sections.flatMap(s => s.items), [menu]);
  const popularityThreshold = useMemo(() => {
    const scores = allItems.map(i => i.popularityScore || 0).sort((a, b) => b - a);
    const idx = Math.floor(scores.length * 0.2);
    return Math.max(scores[idx] || 0, 3);
  }, [allItems]);

  const displayName = (item: MenuItemResponse) =>
    locale === 'AM' && item.nameAmharic ? item.nameAmharic : item.name;

  const displayDescription = (item: MenuItemResponse) =>
    locale === 'AM' && item.descriptionAmharic
      ? item.descriptionAmharic
      : item.description;

  const sectionName = (sec: { name: string; nameAmharic?: string | null }) =>
    locale === 'AM' && sec.nameAmharic ? sec.nameAmharic : sec.name;

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return menu.sections
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => {
          if (!item.isAvailable && filter !== 'all') return false;

          // Search match
          if (q) {
            const matchesEn = item.name.toLowerCase().includes(q);
            const matchesAm = item.nameAmharic ? item.nameAmharic.toLowerCase().includes(q) : false;
            const matchesDescEn = item.description ? item.description.toLowerCase().includes(q) : false;
            const matchesDescAm = item.descriptionAmharic ? item.descriptionAmharic.toLowerCase().includes(q) : false;
            const matchesTags = (item.dietaryLabels || []).some(label => label.toLowerCase().includes(q));
            if (!matchesEn && !matchesAm && !matchesDescEn && !matchesDescAm && !matchesTags) {
              return false;
            }
          }

          // Filter match
          const labels = item.dietaryLabels || [];
          if (filter === 'popular') return (item.popularityScore || 0) >= popularityThreshold;
          if (filter === 'fasting') return labels.includes(DietaryLabel.FASTING);
          if (filter === 'mild') return item.spiceLevel === 0;
          if (filter === 'spicy')
            return (item.spiceLevel ?? 0) >= 2 || labels.includes(DietaryLabel.SPICY);
          if (filter === 'vegan')
            return labels.includes(DietaryLabel.VEGAN) || labels.includes(DietaryLabel.FASTING);
          if (filter === 'gluten_free') return labels.includes(DietaryLabel.GLUTEN_FREE);
          return true;
        }),
      }))
      .filter(sec => sec.items.length > 0);
  }, [menu, filter, searchQuery, popularityThreshold]);

  const estimatedTotals = calculateOrderTotals(
    state.items.map(i => lineUnitPrice(i) * i.quantity),
    branch.serviceChargePercent || 0,
    branch.vatPercent || 0,
    currency
  );

  const filters: { key: GuestFilter; label: string; icon?: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'popular', label: t('popular'), icon: '⭐' },
    { key: 'fasting', label: t('fasting'), icon: '🌱' },
    { key: 'spicy', label: t('spicy'), icon: '🌶️' },
    { key: 'mild', label: t('mild'), icon: '🥛' },
    { key: 'vegan', label: t('vegan'), icon: '🥗' },
    { key: 'gluten_free', label: t('gluten_free'), icon: '🌾' },
  ];

  const hasRequiredModifiers = (item: MenuItemResponse) => {
    return (item.modifierGroups || []).some(g => g.required || g.minSelect > 0);
  };

  // Cart helper functions
  const getItemCartQuantity = (menuItemId: string) => {
    return state.items
      .filter(i => i.menuItemId === menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  const getSimpleCartLine = (menuItemId: string) => {
    return state.items.find(
      i => i.menuItemId === menuItemId && (!i.selectedModifiers || i.selectedModifiers.length === 0)
    );
  };

  const openDetail = (item: MenuItemResponse) => {
    setDetailItem(item);
    setQty(1);
    setNotes('');
    const defaults: Record<string, string[]> = {};
    for (const g of item.modifierGroups || []) {
      if (g.required && g.options.length) {
        defaults[g.id] = [g.options[0].id];
      } else {
        defaults[g.id] = [];
      }
    }
    setModifierSelections(defaults);
    setError('');
  };

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItemResponse) => {
    e.stopPropagation();
    if (!item.isAvailable) return;
    if (hasRequiredModifiers(item)) {
      openDetail(item);
      return;
    }
    const existing = getSimpleCartLine(item.id);
    if (existing) {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { lineId: existing.lineId, quantity: existing.quantity + 1 },
      });
    } else {
      dispatch({
        type: 'ADD_LINE',
        payload: {
          lineId: crypto.randomUUID(),
          menuItemId: item.id,
          name: item.name,
          nameAmharic: item.nameAmharic,
          price: item.price,
          quantity: 1,
          selectedModifiers: [],
        },
      });
    }
  };

  const handleQuickDecrement = (e: React.MouseEvent, item: MenuItemResponse) => {
    e.stopPropagation();
    const existing = getSimpleCartLine(item.id);
    if (!existing) return;
    if (existing.quantity <= 1) {
      dispatch({ type: 'REMOVE_LINE', payload: { lineId: existing.lineId } });
    } else {
      dispatch({
        type: 'UPDATE_QUANTITY',
        payload: { lineId: existing.lineId, quantity: existing.quantity - 1 },
      });
    }
  };

  const toggleModifier = (groupId: string, optionId: string, maxSelect: number) => {
    setModifierSelections(prev => {
      const current = prev[groupId] || [];
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter(id => id !== optionId) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const currentDetailItemTotal = useMemo(() => {
    if (!detailItem) return 0;
    let base = detailItem.price;
    const groups = detailItem.modifierGroups || [];
    for (const g of groups) {
      const sel = modifierSelections[g.id] || [];
      for (const optId of sel) {
        const opt = g.options.find(o => o.id === optId);
        if (opt && opt.priceDelta) base += opt.priceDelta;
      }
    }
    return base * qty;
  }, [detailItem, modifierSelections, qty]);

  const addFromDetail = () => {
    if (!detailItem) return;
    const groups = detailItem.modifierGroups || [];
    for (const g of groups) {
      const sel = modifierSelections[g.id] || [];
      if (g.required && sel.length < Math.max(g.minSelect, 1)) {
        setError(`${locale === 'AM' && g.nameAmharic ? g.nameAmharic : g.name} ${t('required_choices')}`);
        return;
      }
    }

    const selectedModifiers = groups.flatMap(g => {
      const sel = modifierSelections[g.id] || [];
      return sel.map(optId => {
        const opt = g.options.find(o => o.id === optId)!;
        return {
          groupId: g.id,
          groupName: g.name,
          optionId: opt.id,
          optionName: opt.name,
          priceDelta: opt.priceDelta,
        };
      });
    });

    dispatch({
      type: 'ADD_LINE',
      payload: {
        lineId: crypto.randomUUID(),
        menuItemId: detailItem.id,
        name: detailItem.name,
        nameAmharic: detailItem.nameAmharic,
        price: detailItem.price,
        quantity: qty,
        notes: notes.trim() || undefined,
        selectedModifiers,
      },
    });
    setDetailItem(null);
    setError('');
  };

  const scrollToSection = (sectionId: string) => {
    setActiveCategory(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      const yOffset = -135;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const placeOrder = async () => {
    setError('');
    if (!canOrder) return;

    if (
      fulfillment === FulfillmentType.DINE_IN &&
      !tableContext?.locked &&
      serviceMode === ServiceMode.SINGLE_QR_SELF_ORDER &&
      !tableNumber.trim()
    ) {
      setError(t('select_table'));
      return;
    }

    setSubmitting(true);
    try {
      const order = await apiClient.createOrder({
        branchId: branch.id,
        fulfillmentType: fulfillment,
        tableNumber:
          fulfillment === FulfillmentType.TAKEAWAY
            ? undefined
            : tableContext?.locked
              ? tableContext.label
              : tableNumber,
        tableToken:
          fulfillment === FulfillmentType.DINE_IN && tableContext?.token
            ? tableContext.token
            : undefined,
        idempotencyKey: crypto.randomUUID(),
        ...(fulfillment === FulfillmentType.TAKEAWAY ? { guestName: takeawayDetails.name.trim() || undefined, guestPhone: takeawayDetails.phone.trim() || undefined, pickupNote: takeawayDetails.note.trim() || undefined, pickupTime: takeawayDetails.pickupTime.trim() || undefined } : {}),
        items: state.items.map(cartLineToOrderPayload),
      });
      setCompletedOrder(order);
      setSuccess(true);
      dispatch({ type: 'CLEAR_CART' });
      setCartOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  const requestBill = async () => {
    setError('');
    const requestTable = tableContext?.locked ? undefined : (tableNumber || billTableNumber).trim();
    if (!tableContext?.locked && !requestTable) {
      setServicePromptType('bill');
      setBillTablePromptOpen(true);
      return;
    }
    setBillRequesting(true);
    try {
      const request = await apiClient.createBillRequest({
        branchId: branch.id,
        tableNumber: requestTable,
        tableToken: tableContext?.token,
        idempotencyKey: crypto.randomUUID(),
      });
      if (request.guestAccessToken) {
        const tracking = { id: request.id, token: request.guestAccessToken };
        setActiveServiceRequest(tracking); window.localStorage.setItem(`service-request:${branch.id}`, JSON.stringify(tracking));
      }
      setServiceRequestStatus(request.status);
      setBillRequested(true);
      setBillTablePromptOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to request the bill');
    } finally {
      setBillRequesting(false);
    }
  };

  const requestWaiter = async () => {
    const requestTable = tableContext?.locked ? undefined : (tableNumber || billTableNumber).trim();
    if (!tableContext?.locked && !requestTable) { setServicePromptType('waiter'); setBillTablePromptOpen(true); return; }
    try {
      const request = await apiClient.createWaiterRequest({ branchId: branch.id, tableNumber: requestTable, tableToken: tableContext?.token, idempotencyKey: crypto.randomUUID() });
      if (request.guestAccessToken) {
        const tracking = { id: request.id, token: request.guestAccessToken };
        setActiveServiceRequest(tracking); window.localStorage.setItem(`service-request:${branch.id}`, JSON.stringify(tracking));
      }
      setServiceRequestStatus(request.status);
      setWaiterRequested(true);
      setBillTablePromptOpen(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Unable to call a waiter'); }
  };

  const formatSpiceIcons = (level?: number) => {
    if (level === undefined || level === null || level === 0) return null;
    if (level === 1) return '🌶️';
    if (level === 2) return '🌶️🌶️';
    if (level === 3) return '🌶️🌶️🌶️';
    return '🔥🌶️';
  };

  if (success) {
    return (
      <div className="guest-menu guest-success-wrapper" style={theme?.cssVariables as React.CSSProperties}>
        <div className="guest-success-card" role="status">
          <div className="success-icon-badge">✓</div>
          <h2>{t('order_success')}</h2>
          {completedOrder && (
            <div className="success-details">
              <div className="success-order-id">
                Order #{completedOrder.id.slice(0, 8)}
              </div>
              <div className="success-meta-chip">
                {completedOrder.fulfillmentType === FulfillmentType.TAKEAWAY
                  ? `🛍️ ${t('takeaway')}`
                  : `📍 ${t('table_number')} ${completedOrder.tableNumber}`}
              </div>
              <p className="success-total">
                {t('total')}: <strong>{formatMoney(completedOrder.grandTotal, completedOrder.currency)}</strong>
              </p>
              <p className="success-hint">{t('staff_notified')}</p>
              {completedOrder.guestAccessToken && (
                <a
                  className="btn-track-order"
                  href={`/${branch.slug}/order/${completedOrder.id}?token=${encodeURIComponent(completedOrder.guestAccessToken)}`}
                >
                  🚀 {t('track_order')}
                </a>
              )}
            </div>
          )}
          <button type="button" className="btn-back-menu" onClick={() => setSuccess(false)}>
            {t('back_to_menu')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-menu" style={theme?.cssVariables as React.CSSProperties}>
      {/* ── Top Header / Brand Hero with Cover Banner Support ── */}
      <header className={`guest-header ${branch.coverImageUrl ? 'has-cover' : ''}`}>
        {branch.coverImageUrl && (
          <div className="guest-cover-banner">
            <img src={branch.coverImageUrl} alt="" className="cover-img" />
            <div className="cover-scrim" />
          </div>
        )}
        <div className="guest-header-inner">
          <div className="header-brand-row">
            {branch.logoUrl ? (
              <img src={branch.logoUrl} alt={branch.name} className="guest-logo" />
            ) : (
              <div className="guest-logo-placeholder">🍽️</div>
            )}
            <div className="guest-brand-info">
              <div className="brand-title-row">
                <h1>{branch.name}</h1>
              </div>
              {branch.tagline && <p className="guest-tagline">{branch.tagline}</p>}
              <div className="guest-context-pill">
                {tableContext?.locked ? (
                  <span>📍 {t('locked_table')}: <strong>{tableContext.label}</strong></span>
                ) : fulfillment === FulfillmentType.TAKEAWAY ? (
                  <span>🛍️ <strong>{t('takeaway')}</strong></span>
                ) : tableNumber ? (
                  <span>📍 {t('table_number')}: <strong>{tableNumber}</strong></span>
                ) : (
                  <span>🍽️ <strong>{branch.name}</strong></span>
                )}
              </div>
            </div>
            <button
              type="button"
              className="guest-lang-btn"
              onClick={toggleLanguage}
              aria-label="Switch language"
            >
              <span className="lang-icon">🌐</span>
              <span className="lang-code">{locale === 'AM' ? 'English' : 'አማርኛ'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Restaurant Contact & Info Chips ── */}
      {(branch.description || branch.address || branch.phone || branch.mapUrl) && (
        <section className="guest-profile" aria-label="Restaurant information">
          {branch.description && <p className="branch-desc">{branch.description}</p>}
          <div className="guest-profile-chips">
            {branch.address && (
              <span className="profile-chip">
                📍 {branch.address}
              </span>
            )}
            {branch.phone && (
              <a href={`tel:${branch.phone}`} className="profile-chip link">
                📞 {branch.phone}
              </a>
            )}
            {branch.mapUrl && (
              <a href={branch.mapUrl} target="_blank" rel="noreferrer" className="profile-chip link">
                🗺️ Directions
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── Real-time Alerts & Banners ── */}
      {!isOnline && (
        <div className="guest-banner offline" role="alert">
          📡 Offline — browsing cached offline menu
        </div>
      )}
      {!canOrder && (
        <div className="guest-banner info" role="status">
          ℹ️ {t('menu_only_notice')}
        </div>
      )}
      {error && (
        <div className="guest-banner error" role="alert">
          ⚠️ {error}
        </div>
      )}
      {serviceRequestStatus && (
        <div className="guest-banner status" role="status">
          🔔 {serviceRequestStatus === 'ACKNOWLEDGED'
            ? t('staff_on_the_way')
            : serviceRequestStatus === 'COMPLETED'
              ? t('request_completed')
              : t('staff_notified')}
        </div>
      )}

      {/* ── Sticky Search & Navigation Bar ── */}
      <div className="guest-sticky-nav">
        <div className="guest-search-box">
          <span className="search-icon">🔍</span>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            aria-label="Search dishes"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Category Jump Navigation ── */}
        {menu.sections.length > 1 && !searchQuery && (
          <nav ref={categoryNavRef} className="guest-category-tabs" aria-label="Menu categories">
            {menu.sections.map(sec => (
              <button
                key={sec.id}
                type="button"
                className={`category-tab ${activeCategory === sec.id ? 'active' : ''}`}
                onClick={() => scrollToSection(sec.id)}
              >
                {sectionName(sec)}
              </button>
            ))}
          </nav>
        )}

        {/* ── Dietary & Lifestyle Filter Chips ── */}
        <nav className="guest-nav" aria-label="Dietary filters">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              className={`filter-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.icon && <span className="chip-icon">{f.icon}</span>}
              <span>{f.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Cultural Dining Guide Drawer Toggle ── */}
      <div className="guest-explainer-toggle">
        <button
          type="button"
          className="explainer-btn"
          onClick={() => setShowExplainers(v => !v)}
          aria-expanded={showExplainers}
        >
          <span>💡 {showExplainers ? t('hide_explainers') : t('show_explainers')}</span>
          <span className="toggle-arrow">{showExplainers ? '▲' : '▼'}</span>
        </button>
      </div>
      {showExplainers && (
        <aside className="guest-explainers" aria-label="Dining tips">
          <div className="explainer-card">
            <h4>🍞 Injera (እንጀራ)</h4>
            <p>{t('explainer_injera')}</p>
          </div>
          <div className="explainer-card">
            <h4>🍲 Beyaynetu (በያይነቱ)</h4>
            <p>{t('explainer_beyaynetu')}</p>
          </div>
          <div className="explainer-card">
            <h4>🌱 Fasting / Tsom (የጾም)</h4>
            <p>{t('explainer_fasting')}</p>
          </div>
          <div className="explainer-card">
            <h4>🌶️ Spice Guide</h4>
            <p>{t('explainer_spice')}</p>
          </div>
        </aside>
      )}

      {/* ── Main Menu Section & Food Cards ── */}
      <main className="guest-main">
        {filteredSections.length === 0 || filteredSections.every(s => s.items.length === 0) ? (
          <div className="guest-empty-state">
            <span className="empty-icon">🍽️</span>
            <h3>{t('no_results')}</h3>
            <p>Try adjusting your search or clearing dietary filters.</p>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
            >
              {t('all_dishes')}
            </button>
          </div>
        ) : (
          filteredSections.map(sec => (
            <section key={sec.id} id={`section-${sec.id}`} className="guest-section">
              <div className="section-header">
                <div className="section-title-wrap">
                  <h2>{sectionName(sec)}</h2>
                  {locale !== 'AM' && sec.nameAmharic && (
                    <span className="section-sub-amharic">{sec.nameAmharic}</span>
                  )}
                </div>
                <div className="section-meta-wrap">
                  {sec.timeSlot && sec.timeSlot !== 'ALL_DAY' && (
                    <span className="section-slot-badge">⏰ {sec.timeSlot}</span>
                  )}
                  <span className="section-count">{sec.items.length} {t('items')}</span>
                </div>
              </div>
              <div className="guest-item-grid">
                {sec.items.map(item => {
                  const isAvail = item.isAvailable;
                  const hasModifiers = hasRequiredModifiers(item);
                  const isFasting = (item.dietaryLabels || []).includes(DietaryLabel.FASTING);
                  const isSpicy = (item.spiceLevel ?? 0) >= 2 || (item.dietaryLabels || []).includes(DietaryLabel.SPICY);
                  const isPopular = (item.popularityScore || 0) >= popularityThreshold;
                  const cartQty = getItemCartQuantity(item.id);
                  const simpleCartLine = getSimpleCartLine(item.id);
                  const spiceIcons = formatSpiceIcons(item.spiceLevel);

                  return (
                    <article
                      key={item.id}
                      className={`guest-card ${!isAvail ? 'unavailable' : ''} ${isPopular ? 'popular-card' : ''} ${cartQty > 0 ? 'in-cart' : ''}`}
                      onClick={() => isAvail && openDetail(item)}
                      role="button"
                      tabIndex={isAvail ? 0 : -1}
                      onKeyDown={e => e.key === 'Enter' && isAvail && openDetail(item)}
                    >
                      <div className="guest-card-body">
                        <div className="card-top-row">
                          <div className="card-title-group">
                            <h3 className="card-title">{displayName(item)}</h3>
                            {locale !== 'AM' && item.nameAmharic && (
                              <span className="card-sub-amharic">{item.nameAmharic}</span>
                            )}
                          </div>
                        </div>

                        {displayDescription(item) && (
                          <p className="card-description">{displayDescription(item)}</p>
                        )}

                        <div className="card-tags-row">
                          {isPopular && <span className="tag-pill popular">⭐ {t('popular')}</span>}
                          {isFasting && <span className="tag-pill fasting">🌱 {t('fasting')}</span>}
                          {isSpicy && <span className="tag-pill spicy">{spiceIcons || '🌶️'} {getSpiceLabel(item.spiceLevel ?? 2, locale)}</span>}
                          {item.prepTimeMin && (
                            <span className="tag-pill prep-time">⏱️ {item.prepTimeMin}m</span>
                          )}
                          {item.servingSize && (
                            <span className="tag-pill size">🍽️ {item.servingSize}</span>
                          )}
                        </div>

                        <div className="card-footer">
                          <div className="card-price">
                            {formatMoney(item.price, currency)}
                          </div>

                          {!isAvail ? (
                            <span className="card-badge-soldout">
                              {item.unavailableReason || t('sold_out')}
                            </span>
                          ) : canOrder ? (
                            hasModifiers ? (
                              <div className="btn-customize-wrap">
                                <button
                                  type="button"
                                  className="btn-card-action customize"
                                  onClick={e => {
                                    e.stopPropagation();
                                    openDetail(item);
                                  }}
                                  aria-label={`${t('customize')} ${displayName(item)}`}
                                >
                                  {t('customize')}
                                  {cartQty > 0 && <span className="action-cart-qty">({cartQty})</span>}
                                </button>
                              </div>
                            ) : simpleCartLine && simpleCartLine.quantity > 0 ? (
                              /* ── High-Converting Interactive Stepper On Card ── */
                              <div className="card-inline-stepper" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="inline-stepper-btn minus"
                                  onClick={e => handleQuickDecrement(e, item)}
                                  aria-label="Decrease quantity"
                                >
                                  −
                                </button>
                                <span className="inline-stepper-qty">{simpleCartLine.quantity}</span>
                                <button
                                  type="button"
                                  className="inline-stepper-btn plus"
                                  onClick={e => handleQuickAdd(e, item)}
                                  aria-label="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn-card-action direct-add"
                                onClick={e => handleQuickAdd(e, item)}
                                aria-label={`${t('add')} ${displayName(item)}`}
                              >
                                + {t('add')}
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>

                      {item.photoUrl ? (
                        <div className="guest-card-media">
                          <img src={item.photoUrl} alt={displayName(item)} loading="lazy" />
                          {cartQty > 0 && <span className="media-cart-pill">{cartQty}</span>}
                        </div>
                      ) : (
                        <div className="guest-card-media fallback">
                          <span className="fallback-emoji">{isFasting ? '🥗' : isSpicy ? '🌶️' : '🍲'}</span>
                          {cartQty > 0 && <span className="media-cart-pill">{cartQty}</span>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* ── Guest Quick Service Dock (Call Waiter & Request Bill) ── */}
      {(branch.callWaiterEnabled || branch.requestBillEnabled || branch.whatsappNumber) && (
        <div className="guest-service-dock">
          {branch.callWaiterEnabled && (
            <button
              type="button"
              className="service-dock-btn"
              disabled={waiterRequested}
              onClick={requestWaiter}
            >
              🛎️ {waiterRequested ? t('waiter_notified') : t('call_waiter')}
            </button>
          )}
          {branch.requestBillEnabled && (
            <button
              type="button"
              className="service-dock-btn"
              disabled={billRequesting || billRequested}
              onClick={requestBill}
            >
              🧾 {billRequested ? t('bill_requested') : billRequesting ? '...' : t('request_bill')}
            </button>
          )}
          {branch.whatsappNumber && (
            <a
              href={`https://wa.me/${branch.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="service-dock-btn whatsapp"
            >
              💬 {t('whatsapp')}
            </a>
          )}
        </div>
      )}

      {/* ── Sticky Bottom Cart Bar ── */}
      {canOrder && totalItems > 0 && (
        <div className="guest-cart-bar">
          <button
            type="button"
            className="guest-cart-pill"
            onClick={() => setCartOpen(true)}
            aria-label={`${t('basket')} (${totalItems} ${t('items')})`}
          >
            <div className="cart-pill-left">
              <span className="cart-badge-count">{totalItems}</span>
              <span className="cart-label">{t('basket')}</span>
            </div>
            <div className="cart-pill-right">
              <span className="cart-total-price">
                {formatMoney(estimatedTotals.grandTotal, currency)}
              </span>
              <span className="cart-arrow">→</span>
            </div>
          </button>
        </div>
      )}

      {/* ── Item Detail & Customization Bottom Sheet ── */}
      {detailItem && (
        <div className="guest-sheet-overlay" role="dialog" aria-modal="true">
          <div className="guest-sheet-backdrop" onClick={() => setDetailItem(null)} />
          <div className="guest-sheet">
            <div className="sheet-drag-handle" />
            <div className="sheet-header">
              <div>
                <h3>{displayName(detailItem)}</h3>
                {locale !== 'AM' && detailItem.nameAmharic && (
                  <p className="sheet-sub-title">{detailItem.nameAmharic}</p>
                )}
              </div>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => setDetailItem(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="sheet-body">
              {detailItem.photoUrl && (
                <div className="sheet-hero-image">
                  <img src={detailItem.photoUrl} alt={displayName(detailItem)} />
                </div>
              )}

              {displayDescription(detailItem) && (
                <p className="sheet-description">{displayDescription(detailItem)}</p>
              )}

              <div className="sheet-meta-tags">
                <span className="sheet-price-tag">
                  {formatMoney(detailItem.price, currency)}
                </span>
                {detailItem.servingSize && (
                  <span className="sheet-info-pill">🍽️ {detailItem.servingSize}</span>
                )}
                {detailItem.prepTimeMin && (
                  <span className="sheet-info-pill">⏱️ {detailItem.prepTimeMin} min</span>
                )}
                {detailItem.spiceLevel !== undefined && detailItem.spiceLevel > 0 && (
                  <span className="sheet-info-pill">
                    {formatSpiceIcons(detailItem.spiceLevel)} {getSpiceLabel(detailItem.spiceLevel, locale)}
                  </span>
                )}
                {(detailItem.dietaryLabels || []).map(d => (
                  <span key={d} className="sheet-info-pill">{d}</span>
                ))}
              </div>

              {/* Modifier Groups */}
              {(detailItem.modifierGroups || []).map(g => (
                <fieldset key={g.id} className="sheet-modifier-group">
                  <legend className="modifier-legend">
                    <span className="group-name">
                      {locale === 'AM' && g.nameAmharic ? g.nameAmharic : g.name}
                    </span>
                    {g.required ? (
                      <span className="badge-required">* {t('required_choices')}</span>
                    ) : (
                      <span className="badge-optional">{t('optional_extras')}</span>
                    )}
                  </legend>

                  <div className="modifier-options-list">
                    {g.options.filter(o => o.isAvailable).map(opt => {
                      const isSelected = (modifierSelections[g.id] || []).includes(opt.id);
                      return (
                        <label key={opt.id} className={`modifier-option-row ${isSelected ? 'selected' : ''}`}>
                          <input
                            type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                            name={g.id}
                            checked={isSelected}
                            onChange={() => toggleModifier(g.id, opt.id, g.maxSelect)}
                          />
                          <div className="option-label-wrap">
                            <span className="option-name">
                              {locale === 'AM' && opt.nameAmharic ? opt.nameAmharic : opt.name}
                            </span>
                            {opt.priceDelta > 0 && (
                              <span className="option-delta">
                                +{formatMoney(opt.priceDelta, currency)}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              {/* Special Instructions Note */}
              <div className="sheet-notes-section">
                <label htmlFor="guest-dish-notes" className="notes-label">
                  ✍️ {t('guest_notes')}
                </label>
                <textarea
                  id="guest-dish-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., Less spicy, no onions, extra injera..."
                  maxLength={200}
                />
                <span className="char-count">{notes.length}/200</span>
              </div>
            </div>

            {/* Bottom Actions with Tactile Stepper */}
            <div className="sheet-footer">
              <div className="stepper-wrap">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="stepper-val">{qty}</span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => setQty(Math.min(99, qty + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="btn-sheet-submit"
                onClick={addFromDetail}
              >
                <span>{t('add_to_basket')}</span>
                <span>{formatMoney(currentDetailItemTotal, currency)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Prompt Modal for Guest Service ── */}
      {billTablePromptOpen && (
        <div className="guest-sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="bill-table-title">
          <div className="guest-sheet-backdrop" onClick={() => setBillTablePromptOpen(false)} />
          <div className="guest-sheet table-prompt-sheet">
            <div className="sheet-drag-handle" />
            <h3 id="bill-table-title">{t('which_table')}</h3>
            <p className="table-prompt-sub">Please specify your table so staff can attend to you promptly.</p>
            <div className="table-input-wrap">
              <input
                autoFocus
                placeholder="e.g. Table 4, Patio 2"
                value={billTableNumber}
                onChange={e => setBillTableNumber(e.target.value)}
              />
            </div>
            <div className="sheet-actions-row">
              <button type="button" className="btn-cancel" onClick={() => setBillTablePromptOpen(false)}>
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={billRequesting || !billTableNumber.trim()}
                onClick={servicePromptType === 'bill' ? requestBill : requestWaiter}
              >
                {billRequesting ? '...' : servicePromptType === 'bill' ? t('request_bill') : t('call_waiter')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cart & Checkout Drawer ── */}
      {cartOpen && canOrder && (
        <div className="guest-sheet-overlay" role="dialog" aria-modal="true">
          <div className="guest-sheet-backdrop" onClick={() => setCartOpen(false)} />
          <div className="guest-sheet cart-sheet">
            <div className="sheet-drag-handle" />
            <div className="sheet-header">
              <div className="cart-title-wrap">
                <h3>{t('basket')}</h3>
                <span className="cart-items-pill">{totalItems} {t('items')}</span>
              </div>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => setCartOpen(false)}
                aria-label="Close basket"
              >
                ✕
              </button>
            </div>

            <div className="sheet-body cart-body">
              {state.items.length === 0 ? (
                <div className="cart-empty-view">
                  <span className="cart-empty-icon">🛒</span>
                  <p>{t('empty_cart')}</p>
                </div>
              ) : (
                <ul className="cart-items-list">
                  {state.items.map(line => (
                    <li key={line.lineId} className="cart-line-item">
                      <div className="cart-line-info">
                        <div className="cart-line-name">
                          {locale === 'AM' && line.nameAmharic ? line.nameAmharic : line.name}
                        </div>
                        {line.selectedModifiers && line.selectedModifiers.length > 0 && (
                          <div className="cart-line-mods">
                            {line.selectedModifiers.map(m => m.optionName).join(', ')}
                          </div>
                        )}
                        {line.notes && (
                          <div className="cart-line-notes">📝 {line.notes}</div>
                        )}
                        <div className="cart-line-unit-price">
                          {formatMoney(lineUnitPrice(line), currency)}
                        </div>
                      </div>

                      <div className="cart-line-controls">
                        <div className="cart-stepper">
                          <button
                            type="button"
                            onClick={() => {
                              if (line.quantity <= 1) {
                                dispatch({ type: 'REMOVE_LINE', payload: { lineId: line.lineId } });
                              } else {
                                dispatch({ type: 'UPDATE_QUANTITY', payload: { lineId: line.lineId, quantity: line.quantity - 1 } });
                              }
                            }}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { lineId: line.lineId, quantity: line.quantity + 1 } })}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <div className="cart-line-total">
                          {formatMoney(lineUnitPrice(line) * line.quantity, currency)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Fulfillment Options */}
              {serviceMode === ServiceMode.SINGLE_QR_SELF_ORDER && (
                <div className="fulfillment-box">
                  <span className="fulfillment-label">Dining Option</span>
                  <div className="fulfillment-segmented">
                    <button
                      type="button"
                      className={`seg-btn ${fulfillment === FulfillmentType.DINE_IN ? 'active' : ''}`}
                      onClick={() => setFulfillment(FulfillmentType.DINE_IN)}
                    >
                      🍽️ {t('dine_in')}
                    </button>
                    {branch.enableTakeaway && (
                      <button
                        type="button"
                        className={`seg-btn ${fulfillment === FulfillmentType.TAKEAWAY ? 'active' : ''}`}
                        onClick={() => setFulfillment(FulfillmentType.TAKEAWAY)}
                      >
                        🛍️ {t('takeaway')}
                      </button>
                    )}
                    {branch.enableRoomService && (
                      <button
                        type="button"
                        className={`seg-btn ${fulfillment === FulfillmentType.ROOM_SERVICE ? 'active' : ''}`}
                        onClick={() => setFulfillment(FulfillmentType.ROOM_SERVICE)}
                      >
                        🛎️ {t('room_service')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Table Number or Takeaway Inputs */}
              {!tableContext?.locked && fulfillment === FulfillmentType.DINE_IN && (
                <div className="cart-input-field">
                  <label htmlFor="cart-table-number">📍 {t('table_number')}</label>
                  <input
                    id="cart-table-number"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Enter your table number (e.g. 5)"
                  />
                </div>
              )}

              {tableContext?.locked && (
                <div className="locked-table-banner">
                  📍 Ordering for <strong>{t('locked_table')}: {tableContext.label}</strong>
                </div>
              )}

              {fulfillment === FulfillmentType.TAKEAWAY && (
                <div className="takeaway-fields">
                  <div className="cart-input-field">
                    <label>Name</label>
                    <input
                      required
                      placeholder="Your name"
                      value={takeawayDetails.name}
                      onChange={e => setTakeawayDetails(current => ({ ...current, name: e.target.value }))}
                    />
                  </div>
                  <div className="cart-input-field">
                    <label>Phone Number</label>
                    <input
                      required
                      type="tel"
                      placeholder="09..."
                      value={takeawayDetails.phone}
                      onChange={e => setTakeawayDetails(current => ({ ...current, phone: e.target.value }))}
                    />
                  </div>
                  <div className="cart-input-field">
                    <label>Pickup Note (Optional)</label>
                    <textarea
                      placeholder="Special packaging or instructions"
                      value={takeawayDetails.note}
                      onChange={e => setTakeawayDetails(current => ({ ...current, note: e.target.value }))}
                      maxLength={200}
                    />
                  </div>
                </div>
              )}

              {/* Bill Summary Breakdown */}
              <div className="cart-totals-breakdown">
                <div className="totals-row">
                  <span>{t('subtotal')}</span>
                  <span>{formatMoney(estimatedTotals.subtotal, currency)}</span>
                </div>
                {estimatedTotals.serviceChargeAmount > 0 && (
                  <div className="totals-row">
                    <span>{t('service_charge')} ({branch.serviceChargePercent}%)</span>
                    <span>{formatMoney(estimatedTotals.serviceChargeAmount, currency)}</span>
                  </div>
                )}
                {estimatedTotals.vatAmount > 0 && (
                  <div className="totals-row">
                    <span>{t('vat')} ({branch.vatPercent}%)</span>
                    <span>{formatMoney(estimatedTotals.vatAmount, currency)}</span>
                  </div>
                )}
                <div className="totals-row grand-total">
                  <span>{t('total')}</span>
                  <span>{formatMoney(estimatedTotals.grandTotal, currency)}</span>
                </div>
              </div>
            </div>

            <div className="sheet-footer">
              <button
                type="button"
                className="btn-place-order"
                disabled={submitting || state.items.length === 0}
                onClick={placeOrder}
              >
                {submitting ? (
                  <span className="spinner-wrap">⏳ Processing...</span>
                ) : (
                  <span>🚀 {t('place_order')} · {formatMoney(estimatedTotals.grandTotal, currency)}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Mobile-First Design System ── */}
      <style jsx global>{`
        /* ── Root & Global Phone Layout ── */
        .guest-menu {
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--color-bg, #fcfaf7);
          color: var(--color-text, #1e1b18);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding-bottom: max(6.5rem, calc(5rem + env(safe-area-inset-bottom, 0px)));
          -webkit-font-smoothing: antialiased;
          -webkit-tap-highlight-color: transparent;
          overflow-x: clip;
          width: 100%;
          box-sizing: border-box;
        }

        .guest-menu *,
        .guest-menu *::before,
        .guest-menu *::after {
          box-sizing: border-box;
        }

        /* Prevent auto-zoom on iPhone for inputs */
        .guest-menu input,
        .guest-menu textarea,
        .guest-menu select {
          font-size: 16px !important;
        }

        /* ── Amharic Text Formatting ── */
        .guest-menu :lang(am),
        .card-sub-amharic,
        .section-sub-amharic {
          font-family: 'Nyala', 'Noto Sans Ethiopic', -apple-system, sans-serif;
          line-height: 1.45;
        }

        /* ── Header & Brand Hero with Cover Banner ── */
        .guest-header {
          position: relative;
          background: var(--color-surface, #ffffff);
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.08));
          padding: max(0.85rem, env(safe-area-inset-top, 0.85rem)) 1rem 0.85rem;
          box-shadow: 0 2px 10px var(--color-card-shadow, rgba(0,0,0,0.03));
        }
        .guest-header.has-cover {
          padding-top: 0;
        }
        .guest-cover-banner {
          position: relative;
          width: 100%;
          height: clamp(130px, 32vw, 190px);
          overflow: hidden;
          margin: 0 -1rem;
          width: calc(100% + 2rem);
        }
        .cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cover-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
        }

        .guest-header-inner {
          max-width: 680px;
          margin: 0 auto;
        }
        .guest-header.has-cover .header-brand-row {
          margin-top: -24px;
          position: relative;
          z-index: 2;
        }
        .header-brand-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .guest-logo {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          object-fit: cover;
          border: 2px solid var(--color-surface, #ffffff);
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
          flex-shrink: 0;
          background: var(--color-surface, #ffffff);
        }
        .guest-logo-placeholder {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: var(--color-primary, #b45309);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
          border: 2px solid var(--color-surface, #ffffff);
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
        }
        .guest-brand-info {
          flex: 1;
          min-width: 0;
        }
        .brand-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .guest-header h1 {
          margin: 0;
          font-size: clamp(1.05rem, 4vw, 1.25rem);
          font-weight: 700;
          font-family: var(--font-heading, inherit);
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .guest-tagline {
          margin: 0.1rem 0 0.25rem;
          font-size: 0.8rem;
          color: var(--color-text-muted, #6b7280);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .guest-context-pill {
          display: inline-block;
          padding: 0.18rem 0.5rem;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text, inherit);
          white-space: nowrap;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .guest-lang-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.65rem;
          border: 1px solid var(--color-border, rgba(0,0,0,0.15));
          background: var(--color-bg, #f5f5f4);
          color: var(--color-text, inherit);
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
          min-height: 36px;
          transition: all 0.15s ease;
        }
        .guest-lang-btn:active {
          background: var(--color-primary, #b45309);
          color: #fff;
          border-color: transparent;
        }

        /* ── Profile & Info Chips ── */
        .guest-profile {
          max-width: 680px;
          margin: 0 auto;
          padding: 0.65rem 1rem;
          font-size: 0.82rem;
        }
        .branch-desc {
          margin: 0 0 0.45rem;
          color: var(--color-text-muted, #57534e);
          line-height: 1.35;
        }
        .guest-profile-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .profile-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.55rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--color-text-muted, #6b7280);
          text-decoration: none;
        }
        .profile-chip.link {
          color: var(--color-primary, #b45309);
          font-weight: 600;
        }

        /* ── Alerts & Banners ── */
        .guest-banner {
          max-width: 680px;
          margin: 0.4rem 1rem;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .guest-banner.offline { background: #fef3c7; color: #92400e; }
        .guest-banner.info { background: var(--color-surface, #ffffff); border: 1px solid var(--color-border); }
        .guest-banner.error { background: #fee2e2; color: #991b1b; }
        .guest-banner.status { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }

        /* ── Sticky Search & Navigation Bar ── */
        .guest-sticky-nav {
          position: sticky;
          top: 0;
          z-index: 30;
          background: var(--color-surface, #ffffff);
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.08));
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 0.6rem 1rem 0.45rem;
          box-shadow: 0 4px 12px var(--color-card-shadow, rgba(0,0,0,0.04));
        }
        .guest-search-box {
          max-width: 680px;
          margin: 0 auto;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          font-size: 0.85rem;
          pointer-events: none;
          opacity: 0.6;
        }
        .guest-search-box input {
          width: 100%;
          padding: 0.55rem 2.2rem;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: var(--border-radius-button, 999px);
          color: var(--color-text, inherit);
          outline: none;
          min-height: 40px;
          transition: border-color 0.15s;
        }
        .guest-search-box input:focus {
          border-color: var(--color-primary, #b45309);
        }
        .search-clear-btn {
          position: absolute;
          right: 0.6rem;
          background: transparent;
          border: none;
          color: var(--color-text-muted, #888);
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0.4rem;
          min-width: 32px;
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Category Tabs ── */
        .guest-category-tabs {
          max-width: 680px;
          margin: 0.45rem auto 0;
          display: flex;
          gap: 0.35rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding-bottom: 0.1rem;
        }
        .guest-category-tabs::-webkit-scrollbar { display: none; }
        .category-tab {
          flex-shrink: 0;
          padding: 0.4rem 0.7rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-text-muted, #78716c);
          cursor: pointer;
          white-space: nowrap;
          min-height: 36px;
          transition: all 0.15s;
        }
        .category-tab.active {
          color: var(--color-primary, #b45309);
          border-bottom-color: var(--color-primary, #b45309);
        }

        /* ── Dietary Filter Chips ── */
        .guest-nav {
          max-width: 680px;
          margin: 0.4rem auto 0;
          display: flex;
          gap: 0.35rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .guest-nav::-webkit-scrollbar { display: none; }
        .filter-chip {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.32rem 0.65rem;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: var(--border-radius-button, 999px);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text, inherit);
          cursor: pointer;
          white-space: nowrap;
          min-height: 32px;
          transition: all 0.15s;
        }
        .filter-chip.active {
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border-color: transparent;
        }

        /* ── Explainer Guide Drawer ── */
        .guest-explainer-toggle {
          max-width: 680px;
          margin: 0.45rem auto 0;
          padding: 0 1rem;
        }
        .explainer-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.8rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--color-primary, #b45309);
          cursor: pointer;
          min-height: 38px;
        }
        .toggle-arrow { font-size: 0.65rem; opacity: 0.7; }
        .guest-explainers {
          max-width: 680px;
          margin: 0.35rem auto 0;
          padding: 0.5rem 1rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.4rem;
        }
        @media (min-width: 520px) {
          .guest-explainers { grid-template-columns: 1fr 1fr; }
        }
        .explainer-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 8px;
          padding: 0.6rem 0.8rem;
          font-size: 0.78rem;
        }
        .explainer-card h4 {
          margin: 0 0 0.2rem;
          font-size: 0.82rem;
          color: var(--color-primary, #b45309);
        }
        .explainer-card p {
          margin: 0;
          color: var(--color-text-muted, #6b7280);
          line-height: 1.35;
        }

        /* ── Main Menu Section & Food Cards ── */
        .guest-main {
          max-width: 680px;
          margin: 0 auto;
          padding: 0.85rem 1rem;
        }
        .guest-section {
          margin-bottom: 1.85rem;
        }
        .section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin: 0 0 0.7rem;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.08));
          padding-bottom: 0.4rem;
          gap: 0.5rem;
        }
        .section-title-wrap {
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .guest-section h2 {
          font-size: 1.18rem;
          font-weight: 700;
          font-family: var(--font-heading, inherit);
          margin: 0;
          color: var(--color-text, inherit);
        }
        .section-sub-amharic {
          font-size: 0.85rem;
          color: var(--color-text-muted, #78716c);
        }
        .section-meta-wrap {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }
        .section-slot-badge {
          font-size: 0.7rem;
          background: var(--color-bg, #f5f5f4);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-weight: 600;
        }
        .section-count {
          font-size: 0.72rem;
          color: var(--color-text-muted, #888);
          font-weight: 500;
        }

        .guest-item-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* ── World-Class Menu Item Card ── */
        .guest-card {
          display: flex;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: var(--border-radius-card, 1rem);
          box-shadow: 0 2px 8px var(--color-card-shadow, rgba(0,0,0,0.03));
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          position: relative;
        }
        .guest-card:active {
          transform: scale(0.99);
        }
        .guest-card.popular-card {
          border-left: 3.5px solid var(--color-primary, #b45309);
        }
        .guest-card.in-cart {
          border-color: var(--color-primary, #b45309);
          box-shadow: 0 4px 14px var(--color-card-shadow, rgba(0,0,0,0.06));
        }
        .guest-card.unavailable {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .guest-card-body {
          flex: 1;
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
        }
        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.4rem;
        }
        .card-title-group {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .card-title {
          margin: 0;
          font-size: clamp(0.92rem, 3.8vw, 1.02rem);
          font-weight: 700;
          line-height: 1.25;
          color: var(--color-text, inherit);
          word-break: break-word;
        }
        .card-sub-amharic {
          font-size: 0.8rem;
          color: var(--color-text-muted, #78716c);
          margin-top: 0.1rem;
        }
        .card-description {
          margin: 0.3rem 0 0.45rem;
          font-size: 0.8rem;
          color: var(--color-text-muted, #6b7280);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Card Tags */
        .card-tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }
        .tag-pill {
          padding: 0.12rem 0.4rem;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 600;
          background: var(--color-bg, #f5f5f4);
          color: var(--color-text-muted, #6b7280);
          white-space: nowrap;
        }
        .tag-pill.popular { background: #fef3c7; color: #92400e; }
        .tag-pill.fasting { background: #ecfdf5; color: #065f46; }
        .tag-pill.spicy { background: #fee2e2; color: #991b1b; }
        .tag-pill.prep-time { background: #f0f9ff; color: #0369a1; }
        .tag-pill.size { background: #fdf4ff; color: #86198f; }

        /* Card Footer & Action Area */
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          gap: 0.4rem;
        }
        .card-price {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--color-primary, #b45309);
          white-space: nowrap;
        }
        .btn-card-action {
          padding: 0.38rem 0.85rem;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border: none;
          border-radius: var(--border-radius-button, 999px);
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          min-height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .btn-card-action.customize {
          background: var(--color-bg, #f5f5f4);
          color: var(--color-text, inherit);
          border: 1px solid var(--color-border, rgba(0,0,0,0.15));
        }
        .btn-card-action:active {
          transform: scale(0.95);
        }
        .action-cart-qty {
          background: var(--color-primary, #b45309);
          color: #ffffff;
          padding: 0.05rem 0.4rem;
          border-radius: 999px;
          font-size: 0.7rem;
        }

        /* ── Inline Stepper On Item Card ── */
        .card-inline-stepper {
          display: flex;
          align-items: center;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border-radius: var(--border-radius-button, 999px);
          overflow: hidden;
          min-height: 36px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .inline-stepper-btn {
          width: 32px;
          height: 36px;
          border: none;
          background: transparent;
          color: #ffffff;
          font-size: 1.15rem;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .inline-stepper-btn:active {
          background: rgba(0,0,0,0.15);
        }
        .inline-stepper-qty {
          min-width: 20px;
          text-align: center;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0 0.1rem;
        }

        .card-badge-soldout {
          font-size: 0.72rem;
          font-weight: 600;
          color: #991b1b;
          background: #fee2e2;
          padding: 0.2rem 0.45rem;
          border-radius: 4px;
          white-space: nowrap;
        }

        /* Card Media Thumbnail (Adaptive 4:3 Mobile Sizing) */
        .guest-card-media {
          width: clamp(90px, 26vw, 115px);
          min-height: 90px;
          flex-shrink: 0;
          position: relative;
          background: var(--color-bg, #f5f5f4);
          overflow: hidden;
        }
        .guest-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.25s ease;
        }
        .guest-card:hover .guest-card-media img {
          transform: scale(1.05);
        }
        .guest-card-media.fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-bg, #f5f5f4), var(--color-surface, #ffffff));
        }
        .fallback-emoji {
          font-size: 2rem;
          opacity: 0.7;
        }
        .media-cart-pill {
          position: absolute;
          top: 6px;
          right: 6px;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 1.5px solid #ffffff;
        }

        /* ── Narrow Screen Overrides (<360px: iPhone SE, Fold) ── */
        @media (max-width: 360px) {
          .guest-header-inner { gap: 0.5rem; }
          .guest-logo, .guest-logo-placeholder { width: 40px; height: 40px; }
          .guest-card-media { width: 80px; min-height: 80px; }
          .guest-card-body { padding: 0.65rem; }
          .btn-card-action { padding: 0.35rem 0.65rem; font-size: 0.75rem; }
          .inline-stepper-btn { width: 28px; }
        }

        /* ── Tablet & Desktop Scalability (>=640px) ── */
        @media (min-width: 640px) {
          .guest-item-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.85rem;
          }
          .guest-card {
            flex-direction: row;
          }
        }

        /* ── Empty State ── */
        .guest-empty-state {
          text-align: center;
          padding: 2.5rem 1rem;
          background: var(--color-surface, #ffffff);
          border: 1px dashed var(--color-border, rgba(0,0,0,0.15));
          border-radius: 1rem;
        }
        .empty-icon { font-size: 2.2rem; }
        .guest-empty-state h3 { margin: 0.5rem 0 0.25rem; font-size: 1.05rem; }
        .guest-empty-state p { margin: 0 0 1rem; color: var(--color-text-muted, #888); font-size: 0.82rem; }
        .btn-reset-filters {
          padding: 0.45rem 0.95rem;
          background: var(--color-primary, #b45309);
          color: #fff;
          border: none;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }

        /* ── Floating Service Dock ── */
        .guest-service-dock {
          max-width: 680px;
          margin: 1.25rem auto 0;
          padding: 0 1rem;
          display: flex;
          gap: 0.4rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .service-dock-btn {
          padding: 0.45rem 0.75rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.15));
          border-radius: var(--border-radius-button, 999px);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--color-text, inherit);
          cursor: pointer;
          box-shadow: 0 2px 6px var(--color-card-shadow, rgba(0,0,0,0.03));
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          min-height: 38px;
        }
        .service-dock-btn:active {
          border-color: var(--color-primary, #b45309);
          transform: scale(0.97);
        }
        .service-dock-btn.whatsapp {
          color: #15803d;
        }

        /* ── Sticky Bottom Cart Bar ── */
        .guest-cart-bar {
          position: fixed;
          bottom: max(1rem, env(safe-area-inset-bottom, 1rem));
          left: 0;
          right: 0;
          z-index: 40;
          padding: 0 1rem;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .guest-cart-pill {
          pointer-events: auto;
          width: 100%;
          max-width: 480px;
          padding: 0.85rem 1.25rem;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border: none;
          border-radius: var(--border-radius-button, 999px);
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          cursor: pointer;
          min-height: 52px;
          transition: transform 0.15s ease;
        }
        .guest-cart-pill:active {
          transform: scale(0.98);
        }
        .cart-pill-left {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .cart-badge-count {
          background: rgba(255,255,255,0.25);
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.8rem;
        }
        .cart-label {
          font-size: 0.92rem;
        }
        .cart-pill-right {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.95rem;
        }
        .cart-arrow {
          font-size: 1.05rem;
        }

        /* ── Bottom Sheet Modals & Drawers ── */
        .guest-sheet-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .guest-sheet-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease-out;
        }
        .guest-sheet {
          position: relative;
          background: var(--color-surface, #ffffff);
          color: var(--color-text, inherit);
          width: 100%;
          max-width: 520px;
          max-height: 88vh;
          max-height: 88dvh;
          border-radius: 1.25rem 1.25rem 0 0;
          box-shadow: 0 -8px 24px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          animation: slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
          z-index: 10;
          padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0.75rem));
        }
        .sheet-drag-handle {
          width: 36px;
          height: 4px;
          background: var(--color-border, rgba(0,0,0,0.15));
          border-radius: 999px;
          margin: 0.6rem auto 0.3rem;
          flex-shrink: 0;
        }
        .sheet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0.5rem 1.1rem 0.65rem;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,0.08));
          flex-shrink: 0;
        }
        .sheet-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          font-family: var(--font-heading, inherit);
        }
        .sheet-sub-title {
          margin: 0.1rem 0 0;
          font-size: 0.82rem;
          color: var(--color-text-muted, #78716c);
        }
        .sheet-close-btn {
          background: var(--color-bg, #f5f5f4);
          border: none;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted, #666);
          cursor: pointer;
          flex-shrink: 0;
        }
        .sheet-body {
          padding: 0.85rem 1.1rem;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1;
        }
        .sheet-hero-image {
          width: 100%;
          height: 160px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }
        .sheet-hero-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sheet-description {
          margin: 0 0 0.75rem;
          font-size: 0.85rem;
          color: var(--color-text-muted, #57534e);
          line-height: 1.4;
        }
        .sheet-meta-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
          margin-bottom: 0.85rem;
        }
        .sheet-price-tag {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-primary, #b45309);
        }
        .sheet-info-pill {
          padding: 0.18rem 0.5rem;
          background: var(--color-bg, #f5f5f4);
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-text-muted, #6b7280);
        }

        /* Modifier Selection */
        .sheet-modifier-group {
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 10px;
          padding: 0.75rem;
          margin: 0 0 0.75rem;
          background: var(--color-bg, #fcfaf7);
        }
        .modifier-legend {
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0 0.35rem;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .badge-required { font-size: 0.7rem; color: #b45309; font-weight: 600; }
        .badge-optional { font-size: 0.7rem; color: var(--color-text-muted, #888); font-weight: 500; }
        .modifier-options-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-top: 0.45rem;
        }
        .modifier-option-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.5rem 0.6rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.82rem;
          min-height: 40px;
          transition: background 0.1s;
        }
        .modifier-option-row:active,
        .modifier-option-row.selected {
          background: var(--color-surface, #ffffff);
        }
        .option-label-wrap {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.4rem;
        }
        .option-delta {
          font-weight: 600;
          color: var(--color-primary, #b45309);
          font-size: 0.78rem;
        }

        /* Notes Box */
        .sheet-notes-section {
          margin-top: 0.65rem;
          position: relative;
        }
        .notes-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .sheet-notes-section textarea {
          width: 100%;
          padding: 0.55rem;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: 8px;
          color: var(--color-text, inherit);
          height: 64px;
          outline: none;
          resize: none;
        }
        .char-count {
          position: absolute;
          right: 0.5rem;
          bottom: 0.4rem;
          font-size: 0.68rem;
          color: var(--color-text-muted, #999);
        }

        /* Sheet Footer & Tactile Stepper (Touch-Friendly 44px) */
        .sheet-footer {
          padding: 0.75rem 1.1rem;
          border-top: 1px solid var(--color-border, rgba(0,0,0,0.08));
          display: flex;
          gap: 0.75rem;
          align-items: center;
          background: var(--color-surface, #ffffff);
          flex-shrink: 0;
        }
        .stepper-wrap {
          display: flex;
          align-items: center;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: var(--border-radius-button, 999px);
          overflow: hidden;
          min-height: 44px;
        }
        .stepper-btn {
          width: 44px;
          height: 44px;
          border: none;
          background: transparent;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--color-text, inherit);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stepper-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .stepper-val {
          width: 28px;
          text-align: center;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .btn-sheet-submit {
          flex: 1;
          padding: 0.75rem 1.1rem;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border: none;
          border-radius: var(--border-radius-button, 999px);
          font-weight: 700;
          font-size: 0.9rem;
          min-height: 44px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .btn-sheet-submit:active {
          opacity: 0.9;
          transform: scale(0.98);
        }

        /* ── Cart Drawer Content ── */
        .cart-sheet {
          max-height: 90vh;
          max-height: 90dvh;
        }
        .cart-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .cart-items-pill {
          font-size: 0.72rem;
          background: var(--color-bg, #f5f5f4);
          padding: 0.15rem 0.45rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .cart-empty-view {
          text-align: center;
          padding: 2rem 1rem;
        }
        .cart-empty-icon { font-size: 2.2rem; }
        .cart-items-list {
          list-style: none;
          padding: 0;
          margin: 0 0 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .cart-line-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.65rem;
          padding: 0.65rem;
          background: var(--color-bg, #fcfaf7);
          border: 1px solid var(--color-border, rgba(0,0,0,0.06));
          border-radius: 10px;
        }
        .cart-line-info {
          flex: 1;
          min-width: 0;
        }
        .cart-line-name {
          font-weight: 700;
          font-size: 0.88rem;
          word-break: break-word;
        }
        .cart-line-mods {
          font-size: 0.72rem;
          color: var(--color-text-muted, #78716c);
          margin-top: 0.1rem;
        }
        .cart-line-notes {
          font-size: 0.72rem;
          color: #b45309;
          margin-top: 0.1rem;
        }
        .cart-line-unit-price {
          font-size: 0.78rem;
          color: var(--color-text-muted, #666);
          margin-top: 0.1rem;
        }
        .cart-line-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .cart-stepper {
          display: flex;
          align-items: center;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: 999px;
          min-height: 32px;
        }
        .cart-stepper button {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          font-weight: bold;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cart-stepper span {
          width: 22px;
          text-align: center;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .cart-line-total {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--color-primary, #b45309);
        }

        /* Fulfillment Selector */
        .fulfillment-box {
          margin-bottom: 0.75rem;
        }
        .fulfillment-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 0.3rem;
        }
        .fulfillment-segmented {
          display: flex;
          background: var(--color-bg, #f5f5f4);
          padding: 0.2rem;
          border-radius: 10px;
          gap: 0.2rem;
        }
        .seg-btn {
          flex: 1;
          padding: 0.45rem;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          min-height: 38px;
          color: var(--color-text-muted, #666);
          transition: all 0.15s;
        }
        .seg-btn.active {
          background: var(--color-surface, #ffffff);
          color: var(--color-text, #000);
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .cart-input-field {
          margin-bottom: 0.65rem;
        }
        .cart-input-field label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 0.2rem;
        }
        .cart-input-field input,
        .cart-input-field textarea {
          width: 100%;
          padding: 0.55rem 0.7rem;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: 8px;
          color: var(--color-text, inherit);
          outline: none;
        }
        .locked-table-banner {
          padding: 0.55rem 0.75rem;
          background: var(--color-bg, #f5f5f4);
          border-radius: 8px;
          font-size: 0.82rem;
          margin-bottom: 0.75rem;
        }

        /* Order Totals Breakdown */
        .cart-totals-breakdown {
          border-top: 1px solid var(--color-border, rgba(0,0,0,0.08));
          padding-top: 0.65rem;
          margin-top: 0.4rem;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: var(--color-text-muted, #666);
          margin-bottom: 0.3rem;
        }
        .totals-row.grand-total {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text, inherit);
          margin-top: 0.45rem;
          padding-top: 0.35rem;
          border-top: 1px dashed var(--color-border, rgba(0,0,0,0.1));
        }
        .btn-place-order {
          width: 100%;
          padding: 0.85rem;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border: none;
          border-radius: var(--border-radius-button, 999px);
          font-size: 0.98rem;
          font-weight: 700;
          min-height: 48px;
          cursor: pointer;
        }
        .btn-place-order:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Service Prompt Sheet ── */
        .table-prompt-sheet {
          padding: 1.1rem;
        }
        .table-prompt-sheet h3 { margin: 0 0 0.25rem; font-size: 1.05rem; }
        .table-prompt-sub { margin: 0 0 0.75rem; font-size: 0.8rem; color: var(--color-text-muted, #777); }
        .table-input-wrap input {
          width: 100%;
          padding: 0.65rem 0.8rem;
          background: var(--color-bg, #f5f5f4);
          border: 1px solid var(--color-border, rgba(0,0,0,0.1));
          border-radius: 8px;
          outline: none;
        }
        .sheet-actions-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.85rem;
        }
        .btn-cancel {
          flex: 1;
          padding: 0.65rem;
          background: var(--color-bg, #f5f5f4);
          border: none;
          border-radius: 8px;
          font-weight: 600;
          min-height: 42px;
          cursor: pointer;
        }
        .btn-primary {
          flex: 1;
          padding: 0.65rem;
          background: var(--color-primary, #b45309);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          min-height: 42px;
          cursor: pointer;
        }

        /* ── Success Screen ── */
        .guest-success-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
        }
        .guest-success-card {
          width: 100%;
          max-width: 440px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 1.5rem;
          padding: 1.75rem 1.25rem;
          text-align: center;
          box-shadow: 0 8px 30px var(--color-card-shadow, rgba(0,0,0,0.06));
        }
        .success-icon-badge {
          width: 56px;
          height: 56px;
          margin: 0 auto 0.85rem;
          background: #ecfdf5;
          color: #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          font-weight: bold;
        }
        .guest-success-card h2 {
          margin: 0 0 0.85rem;
          font-size: 1.3rem;
          font-family: var(--font-heading, inherit);
        }
        .success-details {
          background: var(--color-bg, #fcfaf7);
          border-radius: 12px;
          padding: 0.95rem;
          margin-bottom: 1.15rem;
        }
        .success-order-id {
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 0.3rem;
        }
        .success-meta-chip {
          display: inline-block;
          padding: 0.18rem 0.55rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, rgba(0,0,0,0.08));
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          margin-bottom: 0.45rem;
        }
        .success-total {
          margin: 0.45rem 0 0.2rem;
          font-size: 0.92rem;
        }
        .success-hint {
          margin: 0.2rem 0 0.75rem;
          font-size: 0.8rem;
          color: var(--color-text-muted, #777);
        }
        .btn-track-order {
          display: inline-block;
          padding: 0.65rem 1.25rem;
          background: var(--color-primary, #b45309);
          color: #ffffff;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.85rem;
          min-height: 42px;
          line-height: 1.8;
        }
        .btn-back-menu {
          background: transparent;
          border: 1px solid var(--color-border, rgba(0,0,0,0.15));
          padding: 0.55rem 1.15rem;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-text, inherit);
          cursor: pointer;
          min-height: 40px;
        }

        /* ── Keyframe Animations ── */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
