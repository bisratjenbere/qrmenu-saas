'use client';
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { OrderLineModifierSnapshot } from '@qrmenu/shared';

export interface CartLineModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  lineId: string;
  menuItemId: string;
  name: string;
  nameAmharic?: string | null;
  price: number;
  quantity: number;
  notes?: string;
  selectedModifiers: CartLineModifier[];
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_LINE'; payload: CartItem }
  | { type: 'REMOVE_LINE'; payload: { lineId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { lineId: string; quantity: number } }
  | { type: 'CLEAR_CART' };

function lineUnitPrice(item: CartItem): number {
  const modifierTotal = item.selectedModifiers.reduce((s, m) => s + m.priceDelta, 0);
  return item.price + modifierTotal;
}

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_LINE':
      return { items: [...state.items, action.payload] };
    case 'REMOVE_LINE':
      return { items: state.items.filter(i => i.lineId !== action.payload.lineId) };
    case 'UPDATE_QUANTITY':
      if (action.payload.quantity <= 0) {
        return { items: state.items.filter(i => i.lineId !== action.payload.lineId) };
      }
      return {
        items: state.items.map(i =>
          i.lineId === action.payload.lineId ? { ...i, quantity: action.payload.quantity } : i
        ),
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  totalItems: number;
  subtotal: number;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, initial => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('cart_v2');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          sessionStorage.removeItem('cart_v2');
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    sessionStorage.setItem('cart_v2', JSON.stringify(state));
  }, [state]);

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = state.items.reduce(
    (acc, item) => acc + lineUnitPrice(item) * item.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ state, dispatch, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export function cartLineToOrderPayload(item: CartItem) {
  return {
    clientLineId: item.lineId,
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    notes: item.notes || null,
    selectedModifiers: item.selectedModifiers.map(m => ({
      groupId: m.groupId,
      groupName: m.groupName,
      optionId: m.optionId,
      optionName: m.optionName,
      priceDelta: m.priceDelta,
    })) as OrderLineModifierSnapshot[],
  };
}

export { lineUnitPrice };
