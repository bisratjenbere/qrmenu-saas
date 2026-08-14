'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { MenuPresetTemplateResponse } from '@qrmenu/shared';
import {
  LayoutTemplate,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Edit2,
  Sparkles,
  DatabaseZap,
  Code,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

type TemplateItemDraft = {
  name: string;
  nameAmharic?: string;
  description?: string;
  price: number;
  dietaryLabels?: string[];
  spiceLevel?: number;
};

type TemplateSectionDraft = {
  name: string;
  nameAmharic?: string;
  timeSlot?: 'ALL_DAY' | 'BREAKFAST' | 'LUNCH_DINNER';
  items: TemplateItemDraft[];
};

const DEFAULT_TEMPLATE_SECTIONS: TemplateSectionDraft[] = [
  {
    name: 'Fasting dishes',
    items: [
      {
        name: 'Shiro Wot',
        description: 'Chickpea stew served with injera.',
        price: 280,
        dietaryLabels: ['FASTING', 'VEGAN'],
        spiceLevel: 1,
      },
    ],
  },
  {
    name: 'Traditional favourites',
    items: [
      {
        name: 'Doro Wot',
        description: 'Slow-cooked chicken stew with a boiled egg.',
        price: 520,
        spiceLevel: 2,
      },
    ],
  },
];

const DEFAULT_SECTIONS_JSON = JSON.stringify(DEFAULT_TEMPLATE_SECTIONS, null, 2);

const parseSectionsForEditor = (raw: string): TemplateSectionDraft[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((section: any) => ({
      ...section,
      name: typeof section?.name === 'string' ? section.name : '',
      nameAmharic: typeof section?.nameAmharic === 'string' ? section.nameAmharic : '',
      timeSlot: ['ALL_DAY', 'BREAKFAST', 'LUNCH_DINNER'].includes(section?.timeSlot)
        ? section.timeSlot
        : 'ALL_DAY',
      items: Array.isArray(section?.items)
        ? section.items.map((item: any) => ({
            ...item,
            name: typeof item?.name === 'string' ? item.name : '',
            nameAmharic: typeof item?.nameAmharic === 'string' ? item.nameAmharic : '',
            description: typeof item?.description === 'string' ? item.description : '',
            price: typeof item?.price === 'number' ? item.price : 0,
            dietaryLabels: Array.isArray(item?.dietaryLabels) ? item.dietaryLabels : [],
            spiceLevel: typeof item?.spiceLevel === 'number' ? item.spiceLevel : 0,
          }))
        : [],
    }));
  } catch {
    return [];
  }
};

export default function SuperAdminTemplatesPage() {
  const [templates, setTemplates] = useState<MenuPresetTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [nameAmharic, setNameAmharic] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Full Restaurant');
  const [sectionsJson, setSectionsJson] = useState(DEFAULT_SECTIONS_JSON);
  
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editorSections = parseSectionsForEditor(sectionsJson);
  const updateEditorSections = (next: TemplateSectionDraft[]) => {
    setSectionsJson(JSON.stringify(next, null, 2));
  };
  const updateSection = (sectionIndex: number, patch: Partial<TemplateSectionDraft>) => {
    updateEditorSections(editorSections.map((section, index) => index === sectionIndex ? { ...section, ...patch } : section));
  };
  const updateItem = (sectionIndex: number, itemIndex: number, patch: Partial<TemplateItemDraft>) => {
    updateEditorSections(editorSections.map((section, index) => index === sectionIndex
      ? { ...section, items: section.items.map((item, itemIndex_) => itemIndex_ === itemIndex ? { ...item, ...patch } : item) }
      : section));
  };
  const addSection = () => updateEditorSections([
    ...editorSections,
    { name: '', nameAmharic: '', timeSlot: 'ALL_DAY', items: [{ name: '', nameAmharic: '', description: '', price: 0, dietaryLabels: [], spiceLevel: 0 }] },
  ]);
  const addItem = (sectionIndex: number) => updateEditorSections(editorSections.map((section, index) => index === sectionIndex
    ? { ...section, items: [...section.items, { name: '', nameAmharic: '', description: '', price: 0, dietaryLabels: [], spiceLevel: 0 }] }
    : section));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiClient.fetchPresetTemplates();
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Failed to load preset templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setNameAmharic('');
    setDescription('');
    setCategory('Full Restaurant');
    setSectionsJson(DEFAULT_SECTIONS_JSON);
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: MenuPresetTemplateResponse) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setNameAmharic(tpl.nameAmharic || '');
    setDescription(tpl.description || '');
    setCategory(tpl.category);
    let parsed = '';
    try {
      parsed = JSON.stringify(JSON.parse(tpl.sectionsJson), null, 2);
    } catch(e) {
      parsed = tpl.sectionsJson;
    }
    setSectionsJson(parsed);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // validate JSON
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(sectionsJson);
    } catch (e) {
      setToastMessage('Invalid JSON format for sections');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
      setSubmitting(false);
      return;
    }

    const hasInvalidContent = !Array.isArray(parsedJson) || parsedJson.length === 0 || parsedJson.some(
      (section: TemplateSectionDraft) => !section.name.trim() || !section.items?.length || section.items.some(
        (item: TemplateItemDraft) => !item.name.trim() || !Number.isFinite(item.price) || item.price <= 0
      )
    );
    if (hasInvalidContent) {
      setToastMessage('Add a section name and at least one priced item to every section');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
      setSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        await apiClient.updatePresetTemplate(editingId, {
          name,
          nameAmharic,
          description,
          category,
          sectionsJson: JSON.stringify(parsedJson),
        });
        setToastMessage('Template updated successfully');
      } else {
        await apiClient.createPresetTemplate({
          name,
          nameAmharic,
          description,
          category,
          sectionsJson: JSON.stringify(parsedJson),
        });
        setToastMessage('Template created successfully');
      }
      setIsModalOpen(false);
      setToastType('success');
      setTimeout(() => setToastMessage(''), 3000);
      loadTemplates();
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to save template');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this preset template?')) return;
    setDeletingId(id);
    try {
      await apiClient.deletePresetTemplate(id);
      setToastMessage('Template deleted successfully');
      setToastType('success');
      setTimeout(() => setToastMessage(''), 3000);
      loadTemplates();
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to delete template');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    const defaults = [
      {
        name: 'Traditional Ethiopian Restaurant',
        nameAmharic: 'ባህላዊ ምግብ ቤት',
        description: 'Comprehensive setup for a full-scale traditional Ethiopian dining experience.',
        category: 'Traditional',
        sectionsJson: JSON.stringify([
          { name: 'Appetizers', items: [{ name: 'Azifa', description: 'Seasoned green lentil salad.', price: 220, dietaryLabels: ['FASTING', 'VEGAN'] }] },
          { name: 'Tibs (Meat)', items: [{ name: 'Lamb Tibs', description: 'Sautéed lamb with rosemary and onions.', price: 560, spiceLevel: 1 }] },
          { name: 'Wot (Stews)', items: [{ name: 'Doro Wot', description: 'Slow-cooked chicken stew with a boiled egg.', price: 520, spiceLevel: 2 }] },
          { name: 'Kitfo & Raw Meats', items: [{ name: 'Kitfo', description: 'Minced beef seasoned with mitmita and kibbeh.', price: 580, spiceLevel: 2 }] },
          { name: 'Vegetarian / Vegan', items: [{ name: 'Shiro Wot', description: 'Chickpea stew served with injera.', price: 280, dietaryLabels: ['FASTING', 'VEGAN'], spiceLevel: 1 }] },
          { name: 'Special Combos', items: [{ name: 'Beyaynetu', description: 'A selection of Ethiopian stews served on injera.', price: 480, isCombo: true, comboItemCount: 5, comboPrice: 480 }] },
          { name: 'Hot Beverages', items: [{ name: 'Ethiopian Coffee', description: 'Freshly brewed Ethiopian coffee.', price: 90 }] },
          { name: 'Cold Beverages', items: [{ name: 'Fresh Mango Juice', description: 'Freshly blended mango juice.', price: 150 }] }
        ])
      },
      {
        name: 'Ethiopian Café & Bakery',
        nameAmharic: 'ካፌ እና ዳቦ ቤት',
        description: 'Perfect for coffee shops, pastry houses, and light breakfast spots.',
        category: 'Cafe',
        sectionsJson: JSON.stringify([
          { name: 'Hot Coffee & Tea', items: [{ name: 'Ethiopian Coffee', description: 'Freshly brewed Ethiopian coffee.', price: 90 }] },
          { name: 'Fresh Juices & Smoothies', items: [{ name: 'Avocado Juice', description: 'Fresh avocado blended with milk.', price: 170 }] },
          { name: 'Pastries & Cakes', items: [{ name: 'Butter Croissant', description: 'Freshly baked butter croissant.', price: 110 }] },
          { name: 'Breakfast & Light Bites', timeSlot: 'BREAKFAST', items: [{ name: 'Chechebsa', description: 'Torn flatbread with spiced butter and berbere.', price: 220 }] }
        ])
      },
      {
        name: 'Fasting Specialty House',
        nameAmharic: 'የጾም ቤት',
        description: 'Dedicated entirely to vegan, fasting (Tsome) dishes for fasting seasons.',
        category: 'Vegan/Fasting',
        sectionsJson: JSON.stringify([
          { name: 'Fasting Starters', items: [{ name: 'Azifa', description: 'Seasoned green lentil salad.', price: 220, dietaryLabels: ['FASTING', 'VEGAN'] }] },
          { name: 'Shiro & Lentils', items: [{ name: 'Shiro Wot', description: 'Chickpea stew served with injera.', price: 280, dietaryLabels: ['FASTING', 'VEGAN'], spiceLevel: 1 }] },
          { name: 'Vegetable Stews', items: [{ name: 'Gomen', description: 'Seasoned Ethiopian collard greens.', price: 240, dietaryLabels: ['FASTING', 'VEGAN'] }] },
          { name: 'Beyaynetu Combos', items: [{ name: 'Yetsom Beyaynetu', description: 'A selection of fasting stews served on injera.', price: 420, dietaryLabels: ['FASTING', 'VEGAN'], isCombo: true, comboItemCount: 5, comboPrice: 420 }] },
          { name: 'Juices & Beverages', items: [{ name: 'Fresh Mango Juice', description: 'Freshly blended mango juice.', price: 150 }] }
        ])
      },
      {
        name: 'Modern Bistro & Lounge',
        nameAmharic: 'ዘመናዊ ምግብ ቤት',
        description: 'A blend of local and international cuisines for upscale dining.',
        category: 'Bistro/Lounge',
        sectionsJson: JSON.stringify([
          { name: 'Starters & Salads', items: [{ name: 'Avocado Salad', description: 'Avocado, tomato, onion, and lemon dressing.', price: 250, dietaryLabels: ['VEGAN'] }] },
          { name: 'Burgers & Sandwiches', items: [{ name: 'Beef Burger', description: 'Grilled beef patty with fries.', price: 420 }] },
          { name: 'Pasta & Pizza', items: [{ name: 'Chicken Pasta', description: 'Creamy pasta with grilled chicken.', price: 430 }] },
          { name: 'Grill & Steaks', items: [{ name: 'Beef Steak', description: 'Grilled steak served with seasonal vegetables.', price: 690 }] },
          { name: 'Desserts', items: [{ name: 'Chocolate Cake', description: 'Chocolate cake slice.', price: 180 }] },
          { name: 'Cocktails & Beverages', items: [{ name: 'Fresh Mango Juice', description: 'Freshly blended mango juice.', price: 150 }] }
        ])
      }
    ];

    try {
      for (const def of defaults) {
        await apiClient.createPresetTemplate(def);
      }
      setToastMessage('Default templates seeded successfully');
      setToastType('success');
      setTimeout(() => setToastMessage(''), 3000);
      loadTemplates();
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to seed templates');
      setToastType('error');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setSeeding(false);
    }
  };

  const filteredTemplates = templates.filter(
    t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '2rem' }}>
      
      {/* Hero Header */}
      <div style={{ 
        background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)', 
        border: '1px solid #334155',
        borderRadius: '1rem',
        padding: '2.5rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: '#3b82f6', color: '#fff', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <LayoutTemplate size={24} />
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                Menu Preset Templates
              </h1>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#94a3b8', margin: '0 0 0.5rem 3.25rem' }}>
              የምናሌ ቅንብሮች
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: '0 0 0 3.25rem', maxWidth: '600px' }}>
              Manage structural blueprints for new restaurants. These templates define default categories and items for 1-tap onboarding.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {templates.length === 0 && !loading && (
              <button
                onClick={handleSeedDefaults}
                disabled={seeding}
                style={{
                  background: 'transparent',
                  color: '#fbbf24',
                  border: '1px solid #fbbf24',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: seeding ? 'not-allowed' : 'pointer',
                  opacity: seeding ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {seeding ? <RefreshCw size={18} className="animate-spin" /> : <DatabaseZap size={18} />}
                Seed Defaults
              </button>
            )}
            <button
              onClick={openCreateModal}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)',
                transition: 'transform 0.1s'
              }}
            >
              <Plus size={18} />
              New Template
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div style={{ 
          padding: '1rem 1.25rem', 
          borderRadius: '0.5rem', 
          background: toastType === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          color: toastType === 'success' ? '#34d399' : '#f87171', 
          border: `1px solid ${toastType === 'success' ? '#059669' : '#dc2626'}`, 
          marginBottom: '2rem', 
          fontSize: '0.9375rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {toastType === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toastMessage}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ marginBottom: '2rem', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input 
          type="text" 
          placeholder="Search templates..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem 0.75rem 2.75rem',
            color: '#f8fafc',
            outline: 'none',
            fontSize: '0.9375rem'
          }}
        />
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <RefreshCw size={32} className="animate-spin" />
            <span>Loading premium templates...</span>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', background: '#1e293b', borderRadius: '1rem', border: '1px dashed #334155' }}>
            <div style={{ color: '#64748b', marginBottom: '1rem' }}>
              <LayoutTemplate size={48} style={{ margin: '0 auto', opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>No templates found</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>Click "Seed Defaults" or "New Template" to get started.</p>
          </div>
        ) : (
          filteredTemplates.map(tpl => {
            let sections: any[] = [];
            try {
              sections = JSON.parse(tpl.sectionsJson || '[]');
            } catch (e) {
              sections = [];
            }
            
            const isDetailed = sections.length > 0 && typeof sections[0] === 'object' && sections[0].name;
            const totalItems = isDetailed ? sections.reduce((acc, curr) => acc + (curr.items?.length || 0), 0) : 0;
            const sectionCount = sections.length;

            return (
              <div
                key={tpl.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid #334155',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  transition: 'transform 0.2s, border-color 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#475569'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                {/* Decoration */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%)', transform: 'translate(30%, -30%)', pointerEvents: 'none' }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ 
                        display: 'inline-block',
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        color: '#60a5fa', 
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        {tpl.category}
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem 0' }}>
                        {tpl.name}
                      </h3>
                      {tpl.nameAmharic && (
                        <div style={{ fontSize: '0.875rem', color: '#94a3b8', fontFamily: 'serif' }}>
                          {tpl.nameAmharic}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(tpl)}
                        style={{ background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                        onMouseLeave={e => e.currentTarget.style.background = '#334155'}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        disabled={deletingId === tpl.id}
                        style={{ background: '#334155', color: '#f87171', border: 'none', borderRadius: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: deletingId === tpl.id ? 'not-allowed' : 'pointer', opacity: deletingId === tpl.id ? 0.5 : 1, transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                        onMouseLeave={e => e.currentTarget.style.background = '#334155'}
                      >
                        {deletingId === tpl.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <p style={{ color: '#cbd5e1', fontSize: '0.875rem', margin: '0 0 1.25rem 0', lineHeight: 1.5, minHeight: '2.5rem' }}>
                    {tpl.description}
                  </p>

                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Sections</span>
                        <span style={{ fontSize: '1.125rem', color: '#e2e8f0', fontWeight: 700 }}>{sectionCount}</span>
                      </div>
                      {isDetailed && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Items</span>
                          <span style={{ fontSize: '1.125rem', color: '#10b981', fontWeight: 700 }}>{totalItems}+</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {sections.slice(0, 6).map((sec, idx) => (
                        <span key={idx} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                          {typeof sec === 'string' ? sec : sec.name}
                        </span>
                      ))}
                      {sections.length > 6 && (
                        <span style={{ background: '#1e293b', border: '1px dashed #475569', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                          +{sections.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50, padding: '1rem' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.25rem', width: '100%', maxWidth: '600px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} color="#3b82f6" />
              {editingId ? 'Edit Preset Template' : 'Create Preset Template'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '2rem' }}>
              Create a bilingual starter menu with real, editable items for one-tap tenant onboarding.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.375rem' }}>
                    Template Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traditional Ethiopian"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.375rem' }}>
                    Amharic Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ባህላዊ ምግብ ቤት"
                    value={nameAmharic}
                    onChange={e => setNameAmharic(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', outline: 'none', fontFamily: 'serif' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.375rem' }}>
                  Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional, Cafe, Bistro..."
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.375rem' }}>
                  Description
                </label>
                <textarea
                  placeholder="Brief description of starter menu layout..."
                  value={description}
                  rows={2}
                  onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.375rem' }}>
                  <Code size={16} />
                  Menu content
                </label>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Add the starter sections and items a restaurant should review before publishing. Prices are in ETB.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {editorSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '0.75rem', padding: '0.875rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <input required placeholder="Section name" value={section.name} onChange={e => updateSection(sectionIndex, { name: e.target.value })} style={{ padding: '0.625rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#f8fafc', outline: 'none' }} />
                        <input placeholder="Amharic name (optional)" value={section.nameAmharic || ''} onChange={e => updateSection(sectionIndex, { nameAmharic: e.target.value })} style={{ padding: '0.625rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#f8fafc', outline: 'none' }} />
                        <button type="button" aria-label="Remove section" onClick={() => updateEditorSections(editorSections.filter((_, index) => index !== sectionIndex))} style={{ background: 'transparent', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '0.375rem', padding: '0.5rem', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                      <select value={section.timeSlot || 'ALL_DAY'} onChange={e => updateSection(sectionIndex, { timeSlot: e.target.value as TemplateSectionDraft['timeSlot'] })} style={{ marginBottom: '0.75rem', padding: '0.5rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#cbd5e1' }}>
                        <option value="ALL_DAY">All day</option>
                        <option value="BREAKFAST">Breakfast only</option>
                        <option value="LUNCH_DINNER">Lunch and dinner</option>
                      </select>
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px auto', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <input required placeholder="Item name" value={item.name} onChange={e => updateItem(sectionIndex, itemIndex, { name: e.target.value })} style={{ padding: '0.625rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#f8fafc', outline: 'none' }} />
                          <input placeholder="Amharic name (optional)" value={item.nameAmharic || ''} onChange={e => updateItem(sectionIndex, itemIndex, { nameAmharic: e.target.value })} style={{ padding: '0.625rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#f8fafc', outline: 'none' }} />
                          <input required type="number" min="0.01" step="0.01" aria-label="Price in ETB" placeholder="ETB" value={item.price || ''} onChange={e => updateItem(sectionIndex, itemIndex, { price: Number(e.target.value) })} style={{ padding: '0.625rem', background: '#1e293b', border: '1px solid #475569', borderRadius: '0.375rem', color: '#f8fafc', outline: 'none' }} />
                          <button type="button" aria-label="Remove item" onClick={() => updateSection(sectionIndex, { items: section.items.filter((_, index) => index !== itemIndex) })} style={{ background: 'transparent', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: '0.375rem', padding: '0.5rem', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addItem(sectionIndex)} style={{ marginTop: '0.75rem', background: 'transparent', color: '#60a5fa', border: '1px solid #1d4ed8', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600 }}>Add item</button>
                    </div>
                  ))}
                  <button type="button" onClick={addSection} style={{ background: 'transparent', color: '#60a5fa', border: '1px dashed #2563eb', borderRadius: '0.5rem', padding: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Add section</button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {submitting && <RefreshCw size={16} className="animate-spin" />}
                  {submitting ? 'Saving...' : (editingId ? 'Update Template' : 'Save Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
