import {
  LeadStatus,
  LeadSource,
  ClientType,
  PropertyType,
  ProjectStatus,
  PropertyStatus,
  SaleStage,
  PaymentMethod,
  FollowUpPriority,
  UserRole,
} from '@/types'

// ── BRAND COLORS ─────────────────────────────────────────────
export const BRAND = {
  teal: '#0D5271',
  tealMid: '#1A7294',
  gold: '#C9A84C',
  goldLight: '#E8C97A',
  dark: '#0A2D3D',
} as const

// ── LEAD STATUS ───────────────────────────────────────────────
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new_enquiry: 'New Enquiry',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_booked: 'Site Visit Booked',
  site_visit_completed: 'Site Visit Completed',
  negotiation: 'Negotiation',
  reserved: 'Reserved',
  payment_started: 'Payment Started',
  purchased: 'Purchased',
  handover_completed: 'Handover Completed',
  lost: 'Lost',
}

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new_enquiry: 'bg-blue-50 text-blue-700',
  contacted: 'bg-indigo-50 text-indigo-700',
  qualified: 'bg-purple-50 text-purple-700',
  site_visit_booked: 'bg-orange-50 text-orange-700',
  site_visit_completed: 'bg-amber-50 text-amber-700',
  negotiation: 'bg-yellow-50 text-yellow-700',
  reserved: 'bg-yellow-50 text-yellow-800',
  payment_started: 'bg-green-50 text-green-700',
  purchased: 'bg-teal-50 text-teal-800',
  handover_completed: 'bg-emerald-50 text-emerald-800',
  lost: 'bg-red-50 text-red-700',
}

// ── LEAD SOURCE ───────────────────────────────────────────────
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: 'Website',
  referral: 'Referral',
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  walk_in: 'Walk-in',
  agent: 'Agent',
  call: 'Phone Call',
  diaspora: 'Diaspora',
  other: 'Other',
}

// ── CLIENT TYPE ───────────────────────────────────────────────
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  buyer: 'Buyer',
  investor: 'Investor',
  diaspora_buyer: 'Diaspora Buyer',
  tenant: 'Tenant',
  landlord: 'Landlord',
  property_owner: 'Property Owner',
}

// ── PROPERTY TYPE ─────────────────────────────────────────────
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  duplex: 'Duplex',
  apartment: 'Apartment',
  townhouse: 'Townhouse',
  commercial_building: 'Commercial Building',
  estate_development: 'Estate Development',
  renovation: 'Renovation',
  bungalow: 'Bungalow',
  mansion: 'Mansion',
  other: 'Other',
}

// ── PROJECT STATUS ────────────────────────────────────────────
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  land_preparation: 'Land Preparation',
  foundation: 'Foundation',
  structure: 'Structure',
  roofing: 'Roofing',
  plumbing_electrical: 'Plumbing & Electrical',
  plastering: 'Plastering',
  tiling: 'Tiling',
  painting: 'Painting',
  finishing: 'Finishing',
  completed: 'Completed',
  on_hold: 'On Hold',
}

export const PROJECT_STATUS_PROGRESS: Record<ProjectStatus, number> = {
  planning: 5,
  land_preparation: 10,
  foundation: 20,
  structure: 35,
  roofing: 50,
  plumbing_electrical: 62,
  plastering: 72,
  tiling: 82,
  painting: 90,
  finishing: 96,
  completed: 100,
  on_hold: 0,
}

// ── PROPERTY STATUS ───────────────────────────────────────────
export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  rented: 'Rented',
  under_construction: 'Under Construction',
  on_hold: 'On Hold',
  under_management: 'Under Management',
}

export const PROPERTY_STATUS_COLORS: Record<PropertyStatus, string> = {
  available: 'bg-green-50 text-green-700',
  reserved: 'bg-yellow-50 text-yellow-700',
  sold: 'bg-teal-50 text-teal-800',
  rented: 'bg-blue-50 text-blue-700',
  under_construction: 'bg-orange-50 text-orange-700',
  on_hold: 'bg-gray-100 text-gray-600',
  under_management: 'bg-purple-50 text-purple-700',
}

// ── SALE STAGE ────────────────────────────────────────────────
export const SALE_STAGE_LABELS: Record<SaleStage, string> = {
  new_enquiry: 'New Enquiry',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_booked: 'Site Visit Booked',
  site_visit_completed: 'Site Visit Completed',
  negotiation: 'Negotiation',
  reserved: 'Reserved',
  payment_started: 'Payment Started',
  closed_won: 'Closed / Won',
  handover_completed: 'Handover Completed',
  lost: 'Lost',
}

// ── PAYMENT METHOD ────────────────────────────────────────────
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money (MoMo)',
  cheque: 'Cheque',
  other: 'Other',
}

// ── FOLLOW-UP PRIORITY ────────────────────────────────────────
export const PRIORITY_COLORS: Record<FollowUpPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
}

// ── USER ROLES ────────────────────────────────────────────────
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ceo: 'CEO / Super Admin',
  customer_service: 'Customer Service',
  project_manager: 'Project Manager',
  sales_officer: 'Sales Officer',
  accountant: 'Accountant',
  property_manager: 'Property Manager',
  admin: 'Admin',
}

// ── INVENTORY CATEGORIES ──────────────────────────────────────
export const INVENTORY_CATEGORIES = [
  'Cement', 'Iron Rods', 'Sand', 'Blocks', 'Tiles',
  'Paint', 'Wood', 'Roofing', 'Electrical', 'Plumbing',
  'Fittings', 'Doors', 'Windows', 'Glass', 'Other',
]

// ── EXPENSE CATEGORIES ────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Transportation', 'Equipment Rental', 'Permits',
  'Site Security', 'Water', 'Electricity', 'Repairs',
  'Tools', 'Miscellaneous',
]

// ── LABOUR ROLES ──────────────────────────────────────────────
export const LABOUR_ROLES = [
  'Mason', 'Carpenter', 'Electrician', 'Plumber',
  'Painter', 'Tiler', 'Labourer', 'Foreman',
  'Site Supervisor', 'Security Guard', 'Other',
]

// ── PAGINATION ────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ── APP CONFIG ────────────────────────────────────────────────
export const APP_NAME = 'UMANIE Homes CRM'
export const APP_TAGLINE = 'Real Estate Operations Platform'
export const CURRENCY = 'GHS'
export const TIMEZONE = 'Africa/Accra'