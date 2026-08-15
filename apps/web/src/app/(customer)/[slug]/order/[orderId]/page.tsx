'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { OrderResponse, formatMoney } from '@qrmenu/shared';

const labels: Record<string, string> = {
  NEW: 'Received by the restaurant',
  SEEN: 'Staff are preparing your order',
  SERVED: 'Order served',
};

export default function GuestOrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const token = useSearchParams().get('token');
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('This tracking link is incomplete.'); return; }
    const load = async () => {
      try { setOrder(await apiClient.fetchGuestOrder(orderId, token)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Unable to load this order.'); }
    };
    load();
    const interval = window.setInterval(load, 10_000);
    return () => window.clearInterval(interval);
  }, [orderId, token]);

  if (error) return <main style={{ padding: '2rem' }}>{error}</main>;
  if (!order) return <main style={{ padding: '2rem' }}>Loading your order…</main>;

  return <main style={{ maxWidth: 560, margin: 'auto', padding: '2rem', fontFamily: 'system-ui' }}>
    <h1>Order #{order.id.slice(0, 8)}</h1>
    <p><strong>{labels[order.status] || 'Order received'}</strong></p>
    <p>{order.fulfillmentType === 'TAKEAWAY' ? 'Takeaway' : `Table ${order.tableNumber}`}</p>
    <ul>{order.items.map(item => <li key={item.id}>{item.quantity}× {item.itemNameSnapshot}</li>)}</ul>
    <p><strong>Total: {formatMoney(order.grandTotal, order.currency)}</strong></p>
    <p>This page updates automatically while your order is being handled.</p>
  </main>;
}
