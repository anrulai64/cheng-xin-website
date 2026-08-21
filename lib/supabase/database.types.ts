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
      article_categories: {
        Row: {
          id: string
          name: string
          seo_title: string | null
          seo_keywords: string | null
          seo_description: string | null
          head_code: string | null
          slug: string
          image_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug: string
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug?: string
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          id: string
          category_id: string
          title: string
          seo_title: string | null
          seo_keywords: string | null
          seo_description: string | null
          head_code: string | null
          slug: string
          video_url: string | null
          cover_image_url: string | null
          publish_date: string
          start_date: string | null
          end_date: string | null
          show_on_homepage: boolean
          is_pinned: boolean
          external_url: string | null
          content_html: string | null
          memo: string | null
          status: string
          excerpt: string | null
          cover_alt: string | null
          content_updated_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          title: string
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug: string
          video_url?: string | null
          cover_image_url?: string | null
          publish_date?: string
          start_date?: string | null
          end_date?: string | null
          show_on_homepage?: boolean
          is_pinned?: boolean
          external_url?: string | null
          content_html?: string | null
          memo?: string | null
          status?: string
          excerpt?: string | null
          cover_alt?: string | null
          content_updated_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug?: string
          video_url?: string | null
          cover_image_url?: string | null
          publish_date?: string
          start_date?: string | null
          end_date?: string | null
          show_on_homepage?: boolean
          is_pinned?: boolean
          external_url?: string | null
          content_html?: string | null
          memo?: string | null
          status?: string
          excerpt?: string | null
          cover_alt?: string | null
          content_updated_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_related_articles: {
        Row: {
          article_id: string
          related_article_id: string
          sort_order: number
        }
        Insert: {
          article_id: string
          related_article_id: string
          sort_order?: number
        }
        Update: {
          article_id?: string
          related_article_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      article_faqs: {
        Row: {
          id: string
          article_id: string
          question: string
          answer: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          article_id: string
          question: string
          answer: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          article_id?: string
          question?: string
          answer?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // -----------------------------------------------------------------------
      // 實績案例管理系統 (Case Study CMS) — STEP 1A. Additive; mirrors
      // scripts/004_cases_schema.sql. Separate from the legacy `case_studies`.
      // -----------------------------------------------------------------------
      case_categories: {
        Row: {
          id: string
          name: string
          seo_title: string | null
          seo_keywords: string | null
          seo_description: string | null
          head_code: string | null
          slug: string | null
          image_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_items: {
        Row: {
          id: string
          category_id: string
          name: string
          short_description: string | null
          seo_title: string | null
          seo_keywords: string | null
          seo_description: string | null
          head_code: string | null
          slug: string | null
          price: number | null
          original_price: number | null
          is_home: boolean
          is_new: boolean
          is_hot: boolean
          is_recommended: boolean
          publish_start: string | null
          publish_end: string | null
          status: string
          description_html: string | null
          detail_html: string | null
          note: string | null
          case_code: string
          stock_quantity: number | null
          safety_stock: number | null
          shipping_rule: string | null
          location: string | null
          property_type: string | null
          property_condition: string | null
          floor_area: string | null
          layout: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          short_description?: string | null
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug?: string | null
          price?: number | null
          original_price?: number | null
          is_home?: boolean
          is_new?: boolean
          is_hot?: boolean
          is_recommended?: boolean
          publish_start?: string | null
          publish_end?: string | null
          status?: string
          description_html?: string | null
          detail_html?: string | null
          note?: string | null
          case_code: string
          stock_quantity?: number | null
          safety_stock?: number | null
          shipping_rule?: string | null
          location?: string | null
          property_type?: string | null
          property_condition?: string | null
          floor_area?: string | null
          layout?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          short_description?: string | null
          seo_title?: string | null
          seo_keywords?: string | null
          seo_description?: string | null
          head_code?: string | null
          slug?: string | null
          price?: number | null
          original_price?: number | null
          is_home?: boolean
          is_new?: boolean
          is_hot?: boolean
          is_recommended?: boolean
          publish_start?: string | null
          publish_end?: string | null
          status?: string
          description_html?: string | null
          detail_html?: string | null
          note?: string | null
          case_code?: string
          stock_quantity?: number | null
          safety_stock?: number | null
          shipping_rule?: string | null
          location?: string | null
          property_type?: string | null
          property_condition?: string | null
          floor_area?: string | null
          layout?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_images: {
        Row: {
          id: string
          case_id: string
          storage_path: string
          public_url: string | null
          alt_text: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          storage_path: string
          public_url?: string | null
          alt_text?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          storage_path?: string
          public_url?: string | null
          alt_text?: string | null
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      case_related_cases: {
        Row: {
          case_id: string
          related_case_id: string
          sort_order: number
          created_at: string
        }
        Insert: {
          case_id: string
          related_case_id: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          case_id?: string
          related_case_id?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      case_faqs: {
        Row: {
          id: string
          question: string
          answer_html: string
          sort_order: number
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          question: string
          answer_html: string
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer_html?: string
          sort_order?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_intro_content: {
        Row: {
          id: string
          content_html: string | null
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content_html?: string | null
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content_html?: string | null
          is_visible?: boolean
          created_at?: string
          updated_at?: string
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
