import { CustomerLanguageProvider } from '@/hooks/use-customer-language';
import { CartProvider } from '@/hooks/use-cart';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerLanguageProvider>
      <CartProvider>{children}</CartProvider>
    </CustomerLanguageProvider>
  );
}
