import { CartProvider } from '@/hooks/use-cart';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
