'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSSE } from '@/hooks/use-sse';
import { apiClient } from '@/lib/api-client';
import { OrderResponse, OrderStatus, ServiceRequestResponse } from '@qrmenu/shared';

export default function OperationsPage() {
  const { staff, token, isLoading } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [requests, setRequests] = useState<ServiceRequestResponse[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notify = (message: string) => {
    audioRef.current?.play().catch(() => undefined);
    if (Notification.permission === 'granted') new Notification(message);
  };
  const load = async () => {
    if (!staff?.branchId) return;
    try {
      const [nextOrders, nextRequests] = await Promise.all([apiClient.fetchOrders(staff.branchId), apiClient.fetchServiceRequests(staff.branchId)]);
      setOrders(nextOrders); setRequests(nextRequests);
    } catch { setError('Unable to refresh the service queue. Please try again.'); }
  };
  useEffect(() => { audioRef.current = new Audio('/sounds/notification.mp3'); load(); }, [staff?.branchId]);
  useSSE(staff?.branchId || null, token, {
    onNewOrder: order => { setOrders(previous => previous.some(item => item.id === order.id) ? previous : [order, ...previous]); notify(`New order - ${order.fulfillmentType === 'TAKEAWAY' ? 'Takeaway' : `Table ${order.tableNumber}`}`); },
    onOrderUpdated: ({ id, status }) => setOrders(previous => previous.map(order => order.id === id ? { ...order, status: status as OrderResponse['status'] } : order)),
    onServiceRequest: request => {
      setRequests(previous => request.status === 'COMPLETED'
        ? previous.filter(item => item.id !== request.id)
        : previous.some(item => item.id === request.id) ? previous.map(item => item.id === request.id ? request : item) : [request, ...previous]);
      if (request.status === 'REQUESTED') notify(`${request.type === 'BILL' ? 'Bill' : 'Waiter'} request - Table ${request.tableNumber}`);
    },
    onReconnect: load,
  });
  if (isLoading || !staff) return <main style={{ padding: '2rem' }}>Loading…</main>;
  const move = async (id: string, status: string) => { try { await apiClient.updateOrderStatus(id, status); setNotice('Order updated.'); await load(); } catch { setError('Unable to update this order. Please retry.'); } };
  const act = async (id: string, completed: boolean) => { try { await (completed ? apiClient.completeServiceRequest(id) : apiClient.acknowledgeServiceRequest(id)); setNotice(completed ? 'Service request completed.' : 'Service request acknowledged.'); await load(); } catch { setError('Unable to update this request. Please retry.'); } };
  const waiting = (createdAt: string) => `${Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))} min waiting`;
  const group = (status: string) => orders.filter(order => order.status === status);
  const orderCard = (order: OrderResponse, action?: [string, string]) => <article key={order.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}><b>{order.fulfillmentType === 'TAKEAWAY' ? 'Takeaway' : `Table ${order.tableNumber}`}</b>{order.fulfillmentType === 'TAKEAWAY' && <p>{order.guestName || 'Guest'}{order.guestPhone ? ` · ${order.guestPhone}` : ''}{order.pickupTime ? ` · Pickup: ${order.pickupTime}` : ''}{order.pickupNote ? ` · ${order.pickupNote}` : ''}</p>}<ul>{order.items.map(item => <li key={item.id}>{item.quantity}× {item.itemNameSnapshot}{item.notes ? ` — ${item.notes}` : ''}</li>)}</ul>{action && <button onClick={() => move(order.id, action[1])}>{action[0]}</button>}</article>;
  return <main style={{ padding: '1rem', fontFamily: 'system-ui' }}><h1>Service operations</h1>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<section><h2>Needs attention</h2>{requests.length ? requests.map(request => <article key={request.id} style={{ padding: '1rem', border: '1px solid #eab308', marginBottom: 8 }}><b>{request.type === 'BILL' ? 'Bill requested' : 'Waiter requested'} · Table {request.tableNumber}</b><span style={{ marginLeft: 8 }}>{waiting(request.createdAt)}</span><button style={{ marginLeft: 12 }} onClick={() => act(request.id, request.status === 'ACKNOWLEDGED')}>{request.status === 'ACKNOWLEDGED' ? 'Complete' : 'Acknowledge'}</button></article>) : <p>No guest requests.</p>}</section><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}><section><h2>New</h2>{group(OrderStatus.NEW).map(order => orderCard(order, ['Start', OrderStatus.SEEN]))}</section><section><h2>In progress</h2>{group(OrderStatus.SEEN).map(order => orderCard(order, [order.fulfillmentType === 'TAKEAWAY' ? 'Ready for pickup' : 'Mark served', OrderStatus.SERVED]))}</section><section><h2>Completed</h2>{group(OrderStatus.SERVED).slice(0, 10).map(order => orderCard(order))}</section></div></main>;
}
