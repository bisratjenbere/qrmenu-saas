'use client';
import { useEffect, useState } from 'react';
import { SSEEvent, OrderResponse, ServiceRequestResponse } from '@qrmenu/shared';

export function useSSE(branchId: string | null, token: string | null, callbacks: {
  onNewOrder: (order: OrderResponse) => void;
  onOrderUpdated: (data: { id: string, status: string }) => void;
  onOrderItemUpdated?: (data: { id: string, orderId: string, status: string }) => void;
  onServiceRequest?: (request: ServiceRequestResponse) => void;
  onReconnect?: () => void;
}) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!branchId || !token) return;

    let sse: EventSource;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      setStatus(prev => prev === 'disconnected' ? 'connecting' : 'reconnecting');
      sse = new EventSource(`/api/branches/${branchId}/orders/stream?token=${token}`);

      sse.onopen = () => {
        setStatus('connected');
        if (callbacks.onReconnect) callbacks.onReconnect();
      };

      sse.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data) as any;
          if (event.type === 'new-order') {
            callbacks.onNewOrder(event.data);
          } else if (event.type === 'order-updated') {
            callbacks.onOrderUpdated(event.data);
          } else if (event.type === 'order-item-updated' && callbacks.onOrderItemUpdated) {
            callbacks.onOrderItemUpdated(event.data);
          } else if (event.type === 'service-request' && callbacks.onServiceRequest) {
            callbacks.onServiceRequest(event.data);
          }
        } catch (err) {}
      };

      sse.onerror = () => {
        sse.close();
        setStatus('reconnecting');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (sse) sse.close();
      setStatus('disconnected');
    };
  }, [branchId, token]);

  return { connectionStatus: status };
}
