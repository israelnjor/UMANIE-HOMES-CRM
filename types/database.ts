export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          phone?: string | null
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          last_login_at?: string | null
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          whatsapp: string | null
          email: string | null
          location: string | null
          budget: number | null
          preferred_property_type: PropertyType | null
          interested_location: string | null
          source: LeadSource
          client_type: ClientType
          status: LeadStatus
          assigned_to: string | null
          linked_project_id: string | null
          linked_property_id: string | null
          notes: string | null
          is_converted: boolean
          converted_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          location?: string | null
          budget?: number | null
          preferred_property_type?: PropertyType | null
          interested_location?: string | null
          source?: LeadSource
          client_type?: ClientType
          status?: LeadStatus
          assigned_to?: string | null
          linked_project_id?: string | null
          linked_property_id?: string | null
          notes?: string | null
          is_converted?: boolean
          created_by?: string | null
        }
        Update: {
          full_name?: string
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          location?: string | null
          budget?: number | null
          preferred_property_type?: PropertyType | null
          interested_location?: string | null
          source?: LeadSource
          client_type?: ClientType
          status?: LeadStatus
          assigned_to?: string | null
          linked_project_id?: string | null
          linked_property_id?: string | null
          notes?: string | null
          is_converted?: boolean
          converted_at?: string | null
          updated_at?: string
        }
      }
      follow_ups: {
        Row: {
          id: string
          lead_id: string | null
          assigned_to: string | null
          title: string
          description: string | null
          due_date: string
          status: FollowUpStatus
          priority: FollowUpPriority
          completed_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          assigned_to?: string | null
          title: string
          description?: string | null
          due_date: string
          status?: FollowUpStatus
          priority?: FollowUpPriority
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          title?: string
          description?: string | null
          due_date?: string
          status?: FollowUpStatus
          priority?: FollowUpPriority
          completed_at?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      site_visits: {
        Row: {
          id: string
          lead_id: string | null
          project_id: string | null
          property_id: string | null
          scheduled_at: string
          assigned_to: string | null
          status: VisitStatus
          client_feedback: string | null
          next_action: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          project_id?: string | null
          property_id?: string | null
          scheduled_at: string
          assigned_to?: string | null
          status?: VisitStatus
          client_feedback?: string | null
          next_action?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          scheduled_at?: string
          assigned_to?: string | null
          status?: VisitStatus
          client_feedback?: string | null
          next_action?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          location: string
          project_type: PropertyType
          description: string | null
          start_date: string | null
          expected_completion: string | null
          status: ProjectStatus
          progress_percentage: number
          project_manager_id: string | null
          budget: number | null
          expected_selling_price: number | null
          total_material_cost: number
          total_labour_cost: number
          total_expense_cost: number
          total_cost: number
          is_converted: boolean
          converted_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location: string
          project_type: PropertyType
          description?: string | null
          start_date?: string | null
          expected_completion?: string | null
          status?: ProjectStatus
          progress_percentage?: number
          project_manager_id?: string | null
          budget?: number | null
          expected_selling_price?: number | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          name?: string
          location?: string
          project_type?: PropertyType
          description?: string | null
          start_date?: string | null
          expected_completion?: string | null
          status?: ProjectStatus
          progress_percentage?: number
          project_manager_id?: string | null
          budget?: number | null
          expected_selling_price?: number | null
          notes?: string | null
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          name: string
          project_id: string | null
          location: string
          unit_number: string | null
          property_type: PropertyType
          bedrooms: number | null
          bathrooms: number | null
          size_sqm: number | null
          floor_number: number | null
          selling_price: number | null
          status: PropertyStatus
          construction_status: ProjectStatus | null
          description: string | null
          floor_plan_url: string | null
          linked_client_id: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          project_id?: string | null
          location: string
          unit_number?: string | null
          property_type: PropertyType
          bedrooms?: number | null
          bathrooms?: number | null
          size_sqm?: number | null
          floor_number?: number | null
          selling_price?: number | null
          status?: PropertyStatus
          construction_status?: ProjectStatus | null
          description?: string | null
          floor_plan_url?: string | null
          linked_client_id?: string | null
          notes?: string | null
          created_by?: string | null
        }
        Update: {
          name?: string
          project_id?: string | null
          location?: string
          unit_number?: string | null
          property_type?: PropertyType
          bedrooms?: number | null
          bathrooms?: number | null
          size_sqm?: number | null
          floor_number?: number | null
          selling_price?: number | null
          status?: PropertyStatus
          construction_status?: ProjectStatus | null
          description?: string | null
          floor_plan_url?: string | null
          linked_client_id?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          project_id: string
          name: string
          category: string
          unit: string
          quantity_in: number
          quantity_used: number
          quantity_remaining: number
          unit_cost: number
          total_cost: number
          supplier: string | null
          purchased_at: string | null
          receipt_url: string | null
          notes: string | null
          added_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          category: string
          unit: string
          quantity_in?: number
          quantity_used?: number
          unit_cost?: number
          supplier?: string | null
          purchased_at?: string | null
          receipt_url?: string | null
          notes?: string | null
          added_by?: string | null
        }
        Update: {
          name?: string
          category?: string
          unit?: string
          quantity_in?: number
          quantity_used?: number
          unit_cost?: number
          supplier?: string | null
          purchased_at?: string | null
          receipt_url?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      stock_movements: {
        Row: {
          id: string
          inventory_item_id: string
          project_id: string
          movement_type: 'stock_in' | 'stock_out'
          quantity: number
          unit_price: number | null
          supplier: string | null
          purpose: string | null
          requested_by: string | null
          receipt_url: string | null
          notes: string | null
          recorded_by: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          inventory_item_id: string
          project_id: string
          movement_type: 'stock_in' | 'stock_out'
          quantity: number
          unit_price?: number | null
          supplier?: string | null
          purpose?: string | null
          requested_by?: string | null
          receipt_url?: string | null
          notes?: string | null
          recorded_by?: string | null
          recorded_at?: string