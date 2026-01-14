
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

  // Load draft on mount
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

  // Auto-save draft whenever form changes
  useEffect(() => {
    // We don't save File objects to localStorage as it's not supported
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
      // 1. Convert equipment list to a readable string for the sheet
      const equipmentString = formData.equipment
        .map(e => `${e.type} (${e.socket})`)
        .join(', ');

      const submissionPayload: any = { 
        ...formData,
        equipment: equipmentString 
      };
      
      // 2. Process Files
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
        if (dishData.photo) {
          submissionPayload[`photoData_${dish}`] = await fileToBase64(dishData.photo);
          submissionPayload[`photoName_${dish}`] = dishData.photo.name;
        }
      }

      // Cleanup large objects before sending
      delete submissionPayload.paperwork;
      delete submissionPayload.branding;
      delete submissionPayload.menu;

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
      alert("Submission failed. Your data is still saved locally. Please check your internet and try again.");
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
            <h1 className="text-3xl font-bold text-gray-800 tracking-tighter">FUME 2026</h1>
            <p className="text-gray-500 mt-2">Vendor Onboarding Portal</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Password"
              required
            />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg shadow-lg">
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
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg">
          <div className="text-green-500 text-6xl mb-6">✓</div>
          <h2 className="text-3xl font-bold mb-4 font-mono">SUBMITTED</h2>
          <p className="text-gray-600 mb-8">Data synced to FUME 2026 Master Sheet. Previous records for this Vendor ID have been updated.</p>
          <button onClick={() => window.location.reload()} className="bg-orange-600 text-white font-bold px-8 py-3 rounded-xl">New Entry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={saveManually}
          className={`px-6 py-3 rounded-full font-bold shadow-2xl transition-all flex items-center gap-2 ${
            isDraftSaved ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-black'
          }`}
        >
          {isDraftSaved ? '✓ Saved Locally' : 'Save Progress'}
        </button>
      </div>

      <header className="mb-12 text-center">
        <h1 className="text-6xl font-black text-gray-900 tracking-tight mb-2 italic">FUME 2026</h1>
        <p className="text-lg text-gray-500 font-medium uppercase tracking-widest">Vendor Onboarding</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 1: Vendor Details" />
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Vendor ID" required helper="Matches existing row for updates" value={formData.vendorId} onChange={(v) => setFormData({...formData, vendorId: v})} />
            <FormField label="Trading Name" required value={formData.tradingName} onChange={(v) => setFormData({...formData, tradingName: v})} />
            <FormField label="Contact Name" required value={formData.contactName} onChange={(v) => setFormData({...formData, contactName: v})} />
            <FormField label="Email" type="email" required value={formData.email} onChange={(v) => setFormData({...formData, email: v})} />
            <FormField label="Phone" required value={formData.phone} onChange={(v) => setFormData({...formData, phone: v})} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Coming to State Fayre? <span className="text-red-500">*</span></label>
              <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
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
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <p className="text-sm text-gray-800 leading-relaxed italic font-medium">
                "Left/Right refers to looking at the Front of House (visitor POV). There is 2.3m to the left/right, and 2 m behind your stand included in your pitch fee. Every meter further will be charged at £100 unless already discussed with organisers."
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Van / Shack</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500" value={formData.standType} onChange={(e) => setFormData({...formData, standType: e.target.value as any})} required>
                  <option value="">Select...</option>
                  <option value="Van">Van</option>
                  <option value="Shack">Shack</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['spaceLeft', 'spaceRight', 'spaceBehind'].map((field) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    {field === 'spaceLeft' ? 'Space Left' : field === 'spaceRight' ? 'Space Right' : 'Space Behind'}
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    value={(formData as any)[field]}
                    onChange={(e) => setFormData({...formData, [field]: e.target.value})}
                  >
                    {SPACE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Reason for Additional Space</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({...formData, externalSpaceReason: opt as ExternalSpaceReason})}
                    className={`px-4 py-3 rounded-xl border-2 font-medium transition text-sm ${
                      formData.externalSpaceReason === opt 
                      ? 'border-orange-600 bg-orange-50 text-orange-800 shadow-md' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Power Source</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.powerSource} onChange={(e) => setFormData({...formData, powerSource: e.target.value as any})} required>
                <option value="">Select...</option>
                <option value="FUME/Venue Supply">FUME/Venue Supply</option>
                <option value="Own Generator">Own Generator</option>
              </select>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800">Equipment Inventory</h3>
                <button type="button" onClick={addEquipment} className="bg-orange-600 text-white text-xs font-black px-4 py-2 rounded-full uppercase tracking-tighter shadow-lg">+ Add Item</button>
              </div>
              <div className="space-y-3">
                {formData.equipment.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div className="flex-1">
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white" value={item.type} onChange={(e) => {
                        const newList = [...formData.equipment];
                        newList[index].type = e.target.value;
                        setFormData({...formData, equipment: newList});
                      }}>
                        {EQUIPMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none bg-white" value={item.socket} onChange={(e) => {
                        const newList = [...formData.equipment];
                        newList[index].socket = e.target.value;
                        setFormData({...formData, equipment: newList});
                      }}>
                        {POWER_SOCKETS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => removeEquipment(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 4: Paperwork" />
          <div className="p-8 space-y-8">
            <div className={`p-4 rounded-xl border-l-4 ${formData.comingToStateFayre === 'Yes' ? 'bg-purple-100 border-purple-600 text-purple-900 shadow-inner' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
              <p className="text-sm font-bold uppercase tracking-tight">
                {formData.comingToStateFayre === 'Yes' 
                  ? '⚠️ ATTENTION: State Fayre selected. All documents MUST be valid until JULY 1st 2026.' 
                  : 'FUME FESTIVAL: All documents must be valid until JUNE 14th 2026.'}
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
                    <label className="text-[10px] uppercase font-bold text-gray-400 mb-1">Expiry Date</label>
                    <input 
                      type="date"
                      className={`w-full px-3 py-2 border rounded-lg transition text-sm ${
                        formData.paperwork[item.id].expiry && !validateExpiry(formData.paperwork[item.id].expiry) 
                        ? 'border-red-500 bg-red-50' 
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
                      <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">Too Early - Must be after {formData.comingToStateFayre === 'Yes' ? 'July 1st' : 'June 14th'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Paperwork Status</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" value={formData.paperworkStatus} onChange={(e) => setFormData({...formData, paperworkStatus: e.target.value as any})} required>
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
            {['dish3', 'dish75', 'dish15'].map((dishKey) => (
              <div key={dishKey} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-2xl">
                <div className="flex flex-col justify-center">
                  <div className="text-4xl font-black text-orange-600 mb-1">{dishKey === 'dish3' ? '£3' : dishKey === 'dish75' ? '£7.50' : '£15'}</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{dishKey === 'dish3' ? 'Starter' : dishKey === 'dish75' ? 'Mid' : 'Main'}</div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <FormField label="Description" value={(formData.menu as any)[dishKey].desc} onChange={(v) => {
                    const newMenu = { ...formData.menu };
                    (newMenu as any)[dishKey].desc = v;
                    setFormData({...formData, menu: newMenu});
                  }} />
                  <FormField label="Ingredients" value={(formData.menu as any)[dishKey].ingredients} onChange={(v) => {
                    const newMenu = { ...formData.menu };
                    (newMenu as any)[dishKey].ingredients = v;
                    setFormData({...formData, menu: newMenu});
                  }} />
                  <FileInput label="Photo" accept="image/*" onChange={(f) => {
                    const newMenu = { ...formData.menu };
                    (newMenu as any)[dishKey].photo = f;
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
            <div className="bg-orange-900 text-white p-4 rounded-xl">
              <p className="text-xs leading-relaxed uppercase font-bold tracking-tight">
                FUME Festival requires there to be at least 6 staff working on your stand during the live show to maximise speed and quality of service. Failure to meet this will result in a breach of contracts and fines.
              </p>
            </div>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Staff Allocation ({formData.staff.length}/6)</h3>
              <button type="button" onClick={addStaff} className="bg-black text-white text-xs font-bold px-4 py-2 rounded-lg transition hover:scale-105">+ Add Staff</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.staff.map((s, index) => (
                <div key={s.id} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-200">
                  <span className="text-xs font-bold text-gray-400">#{index+1}</span>
                  <select className="flex-1 bg-transparent text-sm focus:outline-none" value={s.role} onChange={(e) => {
                    const newStaff = [...formData.staff];
                    newStaff[index].role = e.target.value;
                    setFormData({...formData, staff: newStaff});
                  }}>
                    {STAFF_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <button type="button" onClick={() => removeStaff(s.id)} className="text-red-400">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader title="Section 7: Final Details" />
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Vehicle Registration" value={formData.vehicleReg} onChange={(v) => setFormData({...formData, vehicleReg: v})} required />
            <FormField label="Instagram Handle" value={formData.instagram} onChange={(v) => setFormData({...formData, instagram: v})} />
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Questions / Comments</label>
              <textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" value={formData.comments} onChange={(e) => setFormData({...formData, comments: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            type="submit" 
            disabled={isSubmitting || formData.staff.length < MIN_STAFF_COUNT}
            className={`w-full py-6 rounded-3xl text-2xl font-black text-white shadow-2xl transition-all ${
              isSubmitting || formData.staff.length < MIN_STAFF_COUNT ? 'bg-gray-300' : 'bg-orange-600 hover:bg-orange-700 active:scale-95'
            }`}
          >
            {isSubmitting ? 'SYNCING TO CLOUD...' : 'SUBMIT ALL DETAILS'}
          </button>
          {formData.staff.length < MIN_STAFF_COUNT && (
            <p className="text-center text-red-500 text-sm font-bold">You must add at least 6 staff members to enable submission.</p>
          )}
        </div>
      </form>

      <footer className="mt-20 py-10 border-t border-gray-200 text-center">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">&copy; 2026 FUME Festival | Allianz Stadium</p>
      </footer>
    </div>
  );
};

export default App;
