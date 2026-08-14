'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSSE } from '@/hooks/use-sse';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface KitchenItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  notes: string | null;
  status: 'PENDING' | 'PREPARING' | 'READY';
  order: {
    tableNumber: string;
    createdAt: string;
  };
}

interface AggregatedItem {
  menuItemId: string;
  name: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
  count: number;
}

export default function KitchenPage() {
  const router = useRouter();
  const { staff, isLoading } = useAuth();
  const [items, setItems] = useState<KitchenItem[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedItem[]>([]);
  const [error, setError] = useState('');

  // Audio alert helper
  const playSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(() => {});
  };

  const loadQueue = async () => {
    if (!staff?.branchId) return;
    try {
      const data = await apiClient.fetchKitchenQueue(staff.branchId);
      setItems(data.items);
      setAggregated(data.aggregated);
    } catch (e: any) {
      setError(e.message || 'Failed to load kitchen queue');
    }
  };

  // Initial load
  useEffect(() => {
    if (!isLoading && staff?.branchId) {
      loadQueue();
    }
  }, [isLoading, staff]);

  // Hook up SSE stream for real-time aggregation and updates
  useSSE(staff?.branchId || null, typeof window !== 'undefined' ? localStorage.getItem('token') : null, {
    onNewOrder: (order) => {
      playSound();
      loadQueue(); // Refresh entire list to maintain correct chronological sort and aggregation
    },
    onOrderUpdated: () => {
      loadQueue();
    },
    onOrderItemUpdated: (updatedItem) => {
      // Optimistically update local item prep status
      setItems(prev => prev.map(i => i.id === updatedItem.id ? { ...i, status: updatedItem.status as any } : i));
      
      // Update local aggregation
      setAggregated(prev => {
        const itemToUpdate = items.find(i => i.id === updatedItem.id);
        if (!itemToUpdate) return prev;
        
        // Recalculate aggregation counts dynamically
        const newItems = items.map(i => i.id === updatedItem.id ? { ...i, status: updatedItem.status as any } : i);
        const map = new Map<string, { menuItemId: string, name: string, status: string, count: number }>();
        for (const item of newItems) {
          const key = `${item.menuItemId}-${item.status}`;
          const existing = map.get(key);
          if (existing) {
            existing.count += item.quantity;
          } else {
            map.set(key, {
              menuItemId: item.menuItemId,
              name: item.itemNameSnapshot,
              status: item.status,
              count: item.quantity
            });
          }
        }
        return Array.from(map.values()) as any;
      });
    },
    onReconnect: () => {
      loadQueue();
    }
  });

  const handleCycleStatus = async (item: KitchenItem) => {
    const nextStatusMap: Record<string, 'PENDING' | 'PREPARING' | 'READY'> = {
      PENDING: 'PREPARING',
      PREPARING: 'READY',
      READY: 'PENDING'
    };
    const nextStatus = nextStatusMap[item.status];
    try {
      await apiClient.updateKitchenItemStatus(item.id, nextStatus);
      // Let the SSE callback update the UI state, but optimistically set it here too
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
    } catch (e: any) {
      alert(e.message || 'Failed to update item status');
    }
  };

  if (isLoading) {
    return <div style={{ color: 'white', background: '#121214', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading KDS Queue...</div>;
  }

  if (!staff?.branchId) {
    return <div style={{ color: 'white', background: '#121214', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Error: Staff member is not assigned to a branch.</div>;
  }

  // Filter out READY items from display to keep tickets clean, but keep them for calculations
  const activeItems = items.filter(i => i.status !== 'READY');

  // Group active items by orderId for order ticket rendering
  const orderTicketsMap = new Map<string, { orderId: string, tableNumber: string, createdAt: string, items: KitchenItem[] }>();
  for (const item of activeItems) {
    const existing = orderTicketsMap.get(item.orderId);
    if (existing) {
      existing.items.push(item);
    } else {
      orderTicketsMap.set(item.orderId, {
        orderId: item.orderId,
        tableNumber: item.order.tableNumber,
        createdAt: item.order.createdAt,
        items: [item]
      });
    }
  }
  const orderTickets = Array.from(orderTicketsMap.values());

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0c0a09', // Deep dark background
      color: '#f5f5f4',
      fontFamily: 'var(--font-inter), sans-serif'
    }}>
      
      {/* ─── Left Sidebar: Prep Aggregation totals ─────── */}
      <aside style={{
        width: '280px',
        borderRight: '2px solid #292524',
        background: '#1c1917',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '900',
          color: 'var(--color-primary)',
          margin: '0 0 1.5rem 0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-outfit), sans-serif'
        }}>Kitchen prep totals</h2>
        
        {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
          {aggregated.filter(a => a.status !== 'READY').length === 0 ? (
            <p style={{ color: '#a8a29e', fontSize: '0.9rem', fontStyle: 'italic' }}>No active items to prepare.</p>
          ) : (
            aggregated.filter(a => a.status !== 'READY').map(a => (
              <div key={`${a.menuItemId}-${a.status}`} style={{
                background: '#292524',
                padding: '0.85rem 1rem',
                borderRadius: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderLeft: `4px solid ${a.status === 'PREPARING' ? 'var(--color-primary)' : '#78716c'}`
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>{a.name}</p>
                  <span style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    fontWeight: 'bold',
                    color: a.status === 'PREPARING' ? 'var(--color-primary)' : '#a8a29e'
                  }}>
                    {a.status}
                  </span>
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'white' }}>
                  x{a.count}
                </span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ─── Main Right Area: Tickets Queue ─────────────── */}
      <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #292524',
          paddingBottom: '1.25rem',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', margin: 0, fontFamily: 'var(--font-outfit), sans-serif' }}>Active Kitchen Queue</h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#a8a29e', fontSize: '0.9rem' }}>Real-time tick list for preparing plates</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => router.push('/staff/dashboard')}
              style={{
                background: '#292524',
                color: '#f5f5f4',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #44403c',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📋 Back to Dashboard
            </button>
            <span style={{
              background: '#292524',
              color: '#f5f5f4',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              Active: {orderTickets.length} tables
            </span>
          </div>
        </header>

        {/* Tickets Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignContent: 'start',
          flex: 1,
          overflowY: 'auto'
        }}>
          {orderTickets.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '4rem',
              background: '#1c1917',
              borderRadius: '1rem',
              border: '2px dashed #292524'
            }}>
              <p style={{ fontSize: '1.2rem', color: '#a8a29e', margin: 0 }}>All clear! No active dishes to cook.</p>
            </div>
          ) : (
            orderTickets.map(ticket => {
              const elapsedMin = Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000);
              const isLate = elapsedMin > 15;
              
              return (
                <div key={ticket.orderId} style={{
                  background: '#1c1917',
                  borderRadius: '1.25rem',
                  border: isLate ? '2px solid var(--color-error)' : '2px solid #292524',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '420px'
                }}>
                  {/* Ticket Header */}
                  <div style={{
                    padding: '1rem 1.25rem',
                    background: isLate ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid #292524',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTopLeftRadius: '1.15rem',
                    borderTopRightRadius: '1.15rem'
                  }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fbbf24', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      T-{ticket.tableNumber}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: isLate ? 'var(--color-error)' : '#a8a29e'
                    }}>
                      {elapsedMin}m ago
                    </span>
                  </div>

                  {/* Ticket Items list */}
                  <div style={{ padding: '1.25rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {ticket.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleCycleStatus(item)}
                        style={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          background: item.status === 'PREPARING' ? 'rgba(217, 119, 6, 0.15)' : '#292524',
                          border: `1px solid ${item.status === 'PREPARING' ? 'var(--color-primary)' : 'transparent'}`,
                          padding: '0.75rem 1rem',
                          borderRadius: '0.75rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>
                            {item.quantity}x {item.itemNameSnapshot}
                          </span>
                        </div>
                        {item.notes && (
                          <div style={{
                            marginTop: '0.35rem',
                            fontSize: '0.8rem',
                            color: '#f59e0b',
                            fontWeight: 'bold',
                            background: 'rgba(245, 158, 11, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            ★ {item.notes}
                          </div>
                        )}
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            color: item.status === 'PREPARING' ? 'var(--color-primary)' : '#78716c'
                          }}>
                            {item.status} ➔
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
