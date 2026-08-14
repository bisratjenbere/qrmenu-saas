'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, MapPin, MenuSquare, QrCode, Store, UtensilsCrossed } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { BranchResponse, OnboardingStatusResponse } from '@qrmenu/shared';
import { ServiceMode, type ServiceMode as ServiceModeValue } from '@qrmenu/shared';
import styles from './onboarding.module.css';

const restaurantTypes = [
  ['TRADITIONAL', 'Traditional restaurant', 'Tibs, wot, kitfo, and Ethiopian platters'],
  ['CAFE_BAKERY', 'Café and bakery', 'Coffee, breakfast, pastries, and light bites'],
  ['FASTING_SPECIALTY', 'Fasting specialty', 'Vegan and fasting dishes throughout the year'],
  ['BISTRO_LOUNGE', 'Bistro and lounge', 'Local and international dishes, drinks, and service'],
  ['HOTEL', 'Hotel restaurant', 'Dine-in, room service, and broader guest needs'],
] as const;

const guestModes = [
  {
    value: ServiceMode.MENU_ONLY,
    icon: MenuSquare,
    title: 'Menu-only QR',
    description: 'Guests browse your menu and contact or order through the channels you choose.',
  },
  {
    value: ServiceMode.SINGLE_QR_SELF_ORDER,
    icon: QrCode,
    title: 'One shared QR',
    description: 'Use one branded code at the counter, entrance, showcase, social media, or Google Maps.',
  },
  {
    value: ServiceMode.PER_TABLE_QR,
    icon: UtensilsCrossed,
    title: 'Table QR ordering',
    description: 'Each table gets a secure code, so guest orders arrive with the correct table context.',
  },
];

export default function BranchOnboardingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [branch, setBranch] = useState<BranchResponse | null>(null);
  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [basics, setBasics] = useState({ name: '', restaurantType: '', primaryLanguage: 'AM', address: '', phone: '' });
  const [experience, setExperience] = useState<{ serviceMode: ServiceModeValue; enableTakeaway: boolean; whatsappNumber: string; tableCount: number }>({ serviceMode: ServiceMode.SINGLE_QR_SELF_ORDER, enableTakeaway: true, whatsappNumber: '', tableCount: 10 });

  useEffect(() => {
    Promise.all([apiClient.fetchBranches(), apiClient.fetchOnboardingStatus(branchId)])
      .then(([branches, onboarding]) => {
        const found = branches.find(item => item.id === branchId);
        if (!found) throw new Error('Branch not found');
        setBranch(found);
        setStatus(onboarding);
        setBasics({
          name: found.name,
          restaurantType: found.restaurantType || '',
          primaryLanguage: found.primaryLanguage || 'AM',
          address: found.address || '',
          phone: found.phone || '',
        });
        setExperience({
          serviceMode: found.serviceMode,
          enableTakeaway: found.enableTakeaway ?? true,
          whatsappNumber: found.whatsappNumber || '',
          tableCount: 10,
        });
        setStep(onboarding.currentStep >= 2 ? 2 : 1);
      })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load restaurant setup.'));
  }, [branchId]);

  const saveBasics = async (event: FormEvent) => {
    event.preventDefault();
    if (!basics.restaurantType) {
      setMessage('Choose the restaurant type that best fits this branch.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await apiClient.updateBranch(branchId, { ...basics, setupStep: 1 });
      const updated = await apiClient.fetchOnboardingStatus(branchId);
      setStatus(updated);
      setStep(2);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save restaurant basics.');
    } finally {
      setSaving(false);
    }
  };

  const saveExperience = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await apiClient.updateBranch(branchId, {
        serviceMode: experience.serviceMode,
        enableTakeaway: experience.enableTakeaway,
        whatsappNumber: experience.whatsappNumber.trim() || null,
        setupStep: 2,
      });
      if (experience.serviceMode === ServiceMode.PER_TABLE_QR && (status?.tableCount || 0) === 0) {
        await apiClient.generateTables(branchId, experience.tableCount);
      }
      router.push(`/admin/menus/${branchId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the guest experience.');
    } finally {
      setSaving(false);
    }
  };

  if (!branch || !status) return <main className={styles.loading}>Loading restaurant setup…</main>;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.identity}><span className={styles.mark}><Store size={19} /></span><div><span>Restaurant setup</span><b>{branch.name}</b></div></div>
          <button type="button" className={styles.exitButton} onClick={() => router.push('/admin/branches')}>Save and exit</button>
        </header>

        <div className={styles.progressLabel}><span>Step {step} of 7</span><span>{step === 1 ? 'Restaurant basics' : 'Guest QR experience'}</span></div>
        <div className={styles.progressTrack}><span style={{ width: `${(step / 7) * 100}%` }} /></div>
        <ol className={styles.steps} aria-label="Restaurant setup progress">
          {['Basics', 'Guest flow', 'Menu starter', 'Menu review', 'Public profile', 'QR materials', 'Publish'].map((item, index) => <li key={item} className={index + 1 <= step ? styles.activeStep : ''}>{index + 1 <= step && <Check size={12} />}{item}</li>)}
        </ol>

        {message && <p className={styles.message} role="status">{message}</p>}

        {step === 1 ? (
          <form onSubmit={saveBasics} className={styles.content}>
            <p className={styles.eyebrow}>Start with the essentials</p>
            <h1>Tell us about this restaurant.</h1>
            <p className={styles.lead}>We use these details to recommend the right menu starter and guest experience. You can revise them later.</p>
            <div className={styles.fieldGrid}>
              <label>Restaurant or branch name<input required value={basics.name} onChange={event => setBasics(current => ({ ...current, name: event.target.value }))} /></label>
              <label>Primary menu language<select value={basics.primaryLanguage} onChange={event => setBasics(current => ({ ...current, primaryLanguage: event.target.value }))}><option value="AM">Amharic first</option><option value="EN">English first</option></select></label>
              <label>Address <span>(optional)</span><input value={basics.address} onChange={event => setBasics(current => ({ ...current, address: event.target.value }))} placeholder="Bole, Addis Ababa" /></label>
              <label>Phone <span>(optional)</span><input value={basics.phone} onChange={event => setBasics(current => ({ ...current, phone: event.target.value }))} placeholder="+251…" /></label>
            </div>
            <fieldset className={styles.typeFieldset}><legend>What kind of restaurant is this?</legend><div className={styles.typeGrid}>{restaurantTypes.map(([value, title, copy]) => <button type="button" key={value} className={`${styles.typeCard} ${basics.restaurantType === value ? styles.selected : ''}`} onClick={() => setBasics(current => ({ ...current, restaurantType: value }))}><b>{title}</b><span>{copy}</span></button>)}</div></fieldset>
            <div className={styles.actions}><button type="button" className={styles.backButton} onClick={() => router.push('/admin/branches')}>Exit setup</button><button className={styles.nextButton} disabled={saving}>Continue <ChevronRight size={18} /></button></div>
          </form>
        ) : (
          <form onSubmit={saveExperience} className={styles.content}>
            <button type="button" className={styles.textBack} onClick={() => setStep(1)}><ChevronLeft size={16} /> Back to basics</button>
            <p className={styles.eyebrow}>Choose the guest journey</p>
            <h1>How should guests use your QR menu?</h1>
            <p className={styles.lead}>Choose one setup for this branch. The menu stays the same if your service style changes later.</p>
            <div className={styles.modeGrid}>{guestModes.map(({ value, icon: Icon, title, description }) => <button type="button" key={value} className={`${styles.modeCard} ${experience.serviceMode === value ? styles.selected : ''}`} onClick={() => setExperience(current => ({ ...current, serviceMode: value }))}><span><Icon size={22} /></span><b>{title}</b><p>{description}</p></button>)}</div>
            <div className={styles.experienceFields}>
              {experience.serviceMode !== ServiceMode.MENU_ONLY && <label className={styles.toggle}><input type="checkbox" checked={experience.enableTakeaway} onChange={event => setExperience(current => ({ ...current, enableTakeaway: event.target.checked }))} /><span><b>Allow takeaway</b><small>Guests can choose takeaway when they open the shared QR.</small></span></label>}
              <label>WhatsApp number <span>(optional)</span><input value={experience.whatsappNumber} onChange={event => setExperience(current => ({ ...current, whatsappNumber: event.target.value }))} placeholder="+251…" /></label>
              {experience.serviceMode === ServiceMode.PER_TABLE_QR && <label>How many table QR codes?<input required min="1" max="200" type="number" value={experience.tableCount} onChange={event => setExperience(current => ({ ...current, tableCount: Math.max(1, Number(event.target.value) || 1) }))} /><small>We will create secure codes for these tables. You can add more later.</small></label>}
            </div>
            <div className={styles.actions}><button type="button" className={styles.backButton} onClick={() => setStep(1)}>Back</button><button className={styles.nextButton} disabled={saving}>{saving ? 'Saving…' : 'Save and choose menu starter'} <ChevronRight size={18} /></button></div>
          </form>
        )}

        <aside className={styles.nextUp}><MapPin size={16} /><span><b>Next up:</b> choose an Ethiopian menu starter, then review prices and translations before publishing.</span></aside>
      </section>
    </main>
  );
}
