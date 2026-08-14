'use client';
import { useEffect, useState, DragEvent, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { 
  MenuResponse, MenuSectionResponse, MenuItemResponse, 
  MENU_THEMES, ETHIOPIAN_DISHES, searchDishes, 
  getTransliteration, SPICE_LEVELS, getThemeById, DEFAULT_THEME_ID 
} from '@qrmenu/shared';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';
import MenuView from '@/components/menu/MenuView';

const SECTION_PRESETS = [
  { name: 'Appetizers', nameAmharic: 'መክሰስ', icon: '🥗' },
  { name: 'Beyaynetu', nameAmharic: 'በያይነቱ', icon: '🍽' },
  { name: 'Tibs', nameAmharic: 'ጥብስ', icon: '🥩' },
  { name: 'Wot', nameAmharic: 'ወጥ', icon: '🍲' },
  { name: 'Kitfo', nameAmharic: 'ክትፎ', icon: '🔪' },
  { name: 'Fasting', nameAmharic: 'የጾም', icon: '🌿' },
  { name: 'Breakfast', nameAmharic: 'ቁርስ', icon: '☀️' },
  { name: 'Beverages', nameAmharic: 'መጠጦች', icon: '🥤' },
  { name: 'Coffee', nameAmharic: 'ቡና', icon: '☕' }
];

export default function MenusAdmin() {
  const params = useParams();
  const branchId = params.branchId as string;
  const { locale, toggleLanguage, t } = useLanguage();
  const isAmharic = locale === 'AM';

  const [menu, setMenu] = useState<MenuResponse | null>(null);
  
  // Modals
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isDishCatalogOpen, setIsDishCatalogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Data
  const [templates, setTemplates] = useState<any[]>([]);
  const [branchTheme, setBranchTheme] = useState(DEFAULT_THEME_ID);

  // Forms
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionNameAmharic, setNewSectionNameAmharic] = useState('');
  const [newSectionTimeSlot, setNewSectionTimeSlot] = useState('ALL_DAY');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormStep, setItemFormStep] = useState(1);

  const [newItemData, setNewItemData] = useState({
    name: '', nameAmharic: '', description: '', priceInput: '', isAvailable: true, photoUrl: '',
    dietaryLabels: [] as string[], spiceLevel: 0, prepTimeMin: 0, calories: 0,
    servingSize: '', isCombo: false, comboItemCount: 0, comboPriceInput: ''
  });

  const [catalogQuery, setCatalogQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMenuData = async () => {
    try {
      const branches = await apiClient.fetchBranches();
      const thisBranch = branches.find(b => b.id === branchId);
      if (thisBranch && thisBranch.themeId) {
        setBranchTheme(thisBranch.themeId);
      }

      const data = await apiClient.fetchMenuAdmin(branchId);
      if (Array.isArray(data)) {
        if (data.length > 0) {
          setMenu(data[0]);
        } else {
          const newMenu = await apiClient.createMenu(branchId, { name: 'Main Menu' });
          setMenu({ ...newMenu, sections: [] });
        }
      } else if (data && typeof data === 'object' && !Array.isArray(data)) {
        const single = data as MenuResponse;
        setMenu({
          ...single,
          sections: single.sections || [],
        });
      }
      
      const tpls = await apiClient.fetchMenuTemplates();
      setTemplates(tpls || []);
      
    } catch (e) {
      console.error(e);
      try {
        const newMenu = await apiClient.createMenu(branchId, { name: 'Main Menu' });
        setMenu({ ...newMenu, sections: [] });
      } catch(err) {}
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, [branchId]);

  // Actions
  const handlePublish = async () => {
    if (!menu) return;
    try {
      await apiClient.publishMenu(menu.id);
      showToast('Menu published successfully', 'success');
      fetchMenuData();
    } catch (e) {
      showToast('Failed to publish', 'error');
    }
  };

  const handleUpdateTheme = async (themeId: string) => {
    try {
      await apiClient.updateBranchTheme(branchId, themeId);
      setBranchTheme(themeId);
      setIsThemeModalOpen(false);
      showToast('Theme updated successfully', 'success');
    } catch (e) {
      showToast('Failed to update theme', 'error');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!menu) return;
    try {
      const impact = await apiClient.templateImpact(menu.id);
      const hasExistingContent = impact.sectionsToReplace > 0 || impact.itemsToReplace > 0;
      const confirmed = window.confirm(
        hasExistingContent
          ? `Applying this template will replace ${impact.sectionsToReplace} section(s), ${impact.itemsToReplace} item(s), and ${impact.modifierGroupsAffected} modifier group(s). A backup will be saved. Continue?`
          : 'Applying this template will add its starter sections and items to this empty menu. You can edit every detail afterwards. Continue?'
      );
      if (!confirmed) return;

      await apiClient.applyTemplate(menu.id, templateId, undefined, true);
      showToast('Template applied. Review prices and availability before publishing.', 'success');
      fetchMenuData();
    } catch (e: any) {
      showToast(e.message || 'Failed to apply template', 'error');
    }
  };

  const handleCreatePresetSection = async (preset: typeof SECTION_PRESETS[0]) => {
    if (!menu) return;
    try {
      await apiClient.createSection(menu.id, { 
        name: preset.name, 
        nameAmharic: preset.nameAmharic, 
        timeSlot: 'ALL_DAY', 
        sortOrder: menu.sections.length 
      });
      fetchMenuData();
      showToast(`Section ${preset.name} created`, 'success');
    } catch (e) {
      showToast('Failed to create preset section', 'error');
    }
  };

  const handleCreateSection = async () => {
    if (!menu) return;
    try {
      await apiClient.createSection(menu.id, { 
        name: newSectionName, 
        nameAmharic: newSectionNameAmharic, 
        timeSlot: newSectionTimeSlot, 
        sortOrder: menu.sections.length 
      });
      setNewSectionName('');
      setNewSectionNameAmharic('');
      setNewSectionTimeSlot('ALL_DAY');
      setIsSectionModalOpen(false);
      fetchMenuData();
      showToast('Section created', 'success');
    } catch (e) {
      showToast('Failed to create section', 'error');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    try {
      await apiClient.deleteSection(sectionId);
      fetchMenuData();
      showToast('Section deleted', 'success');
    } catch (e) {
      showToast('Failed to delete section', 'error');
    }
  };

  const handleSectionReorder = async (sectionId: string, currentOrder: number, direction: 'up' | 'down') => {
    try {
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
      await apiClient.updateSection(sectionId, { sortOrder: newOrder });
      fetchMenuData();
    } catch (e) {
      showToast('Failed to reorder section', 'error');
    }
  };

  const handleItemReorder = async (itemId: string, currentOrder: number, direction: 'up' | 'down') => {
    try {
      const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;
      await apiClient.updateItem(itemId, { sortOrder: newOrder });
      fetchMenuData();
    } catch (e) {
      showToast('Failed to reorder item', 'error');
    }
  };

  const openItemModal = (sectionId: string, item?: MenuItemResponse, prefill?: any) => {
    setActiveSectionId(sectionId);
    setItemFormStep(1);
    if (prefill) {
      setEditingItemId(null);
      setNewItemData({
        ...newItemData,
        name: prefill.name || '',
        nameAmharic: prefill.nameAmharic || '',
        description: prefill.description || '',
        dietaryLabels: prefill.dietaryLabels || [],
        spiceLevel: prefill.spiceLevel || 0,
        prepTimeMin: prefill.prepTimeMin || 0,
        servingSize: prefill.servingSize || '',
        priceInput: prefill.suggestedPriceMin ? String(prefill.suggestedPriceMin) : ''
      });
      setPreviewUrl(null);
    } else if (item) {
      setEditingItemId(item.id);
      setNewItemData({
        name: item.name,
        nameAmharic: (item as any).nameAmharic || '',
        description: item.description || '',
        priceInput: typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price as any).toFixed(2),
        isAvailable: item.isAvailable,
        photoUrl: item.photoUrl || '',
        dietaryLabels: item.dietaryLabels || [],
        spiceLevel: item.spiceLevel || 0,
        prepTimeMin: item.prepTimeMin || 0,
        calories: item.calories || 0,
        servingSize: (item as any).servingSize || '',
        isCombo: (item as any).isCombo || false,
        comboItemCount: (item as any).comboItemCount || 0,
        comboPriceInput: (item as any).comboPrice != null ? parseFloat((item as any).comboPrice).toFixed(2) : ''
      });
      setPreviewUrl(item.photoUrl || null);
    } else {
      setEditingItemId(null);
      setNewItemData({
        name: '', nameAmharic: '', description: '', priceInput: '', isAvailable: true, photoUrl: '',
        dietaryLabels: [], spiceLevel: 0, prepTimeMin: 0, calories: 0,
        servingSize: '', isCombo: false, comboItemCount: 0, comboPriceInput: ''
      });
      setPreviewUrl(null);
    }
    setFile(null);
    setIsItemModalOpen(true);
  };

  const handleTransliteration = (e: React.ChangeEvent<HTMLInputElement>, field: 'name' | 'nameAmharic') => {
    const val = e.target.value;
    const trans = getTransliteration(val);
    if (field === 'name') {
      setNewItemData(prev => ({ ...prev, name: val, nameAmharic: (trans && !prev.nameAmharic) ? trans : prev.nameAmharic }));
    } else {
      setNewItemData(prev => ({ ...prev, nameAmharic: val, name: (trans && !prev.name) ? trans : prev.name }));
    }
  };

  const handleSaveItem = async () => {
    if (!activeSectionId) return;
    try {
      let photoUrl = newItemData.photoUrl;
      if (file) {
        const { uploadUrl, publicUrl } = await apiClient.getPresignedUrl({
          fileName: file.name,
          contentType: file.type
        });
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        photoUrl = publicUrl;
      }
      
      const payload = {
        ...newItemData,
        photoUrl,
        price: parseFloat(newItemData.priceInput) || 0,
        comboPrice: parseFloat(newItemData.comboPriceInput) || undefined,
        sortOrder: 0
      };

      if (editingItemId) {
        await apiClient.updateItem(editingItemId, payload);
        showToast('Item updated successfully', 'success');
      } else {
        await apiClient.createItem(activeSectionId, payload);
        showToast('Item created successfully', 'success');
      }
      
      setIsItemModalOpen(false);
      setIsDishCatalogOpen(false);
      fetchMenuData();
    } catch (e) {
      showToast(editingItemId ? 'Failed to update item' : 'Failed to create item', 'error');
    }
  };

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await apiClient.toggleAvailability(itemId, { isAvailable: !isAvailable });
      fetchMenuData();
    } catch (e) {
      showToast('Failed to toggle', 'error');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await apiClient.deleteItem(itemId);
      fetchMenuData();
      showToast('Item deleted', 'success');
    } catch (e) {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  if (!menu) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const statusColor = menu.status === 'PUBLISHED' ? '#10B981' : '#F59E0B';
  const pulseAnim = menu.status === 'PUBLISHED' ? 'pulse 2s infinite' : 'none';

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .theme-card { cursor: pointer; border: 2px solid transparent; border-radius: 0.5rem; padding: 1rem; transition: all 0.2s; }
        .theme-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .theme-card.active { border-color: var(--color-primary); }
      `}</style>
      
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000,
          background: toast.type === 'success' ? 'var(--color-success, #10B981)' : 'var(--color-error, #EF4444)',
          color: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          transition: 'opacity 0.3s'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 style={{ margin: 0 }}>{isAmharic ? 'ምናሌ አርታዒ' : 'Menu Editor'}</h1>
          <span style={{
            background: statusColor, color: 'white', padding: '0.25rem 0.75rem', 
            borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 'bold',
            animation: pulseAnim
          }}>
            {menu.status || 'DRAFT'}
          </span>
          <button 
            onClick={toggleLanguage}
            style={{ 
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', 
              borderRadius: '999px', padding: '0.25rem 0.75rem', cursor: 'pointer', fontWeight: 'bold' 
            }}
          >
            {locale === 'EN' ? 'EN │ አማ' : 'አማ │ EN'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => setIsThemeModalOpen(true)}>
            🎨 {isAmharic ? 'ገጽታ ይምረጡ' : 'Visual Theme'}
          </button>
          <button className="btn" onClick={() => setIsDishCatalogOpen(true)}>
            📚 {isAmharic ? 'ከምግብ ካታሎግ ይምረጡ' : 'Browse Dish Catalog'}
          </button>
          <button className="btn" onClick={() => setIsPreviewOpen(true)}>
            👁️ {isAmharic ? 'ምናሌ ይቃኙ' : 'Preview Menu'}
          </button>
          <button className="btn" onClick={() => setIsSectionModalOpen(true)}>
            + {isAmharic ? 'ክፍል ጨምር' : 'Add Section'}
          </button>
          <button className="btn btn-primary" onClick={handlePublish}>
            {isAmharic ? 'አትም' : 'Publish Menu'}
          </button>
        </div>
      </div>

      {/* Presets Bar */}
      <div style={{ 
        position: 'sticky', top: '0', zIndex: 10, background: 'var(--color-bg)', 
        padding: '1rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem',
        display: 'flex', gap: '0.5rem', overflowX: 'auto', whiteSpace: 'nowrap'
      }}>
        {SECTION_PRESETS.map(preset => (
          <button 
            key={preset.name}
            onClick={() => handleCreatePresetSection(preset)}
            style={{ 
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: '999px', padding: '0.5rem 1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
            }}
          >
            {preset.icon} {isAmharic ? preset.nameAmharic : preset.name}
          </button>
        ))}
      </div>

      {/* Empty State / Templates */}
      {menu.sections.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--color-surface)', borderRadius: '1rem', marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>{isAmharic ? 'ከባዶ ጀምር ወይም አብነት ተጠቀም' : 'Start from scratch or use a Template'}</h2>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1.5rem', width: '250px' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{isAmharic && tpl.nameAmharic ? tpl.nameAmharic : tpl.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{tpl.description}</p>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => handleApplyTemplate(tpl.id)}>
                  {isAmharic ? 'ተጠቀም' : 'Apply Template'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {menu.sections.map((section, sIndex) => (
          <div key={section.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <button onClick={() => handleSectionReorder(section.id, section.sortOrder, 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>▲</button>
                  <button onClick={() => handleSectionReorder(section.id, section.sortOrder, 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>▼</button>
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{isAmharic && section.nameAmharic ? section.nameAmharic : section.name}</h2>
                  {(!isAmharic && section.nameAmharic) || (isAmharic && section.name) ? (
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      {isAmharic ? section.name : section.nameAmharic}
                    </span>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={() => openItemModal(section.id)}>+ {isAmharic ? 'ምግብ ጨምር' : 'Add Item'}</button>
                <button className="btn" style={{ color: 'var(--color-error)' }} onClick={() => handleDeleteSection(section.id)}>{isAmharic ? 'ሰርዝ' : 'Delete Section'}</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {section.items.map((item, iIndex) => (
                <div key={item.id} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {item.photoUrl && <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '0.25rem' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{isAmharic && (item as any).nameAmharic ? (item as any).nameAmharic : item.name}</h3>
                      {(!isAmharic && (item as any).nameAmharic) || (isAmharic && item.name) ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                           {isAmharic ? item.name : (item as any).nameAmharic}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <button onClick={() => handleItemReorder(item.id, item.sortOrder, 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>▲</button>
                      <button onClick={() => handleItemReorder(item.id, item.sortOrder, 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>▼</button>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{item.description}</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>
                    ETB {typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price as any).toFixed(2)}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn" style={{ flex: 1, border: '1px solid var(--color-border)' }} onClick={() => handleToggleAvailability(item.id, item.isAvailable)}>
                      {item.isAvailable ? (isAmharic ? 'ይገኛል' : 'Available') : (isAmharic ? 'አይገኝም' : 'Unavailable')}
                    </button>
                    <button className="btn" style={{ flex: 1, border: '1px solid var(--color-border)' }} onClick={() => openItemModal(section.id, item)}>
                      {isAmharic ? 'አስተካክል' : 'Edit'}
                    </button>
                    <button className="btn" style={{ color: 'var(--color-error)', border: '1px solid var(--color-border)', width: '100%' }} onClick={() => handleDeleteItem(item.id)}>
                      {isAmharic ? 'ሰርዝ' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Item Modal */}
      {isItemModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, overflowY: 'auto', padding: '2rem 0' }}>
          <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingItemId ? (isAmharic ? 'ምግብ አስተካክል' : 'Edit Item') : (isAmharic ? 'ምግብ ጨምር' : 'Create Item')}</h2>
            
            {itemFormStep === 1 && (
              <div>
                <div style={{ display: 'flex', flexDirection: isAmharic ? 'column' : 'column-reverse', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{isAmharic ? 'የምግብ ስም (አማርኛ)' : 'Amharic Name'}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ድሮ ወጥ" 
                      value={newItemData.nameAmharic}
                      onChange={e => handleTransliteration(e, 'nameAmharic')}
                      autoFocus={isAmharic}
                      style={{ 
                        width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', 
                        color: 'var(--color-text)', border: '1px solid var(--color-border)',
                        fontSize: isAmharic ? '1.25rem' : '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{isAmharic ? 'የምግብ ስም (English)' : 'Name'}</label>
                    <input 
                      type="text" 
                      placeholder="Item Name" 
                      value={newItemData.name}
                      onChange={e => handleTransliteration(e, 'name')}
                      autoFocus={!isAmharic}
                      style={{ 
                        width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', 
                        color: 'var(--color-text)', border: '1px solid var(--color-border)',
                        fontSize: !isAmharic ? '1.25rem' : '1rem'
                      }}
                    />
                  </div>
                </div>

                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{isAmharic ? 'ዋጋ (ETB)' : 'Price (ETB)'}</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="e.g. 250.00" 
                  value={newItemData.priceInput}
                  onChange={e => setNewItemData({...newItemData, priceInput: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                />

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setIsItemModalOpen(false)}>{isAmharic ? 'ሰርዝ' : 'Cancel'}</button>
                  <button className="btn" onClick={() => setItemFormStep(2)}>{isAmharic ? 'ቀጣይ' : 'Next Step ➔'}</button>
                  <button className="btn btn-primary" onClick={handleSaveItem}>{isAmharic ? 'አስቀምጥ' : 'Save'}</button>
                </div>
              </div>
            )}

            {itemFormStep === 2 && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Description</label>
                <textarea 
                  placeholder="Description" 
                  value={newItemData.description}
                  onChange={e => setNewItemData({...newItemData, description: e.target.value})}
                  style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                />

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Spice Level</label>
                    <select
                      value={newItemData.spiceLevel}
                      onChange={e => setNewItemData({...newItemData, spiceLevel: parseInt(e.target.value) || 0})}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      {SPICE_LEVELS.map(spice => (
                        <option key={spice.value} value={spice.value}>
                          {spice.name} ({spice.nameAmharic}) {spice.icon}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Serving Size</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 👥 Serves 2-3" 
                      value={newItemData.servingSize}
                      onChange={e => setNewItemData({...newItemData, servingSize: e.target.value})}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    />
                  </div>
                </div>

                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Dietary Labels</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  {['VEGAN', 'GF', 'HALAL', 'SPICY', 'FASTING'].map(label => (
                    <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input 
                        type="checkbox"
                        checked={newItemData.dietaryLabels.includes(label)}
                        onChange={(e) => {
                          if (e.target.checked) setNewItemData({ ...newItemData, dietaryLabels: [...newItemData.dietaryLabels, label] });
                          else setNewItemData({ ...newItemData, dietaryLabels: newItemData.dietaryLabels.filter(l => l !== label) });
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', padding: '0.2rem 0.5rem', background: 'var(--color-surface)', borderRadius: '4px' }}>
                        {label === 'FASTING' ? '🕌 Fasting / የጾም' : label}
                      </span>
                    </label>
                  ))}
                </div>

                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Photo</label>
                <div 
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    border: dragActive ? '2px dashed var(--color-primary)' : '2px dashed var(--color-border)',
                    borderRadius: '0.5rem', padding: '2rem', textAlign: 'center', marginBottom: '1rem',
                    background: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    cursor: 'pointer', position: 'relative'
                  }}
                >
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                  {previewUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Click or drag to change image</span>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--color-text-muted)' }}><p>Drag & drop an image here, or click to select</p></div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button className="btn" onClick={() => setItemFormStep(1)}>Back</button>
                  <button className="btn btn-primary" onClick={handleSaveItem}>Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, overflowY: 'auto' }}>
          <div className="card" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>{isAmharic ? 'የምናሌ ገጽታ ይምረጡ' : 'Visual Theme Selector'}</h2>
              <button className="btn" onClick={() => setIsThemeModalOpen(false)}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {MENU_THEMES.map(theme => (
                <div 
                  key={theme.id} 
                  className={`theme-card ${branchTheme === theme.id ? 'active' : ''}`}
                  onClick={() => handleUpdateTheme(theme.id)}
                  style={{ background: theme.preview.bg, color: theme.preview.text }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{theme.icon}</div>
                  <h3 style={{ margin: '0 0 0.25rem 0' }}>{isAmharic ? theme.nameAmharic : theme.name}</h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', opacity: 0.8 }}>{theme.description}</p>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[theme.preview.bg, theme.preview.card, theme.preview.primary, theme.preview.text, theme.preview.accent].map((color, i) => (
                      <div key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
                    ))}
                  </div>
                  {branchTheme === theme.id && (
                    <div style={{ marginTop: '1rem', background: theme.preview.primary, color: '#fff', padding: '0.25rem', textAlign: 'center', borderRadius: '4px', fontSize: '0.8rem' }}>
                      Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dish Catalog Modal */}
      {isDishCatalogOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, overflowY: 'auto' }}>
          <div className="card" style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>{isAmharic ? 'የምግብ ካታሎግ' : 'Ethiopian Dish Catalog'}</h2>
              <button className="btn" onClick={() => setIsDishCatalogOpen(false)}>✕</button>
            </div>
            
            <input 
              type="text" 
              placeholder={isAmharic ? 'ፈልግ... (ለምሳሌ፦ ወጥ፣ ጥብስ)' : 'Search dishes (e.g. Wot, Tibs)'}
              value={catalogQuery}
              onChange={e => setCatalogQuery(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '0.5rem' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
              {searchDishes(catalogQuery).map(dish => (
                <div key={dish.id} style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem 0' }}>{isAmharic ? dish.nameAmharic : dish.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {!isAmharic && dish.nameAmharic} {isAmharic && dish.name} • {isAmharic ? dish.categoryAmharic : dish.category}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {dish.dietaryLabels.map(lbl => (
                        <span key={lbl} style={{ fontSize: '0.7rem', background: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{lbl}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                      ETB {dish.suggestedPriceMin} - {dish.suggestedPriceMax}
                    </span>
                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => {
                      if (!menu.sections.length) {
                        showToast('Please add a section first!', 'error');
                        return;
                      }
                      // Just open item modal prefilled in the first section (or prompt for section if needed)
                      // Simplification: use the first section
                      openItemModal(menu.sections[0].id, undefined, dish);
                      setIsDishCatalogOpen(false);
                    }}>
                      + {isAmharic ? 'ፍጥነት ጨምር' : 'Quick Add'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {isSectionModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '400px' }}>
            <h2>{isAmharic ? 'ክፍል ፍጠር' : 'Create Section'}</h2>
            <input 
              type="text" 
              placeholder={isAmharic ? 'የክፍል ስም (English)' : 'Section Name'}
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <input 
              type="text" 
              placeholder={isAmharic ? 'የክፍል ስም (አማርኛ) (e.g. የጾም ምግቦች)' : 'Amharic Name (e.g. የጾም ምግቦች)'}
              value={newSectionNameAmharic}
              onChange={e => setNewSectionNameAmharic(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <select
              value={newSectionTimeSlot}
              onChange={e => setNewSectionTimeSlot(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: 'var(--color-admin-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
              <option value="ALL_DAY">All Day</option>
              <option value="BREAKFAST">Breakfast / ቁርስ</option>
              <option value="LUNCH_DINNER">Lunch & Dinner</option>
            </select>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setIsSectionModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSection}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Drawer */}
      {isPreviewOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ 
            width: '375px', height: '812px', background: 'var(--color-bg)', 
            borderRadius: '2rem', overflow: 'hidden', position: 'relative',
            border: '8px solid #333', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2000 }}>
              <button className="btn" style={{ background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none' }} onClick={() => setIsPreviewOpen(false)}>✕</button>
            </div>
            
            {/* Provide the selected theme's CSS variables if possible, or just render MenuView. 
                Wait, MenuView internally checks the theme if it's set in its context, or maybe it checks a document body variable? 
                Actually, MenuView sets the theme internally maybe, or we inject styles here. */}
            <div 
              style={{ width: '100%', height: '100%', overflowY: 'auto', ...getThemeById(branchTheme)?.cssVariables }} 
            >
              <MenuView menu={menu} initialTable="Preview" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
