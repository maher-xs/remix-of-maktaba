export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_settings: {
        Row: {
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          records_count: Json
          status: string
          tables_backed_up: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          records_count?: Json
          status?: string
          tables_backed_up: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          records_count?: Json
          status?: string
          tables_backed_up?: string[]
        }
        Relationships: []
      }
      backup_server_settings: {
        Row: {
          access_key: string | null
          auto_backup_enabled: boolean | null
          auto_backup_schedule: string | null
          bucket_name: string | null
          created_at: string | null
          created_by: string | null
          host: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          max_backups: number | null
          name: string
          password: string | null
          path: string | null
          port: number | null
          region: string | null
          secret_key: string | null
          type: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          access_key?: string | null
          auto_backup_enabled?: boolean | null
          auto_backup_schedule?: string | null
          bucket_name?: string | null
          created_at?: string | null
          created_by?: string | null
          host?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_backups?: number | null
          name: string
          password?: string | null
          path?: string | null
          port?: number | null
          region?: string | null
          secret_key?: string | null
          type: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          access_key?: string | null
          auto_backup_enabled?: boolean | null
          auto_backup_schedule?: string | null
          bucket_name?: string | null
          created_at?: string | null
          created_by?: string | null
          host?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          max_backups?: number | null
          name?: string
          password?: string | null
          path?: string | null
          port?: number | null
          region?: string | null
          secret_key?: string | null
          type?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string | null
          created_at: string | null
          expires_at: string | null
          failed_attempts: number | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          failed_attempts?: number | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          failed_attempts?: number | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      book_annotations: {
        Row: {
          annotation_type: string | null
          book_id: string
          color: string | null
          content: string
          created_at: string
          id: string
          page_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_type?: string | null
          book_id: string
          color?: string | null
          content: string
          created_at?: string
          id?: string
          page_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_type?: string | null
          book_id?: string
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          page_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_annotations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_annotations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_bookmarks: {
        Row: {
          book_id: string
          created_at: string
          id: string
          note: string | null
          page_number: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          note?: string | null
          page_number: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          note?: string | null
          page_number?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_reviews: {
        Row: {
          book_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          download_count: number
          file_size: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          isbn: string | null
          language: string | null
          pages: number | null
          publish_year: number | null
          publisher: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          view_count: number
        }
        Insert: {
          author: string
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_size?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          isbn?: string | null
          language?: string | null
          pages?: number | null
          publish_year?: number | null
          publisher?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
          view_count?: number
        }
        Update: {
          author?: string
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          file_size?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          isbn?: string | null
          language?: string | null
          pages?: number | null
          publish_year?: number | null
          publisher?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          book_count: number
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          book_count?: number
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          book_count?: number
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          status: string
          subject: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      content_moderation_logs: {
        Row: {
          action_taken: string
          content_field: string | null
          content_type: string
          created_at: string
          flagged_words: string[] | null
          id: string
          ip_address: string | null
          original_content: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string
          content_field?: string | null
          content_type: string
          created_at?: string
          flagged_words?: string[] | null
          id?: string
          ip_address?: string | null
          original_content?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string
          content_field?: string | null
          content_type?: string
          created_at?: string
          flagged_words?: string[] | null
          id?: string
          ip_address?: string | null
          original_content?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          admin_notes: string | null
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      discussion_replies: {
        Row: {
          content: string
          created_at: string | null
          discussion_id: string
          id: string
          parent_reply_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          discussion_id: string
          id?: string
          parent_reply_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          discussion_id?: string
          id?: string
          parent_reply_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_votes: {
        Row: {
          created_at: string | null
          discussion_id: string | null
          id: string
          reply_id: string | null
          user_id: string
          vote_type: number
        }
        Insert: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          user_id: string
          vote_type: number
        }
        Update: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "discussion_votes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          book_id: string | null
          content: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          replies_count: number | null
          title: string
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          book_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          replies_count?: number | null
          title: string
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          book_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          replies_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discussions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_selections: {
        Row: {
          book_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          selection_type: string
          start_date: string
          title: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          selection_type: string
          start_date: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          selection_type?: string
          start_date?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_selections_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_selections_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          created_at: string
          discussion_id: string | null
          id: string
          mentioned_user_id: string
          mentioner_id: string
          reply_id: string | null
        }
        Insert: {
          created_at?: string
          discussion_id?: string | null
          id?: string
          mentioned_user_id: string
          mentioner_id: string
          reply_id?: string | null
        }
        Update: {
          created_at?: string
          discussion_id?: string | null
          id?: string
          mentioned_user_id?: string
          mentioner_id?: string
          reply_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "discussion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_settings: {
        Row: {
          id: string
          is_enabled: boolean
          is_maintenance: boolean
          maintenance_message: string | null
          path: string
          title: string
          updated_at: string
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          is_maintenance?: boolean
          maintenance_message?: string | null
          path: string
          title: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_enabled?: boolean
          is_maintenance?: boolean
          maintenance_message?: string | null
          path?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          bio: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          updated_at: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_banned?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          updated_at?: string
          username?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reading_list_books: {
        Row: {
          added_at: string | null
          book_id: string
          id: string
          list_id: string
          notes: string | null
          position: number | null
        }
        Insert: {
          added_at?: string | null
          book_id: string
          id?: string
          list_id: string
          notes?: string | null
          position?: number | null
        }
        Update: {
          added_at?: string | null
          book_id?: string
          id?: string
          list_id?: string
          notes?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_list_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_books_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "public_reading_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_books_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_list_followers: {
        Row: {
          created_at: string
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_list_followers_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "public_reading_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_followers_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_lists: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          created_at: string
          current_page: number
          id: string
          is_completed: boolean | null
          last_read_at: string | null
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          current_page?: number
          id?: string
          is_completed?: boolean | null
          last_read_at?: string | null
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          current_page?: number
          id?: string
          is_completed?: boolean | null
          last_read_at?: string | null
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          path: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          path?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          role: string
          social_links: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          social_links?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          social_links?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          athkar_display_seconds: number | null
          athkar_enabled: boolean | null
          athkar_interval_minutes: number | null
          created_at: string
          id: string
          monthly_reading_goal: number
          notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          athkar_display_seconds?: number | null
          athkar_enabled?: boolean | null
          athkar_interval_minutes?: number | null
          created_at?: string
          id?: string
          monthly_reading_goal?: number
          notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          athkar_display_seconds?: number | null
          athkar_enabled?: boolean | null
          athkar_interval_minutes?: number | null
          created_at?: string
          id?: string
          monthly_reading_goal?: number
          notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          issued_by: string
          notes: string | null
          reason: string
          report_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          issued_by: string
          notes?: string | null
          reason: string
          report_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          issued_by?: string
          notes?: string | null
          reason?: string
          report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_book_reviews: {
        Row: {
          avatar_url: string | null
          book_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          rating: number | null
          review_text: string | null
          updated_at: string | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "public_books"
            referencedColumns: ["id"]
          },
        ]
      }
      public_books: {
        Row: {
          author: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_size: string | null
          file_url: string | null
          id: string | null
          is_featured: boolean | null
          isbn: string | null
          language: string | null
          pages: number | null
          publish_year: number | null
          publisher: string | null
          title: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: string | null
          file_url?: string | null
          id?: string | null
          is_featured?: boolean | null
          isbn?: string | null
          language?: string | null
          pages?: number | null
          publish_year?: number | null
          publisher?: string | null
          title?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: string | null
          file_url?: string | null
          id?: string | null
          is_featured?: boolean | null
          isbn?: string | null
          language?: string | null
          pages?: number | null
          publish_year?: number | null
          publisher?: string | null
          title?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
      public_reading_lists: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_public: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_security_log: {
        Args: { p_action: string; p_details?: Json; p_path?: string }
        Returns: undefined
      }
      ban_user: {
        Args: { reason: string; target_user_id: string }
        Returns: undefined
      }
      check_username_available: {
        Args: { check_username: string; user_id: string }
        Returns: boolean
      }
      ensure_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          bio: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          is_banned: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          updated_at: string
          username: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_admin_stats: {
        Args: never
        Returns: {
          active_readers_today: number
          new_books_week: number
          total_books: number
          total_categories: number
          total_favorites: number
          total_users: number
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          avatar_url: string
          banned_at: string
          banned_reason: string
          bio: string
          country: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_banned: boolean
          is_public: boolean
          is_verified: boolean
          updated_at: string
          username: string
          verified_at: string
          verified_by: string
        }[]
      }
      get_book_rating: {
        Args: { p_book_id: string }
        Returns: {
          average_rating: number
          total_reviews: number
        }[]
      }
      get_book_recommendations: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          author: string
          category_id: string
          cover_url: string
          description: string
          download_count: number
          id: string
          score: number
          title: string
          view_count: number
        }[]
      }
      get_moderation_stats: {
        Args: never
        Returns: {
          blocked_today: number
          blocked_week: number
          by_content_type: Json
          high_severity: number
          total_blocked: number
        }[]
      }
      get_reading_stats: {
        Args: { p_user_id: string }
        Returns: {
          books_completed: number
          favorite_category: string
          last_read_at: string
          reading_streak: number
          total_annotations: number
          total_books_read: number
          total_pages_read: number
        }[]
      }
      get_report_stats: {
        Args: never
        Returns: {
          by_reason: Json
          pending_reports: number
          resolved_today: number
          total_reports: number
        }[]
      }
      get_user_warnings_count: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_download_count: {
        Args: { book_id: string }
        Returns: undefined
      }
      increment_failed_attempts: {
        Args: { p_ip_address: string }
        Returns: Json
      }
      insert_security_log_safe: {
        Args: { p_action: string; p_details?: Json; p_path?: string }
        Returns: undefined
      }
      is_user_banned: { Args: { check_user_id: string }; Returns: boolean }
      log_failed_login: {
        Args: {
          p_email: string
          p_error_message?: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: Json
      }
      log_security_event: {
        Args: { p_action: string; p_details?: Json; p_path?: string }
        Returns: undefined
      }
      search_books: {
        Args: { search_query: string }
        Returns: {
          author: string
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          download_count: number
          file_size: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          isbn: string | null
          language: string | null
          pages: number | null
          publish_year: number | null
          publisher: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "books"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      unban_user: { Args: { target_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "support"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "support"],
    },
  },
} as const
