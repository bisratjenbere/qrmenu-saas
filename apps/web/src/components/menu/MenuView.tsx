'use client';
import GuestMenu from './GuestMenu';
import type { MenuResponse } from '@qrmenu/shared';

export default function MenuView({
  menu,
  initialTable,
  tableContext,
}: {
  menu: MenuResponse;
  initialTable?: string;
  tableContext?: { label: string; token?: string; locked: boolean };
}) {
  return (
    <GuestMenu menu={menu} initialTable={initialTable} tableContext={tableContext} />
  );
}
