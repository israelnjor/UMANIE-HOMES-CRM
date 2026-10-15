// components/properties/PropertiesClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Home, BedDouble, Bath,
  MapPin, Tag, LayoutGrid, List,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS } from "@/constants";

interface PropertyImage { id: string; url: string; is_primary: boolean }
interface Property {
  id: string; title: string; description: string | null;
  type: string; status: string; price: number | null;
  bedrooms: number | null; bathrooms: number | null;
  area_sqft: number | null; address: string | null;
  city: string | null; is_featured: boolean;
  created_at: string;
  projects?: { id: string; name: string } | null;
  property_images?: PropertyImage[];
}
interface Project { id: string; name: string }

const propertySchema = z.object({
  title:       z.string().min(2, "Title required"),
  description: z.string().optional(),
  type:        z.string().min(1, "Select type"),
  status:      z.string().min(1, "Select status"),
  price:       z.coerce.number().optional(),
  bedrooms:    z.coerce.number().optional(),
  bathrooms:   z.coerce.number().optional(),
  area_sqft:   z.coerce.number().optional(),
  address:     z.string().optional(),
  city:        z.string().optional(),
  project_id:  z.string().optional(),
  is_featured: z.boolean().optional(),
});
type PropertyForm = z.infer<typeof propertySchema>;

const STATUS_FILTERS = ["all", "available", "reserved", "sold", "off_market"];

const statusVariant = (s: string) => {
  if (s === "available")  return "success";
  if (s === "sold")       return "danger";
  if (s === "reserved")   return "warning";
  return "default";
};

export default function PropertiesClient({
  properties: initialProperties,
  projects,
  currentUserId,
}: {
  properties: Property[];
  projects: Project[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [addOpen, setAddOpen]       = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter]     = useState("");
  const [viewMode, setViewMode]         = useState<"grid" | "list">("grid");
  const [serverError, setServerError]   = useState("");
  const [isPending, startTransition]    = useTransition();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PropertyForm>({ resolver: zodResolver(propertySchema) as any });

  // ── Stats ────────────────────────────────────────────
  const available = properties.filter((p) => p.status === "available").length;
  const reserved  = properties.filter((p) => p.status === "reserved").length;
  const sold      = properties.filter((p) => p.status === "sold").length;
  const featured  = properties.filter((p) => p.is_featured).length;

  // ── Filter ───────────────────────────────────────────
  const filtered = properties.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });

  // ── Submit ───────────────────────────────────────────
  const onSubmit = async (data: PropertyForm) => {
    setServerError("");
    const supabase = createClient() as any;
    const { data: inserted, error } = await supabase
      .from("properties")
      .insert({
        ...data,
        project_id:  data.project_id || null,
        is_featured: data.is_featured ?? false,
      })
      .select(`
        id, title, description, type, status, price,
        bedrooms, bathrooms, area_sqft, address, city,
        is_featured, created_at,
        projects (id, name),
        property_images (id, url, is_primary)
      `)
      .single();

    if (error) { setServerError(error.message); return; }
    setProperties((prev) => [inserted as Property, ...prev]);
    reset();
    setAddOpen(false);
    startTransition(() => router.refresh());
  };

  // ── Property Card ────────────────────────────────────
  const PropertyCard = ({ property }: { property: Property }) => {
    const primaryImage = property.property_images?.find((i) => i.is_primary);

    return (
      <div
        className="rounded-xl border border-border shadow-card hover:shadow-card-hover transition-shadow cursor-pointer overflow-hidden"
        onClick={() => router.push(`/properties/${property.id}`)}
      >
        {/* Image placeholder */}
        <div className="h-44 bg-surface flex items-center justify-center relative">
          {primaryImage ? (
            <img
              src={primaryImage.url}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Home size={36} className="text-border" />
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant={statusVariant(property.status) as any}>
              {PROPERTY_STATUS_LABELS[property.status as keyof typeof PROPERTY_STATUS_LABELS] ?? property.status}
            </Badge>
            {property.is_featured && (
              <Badge variant="accent">Featured</Badge>
            )}
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-ink truncate">{property.title}</h3>
          <p className="text-xs text-ink-muted mt-0.5 capitalize">
            {PROPERTY_TYPE_LABELS[property.type as keyof typeof PROPERTY_TYPE_LABELS] ?? property.type}
          </p>

          {(property.address || property.city) && (
            <p className="text-xs text-ink-muted flex items-center gap-1 mt-1.5">
              <MapPin size={11} />
              {[property.address, property.city].filter(Boolean).join(", ")}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <BedDouble size={12} /> {property.bedrooms} bed
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath size={12} /> {property.bathrooms} bath
              </span>
            )}
            {property.area_sqft != null && (
              <span>{property.area_sqft.toLocaleString()} ft²</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <p className="font-bold text-primary">
              {property.price ? formatCurrency(property.price) : "Price TBD"}
            </p>
            {property.projects?.name && (
              <p className="text-xs text-ink-muted truncate max-w-[120px]">
                {property.projects.name}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-ink">Properties</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {properties.length} total propert{properties.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg border transition-colors ${
              viewMode === "grid"
                ? "border-primary text-primary bg-primary-50"
                : "border-border text-ink-muted hover:text-ink"
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg border transition-colors ${
              viewMode === "list"
                ? "border-primary text-primary bg-primary-50"
                : "border-border text-ink-muted hover:text-ink"
            }`}
          >
            <List size={16} />
          </button>
          <Button icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
            Add Property
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Available"  value={available} icon={<Home size={20} />} variant="success" />
        <StatCard title="Reserved"   value={reserved}  icon={<Tag size={20} />}  variant="warning" />
        <StatCard title="Sold"       value={sold}      icon={<Home size={20} />} variant="primary" />
        <StatCard title="Featured"   value={featured}  icon={<Tag size={20} />}  variant="accent"  />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 border-b border-border">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`
                px-3 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
                ${statusFilter === f
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-muted hover:text-ink"
                }
              `}
            >
              {f === "off_market" ? "Off Market" : f}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-ink outline-none focus:border-primary ml-auto"
        >
          <option value="">All Types</option>
          {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Properties */}
      {filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <Home size={40} className="text-border mx-auto mb-3" />
            <p className="text-sm font-medium text-ink">No properties found</p>
            <p className="text-xs text-ink-muted mt-1">
              Add your first property or adjust your filters.
            </p>
            <Button size="sm" className="mt-4" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add Property
            </Button>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => <PropertyCard key={p.id} property={p} />)}
        </div>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/properties/${p.id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center shrink-0 border border-border">
                  <Home size={20} className="text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{p.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {PROPERTY_TYPE_LABELS[p.type as keyof typeof PROPERTY_TYPE_LABELS] ?? p.type}
                    {p.city && ` · ${p.city}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    {p.bedrooms != null && (
                      <span className="flex items-center gap-1">
                        <BedDouble size={12} /> {p.bedrooms}
                      </span>
                    )}
                    {p.bathrooms != null && (
                      <span className="flex items-center gap-1">
                        <Bath size={12} /> {p.bathrooms}
                      </span>
                    )}
                  </div>
                  <Badge variant={statusVariant(p.status) as any}>
                    {PROPERTY_STATUS_LABELS[p.status as keyof typeof PROPERTY_STATUS_LABELS] ?? p.status}
                  </Badge>
                  <p className="font-bold text-primary text-sm">
                    {p.price ? formatCurrency(p.price) : "TBD"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Property Modal */}
      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); reset(); setServerError(""); }}
        title="Add Property"
        subtitle="List a new property in the system"
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Property Title" placeholder="e.g. 3-Bedroom Apartment, East Legon"
                required error={errors.title?.message} {...register("title")} />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Description</label>
              <textarea rows={2} placeholder="Brief property description..."
                className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-muted resize-none"
                {...register("description")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Type <span className="text-danger">*</span></label>
              <select className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("type")}>
                <option value="">Select type...</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-danger">{errors.type.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Status <span className="text-danger">*</span></label>
              <select className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("status")}>
                <option value="">Select status...</option>
                {Object.entries(PROPERTY_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.status && <p className="text-xs text-danger">{errors.status.message}</p>}
            </div>
            <Input label="Price (GHS)" type="number" placeholder="250000"
              {...register("price")} />
            <Input label="Area (ft²)" type="number" placeholder="1200"
              {...register("area_sqft")} />
            <Input label="Bedrooms" type="number" placeholder="3"
              {...register("bedrooms")} />
            <Input label="Bathrooms" type="number" placeholder="2"
              {...register("bathrooms")} />
            <Input label="Address" placeholder="123 Airport Road"
              {...register("address")} />
            <Input label="City" placeholder="Accra"
              {...register("city")} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Linked Project</label>
              <select className="w-full rounded-lg border border-border bg-card text-ink text-sm px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                {...register("project_id")}>
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="is_featured" className="w-4 h-4 accent-primary"
                {...register("is_featured")} />
              <label htmlFor="is_featured" className="text-sm text-ink">Mark as featured</label>
            </div>
          </div>

          {serverError && (
            <p className="text-sm text-danger bg-danger-bg px-3 py-2 rounded-lg">{serverError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setAddOpen(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save Property
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}