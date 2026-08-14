import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import MenuView from '@/components/menu/MenuView';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const resolvedParams = await params;
    const menu = await apiClient.fetchMenu(resolvedParams.slug);
    return { title: `${menu.branch.name} - Menu` };
  } catch {
    return { title: 'Menu Not Found' };
  }
}

export default async function MenuPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  try {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const menu = await apiClient.fetchMenu(resolvedParams.slug);
    return <MenuView menu={menu} initialTable={resolvedSearchParams.table} />;
  } catch (error) {
    notFound();
  }
}
