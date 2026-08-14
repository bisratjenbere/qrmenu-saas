'use client';
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { menuItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'SET_NOTES'; payload: { menuItemId: string; notes: string } }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.menuItemId === action.payload.menuItemId);
      if (existing) {
        return { items: state.items.map(i => i.menuItemId === action.payload.menuItemId ? { ...i, quantity: i.quantity + action.payload.quantity } : i) };
      }
      return { items: [...state.items, action.payload] };
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter(i => i.menuItemId !== action.payload.menuItemId) };
    case 'UPDATE_QUANTITY':
      return { items: state.items.map(i => i.menuItemId === action.payload.menuItemId ? { ...i, quantity: action.payload.quantity } : i) };
    case 'SET_NOTES':
      return { items: state.items.map(i => i.menuItemId === action.payload.menuItemId ? { ...i, notes: action.payload.notes } : i) };
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
  totalPrice: number;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, (initial) => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('cart');
      if (saved) return JSON.parse(saved);
    }
    return initial;
  });

  useEffect(() => {
    sessionStorage.setItem('cart', JSON.stringify(state));
  }, [state]);

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ state, dispatch, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
