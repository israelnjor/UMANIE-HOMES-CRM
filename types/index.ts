// Re-export everything from database types
export * from './database'

// ── UI / APP TYPES ───────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface StatCard {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'teal' | 'gold' | 'green' | 'red' | 'orange' | 'purple'
}

export interface SelectOption {
  label: string
  value: string
}

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface FilterState {
  search: string
  status?: string
  source?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
  page: number
  pageSize: number
}

export interface DashboardStats {
  total_leads: number
  total_clients: number
  active_projects: number
  available_properties: number
  reserved_properties: number
  sold_properties: number
  pending_payments: number
  overdue_payments: number
  total_project_cost: number
  follow_ups_due: number
  site_visits_today: number
  reviews_pending: number
}

export interface NotificationWithSender {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
  sender?: {
    full_name: string
    avatar_url: string | null
  } | null
}

export interface LeadWithDetails {
  id: string
  full_name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  budget: number | null
  source: string
  status: string
  client_type: string
  created_at: string
  assigned_staff?: { full_name: string } | null
  linked_project?: { name: string } | null
  linked_property?: { name: string } | null
}

export interface ProjectWithCosts {
  id: string
  name: string
  location: string
  status: string
  progress_percentage: number
  budget: number | null
  total_cost: number
  total_material_cost: number
  total_labour_cost: number
  total_expense_cost: number
  expected_selling_price: number | null
  estimated_profit: number | null
  project_manager?: { full_name: string } | null
}

export interface PushSubscriptionData {
  endpoint: string
  p256dh: string
  auth: string
}