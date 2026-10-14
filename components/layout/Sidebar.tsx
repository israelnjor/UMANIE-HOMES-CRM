'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarClock,
  MapPin,
  HardHat,
  Home,
  Package,
  Wrench,
  Receipt,
  TrendingUp,
  CreditCard,
  FileText,
  FileBadge,
  FolderOpen,
  Star,
  Building2,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

const navigation: NavGroup[] = [
  {
    label: 'Main',
    defaultOpen: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    label: 'CRM',
    defaultOpen: true,
    items: [
      { label: 'Leads', href: '/leads', icon: <Users size={16} /> },
      { label: 'Clients', href: '/clients', icon: <UserCheck size={16} /> },
      { label: 'Follow-ups', href: '/follow-ups', icon: <CalendarClock size={16} /> },
      { label: 'Site Visits', href: '/site-visits', icon: <MapPin size={16} /> },
    ],
  },
  {
    label: 'Projects & Properties',
    defaultOpen: true,
    items: [
      { label: 'Projects', href: '/projects', icon: <HardHat size={16} /> },
      { label: 'Properties', href: '/properties', icon: <Home size={16} /> },
      { label: 'Inventory', href: '/inventory', icon: <Package size={16} /> },
      { label: 'Labour', href: '/labour', icon: <Wrench size={16} /> },
      { label: 'Expenses', href: '/expenses', icon: <Receipt size={16} /> },
    ],
  },
  {
    label: 'Sales & Payments',
    defaultOpen: true,
    items: [
      { label: 'Sales Pipeline', href: '/sales', icon: <TrendingUp size={16} /> },
      { label: 'Payments', href: '/payments', icon: <CreditCard size={16} /> },
      { label: 'Invoices', href: '/invoices', icon: <FileText size={16} /> },
      { label: 'Receipts', href: '/receipts', icon: <FileBadge size={16} /> },
    ],
  },
  {
    label: 'Documents & Reviews',
    defaultOpen: false,
    items: [
      { label: 'Agreements', href: '/agreements', icon: <FileText size={16} /> },
      { label: 'Documents', href: '/documents', icon: <FolderOpen size={16} /> },
      { label: 'Reviews', href: '/reviews', icon: <Star size={16} /> },
    ],
  },
  {
    label: 'Property Management',
    defaultOpen: false,
    items: [
      { label: 'Managed Properties', href: '/property-management', icon: <Building2 size={16} /> },
    ],
  },
  {
    label: 'Reports & Settings',
    defaultOpen: false,
    items: [
      { label: 'Reports', href: '/reports', icon: <BarChart3 size={16} /> },
      { label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
    ],
  },
]

function NavGroupItem({ group }: { group: NavGroup }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(group.defaultOpen ?? true)

  const isGroupActive = group.items.some(item => pathname.startsWith(item.href))

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-1.5 group"
      >
        <span className={cn(
          'text-[10px] font-semibold tracking-widest uppercase transition-colors',
          isGroupActive
            ? 'text-accent'
            : 'text-white/30 group-hover:text-white/50'
        )}>
          {group.label}
        </span>
        <span className="text-white/20 group-hover:text-white/40 transition-colors">
          {open
            ? <ChevronDown size={11} />
            : <ChevronRight size={11} />
          }
        </span>
      </button>

      {/* Nav items */}
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-all duration-150',
                  active
                    ? 'bg-white/10 text-white font-medium border-l-2 border-accent pl-3.5'
                    : 'text-white/55 hover:text-white/90 hover:bg-white/6'
                )}
              >
                <span className={cn(
                  'flex-shrink-0 transition-colors',
                  active ? 'text-accent' : 'text-white/40'
                )}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-primary flex flex-col z-40 shadow-sidebar overflow-hidden">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8 flex-shrink-0">
        <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-primary font-black text-base leading-none">U</span>
        </div>
        <div>
          <div className="text-white font-semibold text-sm leading-tight">
            UMANIE Homes
          </div>
          <div className="text-white/35 text-[10px] leading-tight mt-0.5">
            Operations CRM
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-none py-4 space-y-3">
        {navigation.map((group) => (
          <NavGroupItem key={group.label} group={group} />
        ))}
      </nav>

      {/* Bottom — User info placeholder */}
      <div className="flex-shrink-0 border-t border-white/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-white/70 text-xs font-semibold">AK</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/80 text-xs font-medium truncate">
              CEO
            </div>
            <div className="text-white/35 text-[10px] truncate">
              UMANIE Homes Africa
            </div>
          </div>
          <Settings size={13} className="text-white/25 flex-shrink-0" />
        </div>
      </div>

    </aside>
  )
}