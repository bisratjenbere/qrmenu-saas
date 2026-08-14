'use client';

import { useState, useMemo } from 'react';
import {
  MenuResponse,
  MenuItemResponse,
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
  const { state, dispatch, totalItems, subtotal } = useCart();
  const { locale, toggleLanguage, t } = useCustomerLanguage();
  const { isOnline } = useNetworkStatus();

  const branch = menu.branch;
  const serviceMode = branch.serviceMode || ServiceMode.SINGLE_QR_SELF_ORDER;
  const canOrder = serviceMode !== ServiceMode.MENU_ONLY;
  const currency = branch.currency || 'ETB';

  const [filter, setFilter] = useState<GuestFilter>('all');
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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showExplainers, setShowExplainers] = useState(false);

  const theme = getThemeById((branch as { themeId?: string }).themeId || DEFAULT_THEME_ID);

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

  const filteredSections = useMemo(() => {
    return menu.sections
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => {
          if (!item.isAvailable && filter !== 'all') return false;
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
      .filter(sec => {
        if (sec.timeSlot === 'ALL_DAY') return sec.items.length > 0 || filter === 'all';
        return sec.items.length > 0;
      });
  }, [menu, filter, popularityThreshold]);

  const estimatedTotals = calculateOrderTotals(
    state.items.map(i => lineUnitPrice(i) * i.quantity),
    branch.serviceChargePercent || 0,
    branch.vatPercent || 0,
    currency
  );

  const filters: { key: GuestFilter; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'popular', label: t('popular') },
    { key: 'fasting', label: t('fasting') },
    { key: 'mild', label: t('mild') },
    { key: 'spicy', label: t('spicy') },
    { key: 'vegan', label: t('vegan') },
    { key: 'gluten_free', label: t('gluten_free') },
  ];

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

  const addFromDetail = () => {
    if (!detailItem) return;
    const groups = detailItem.modifierGroups || [];
    for (const g of groups) {
      const sel = modifierSelections[g.id] || [];
      if (g.required && sel.length < Math.max(g.minSelect, 1)) {
        setError(`${g.name} is required`);
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
      await apiClient.createOrder({
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
        items: state.items.map(cartLineToOrderPayload),
      });
      setSuccess(true);
      dispatch({ type: 'CLEAR_CART' });
      setCartOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="guest-success" role="status">
        <h2>{t('order_success')}</h2>
        <button type="button" onClick={() => setSuccess(false)}>{t('all')}</button>
      </div>
    );
  }

  return (
    <div className="guest-menu" style={theme?.cssVariables as React.CSSProperties}>
      <header className="guest-header">
        <div className="guest-header-inner">
          {branch.logoUrl && (
            <img src={branch.logoUrl} alt="" className="guest-logo" />
          )}
          <div>
            <h1>{branch.name}</h1>
            {branch.tagline && <p className="guest-tagline">{branch.tagline}</p>}
            <p className="guest-context">
              {tableContext?.locked
                ? `${t('locked_table')}: ${tableContext.label}`
                : fulfillment === FulfillmentType.TAKEAWAY
                  ? t('takeaway')
                  : tableNumber
                    ? `${t('table_number')}: ${tableNumber}`
                    : branch.name}
            </p>
          </div>
          <button type="button" className="guest-lang-btn" onClick={toggleLanguage} aria-label="Switch language">
            {locale === 'AM' ? 'EN' : 'አማ'}
          </button>
        </div>
      </header>

      {!isOnline && (
        <div className="guest-banner offline" role="alert">Offline — browsing cached menu</div>
      )}
      {!canOrder && (
        <div className="guest-banner" role="status">{t('menu_only_notice')}</div>
      )}
      {error && <div className="guest-banner error" role="alert">{error}</div>}

      <nav className="guest-nav" aria-label="Menu filters">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? 'active' : ''}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="guest-explainer-toggle">
        <button type="button" onClick={() => setShowExplainers(v => !v)}>
          {showExplainers ? t('hide_explainers') : t('show_explainers')}
        </button>
      </div>
      {showExplainers && (
        <aside className="guest-explainers" aria-label="Dining tips">
          <p>{t('explainer_injera')}</p>
          <p>{t('explainer_beyaynetu')}</p>
          <p>{t('explainer_fasting')}</p>
          <p>{t('explainer_spice')}</p>
        </aside>
      )}

      <main className="guest-main">
        {filteredSections.every(s => s.items.length === 0) ? (
          <p className="guest-empty">{t('no_results')}</p>
        ) : (
          filteredSections.map(sec => (
            <section key={sec.id} className="guest-section">
              <h2>
                {locale === 'AM' && sec.nameAmharic ? sec.nameAmharic : sec.name}
              </h2>
              <ul className="guest-item-list">
                {sec.items.map(item => (
                  <li key={item.id} className={!item.isAvailable ? 'unavailable' : ''}>
                    <button
                      type="button"
                      className="guest-item-btn"
                      onClick={() => item.isAvailable && openDetail(item)}
                      disabled={!item.isAvailable}
                      aria-label={displayName(item)}
                    >
                      <span className="guest-item-name">{displayName(item)}</span>
                      <span className="guest-item-price">{formatMoney(item.price, currency)}</span>
                      {!item.isAvailable && (
                        <span className="guest-badge">
                          {item.unavailableReason || t('unavailable')}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      {canOrder && (
        <div className="guest-cart-bar">
          <button
            type="button"
            className="guest-cart-toggle"
            onClick={() => setCartOpen(true)}
            aria-label={t('basket')}
          >
            {t('basket')} ({totalItems}) · {formatMoney(estimatedTotals.grandTotal, currency)}
          </button>
        </div>
      )}

      {branch.callWaiterEnabled && (
        <div className="guest-actions">
          <button type="button">{t('call_waiter')}</button>
          {branch.requestBillEnabled && <button type="button">{t('request_bill')}</button>}
          {branch.whatsappNumber && (
            <a href={`https://wa.me/${branch.whatsappNumber}`}>{t('whatsapp')}</a>
          )}
        </div>
      )}

      {detailItem && (
        <div className="guest-modal-overlay" role="dialog" aria-modal="true">
          <div className="guest-modal">
            <h3>{displayName(detailItem)}</h3>
            {displayDescription(detailItem) && <p>{displayDescription(detailItem)}</p>}
            <p>{formatMoney(detailItem.price, currency)}</p>
            {detailItem.servingSize && (
              <p><strong>{t('serving_size')}:</strong> {detailItem.servingSize}</p>
            )}
            {detailItem.spiceLevel !== undefined && getSpiceLabel(detailItem.spiceLevel, locale) && (
              <p>{getSpiceLabel(detailItem.spiceLevel, locale)}</p>
            )}
            {(detailItem.dietaryLabels || []).length > 0 && (
              <p>{(detailItem.dietaryLabels || []).join(', ')}</p>
            )}
            {(detailItem.allergens || []).length > 0 && (
              <p><strong>{t('allergens')}:</strong> {detailItem.allergens!.join(', ')}</p>
            )}

            {(detailItem.modifierGroups || []).map(g => (
              <fieldset key={g.id}>
                <legend>{locale === 'AM' && g.nameAmharic ? g.nameAmharic : g.name}</legend>
                {g.options.filter(o => o.isAvailable).map(opt => (
                  <label key={opt.id}>
                    <input
                      type={g.maxSelect === 1 ? 'radio' : 'checkbox'}
                      name={g.id}
                      checked={(modifierSelections[g.id] || []).includes(opt.id)}
                      onChange={() => toggleModifier(g.id, opt.id, g.maxSelect)}
                    />
                    {locale === 'AM' && opt.nameAmharic ? opt.nameAmharic : opt.name}
                    {opt.priceDelta > 0 && ` (+${formatMoney(opt.priceDelta, currency)})`}
                  </label>
                ))}
              </fieldset>
            ))}

            <label>
              {t('guest_notes')}
              <textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} />
            </label>

            <div className="guest-modal-actions">
              <label>
                Qty
                <input type="number" min={1} max={99} value={qty} onChange={e => setQty(+e.target.value)} />
              </label>
              <button type="button" onClick={() => setDetailItem(null)}>{t('all')}</button>
              <button type="button" className="primary" onClick={addFromDetail}>{t('add_to_basket')}</button>
            </div>
          </div>
        </div>
      )}

      {cartOpen && canOrder && (
        <div className="guest-modal-overlay" role="dialog" aria-modal="true">
          <div className="guest-modal guest-cart-modal">
            <h3>{t('basket')}</h3>
            <ul>
              {state.items.map(line => (
                <li key={line.lineId}>
                  <span>
                    {locale === 'AM' && line.nameAmharic ? line.nameAmharic : line.name} × {line.quantity}
                  </span>
                  <span>{formatMoney(lineUnitPrice(line) * line.quantity, currency)}</span>
                  <button type="button" onClick={() => dispatch({ type: 'REMOVE_LINE', payload: { lineId: line.lineId } })}>
                    ×
                  </button>
                </li>
              ))}
            </ul>

            {serviceMode === ServiceMode.SINGLE_QR_SELF_ORDER && (
              <fieldset>
                <legend>Fulfillment</legend>
                <label>
                  <input type="radio" checked={fulfillment === FulfillmentType.DINE_IN} onChange={() => setFulfillment(FulfillmentType.DINE_IN)} />
                  {t('dine_in')}
                </label>
                {branch.enableTakeaway && (
                  <label>
                    <input type="radio" checked={fulfillment === FulfillmentType.TAKEAWAY} onChange={() => setFulfillment(FulfillmentType.TAKEAWAY)} />
                    {t('takeaway')}
                  </label>
                )}
                {branch.enableRoomService && (
                  <label>
                    <input type="radio" checked={fulfillment === FulfillmentType.ROOM_SERVICE} onChange={() => setFulfillment(FulfillmentType.ROOM_SERVICE)} />
                    {t('room_service')}
                  </label>
                )}
              </fieldset>
            )}

            {tableContext?.locked && branch.enableTakeaway && (
              <button
                type="button"
                onClick={() =>
                  setFulfillment(
                    fulfillment === FulfillmentType.TAKEAWAY
                      ? FulfillmentType.DINE_IN
                      : FulfillmentType.TAKEAWAY
                  )
                }
              >
                {t('switch_takeaway')}
              </button>
            )}

            {!tableContext?.locked && fulfillment === FulfillmentType.DINE_IN && (
              <label>
                {t('table_number')}
                <input value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
              </label>
            )}

            <div className="guest-totals">
              <p>{t('subtotal')}: {formatMoney(estimatedTotals.subtotal, currency)}</p>
              {estimatedTotals.serviceChargeAmount > 0 && (
                <p>{t('service_charge')}: {formatMoney(estimatedTotals.serviceChargeAmount, currency)}</p>
              )}
              {estimatedTotals.vatAmount > 0 && (
                <p>{t('vat')}: {formatMoney(estimatedTotals.vatAmount, currency)}</p>
              )}
              <p><strong>{t('total')}: {formatMoney(estimatedTotals.grandTotal, currency)}</strong></p>
            </div>

            <button type="button" className="primary" disabled={submitting || state.items.length === 0} onClick={placeOrder}>
              {submitting ? '...' : t('place_order')}
            </button>
            <button type="button" onClick={() => setCartOpen(false)}>Close</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .guest-menu { min-height: 100vh; background: var(--color-bg, #fdfbf7); color: var(--color-text, #1c1917); padding-bottom: 5rem; font-family: system-ui, sans-serif; }
        .guest-header { background: var(--color-primary, #b45309); color: #fff; padding: 1rem; }
        .guest-header-inner { display: flex; gap: 0.75rem; align-items: flex-start; }
        .guest-logo { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
        .guest-header h1 { margin: 0; font-size: 1.25rem; }
        .guest-tagline, .guest-context { margin: 0.25rem 0 0; font-size: 0.85rem; opacity: 0.9; }
        .guest-lang-btn { margin-left: auto; padding: 0.35rem 0.6rem; border: 1px solid rgba(255,255,255,0.5); background: transparent; color: #fff; border-radius: 6px; cursor: pointer; }
        .guest-nav { position: sticky; top: 0; z-index: 20; display: flex; gap: 0.35rem; padding: 0.5rem; background: #fff; border-bottom: 1px solid #e7e5e4; overflow-x: auto; }
        .guest-nav button { flex-shrink: 0; padding: 0.4rem 0.75rem; border: 1px solid #d6d3d1; background: #fff; border-radius: 999px; font-size: 0.8rem; cursor: pointer; }
        .guest-nav button.active { background: var(--color-primary, #b45309); color: #fff; border-color: transparent; }
        .guest-main { padding: 1rem; }
        .guest-section h2 { font-size: 1.1rem; margin: 1rem 0 0.5rem; }
        .guest-item-list { list-style: none; padding: 0; margin: 0; }
        .guest-item-btn { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid #e7e5e4; border-radius: 8px; margin-bottom: 0.5rem; background: #fff; text-align: left; cursor: pointer; }
        .guest-item-list li.unavailable .guest-item-btn { opacity: 0.55; cursor: not-allowed; }
        .guest-badge { font-size: 0.75rem; color: #b45309; }
        .guest-cart-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 0.75rem; background: #fff; border-top: 1px solid #e7e5e4; z-index: 30; }
        .guest-cart-toggle { width: 100%; padding: 0.85rem; background: var(--color-primary, #b45309); color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .guest-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 40; display: flex; align-items: flex-end; justify-content: center; }
        .guest-modal { background: #fff; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; padding: 1rem; border-radius: 12px 12px 0 0; }
        .guest-modal fieldset { border: 1px solid #e7e5e4; margin: 0.5rem 0; padding: 0.5rem; border-radius: 8px; }
        .guest-modal label { display: block; margin: 0.35rem 0; }
        .guest-modal-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
        .guest-modal .primary { background: var(--color-primary, #b45309); color: #fff; border: none; padding: 0.6rem 1rem; border-radius: 8px; }
        .guest-banner { padding: 0.5rem 1rem; background: #fef3c7; font-size: 0.85rem; }
        .guest-banner.error { background: #fee2e2; }
        .guest-empty { text-align: center; padding: 2rem; color: #78716c; }
        .guest-explainers { padding: 0.75rem 1rem; background: #f5f5f4; font-size: 0.85rem; }
        .guest-success { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; text-align: center; }
      `}</style>
    </div>
  );
}
