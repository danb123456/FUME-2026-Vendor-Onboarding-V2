
export type EquipmentItem = {
  id: string;
  type: string;
  socket: string;
};

export type StaffMember = {
  id: string;
  role: string;
};

export type PaperworkFile = {
  file: File | null;
  expiry: string;
  link?: string;
};

export type ExternalSpaceReason = "Smoker" | "Fridge/Fridge Van" | "Food Truck" | "Asado Grill" | "Service Counter" | "Other" | "";

export interface VendorFormData {
  vendorId: string;
  tradingName: string;
  contactName: string;
  email: string;
  phone: string;
  comingToStateFayre: "Yes" | "No" | "Need More Info" | "";
  standType: 'Van' | 'Shack' | '';
  spaceLeft: string;
  spaceRight: string;
  spaceBehind: string;
  externalSpaceReason: ExternalSpaceReason;
  branding: File | null;
  powerSource: 'FUME/Venue Supply' | 'Own Generator' | '';
  equipment: EquipmentItem[];
  paperwork: { [key: string]: PaperworkFile };
  paperworkStatus: 'Yes' | 'Yes but need to renew documents' | 'No' | '';
  menu: {
    dish3: { desc: string; ingredients: string; photo: File | null };
    dish75: { desc: string; ingredients: string; photo: File | null };
    dish15: { desc: string; ingredients: string; photo: File | null };
  };
  staff: StaffMember[];
  vehicleReg: string;
  instagram: string;
  comments: string;
}
