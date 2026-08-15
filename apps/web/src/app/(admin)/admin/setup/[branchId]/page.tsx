'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import type { BranchResponse, MenuResponse, StaffResponse } from '@qrmenu/shared';

type SetupTask = { label: string; detail: string; href: string; complete: boolean; required?: boolean };

export default function RestaurantSetupChecklist() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [menus, setMenus] = useState<MenuResponse[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [staff, setStaff] = useState<StaffResponse[]>([]);

  useEffect(() => {
    Promise.all([apiClient.fetchBranches(), apiClient.fetchMenuAdmin(branchId), apiClient.fetchTables(branchId), apiClient.fetchStaff()])
      .then(([branches, branchMenus, tables, fetchedStaff]) => {
        setBranch(branches.find(item => item.id === branchId) || null);
        setMenus(branchMenus);
        setTableCount(tables.length);
        setStaff(fetchedStaff);
      });
  }, [branchId]);

  if (!branch) return <main style={{ padding: '2rem' }}>Loading restaurant setup…</main>;
  const menu = menus[0];
  const hasItems = Boolean(menu?.sections.some(section => section.items.length > 0));
  const published = menus.some(item => item.status === 'PUBLISHED');
  const perTable = branch.serviceMode === 'PER_TABLE_QR';
  const staffReady = staff.some(member => member.role === 'STAFF' && member.branchId === branchId);
  const tasks: SetupTask[] = [
    { label: 'Restaurant basics', detail: 'Name, type, language, and guest ordering flow are set.', href: `/admin/onboarding/${branchId}`, complete: (branch.setupStep ?? 0) >= 2 },
    { label: 'Build your menu', detail: 'Choose a starter, add dishes, and set prices.', href: `/admin/menus/${branchId}`, complete: hasItems, required: true },
    { label: 'Review public profile', detail: 'Add address, phone, logo, and restaurant description.', href: `/admin/branches/${branchId}`, complete: Boolean(branch.phone || branch.address || branch.logoUrl) },
    { label: 'Set up tables and QR codes', detail: perTable ? 'Create tables, print secure codes, and test one.' : 'Generate and print your shared menu QR code.', href: perTable ? `/admin/tables/${branchId}` : `/admin/qr/${branchId}`, complete: perTable ? tableCount > 0 : true, required: perTable },
    { label: 'Prepare staff device', detail: 'Add a staff member assigned to this branch, then sign in on the service device.', href: '/admin/staff', complete: staffReady },
    { label: 'Publish and test', detail: 'Publish your menu, scan a QR code, and place a test order.', href: `/admin/menus/${branchId}`, complete: published, required: true },
  ];
  const complete = tasks.filter(task => task.complete).length;
  return <main style={{ maxWidth: 780, margin: 'auto', padding: '2rem' }}><button className="btn" onClick={() => router.push('/admin/branches')}>Back to branches</button><h1>Get {branch.name} ready to open</h1><p>Complete these practical steps before sharing your QR code with customers.</p><p><strong>{complete} of {tasks.length} steps complete</strong></p><div style={{ display: 'grid', gap: '0.75rem' }}>{tasks.map(task => <article key={task.label} style={{ border: '1px solid #ddd', borderRadius: 10, padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}><span aria-label={task.complete ? 'Complete' : 'Incomplete'}>{task.complete ? '✓' : '○'}</span><div style={{ flex: 1 }}><b>{task.label}{task.required && ' · Required'}</b><p style={{ margin: '0.25rem 0 0', color: '#666' }}>{task.detail}</p></div><button className="btn" onClick={() => router.push(task.href)}>{task.complete ? 'Review' : 'Continue'}</button></article>)}</div><p style={{ marginTop: '1.5rem', color: '#666' }}>Before opening, scan one printed QR code and submit a test order from a phone.</p></main>;
}
