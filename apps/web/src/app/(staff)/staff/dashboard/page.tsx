'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSSE } from '@/hooks/use-sse';
import { OrderResponse } from '@qrmenu/shared';
import { OrderStatus } from '@qrmenu/shared';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function Dashboard() {
  const { staff, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('today');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchOrders = async () => {
    if (staff?.branchId) {
      try {
        const fetched = await apiClient.fetchOrders(staff.branchId);
        setOrders(fetched);
      } catch (e) {
        console.error('Failed to fetch orders:', e);
      }
    }
  };

  useEffect(() => {
    if (!isLoading && !staff) router.push('/staff/login');
    audioRef.current = new Audio('/sounds/notification.mp3');
    if (staff) {
      fetchOrders();
    }
  }, [isLoading, staff, router]);

  const { connectionStatus } = useSSE(staff?.branchId || null, token, {
    onNewOrder: (order) => {
      setOrders(prev => [order, ...prev]);
      audioRef.current?.play().catch(e => console.log('Audio play failed', e));
      if (Notification.permission === 'granted') {
        new Notification(`New Order - Table ${order.tableNumber}`);
      }
    },
    onOrderUpdated: ({ id, status }) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    },
    onReconnect: () => {
      fetchOrders();
    }
  });

  if (isLoading || !staff) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  const getFilteredOrders = () => {
    if (filterMode === 'all') return orders;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return orders.filter(o => new Date(o.createdAt) >= startOfToday);
  };
  const filteredOrders = getFilteredOrders();

  const newOrders = filteredOrders.filter(o => o.status === OrderStatus.NEW);
  const seenOrders = filteredOrders.filter(o => o.status === OrderStatus.SEEN);
  const servedOrders = filteredOrders.filter(o => o.status === OrderStatus.SERVED);

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '1rem 2rem', background: 'var(--color-staff-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <button 
            className="btn" 
            onClick={() => router.push('/staff/kitchen')} 
            style={{ 
              background: 'var(--color-primary)', 
              color: 'black', 
              fontWeight: 'bold', 
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}>
            🍳 Kitchen Display (KDS)
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', background: 'var(--color-staff-bg)', borderRadius: '0.5rem', padding: '0.25rem' }}>
            <button
              onClick={() => setFilterMode('today')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.25rem',
                background: filterMode === 'today' ? 'var(--color-primary)' : 'transparent',
                color: filterMode === 'today' ? 'black' : 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Today's Orders
            </button>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '0.25rem',
                background: filterMode === 'all' ? 'var(--color-primary)' : 'transparent',
                color: filterMode === 'all' ? 'black' : 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              All Orders
            </button>
          </div>
          <span style={{ fontSize: '0.8rem', color: connectionStatus === 'connected' ? 'var(--color-success)' : 'var(--color-warning)' }}>
            ● {connectionStatus}
          </span>
          <button className="btn" onClick={logout} style={{ color: 'white', border: '1px solid var(--color-staff-border)' }}>Logout</button>
        </div>
      </header>

      {connectionStatus === 'reconnecting' && (
        <div style={{ background: 'var(--color-warning)', color: 'black', padding: '0.5rem', textAlign: 'center' }}>
          Connection lost. Reconnecting...
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem', flex: 1, overflow: 'hidden' }}>
        {[
          { title: 'New', data: newOrders, nextStatus: OrderStatus.SEEN, nextLabel: 'Mark as Seen' },
          { title: 'Seen', data: seenOrders, nextStatus: OrderStatus.SERVED, nextLabel: 'Mark as Served' },
          { title: 'Served', data: servedOrders, nextStatus: null, nextLabel: '' }
        ].map(col => (
          <div key={col.title} style={{ display: 'flex', flexDirection: 'column', background: 'var(--color-staff-surface)', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
              {col.title} ({col.data.length})
            </div>
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {col.data.map(order => (
                <div key={order.id} style={{ background: 'var(--color-staff-bg)', padding: '1rem', borderRadius: '0.5rem', border: `1px solid var(--color-staff-border)`, position: 'relative', overflow: 'hidden' }}>
                  {order.status === OrderStatus.NEW && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--color-error)', animation: 'pulse 2s infinite' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-primary)' }}>T{order.tableNumber}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                    {order.items.map(item => (
                      <li key={item.id} style={{ marginBottom: '0.5rem', borderBottom: '1px solid var(--color-staff-border)', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{item.quantity}x {item.itemNameSnapshot}</span>
                        </div>
                        {item.notes && <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-warning)', fontSize: '0.9rem' }}>Note: {item.notes}</p>}
                      </li>
                    ))}
                  </ul>
                  {col.nextStatus && (
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => updateStatus(order.id, col.nextStatus!)}>
                      {col.nextLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
