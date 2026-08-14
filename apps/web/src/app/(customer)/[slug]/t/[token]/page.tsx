import { apiClient } from '@/lib/api-client';
import { notFound } from 'next/navigation';
import MenuView from '@/components/menu/MenuView';

export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  try {
    const { slug, token } = await params;
    const menu = await apiClient.fetchMenu(slug);
    const ctx = await apiClient.resolveTableToken(slug, token);
    return (
      <MenuView
        menu={menu}
        tableContext={{ label: ctx.label, token, locked: ctx.locked }}
      />
    );
  } catch {
    notFound();
  }
}
