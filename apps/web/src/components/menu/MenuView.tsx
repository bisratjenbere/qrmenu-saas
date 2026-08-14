'use client';
import { useState, useEffect } from 'react';
import { MenuResponse, getThemeById, DEFAULT_THEME_ID } from '@qrmenu/shared';
import { useCart } from '@/hooks/use-cart';
import { apiClient } from '@/lib/api-client';

import { useNetworkStatus } from '@/hooks/use-network-status';

export default function MenuView({ menu, initialTable }: { menu: MenuResponse, initialTable?: string }) {
  const { state, dispatch, totalItems, totalPrice } = useCart();
  const { isOnline } = useNetworkStatus();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [table, setTable] = useState(initialTable || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [upsellSourceItem, setUpsellSourceItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [selectedItemNotes, setSelectedItemNotes] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState('All');
  const [errorBanner, setErrorBanner] = useState('');
  const [pulse, setPulse] = useState(false);
  const [comboItem, setComboItem] = useState<any>(null);
  const [selectedComboSubItems, setSelectedComboSubItems] = useState<any[]>([]);
  const [timeSlotFilter, setTimeSlotFilter] = useState('All Day');

  const themeId = (menu.branch as any).themeId || DEFAULT_THEME_ID;
  const currentTheme = getThemeById(themeId) || getThemeById(DEFAULT_THEME_ID);

  const currency = menu.branch.currency || 'ETB';
  const formatPrice = (price: number) => `${currency} ${price.toFixed(2)}`;

  const getSpiceLabel = (level: number) => {
    switch(level) {
      case 0: return 'Alicha (Mild)';
      case 1: return 'Qey (Medium)';
      case 2: return '🌶️ Berbere (Spicy)';
      case 3: return '🔥 Mitmita (Very Hot)';
      default: return null;
    }
  };

  useEffect(() => {
    if (totalItems > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(t);
    }
  }, [totalItems]);

  const visibleSections = menu.sections.filter(sec => {
    if (timeSlotFilter === 'All Day') return true;
    const t = (sec.timeSlot || '').toLowerCase();
    if (timeSlotFilter === '☀️ Breakfast (ቁርስ)') return t.includes('breakfast');
    if (timeSlotFilter === '🍲 Lunch & Dinner') return t.includes('lunch') || t.includes('dinner');
    return true;
  });

  // Compute bestseller threshold (top 20% of ordered items, minimum 3 orders to qualify)
  const allItems = menu.sections.flatMap(s => s.items);
  const popularityScores = allItems.map(i => i.popularityScore || 0).sort((a, b) => b - a);
  const thresholdIndex = Math.floor(popularityScores.length * 0.2);
  const popularityThreshold = Math.max(popularityScores[thresholdIndex] || 0, 3);

  const handleAddItem = (item: any) => {
    dispatch({ type: 'ADD_ITEM', payload: { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 } });
    
    if (item.upsellIds && item.upsellIds.length > 0) {
      const targets = allItems.filter(
        i => item.upsellIds.includes(i.id) && i.isAvailable && getCartItemQuantity(i.id) === 0
      );
      if (targets.length > 0) {
        setUpsellSourceItem(item);
      }
    }
  };

  // Auto-scrolling section observer
  useEffect(() => {
    const handleScroll = () => {
      const sections = visibleSections.map(s => document.getElementById(`sec-${s.id}`));
      const scrollPosition = window.scrollY + 200;

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(visibleSections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleSections]);

  const placeOrder = async () => {
    setErrorBanner('');
    if (!table) {
      setErrorBanner('Please enter a table number');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.createOrder({
        branchId: menu.branch.id,
        tableNumber: table,
        idempotencyKey: crypto.randomUUID(),
        items: state.items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, notes: i.notes || null }))
      });
      setOrderSuccess(true);
      dispatch({ type: 'CLEAR_CART' });
      setIsCartOpen(false);
    } catch (e: any) {
      setErrorBanner(e.message || 'Error placing order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    return state.items.find(i => i.menuItemId === itemId)?.quantity || 0;
  };

  if (orderSuccess) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          animation: 'bounce 2s infinite'
        }}>
          <span style={{ color: 'var(--color-success)', fontSize: '2.5rem', fontWeight: 'bold' }}>✓</span>
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-text)', margin: '0 0 0.5rem 0' }}>Order Received!</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '320px', margin: '0 0 2rem 0' }}>Your order has been sent to the kitchen. Relax and enjoy your time!</p>
        <button className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} onClick={() => setOrderSuccess(false)}>
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-bg)',
      color: 'var(--color-text)',
      minHeight: '100vh',
      paddingBottom: '120px',
      position: 'relative',
      ...(currentTheme?.cssVariables as any)
    }}>
      <style>{`
        @keyframes cartPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      
      {/* ─── Luxury Cover Header ────────────────────────── */}
      <div style={{ position: 'relative', height: '280px', width: '100%', overflow: 'hidden' }}>
        <img
          src={menu.branch.coverImageUrl || '/images/signature.png'}
          alt="Luxury dining presentation"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(29,25,23,0.95) 100%)'
        }} />
        <div style={{ position: 'absolute', bottom: '2rem', left: '1.5rem', right: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{
              background: 'var(--color-primary)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Table {table || 'Takeaway'}
            </span>
            <span style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              Live Menu
            </span>
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            color: 'white',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.1
          }}>{menu.branch.name}</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            {menu.branch.tagline || 'Indulge in our carefully curated seasonal recipes'}
          </p>
        </div>
      </div>

      {/* ─── Glassmorphic Section Tab Navigation ────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'rgba(253, 251, 247, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {visibleSections.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`sec-${sec.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  flexShrink: 0,
                  textDecoration: 'none',
                  color: isActive ? 'white' : 'var(--color-text)',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '9999px',
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                  border: '1px solid rgba(229, 231, 235, 0.7)',
                  boxShadow: isActive ? '0 4px 12px rgba(245, 158, 11, 0.3)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
              >
                {sec.name} {sec.nameAmharic && <span style={{ marginLeft: '0.25rem', fontFamily: 'serif', fontSize: '0.95em', opacity: isActive ? 0.9 : 0.7 }}>{sec.nameAmharic}</span>}
              </button>
            );
          })}
        </div>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0 1.25rem 0.85rem 1.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {['All Day', '☀️ Breakfast (ቁርስ)', '🍲 Lunch & Dinner'].map(slot => (
            <button
              key={slot}
              onClick={() => setTimeSlotFilter(slot)}
              style={{
                flexShrink: 0,
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: timeSlotFilter === slot ? 'var(--color-text)' : 'transparent',
                color: timeSlotFilter === slot ? 'white' : 'var(--color-text)',
                border: `1px solid ${timeSlotFilter === slot ? 'var(--color-text)' : 'rgba(229, 231, 235, 0.8)'}`,
                cursor: 'pointer'
              }}
            >
              {slot}
            </button>
          ))}
        </div>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0 1.25rem 0.85rem 1.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {['All', '🕌 Fasting', '🌱 Vegan', '🌾 Gluten-Free', '🌶️ Spicy'].map(filter => (
            <button
              key={filter}
              onClick={() => setDietaryFilter(filter)}
              style={{
                flexShrink: 0,
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                background: dietaryFilter === filter ? 'var(--color-text)' : 'transparent',
                color: dietaryFilter === filter ? 'white' : 'var(--color-text)',
                border: `1px solid ${dietaryFilter === filter ? 'var(--color-text)' : 'rgba(229, 231, 235, 0.8)'}`,
                cursor: 'pointer'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </nav>

      {!isOnline && (
        <div style={{
          background: '#fef3c7',
          color: '#b45309',
          padding: '0.75rem 1.25rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          borderBottom: '1px solid #f59e0b',
          position: 'sticky',
          top: '50px',
          zIndex: 29,
          animation: 'fadeIn 0.3s ease'
        }}>
          <span>📶</span> Browsing offline. Cart updates are saved; order placement requires Wi-Fi.
        </div>
      )}

      {/* ─── Sections & Gourmet Items ───────────────────── */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem' }}>
        {visibleSections.map(sec => {
          const filteredItems = sec.items.filter(item => {
            if (dietaryFilter === 'All') return true;
            if (dietaryFilter === '🕌 Fasting') return item.dietaryLabels?.includes('FASTING');
            if (dietaryFilter === '🌱 Vegan') return item.dietaryLabels?.includes('VEGAN');
            if (dietaryFilter === '🌾 Gluten-Free') return item.dietaryLabels?.includes('GF');
            if (dietaryFilter === '🌶️ Spicy') return (item.spiceLevel && item.spiceLevel > 0) || item.dietaryLabels?.includes('SPICY');
            return true;
          });
          
          if (filteredItems.length === 0) return null;

          return (
          <section id={`sec-${sec.id}`} key={sec.id} style={{ paddingTop: '2.5rem' }}>
            <h2 style={{
              fontSize: '1.4rem',
              fontWeight: '800',
              color: 'var(--color-text)',
              marginBottom: '1.25rem',
              borderLeft: '4px solid var(--color-primary)',
              paddingLeft: '0.75rem',
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>{sec.name}</span>
              {sec.nameAmharic && <span style={{ fontFamily: 'serif', color: 'var(--color-text-muted)', fontSize: '0.85em' }}>{sec.nameAmharic}</span>}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredItems.map(item => {
                const quantityInCart = getCartItemQuantity(item.id);
                return (
                  <div
                    key={item.id}
                    className="card"
                    onClick={() => {
                      setSelectedItem(item);
                      setSelectedItemQuantity(1);
                      setSelectedItemNotes('');
                    }}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      background: 'var(--color-surface)',
                      borderRadius: '1.25rem',
                      padding: '1.15rem',
                      opacity: item.isAvailable ? 1 : 0.6,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                      border: '1px solid rgba(229, 231, 235, 0.4)',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Item Details */}
                    <div style={{ flex: 1 }}>
                       <h3 style={{
                        margin: '0 0 0.35rem 0',
                        fontSize: '1.1rem',
                        fontWeight: '750',
                        color: 'var(--color-text)',
                        letterSpacing: '-0.01em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <span>{item.name}</span>
                        {item.nameAmharic && (
                          <span style={{ fontFamily: 'serif', color: 'var(--color-text-muted)', fontSize: '1rem' }}>{item.nameAmharic}</span>
                        )}
                        {item.popularityScore >= popularityThreshold && (
                          <span style={{
                            background: '#fef3c7',
                            color: '#d97706',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap'
                          }}>
                            🔥 Bestseller
                          </span>
                        )}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {item.spiceLevel !== undefined && item.spiceLevel !== null && getSpiceLabel(item.spiceLevel) && (
                          <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600' }}>
                            {getSpiceLabel(item.spiceLevel)}
                          </span>
                        )}
                        {item.servingSize && (
                          <span style={{ fontSize: '0.7rem', color: '#6b21a8', background: '#f3e8ff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600' }}>
                            👥 {item.servingSize}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-text-muted)',
                          lineHeight: '1.4',
                          margin: '0 0 0.85rem 0'
                        }}>{item.description}</p>
                      )}
                      <p style={{
                        fontWeight: '800',
                        fontSize: '1.15rem',
                        color: 'var(--color-primary)',
                        margin: 0
                      }}>{formatPrice(item.price)}</p>
                    </div>

                    {/* Dish Photo & Cart Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }} onClick={e => e.stopPropagation()}>
                      <div style={{
                        position: 'relative',
                        width: '100px',
                        height: '100px',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                      }}>
                        <img
                          src={item.photoUrl || '/images/signature.png'}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {!item.isAvailable && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.65)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            padding: '4px'
                          }}>
                            Sold Out
                          </div>
                        )}
                      </div>

                      {item.isAvailable && (
                        item.isCombo ? (
                          <button
                            className="btn btn-primary"
                            style={{
                              padding: '0.45rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              boxShadow: '0 4px 10px rgba(245,158,11,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setComboItem(item);
                              setSelectedComboSubItems([]);
                            }}
                          >
                            🍱 Build Platter
                          </button>
                        ) : quantityInCart > 0 ? (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            background: 'var(--color-primary)',
                            borderRadius: '9999px',
                            padding: '2px',
                            boxShadow: '0 4px 10px rgba(245,158,11,0.2)'
                          }}>
                            <button
                              className="btn"
                              style={{
                                color: 'white',
                                padding: '4px 8px',
                                minWidth: '24px',
                                background: 'transparent'
                              }}
                              onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId: item.id, quantity: quantityInCart - 1 } })}
                            >
                              -
                            </button>
                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.85rem', padding: '0 4px' }}>
                              {quantityInCart}
                            </span>
                            <button
                              className="btn"
                              style={{
                                color: 'white',
                                padding: '4px 8px',
                                minWidth: '24px',
                                background: 'transparent'
                              }}
                              onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId: item.id, quantity: quantityInCart + 1 } })}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{
                              padding: '0.45rem 1.25rem',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              boxShadow: '0 4px 10px rgba(245,158,11,0.15)'
                            }}
                            onClick={() => handleAddItem(item)}
                          >
                            + Add
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )})}
      </div>

      {/* ─── Floating View Cart Action Trigger ──────────── */}
      {totalItems > 0 && !isCartOpen && (
        <div style={{
          position: 'fixed',
          bottom: '2.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '440px',
          zIndex: 40
        }}>
          <button
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '1.15rem',
              fontSize: '1rem',
              fontWeight: '800',
              borderRadius: '9999px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(245, 158, 11, 0.4)',
              animation: pulse ? 'cartPulse 0.5s ease' : 'none'
            }}
            onClick={() => setIsCartOpen(true)}
          >
            <span>View your order</span>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.85rem'
            }}>
              {totalItems} items • {formatPrice(totalPrice)}
            </span>
          </button>
        </div>
      )}

      {/* ─── Glassmorphic Cart Drawer Panel ─────────────── */}
      {isCartOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              zIndex: 45
            }}
            onClick={() => setIsCartOpen(false)}
          />
          <div className="drawer" style={{ background: 'var(--color-bg)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '1rem'
            }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>Your Order Basket</h2>
              <button
                className="btn"
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
                onClick={() => setIsCartOpen(false)}
              >
                ✕
              </button>
            </div>
            
            {errorBanner && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}>
                {errorBanner}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '40vh', overflowY: 'auto' }}>
              {state.items.map(item => (
                <div
                  key={item.menuItemId}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    background: 'var(--color-surface)',
                    padding: '0.9rem 1.15rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(229,231,235,0.5)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '750', fontSize: '0.95rem' }}>{item.name}</p>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.03)',
                    borderRadius: '9999px',
                    padding: '2px'
                  }}>
                    <button
                      className="btn"
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        minWidth: '24px'
                      }}
                      onClick={() => item.quantity > 1 ? dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId: item.menuItemId, quantity: item.quantity - 1 }}) : dispatch({ type: 'REMOVE_ITEM', payload: { menuItemId: item.menuItemId }})}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', padding: '0 4px' }}>{item.quantity}</span>
                    <button
                      className="btn"
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        minWidth: '24px'
                      }}
                      onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId: item.menuItemId, quantity: item.quantity + 1 }})}
                    >
                      +
                    </button>
                  </div>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Special requests? (e.g. No onions)"
                    value={item.notes || ''}
                    onChange={(e) => dispatch({ type: 'SET_NOTES', payload: { menuItemId: item.menuItemId, notes: e.target.value } })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(229,231,235,0.8)',
                      fontSize: '0.85rem',
                      background: 'var(--color-bg)'
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '750', fontSize: '0.95rem' }}>
                Table Confirmation
              </label>
              <input
                className="input"
                value={table}
                onChange={(e) => setTable(e.target.value)}
                disabled={!!initialTable}
                placeholder="Enter your table label (e.g. 12)"
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '0.75rem',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{
              marginTop: '1.5rem',
              borderTop: '1px dashed var(--color-border)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.95rem'
            }}>
              {(() => {
                const subtotal = totalPrice;
                const serviceChargePercent = menu.branch.serviceChargePercent ?? 10;
                const vatPercent = menu.branch.vatPercent ?? 15;
                const serviceCharge = subtotal * (serviceChargePercent / 100);
                const vat = (subtotal + serviceCharge) * (vatPercent / 100);
                const grandTotal = subtotal + serviceCharge + vat;
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Items Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Service Charge ({serviceChargePercent}%)</span>
                      <span>{formatPrice(serviceCharge)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>VAT ({vatPercent}%)</span>
                      <span>{formatPrice(vat)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontWeight: '800',
                      fontSize: '1.3rem',
                      marginTop: '0.5rem',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '0.75rem'
                    }}>
                      <span>Grand Total</span>
                      <span style={{ color: 'var(--color-primary)' }}>{formatPrice(grandTotal)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              className="btn btn-primary"
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '1.15rem',
                fontSize: '1rem',
                fontWeight: '800',
                borderRadius: '9999px',
                boxShadow: !isOnline ? 'none' : '0 6px 20px rgba(245,158,11,0.2)',
                background: !isOnline ? '#78716c' : 'var(--color-primary)'
              }}
              onClick={placeOrder}
              disabled={isSubmitting || state.items.length === 0 || !isOnline}
            >
              {!isOnline ? 'Offline - Reconnect to Order' : isSubmitting ? 'Sending Order...' : 'Confirm & Place Order'}
            </button>
          </div>
        </>
      )}
      {/* ─── Combo Platter Modal ──────────────────────── */}
      {comboItem && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 60
            }}
            onClick={() => setComboItem(null)}
          />
          <div className="drawer" style={{ zIndex: 65, background: 'var(--color-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Build Your Platter</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Select up to {comboItem.comboItemCount || 6} items
                </p>
              </div>
              <button
                className="btn"
                style={{ background: 'rgba(0,0,0,0.05)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                onClick={() => setComboItem(null)}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {allItems.filter(i => i.id !== comboItem.id).map(target => {
                const isSelected = selectedComboSubItems.some(i => i.id === target.id);
                const maxReached = selectedComboSubItems.length >= (comboItem.comboItemCount || 6);
                
                return (
                  <div
                    key={target.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedComboSubItems(prev => prev.filter(i => i.id !== target.id));
                      } else if (!maxReached) {
                        setSelectedComboSubItems(prev => [...prev, target]);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      background: 'var(--color-surface)',
                      padding: '0.75rem 1rem',
                      borderRadius: '1rem',
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : 'rgba(229,231,235,0.5)'}`,
                      cursor: maxReached && !isSelected ? 'not-allowed' : 'pointer',
                      opacity: maxReached && !isSelected ? 0.6 : 1
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{target.name}</p>
                    </div>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem', borderRadius: '9999px', fontWeight: '800' }}
              disabled={selectedComboSubItems.length === 0}
              onClick={() => {
                const notes = 'Platter items: ' + selectedComboSubItems.map(i => i.name).join(', ');
                dispatch({ type: 'ADD_ITEM', payload: { menuItemId: comboItem.id, name: comboItem.name, price: comboItem.comboPrice || comboItem.price, quantity: 1, notes } });
                setComboItem(null);
                
                if (comboItem.upsellIds && comboItem.upsellIds.length > 0) {
                  const targets = allItems.filter(
                    i => comboItem.upsellIds.includes(i.id) && i.isAvailable && getCartItemQuantity(i.id) === 0
                  );
                  if (targets.length > 0) {
                    setUpsellSourceItem(comboItem);
                  }
                }
              }}
            >
              Add to Order - {formatPrice(comboItem.comboPrice || comboItem.price)}
            </button>
          </div>
        </>
      )}

      {/* ─── Upsell Recommendation Dialog ───────────────── */}
      {upsellSourceItem && (
        (() => {
          const targets = allItems.filter(i => upsellSourceItem.upsellIds?.includes(i.id) && i.isAvailable && getCartItemQuantity(i.id) === 0);
          if (targets.length === 0) return null;
          return (
            <>
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 60
                }}
                onClick={() => setUpsellSourceItem(null)}
              />
              <div className="drawer" style={{ zIndex: 65, background: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Would you like to add?</h3>
                  <button
                    className="btn"
                    style={{ background: 'rgba(0,0,0,0.05)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    onClick={() => setUpsellSourceItem(null)}
                  >
                    ✕
                  </button>
                </div>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 1.25rem 0' }}>
                  Perfect pairings for your <strong>{upsellSourceItem.name}</strong>:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {targets.map(target => (
                    <div
                      key={target.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        background: 'var(--color-surface)',
                        padding: '0.75rem 1rem',
                        borderRadius: '1rem',
                        border: '1px solid rgba(229,231,235,0.5)'
                      }}
                    >
                      <img
                        src={target.photoUrl || '/images/signature.png'}
                        alt={target.name}
                        style={{ width: '56px', height: '56px', borderRadius: '0.5rem', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>{target.name}</p>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                          +{formatPrice(target.price)}
                        </p>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 1rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                        onClick={() => {
                          dispatch({ type: 'ADD_ITEM', payload: { menuItemId: target.id, name: target.name, price: target.price, quantity: 1 } });
                          if (targets.length <= 1) {
                            setUpsellSourceItem(null);
                          }
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="btn"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '9999px', background: 'rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                  onClick={() => setUpsellSourceItem(null)}
                >
                  No, thanks
                </button>
              </div>
            </>
          );
        })()
      )}

      {/* ─── Item Detail Modal ────────────────────────── */}
      {selectedItem && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 70
            }}
            onClick={() => setSelectedItem(null)}
          />
          <div className="drawer" style={{ zIndex: 75, background: 'var(--color-bg)', padding: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ position: 'relative', width: '100%', height: '240px' }}>
              <img
                src={selectedItem.photoUrl || '/images/signature.png'}
                alt={selectedItem.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                className="btn"
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(4px)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--color-text)' }}>{selectedItem.name}</h2>
                  {selectedItem.nameAmharic && <span style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--color-text-muted)', fontFamily: 'serif', marginTop: '0.25rem' }}>{selectedItem.nameAmharic}</span>}
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                  {formatPrice(selectedItem.price)}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {selectedItem.dietaryLabels?.includes('FASTING') && <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '600' }}>🕌 Fasting (የጾም)</span>}
                {selectedItem.isVegan && <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '600' }}>🌱 Vegan</span>}
                {selectedItem.isGlutenFree && <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '600' }}>🌾 Gluten-Free</span>}
                
                {selectedItem.spiceLevel !== undefined && selectedItem.spiceLevel !== null && getSpiceLabel(selectedItem.spiceLevel) && (
                  <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '600' }}>
                    {getSpiceLabel(selectedItem.spiceLevel)}
                  </span>
                )}
                {selectedItem.servingSize && (
                  <span style={{ fontSize: '0.75rem', background: '#f3e8ff', color: '#6b21a8', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '600' }}>
                    👥 {selectedItem.servingSize}
                  </span>
                )}
                
                {selectedItem.prepTime && (
                  <span style={{ fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-text-muted)', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid var(--color-border)', fontWeight: '600' }}>
                    ⏱️ ~{selectedItem.prepTime} min
                  </span>
                )}
                {selectedItem.calories && (
                  <span style={{ fontSize: '0.75rem', background: 'var(--color-surface)', color: 'var(--color-text-muted)', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid var(--color-border)', fontWeight: '600' }}>
                    🔥 {selectedItem.calories} cal
                  </span>
                )}
              </div>

              {selectedItem.description && (
                <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.5', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                  {selectedItem.description}
                </p>
              )}
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.9rem' }}>
                  Special Instructions
                </label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="e.g. No onions, extra spicy..."
                  value={selectedItemNotes}
                  onChange={(e) => setSelectedItemNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(229,231,235,0.8)', fontSize: '0.9rem', resize: 'none' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '9999px',
                  padding: '4px'
                }}>
                  <button
                    className="btn"
                    style={{ padding: '8px 12px', background: 'transparent', fontSize: '1.1rem' }}
                    onClick={() => setSelectedItemQuantity(Math.max(1, selectedItemQuantity - 1))}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 'bold', fontSize: '1rem', padding: '0 8px', minWidth: '24px', textAlign: 'center' }}>
                    {selectedItemQuantity}
                  </span>
                  <button
                    className="btn"
                    style={{ padding: '8px 12px', background: 'transparent', fontSize: '1.1rem' }}
                    onClick={() => setSelectedItemQuantity(selectedItemQuantity + 1)}
                  >
                    +
                  </button>
                </div>
                
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '1rem', fontSize: '1rem', fontWeight: '800', borderRadius: '9999px' }}
                  onClick={() => {
                    dispatch({ 
                      type: 'ADD_ITEM', 
                      payload: { 
                        menuItemId: selectedItem.id, 
                        name: selectedItem.name, 
                        price: selectedItem.price, 
                        quantity: selectedItemQuantity,
                        notes: selectedItemNotes
                      } 
                    });
                    setSelectedItem(null);
                    
                    if (selectedItem.upsellIds && selectedItem.upsellIds.length > 0) {
                      const targets = allItems.filter(
                        i => selectedItem.upsellIds.includes(i.id) && i.isAvailable && getCartItemQuantity(i.id) === 0
                      );
                      if (targets.length > 0) {
                        setUpsellSourceItem(selectedItem);
                      }
                    }
                  }}
                >
                  Add to Order - {formatPrice(selectedItem.price * selectedItemQuantity)}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
