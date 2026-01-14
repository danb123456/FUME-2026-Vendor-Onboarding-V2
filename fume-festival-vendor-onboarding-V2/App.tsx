
import React, { useState, useEffect } from 'react';
import { 
  VendorFormData, 
  EquipmentItem, 
  StaffMember, 
  PaperworkFile,
  ExternalSpaceReason
} from './types';
import { 
  EQUIPMENT_TYPES, 
  POWER_SOCKETS, 
  STAFF_ROLES, 
  PAPERWORK_ITEMS, 
  MIN_STAFF_COUNT, 
  MIN_EXPIRY_DATE_FUME,
  MIN_EXPIRY_DATE_FAYRE,
  SPACE_OPTIONS,
  REASON_OPTIONS
} from './constants';
import SectionHeader from './components/SectionHeader';
import FormField from './components/FormField';
import FileInput from './components/FileInput';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzk7ia8CJ5xf0CieCr6hxTul1MZ1UzwJHycgNETkWI1Ywc8HiYAAllJrvmak2LG9Sk/exec';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  const initialFormData: VendorFormData = {
    vendorId: '',
    tradingName: '',
    contactName: '',
    email: '',
    phone: '',
    comingToStateFayre: '',
    standType: '',
    spaceLeft: 'None',
    spaceRight: 'None',
    spaceBehind: 'None',
    externalSpaceReason: '',
    branding: null,
    powerSource: '',
    equipment: [],
    paperwork: PAPERWORK_ITEMS.reduce((acc, item) => {
      acc[item.id] = { file: null, expiry: '' };
      return acc;
    }, {} as { [key: string]: PaperworkFile }),
    paperworkStatus: '',
    menu: {
      dish3: { desc: '', ingredients: '', photo: null },
      dish75: { desc: '', ingredients: '', photo: null },
      dish15: { desc: '', ingredients: '', photo: null }
    },
    staff: [],
    vehicleReg: '',
    instagram: '',
    comments: ''
  };

  const [formData, setFormData] = useState<VendorFormData>(initialFormData);

  useEffect(() => {
    const saved = localStorage.getItem('fume_vendor_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  useEffect(() => {
    const { branding, paperwork, menu, ...serializable } = formData;
    localStorage.setItem('fume_vendor_draft', JSON.stringify(serializable));
  }, [formData]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'FUME2026') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password. Please try again.');
    }
  };

  const addEquipment = () => {
    const newItem: EquipmentItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: EQUIPMENT_TYPES[0],
      socket: POWER_SOCKETS[0]
    };
    setFormData(prev => ({ ...prev, equipment: [...prev.equipment, newItem] }));
  };

  const removeEquipment = (id: string) => {
    setFormData(prev => ({ ...prev, equipment: prev.equipment.filter(item => item.id !== id) }));
  };

  const addStaff = () => {
    const newStaff: StaffMember = {
      id: Math.random().toString(36).substr(2, 9),
      role: STAFF_ROLES[0]
    };
    setFormData(prev => ({ ...prev, staff: [...prev.staff, newStaff] }));
  };

  const removeStaff = (id: string) => {
    setFormData(prev => ({ ...prev, staff: prev.staff.filter(s => s.id !== id) }));
  };

  const validateExpiry = (date: string) => {
    if (!date) return true;
    const minDate = formData.comingToStateFayre === 'Yes' ? MIN_EXPIRY_DATE_FAYRE : MIN_EXPIRY_DATE_FUME;
    return new Date(date) >= new Date(minDate);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.staff.length < MIN_STAFF_COUNT) {
      alert(`FUME Festival requires at least ${MIN_STAFF_COUNT} staff members.`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const equipmentString = formData.equipment
        .map(e => `${e.type} (${e.socket})`)
        .join(', ');

      const submissionPayload: any = { 
        ...formData,
        equipment: equipmentString 
      };
      
      if (formData.branding) {
        submissionPayload.brandingData = await fileToBase64(formData.branding);
        submissionPayload.brandingName = formData.branding.name;
      }
      
      for (const key of Object.keys(formData.paperwork)) {
        const item = formData.paperwork[key];
        if (item.file) {
          submissionPayload[`fileData_${key}`] = await fileToBase64(item.file);
          submissionPayload[`fileName_${key}`] = item.file.name;
          submissionPayload[`expiry_${key}`] = item.expiry;
        }
      }

      for (const dish of ['dish3', 'dish75', 'dish15']) {
        const dishData = (formData.menu as any)[dish];
        submissionPayload[`menuDesc_${dish}`] = dishData.desc;
        submissionPayload[`menuIngredients_${dish}`] = dishData.ingredients;
        if (dishData.photo) {
          submissionPayload[`photoData_${dish}`] = await fileToBase64(dishData.photo);
          submissionPayload[`photoName_${dish}`] = dishData.photo.name;
        }
      }

      delete (submissionPayload as any).paperwork;
      delete (submissionPayload as any).branding;
      delete (submissionPayload as any).menu;

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });

      localStorage.removeItem('fume_vendor_draft');
      setSubmitSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert("Submission failed. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveManually = () => {
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-bg p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tighter uppercase italic">FUME 2026</h1>
            <p className="text-gray-500 mt-2 font-medium">Vendor Onboarding Portal</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Enter Password"
              required
            />
            {authError && <p className="text-red-500 text-sm font-bold">{authError}</p>}
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-lg shadow-lg tracking-widest uppercase transition-all">
              Access Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg border border-gray-100">
          <div className="text-green-500 text-6xl mb-6">✓</div>
          <h2 className="text-3xl font-black mb-4 font-mono uppercase italic tracking-tighter">SUBMITTED</h2>
          <p className="text-gray-600 mb-8 font-medium">Your data has been synced. The master spreadsheet has been updated for Vendor ID: <span className="text-orange-600 font-bold">{formData.vendorId}</span>.</p>
          <button onClick={() => window.location.reload()} className="bg-orange-600 text-white font-black px-8 py-4 rounded-xl uppercase tracking-widest">New Session</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={saveManually}
          className={`px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center gap-2 ${
            isDraftSaved ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-black active:scale-95'
          }`}
        >
          {isDraftSaved ? '✓ Saved' : 'Save Draft'}
        </button>
      </div>

      <header className="mb-12 text-center">
        <h1 className="text-7xl font-black text-gray-900 tracking-tighter mb-2 italic uppercase">FUME 2026</h1>
        <p className="text-lg text-gray-500 font-bold uppercase tracking-[0.3em]">Vendor Onboarding</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 1: Vendor Details" />
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Vendor ID" required helper="Must match your spreadsheet ID for row replacement" value={formData.vendorId} onChange={(v) => setFormData({...formData, vendorId: v})} />
            <FormField label="Trading Name" required value={formData.tradingName} onChange={(v) => setFormData({...formData, tradingName: v})} />
            <FormField label="Contact Name" required value={formData.contactName} onChange={(v) => setFormData({...formData, contactName: v})} />
            <FormField label="Email" type="email" required value={formData.email} onChange={(v) => setFormData({...formData, email: v})} />
            <FormField label="Phone" required value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} />
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tighter">Coming to State Fayre? *</label>
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                value={formData.comingToStateFayre}
                onChange={(e) => setFormData({...formData, comingToStateFayre: e.target.value as any})}
                required
              >
                <option value="">Select option...</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Need More Info">Need More Info</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 2: Stand Design" />
          <div className="p-8 space-y-8">
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200">
              <p className="text-sm text-orange-900 leading-relaxed italic font-bold uppercase tracking-tight">
                Note: 2.3m left/right and 2m behind included. Excess meterage charged at £100.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tighter">Van / Shack</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 font-medium" value={formData.standType} onChange={(e) => setFormData({...formData, standType: e.target.value as any})} required>
                  <option value="">Select...</option>
                  <option value="Van">Van</option>
                  <option value="Shack">Shack</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['spaceLeft', 'spaceRight', 'spaceBehind'].map((field) => (
                <div key={field}>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">
                    {field === 'spaceLeft' ? 'Space Left' : field === 'spaceRight' ? 'Space Right' : 'Space Behind'}
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-medium"
                    value={(formData as any)[field]}
                    onChange={(e) => setFormData({...formData, [field]: e.target.value})}
                  >
                    {SPACE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 mb-3 uppercase tracking-tighter">Reason for Additional Space</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({...formData, externalSpaceReason: opt as ExternalSpaceReason})}
                    className={`px-4 py-3 rounded-xl border-2 font-black transition-all text-xs uppercase tracking-tight ${
                      formData.externalSpaceReason === opt 
                      ? 'border-orange-600 bg-orange-600 text-white shadow-lg' 
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <FileInput label="Branding Upload (PDF/Images)" accept=".pdf,image/*" onChange={(f) => setFormData({...formData, branding: f})} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 3: Equipment and Power" />
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tighter">Power Source</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-medium" value={formData.powerSource} onChange={(e) => setFormData({...formData, powerSource: e.target.value as any})} required>
                <option value="">Select...</option>
                <option value="FUME/Venue Supply">FUME/Venue Supply</option>
                <option value="Own Generator">Own Generator</option>
              </select>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 uppercase italic tracking-tighter">Equipment Inventory</h3>
                <button type="button" onClick={addEquipment} className="bg-orange-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg hover:bg-orange-700 transition-all">+ Add Item</button>
              </div>
              <div className="space-y-3">
                {formData.equipment.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div className="flex-1">
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white font-bold text-sm" value={item.type} onChange={(e) => {
                        const newList = [...formData.equipment];
                        newList[index].type = e.target.value;
                        setFormData({...formData, equipment: newList});
                      }}>
                        {EQUIPMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white font-bold text-sm" value={item.socket} onChange={(e) => {
                        const newList = [...formData.equipment];
                        newList[index].socket = e.target.value;
                        setFormData({...formData, equipment: newList});
                      }}>
                        {POWER_SOCKETS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => removeEquipment(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 4: Paperwork" />
          <div className="p-8 space-y-8">
            <div className={`p-4 rounded-xl border-l-4 shadow-sm ${formData.comingToStateFayre === 'Yes' ? 'bg-purple-50 border-purple-600 text-purple-900' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
              <p className="text-xs font-black uppercase tracking-widest">
                {formData.comingToStateFayre === 'Yes' 
                  ? 'State Fayre: Docs must be valid until July 1st 2026.' 
                  : 'FUME: Docs must be valid until June 14th 2026.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
              {PAPERWORK_ITEMS.map((item) => (
                <div key={item.id} className="space-y-2">
                  <FileInput label={item.label} accept=".pdf,image/*" onChange={(f) => {
                    const newPaperwork = { ...formData.paperwork };
                    newPaperwork[item.id].file = f;
                    setFormData({...formData, paperwork: newPaperwork});
                  }} />
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-black text-gray-400 mb-1 tracking-widest">Expiry Date</label>
                    <input 
                      type="date"
                      className={`w-full px-3 py-2 border rounded-lg transition text-sm font-bold ${
                        formData.paperwork[item.id].expiry && !validateExpiry(formData.paperwork[item.id].expiry) 
                        ? 'border-red-500 bg-red-50 text-red-700' 
                        : 'border-gray-300 focus:ring-2 focus:ring-orange-500'
                      }`}
                      value={formData.paperwork[item.id].expiry}
                      onChange={(e) => {
                        const newPaperwork = { ...formData.paperwork };
                        newPaperwork[item.id].expiry = e.target.value;
                        setFormData({...formData, paperwork: newPaperwork});
                      }}
                    />
                    {formData.paperwork[item.id].expiry && !validateExpiry(formData.paperwork[item.id].expiry) && (
                      <p className="text-red-600 text-[10px] font-black mt-1 uppercase tracking-tighter animate-pulse">
                        Too Early! Valid until {formData.comingToStateFayre === 'Yes' ? 'July 1st' : 'June 14th'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tighter">Paperwork status finished?</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-medium" value={formData.paperworkStatus} onChange={(e) => setFormData({...formData, paperworkStatus: e.target.value as any})} required>
                <option value="">Select...</option>
                <option value="Yes">Yes</option>
                <option value="Yes but need to renew documents">Yes but need to renew documents</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 5: Menu" />
          <div className="p-8 space-y-10">
            {[
              { key: 'dish3', price: '£3', label: 'Starter' },
              { key: 'dish75', price: '£7.50', label: 'Mid' },
              { key: 'dish15', price: '£15', label: 'Main' }
            ].map((d) => (
              <div key={d.key} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="flex flex-col justify-center">
                  <div className="text-5xl font-black text-orange-600 mb-1 italic tracking-tighter">{d.price}</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{d.label} Dish</div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <FormField label="Item Description" value={(formData.menu as any)[d.key].desc} onChange={(v) => {
                    const newMenu = { ...formData.menu };
                    (newMenu as any)[d.key].desc = v;
                    setFormData({...formData, menu: newMenu});
                  }} />
                  <FormField label="Ingredients" value={(formData.menu as any)[d.key].ingredients} onChange={(v) => {
                    const newMenu = { ...formData.menu };
                    (newMenu as any)[d.key].ingredients = v;
                    setFormData({...formData, menu: newMenu});
                  }} />
                  <FileInput label="Photo Upload" accept="image/*" onChange={(f) => {
                    const newMenu = { ...formData.menu };
                    (newMenu as any)[d.key].photo = f;
                    setFormData({...formData, menu: newMenu});
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 6: Staffing" />
          <div className="p-8 space-y-6">
            <div className="bg-gray-900 text-white p-5 rounded-2xl">
              <p className="text-[10px] leading-relaxed uppercase font-black tracking-widest text-center">
                Min 6 staff required. Non-compliance results in fines.
              </p>
            </div>
            <div className="flex justify-between items-center">
              <h3 className="font-black text-gray-800 uppercase italic tracking-tighter">Staff Allocation ({formData.staff.length}/6)</h3>
              <button type="button" onClick={addStaff} className="bg-black text-white text-[10px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest hover:scale-105 transition-transform">+ Add Staff</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.staff.map((s, index) => (
                <div key={s.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-black text-gray-400">#{index+1}</span>
                  <select className="flex-1 bg-transparent text-xs font-black uppercase tracking-tighter focus:outline-none" value={s.role} onChange={(e) => {
                    const newStaff = [...formData.staff];
                    newStaff[index].role = e.target.value;
                    setFormData({...formData, staff: newStaff});
                  }}>
                    {STAFF_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <button type="button" onClick={() => removeStaff(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 7: Final Details" />
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Vehicle Registration Number" value={formData.vehicleReg} onChange={(v) => setFormData({...formData, vehicleReg: v})} required />
            <FormField label="Instagram Handle" value={formData.instagram} onChange={(v) => setFormData({...formData, instagram: v})} />
            <div className="md:col-span-2">
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tighter">Questions or Comments</label>
              <textarea rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-medium" value={formData.comments} onChange={(e) => setFormData({...formData, comments: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6">
          <button 
            type="submit" 
            disabled={isSubmitting || formData.staff.length < MIN_STAFF_COUNT}
            className={`w-full py-8 rounded-[40px] text-3xl font-black text-white shadow-2xl transition-all uppercase tracking-tighter italic ${
              isSubmitting || formData.staff.length < MIN_STAFF_COUNT ? 'bg-gray-300' : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? 'SYNCING...' : 'FINISH ONBOARDING'}
          </button>
          {formData.staff.length < MIN_STAFF_COUNT && (
            <p className="text-center text-red-600 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
              ⚠️ MUST HAVE AT LEAST 6 STAFF MEMBERS TO SUBMIT
            </p>
          )}
        </div>
      </form>

      <footer className="mt-24 py-12 border-t border-gray-200 text-center">
        <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.4em] italic">&copy; 2026 FUME Festival | Master Vendor Control</p>
      </footer>
    </div>
  );
};

export default App;
