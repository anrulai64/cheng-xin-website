/**
 * Basic Supabase Database types for the existing `public` schema.
 *
 * These describe the tables that already exist in Supabase. They are intentionally
 * conservative (nullable where uncertain) so they do not break `next build`.
 * Regenerate / refine these as the schema evolves in later phases.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      site_settings: {
        Row: {
          id: string
          key: string | null
          value: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key?: string | null
          value?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string | null
          value?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          slug: string | null
          title: string | null
          excerpt: string | null
          content: string | null
          cover_image: string | null
          published: boolean | null
          published_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug?: string | null
          title?: string | null
          excerpt?: string | null
          content?: string | null
          cover_image?: string | null
          published?: boolean | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string | null
          title?: string | null
          excerpt?: string | null
          content?: string | null
          cover_image?: string | null
          published?: boolean | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      case_studies: {
        Row: {
          id: string
          slug: string | null
          title: string | null
          summary: string | null
          content: string | null
          cover_image: string | null
          published: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug?: string | null
          title?: string | null
          summary?: string | null
          content?: string | null
          cover_image?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string | null
          title?: string | null
          summary?: string | null
          content?: string | null
          cover_image?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          slug: string | null
          title: string | null
          description: string | null
          content: string | null
          icon: string | null
          published: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug?: string | null
          title?: string | null
          description?: string | null
          content?: string | null
          icon?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string | null
          title?: string | null
          description?: string | null
          content?: string | null
          icon?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_areas: {
        Row: {
          id: string
          slug: string | null
          name: string | null
          description: string | null
          content: string | null
          published: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug?: string | null
          name?: string | null
          description?: string | null
          content?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string | null
          name?: string | null
          description?: string | null
          content?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: string
          question: string | null
          answer: string | null
          category: string | null
          sort_order: number | null
          published: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          question?: string | null
          answer?: string | null
          category?: string | null
          sort_order?: number | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          question?: string | null
          answer?: string | null
          category?: string | null
          sort_order?: number | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          id: string
          user_id: string | null
          email: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          email?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          email?: string | null
          role?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
