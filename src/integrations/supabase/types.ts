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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          comments_count: number
          community_of_practice: Database["public"]["Enums"]["cop_type"]
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          likes_count: number
          pinned_in_cop: boolean
          post_type: Database["public"]["Enums"]["post_type"]
          tags: string[] | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          author_id: string
          comments_count?: number
          community_of_practice?: Database["public"]["Enums"]["cop_type"]
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          likes_count?: number
          pinned_in_cop?: boolean
          post_type?: Database["public"]["Enums"]["post_type"]
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          author_id?: string
          comments_count?: number
          community_of_practice?: Database["public"]["Enums"]["cop_type"]
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          likes_count?: number
          pinned_in_cop?: boolean
          post_type?: Database["public"]["Enums"]["post_type"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cop_memberships: {
        Row: {
          cop: Database["public"]["Enums"]["cop_type"]
          id: string
          joined_at: string
          member_id: string
        }
        Insert: {
          cop: Database["public"]["Enums"]["cop_type"]
          id?: string
          joined_at?: string
          member_id: string
        }
        Update: {
          cop?: Database["public"]["Enums"]["cop_type"]
          id?: string
          joined_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cop_memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cop_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          cop: Database["public"]["Enums"]["cop_type"]
          id: string
          role: Database["public"]["Enums"]["cop_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          cop: Database["public"]["Enums"]["cop_type"]
          id?: string
          role?: Database["public"]["Enums"]["cop_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          cop?: Database["public"]["Enums"]["cop_type"]
          id?: string
          role?: Database["public"]["Enums"]["cop_role"]
          user_id?: string
        }
        Relationships: []
      }
      deal_interests: {
        Row: {
          created_at: string
          deal_id: string
          id: string
          interest_note: string | null
          investor_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          id?: string
          interest_note?: string | null
          investor_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          id?: string
          interest_note?: string | null
          investor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_interests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_interests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_opportunities: {
        Row: {
          category: string
          created_at: string
          currency: string
          description: string
          enterprise_name: string
          id: string
          instrument_type: Database["public"]["Enums"]["instrument_type"]
          min_tier_required: Database["public"]["Enums"]["membership_tier"]
          sdg_alignment: string[] | null
          sector: string | null
          status: Database["public"]["Enums"]["deal_status"]
          submitted_by: string | null
          ticket_size_max: number | null
          ticket_size_min: number | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          description?: string
          enterprise_name: string
          id?: string
          instrument_type?: Database["public"]["Enums"]["instrument_type"]
          min_tier_required?: Database["public"]["Enums"]["membership_tier"]
          sdg_alignment?: string[] | null
          sector?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          submitted_by?: string | null
          ticket_size_max?: number | null
          ticket_size_min?: number | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          description?: string
          enterprise_name?: string
          id?: string
          instrument_type?: Database["public"]["Enums"]["instrument_type"]
          min_tier_required?: Database["public"]["Enums"]["membership_tier"]
          sdg_alignment?: string[] | null
          sector?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          submitted_by?: string | null
          ticket_size_max?: number | null
          ticket_size_min?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_opportunities_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          member_id: string
          registered_at: string
          status: Database["public"]["Enums"]["registration_status"]
        }
        Insert: {
          event_id: string
          id?: string
          member_id: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Update: {
          event_id?: string
          id?: string
          member_id?: string
          registered_at?: string
          status?: Database["public"]["Enums"]["registration_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          community_of_practice: Database["public"]["Enums"]["cop_type"] | null
          created_at: string
          created_by: string | null
          description: string
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_virtual: boolean
          location: string | null
          max_attendees: number | null
          min_tier_required: Database["public"]["Enums"]["membership_tier"]
          start_date: string
          title: string
          virtual_link: string | null
        }
        Insert: {
          community_of_practice?: Database["public"]["Enums"]["cop_type"] | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_virtual?: boolean
          location?: string | null
          max_attendees?: number | null
          min_tier_required?: Database["public"]["Enums"]["membership_tier"]
          start_date: string
          title: string
          virtual_link?: string | null
        }
        Update: {
          community_of_practice?: Database["public"]["Enums"]["cop_type"] | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_virtual?: boolean
          location?: string | null
          max_attendees?: number | null
          min_tier_required?: Database["public"]["Enums"]["membership_tier"]
          start_date?: string
          title?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_resources: {
        Row: {
          community_of_practice: Database["public"]["Enums"]["cop_type"]
          created_at: string
          description: string
          downloads_count: number
          file_url: string
          id: string
          min_tier_required: Database["public"]["Enums"]["membership_tier"]
          resource_type: Database["public"]["Enums"]["resource_type"]
          title: string
          uploaded_by: string | null
        }
        Insert: {
          community_of_practice?: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          description?: string
          downloads_count?: number
          file_url?: string
          id?: string
          min_tier_required?: Database["public"]["Enums"]["membership_tier"]
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title: string
          uploaded_by?: string | null
        }
        Update: {
          community_of_practice?: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          description?: string
          downloads_count?: number
          file_url?: string
          id?: string
          min_tier_required?: Database["public"]["Enums"]["membership_tier"]
          resource_type?: Database["public"]["Enums"]["resource_type"]
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_key: string
          cop: Database["public"]["Enums"]["cop_type"] | null
          id: string
          label: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_key: string
          cop?: Database["public"]["Enums"]["cop_type"] | null
          id?: string
          label: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_key?: string
          cop?: Database["public"]["Enums"]["cop_type"] | null
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      member_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          member_id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          member_id: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          member_id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      membership_applications: {
        Row: {
          amount_naira: number
          aum_range: string | null
          comm_preference: string | null
          contributions: string[]
          created_at: string
          details: Json
          email: string
          emailed_at: string | null
          event_role: string | null
          events_interested: string[]
          full_name: string
          goals: string[]
          heard_from: string | null
          id: string
          investment_stage: string | null
          linkedin_url: string | null
          location: string | null
          organisation_name: string
          organisation_type: string | null
          payment_reference: string | null
          payment_required: boolean
          payment_status: string
          phone: string | null
          requested_tier: Database["public"]["Enums"]["membership_tier"]
          review_note: string
          role_title: string | null
          sdg_focus: string[]
          sectors: string[]
          statement: string | null
          status: string
          tier_label: string
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          amount_naira?: number
          aum_range?: string | null
          comm_preference?: string | null
          contributions?: string[]
          created_at?: string
          details?: Json
          email: string
          emailed_at?: string | null
          event_role?: string | null
          events_interested?: string[]
          full_name: string
          goals?: string[]
          heard_from?: string | null
          id?: string
          investment_stage?: string | null
          linkedin_url?: string | null
          location?: string | null
          organisation_name: string
          organisation_type?: string | null
          payment_reference?: string | null
          payment_required?: boolean
          payment_status?: string
          phone?: string | null
          requested_tier?: Database["public"]["Enums"]["membership_tier"]
          review_note?: string
          role_title?: string | null
          sdg_focus?: string[]
          sectors?: string[]
          statement?: string | null
          status?: string
          tier_label?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          amount_naira?: number
          aum_range?: string | null
          comm_preference?: string | null
          contributions?: string[]
          created_at?: string
          details?: Json
          email?: string
          emailed_at?: string | null
          event_role?: string | null
          events_interested?: string[]
          full_name?: string
          goals?: string[]
          heard_from?: string | null
          id?: string
          investment_stage?: string | null
          linkedin_url?: string | null
          location?: string | null
          organisation_name?: string
          organisation_type?: string | null
          payment_reference?: string | null
          payment_required?: boolean
          payment_status?: string
          phone?: string | null
          requested_tier?: Database["public"]["Enums"]["membership_tier"]
          review_note?: string
          role_title?: string | null
          sdg_focus?: string[]
          sectors?: string[]
          statement?: string | null
          status?: string
          tier_label?: string
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      membership_payments: {
        Row: {
          amount_kobo: number
          created_at: string
          currency: string
          email: string
          full_name: string | null
          id: string
          metadata: Json
          paid_at: string | null
          provider: string
          reference: string
          status: string
          tier: Database["public"]["Enums"]["membership_tier"]
          user_id: string | null
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          currency?: string
          email: string
          full_name?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string
          reference: string
          status?: string
          tier: Database["public"]["Enums"]["membership_tier"]
          user_id?: string | null
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          email?: string
          full_name?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          provider?: string
          reference?: string
          status?: string
          tier?: Database["public"]["Enums"]["membership_tier"]
          user_id?: string | null
        }
        Relationships: []
      }
      mentorship_bookings: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          mentor_id: string
          message: string
          proposed_time: string
          requester_id: string
          status: Database["public"]["Enums"]["mentorship_status"]
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          mentor_id: string
          message?: string
          proposed_time?: string
          requester_id: string
          status?: Database["public"]["Enums"]["mentorship_status"]
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          mentor_id?: string
          message?: string
          proposed_time?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["mentorship_status"]
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentorship_offers: {
        Row: {
          active: boolean
          availability: string
          bio: string
          capacity_per_month: number
          cops: Database["public"]["Enums"]["cop_type"][]
          created_at: string
          id: string
          mentor_id: string
          topics: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          availability?: string
          bio?: string
          capacity_per_month?: number
          cops?: Database["public"]["Enums"]["cop_type"][]
          created_at?: string
          id?: string
          mentor_id: string
          topics?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          availability?: string
          bio?: string
          capacity_per_month?: number
          cops?: Database["public"]["Enums"]["cop_type"][]
          created_at?: string
          id?: string
          mentor_id?: string
          topics?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          recipient_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closes_at: string | null
          cop: Database["public"]["Enums"]["cop_type"]
          created_at: string
          created_by: string
          id: string
          multi_select: boolean
          options: Json
          question: string
        }
        Insert: {
          closes_at?: string | null
          cop: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          created_by: string
          id?: string
          multi_select?: boolean
          options: Json
          question: string
        }
        Update: {
          closes_at?: string | null
          cop?: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          created_by?: string
          id?: string
          multi_select?: boolean
          options?: Json
          question?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          application_data: Json
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          bio: string | null
          crm_stage: string
          crm_tags: string[]
          email: string
          engagement_score: number
          full_name: string
          id: string
          joined_at: string
          last_active_at: string
          linkedin_url: string | null
          location: string | null
          membership_status: Database["public"]["Enums"]["membership_status"]
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          organisation_name: string | null
          organisation_type: Database["public"]["Enums"]["org_type"] | null
          phone: string | null
          role_title: string | null
          sdg_focus: string[] | null
          sectors: string[] | null
          website_url: string | null
        }
        Insert: {
          application_data?: Json
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          crm_stage?: string
          crm_tags?: string[]
          email: string
          engagement_score?: number
          full_name?: string
          id: string
          joined_at?: string
          last_active_at?: string
          linkedin_url?: string | null
          location?: string | null
          membership_status?: Database["public"]["Enums"]["membership_status"]
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          organisation_name?: string | null
          organisation_type?: Database["public"]["Enums"]["org_type"] | null
          phone?: string | null
          role_title?: string | null
          sdg_focus?: string[] | null
          sectors?: string[] | null
          website_url?: string | null
        }
        Update: {
          application_data?: Json
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          crm_stage?: string
          crm_tags?: string[]
          email?: string
          engagement_score?: number
          full_name?: string
          id?: string
          joined_at?: string
          last_active_at?: string
          linkedin_url?: string | null
          location?: string | null
          membership_status?: Database["public"]["Enums"]["membership_status"]
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          organisation_name?: string | null
          organisation_type?: Database["public"]["Enums"]["org_type"] | null
          phone?: string | null
          role_title?: string | null
          sdg_focus?: string[] | null
          sectors?: string[] | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfc_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          rfc_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          rfc_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          rfc_id?: string
        }
        Relationships: []
      }
      rfc_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: Database["public"]["Enums"]["rfc_reaction"]
          rfc_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: Database["public"]["Enums"]["rfc_reaction"]
          rfc_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: Database["public"]["Enums"]["rfc_reaction"]
          rfc_id?: string
          user_id?: string
        }
        Relationships: []
      }
      rfcs: {
        Row: {
          author_id: string
          body: string
          cop: Database["public"]["Enums"]["cop_type"]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string
          id: string
          status: Database["public"]["Enums"]["rfc_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          cop: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string
          id?: string
          status?: Database["public"]["Enums"]["rfc_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          cop?: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string
          id?: string
          status?: Database["public"]["Enums"]["rfc_status"]
          title?: string
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
      working_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "working_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      working_groups: {
        Row: {
          cop: Database["public"]["Enums"]["cop_type"]
          created_at: string
          created_by: string
          deliverable: string
          description: string
          id: string
          lead_id: string
          name: string
          status: Database["public"]["Enums"]["working_group_status"]
          updated_at: string
        }
        Insert: {
          cop: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          created_by: string
          deliverable?: string
          description?: string
          id?: string
          lead_id: string
          name: string
          status?: Database["public"]["Enums"]["working_group_status"]
          updated_at?: string
        }
        Update: {
          cop?: Database["public"]["Enums"]["cop_type"]
          created_at?: string
          created_by?: string
          deliverable?: string
          description?: string
          id?: string
          lead_id?: string
          name?: string
          status?: Database["public"]["Enums"]["working_group_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      cop_leaderboard: {
        Row: {
          avatar_url: string | null
          cop: Database["public"]["Enums"]["cop_type"] | null
          engagement_score: number | null
          full_name: string | null
          posts_30d: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cop_memberships_member_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_broadcast_notification: {
        Args: {
          _link?: string
          _message: string
          _recipient_ids: string[]
          _title: string
        }
        Returns: number
      }
      admin_get_profiles: {
        Args: { _ids: string[] }
        Returns: {
          application_data: Json
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          bio: string | null
          crm_stage: string
          crm_tags: string[]
          email: string
          engagement_score: number
          full_name: string
          id: string
          joined_at: string
          last_active_at: string
          linkedin_url: string | null
          location: string | null
          membership_status: Database["public"]["Enums"]["membership_status"]
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          organisation_name: string | null
          organisation_type: Database["public"]["Enums"]["org_type"] | null
          phone: string | null
          role_title: string | null
          sdg_focus: string[] | null
          sectors: string[] | null
          website_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_profiles: {
        Args: never
        Returns: {
          application_data: Json
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          bio: string | null
          crm_stage: string
          crm_tags: string[]
          email: string
          engagement_score: number
          full_name: string
          id: string
          joined_at: string
          last_active_at: string
          linkedin_url: string | null
          location: string | null
          membership_status: Database["public"]["Enums"]["membership_status"]
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          organisation_name: string | null
          organisation_type: Database["public"]["Enums"]["org_type"] | null
          phone: string | null
          role_title: string | null
          sdg_focus: string[] | null
          sectors: string[] | null
          website_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      award_badge: {
        Args: {
          _cop?: Database["public"]["Enums"]["cop_type"]
          _key: string
          _label: string
          _user_id: string
        }
        Returns: undefined
      }
      bump_engagement: {
        Args: { _delta: number; _user_id: string }
        Returns: undefined
      }
      current_tier: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["membership_tier"]
      }
      get_event_virtual_link: { Args: { _event_id: string }; Returns: string }
      get_my_profile: {
        Args: never
        Returns: {
          application_data: Json
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          bio: string | null
          crm_stage: string
          crm_tags: string[]
          email: string
          engagement_score: number
          full_name: string
          id: string
          joined_at: string
          last_active_at: string
          linkedin_url: string | null
          location: string | null
          membership_status: Database["public"]["Enums"]["membership_status"]
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          organisation_name: string | null
          organisation_type: Database["public"]["Enums"]["org_type"] | null
          phone: string | null
          role_title: string | null
          sdg_focus: string[] | null
          sectors: string[] | null
          website_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_tier_usage: {
        Args: { _user_id: string }
        Returns: {
          cop_count: number
          mentorship_this_month: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_resource_download: {
        Args: { _resource_id: string }
        Returns: undefined
      }
      is_active_member: { Args: { _user_id: string }; Returns: boolean }
      is_cop_chair: {
        Args: {
          _cop: Database["public"]["Enums"]["cop_type"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      request_tier_upgrade: {
        Args: {
          _note?: string
          _requested: Database["public"]["Enums"]["membership_tier"]
        }
        Returns: undefined
      }
      submit_application: {
        Args: {
          _application_data: Json
          _bio: string
          _full_name: string
          _linkedin_url: string
          _location: string
          _organisation_name: string
          _organisation_type: Database["public"]["Enums"]["org_type"]
          _phone: string
          _role_title: string
          _sdg_focus: string[]
          _sectors: string[]
          _user_id: string
          _website_url: string
        }
        Returns: undefined
      }
      tier_meets: {
        Args: {
          _required: Database["public"]["Enums"]["membership_tier"]
          _user_id: string
        }
        Returns: boolean
      }
      tier_rank: {
        Args: { _tier: Database["public"]["Enums"]["membership_tier"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "member" | "admin" | "super_admin"
      cop_role: "chair" | "co_chair" | "steward"
      cop_type:
        | "giis-inclusive-impact"
        | "climate-green-finance"
        | "niiric"
        | "policy-acii"
        | "capital-deals"
        | "eso-collaborative"
        | "general"
      deal_status: "open" | "under_review" | "matched" | "closed"
      event_type:
        | "convening"
        | "deal_room"
        | "cop_meeting"
        | "webinar"
        | "boot_camp"
        | "policy_roundtable"
      instrument_type:
        | "equity"
        | "debt"
        | "grant"
        | "blended"
        | "convertible_note"
        | "revenue_share"
      membership_status: "pending" | "active" | "lapsed" | "suspended"
      membership_tier:
        | "observer"
        | "contributor"
        | "growth_partner"
        | "anchor"
        | "strategic_partner"
      mentorship_status:
        | "requested"
        | "confirmed"
        | "completed"
        | "declined"
        | "cancelled"
      notification_type:
        | "welcome"
        | "post_reply"
        | "event_reminder"
        | "deal_match"
        | "admin_message"
        | "tier_upgrade"
      org_type:
        | "investor"
        | "dfi"
        | "social_enterprise"
        | "government"
        | "foundation"
        | "accelerator"
        | "research"
        | "corporate"
        | "other"
      post_type:
        | "discussion"
        | "opportunity"
        | "event"
        | "knowledge"
        | "announcement"
      post_visibility:
        | "all_members"
        | "contributor_plus"
        | "growth_partner_plus"
        | "anchor_plus"
      registration_status: "registered" | "attended" | "cancelled"
      resource_type:
        | "report"
        | "case_study"
        | "policy_brief"
        | "dataset"
        | "presentation"
        | "toolkit"
      rfc_reaction: "support" | "concern" | "watching"
      rfc_status: "open" | "accepted" | "parked" | "rejected"
      working_group_status: "active" | "closed" | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["member", "admin", "super_admin"],
      cop_role: ["chair", "co_chair", "steward"],
      cop_type: [
        "giis-inclusive-impact",
        "climate-green-finance",
        "niiric",
        "policy-acii",
        "capital-deals",
        "eso-collaborative",
        "general",
      ],
      deal_status: ["open", "under_review", "matched", "closed"],
      event_type: [
        "convening",
        "deal_room",
        "cop_meeting",
        "webinar",
        "boot_camp",
        "policy_roundtable",
      ],
      instrument_type: [
        "equity",
        "debt",
        "grant",
        "blended",
        "convertible_note",
        "revenue_share",
      ],
      membership_status: ["pending", "active", "lapsed", "suspended"],
      membership_tier: [
        "observer",
        "contributor",
        "growth_partner",
        "anchor",
        "strategic_partner",
      ],
      mentorship_status: [
        "requested",
        "confirmed",
        "completed",
        "declined",
        "cancelled",
      ],
      notification_type: [
        "welcome",
        "post_reply",
        "event_reminder",
        "deal_match",
        "admin_message",
        "tier_upgrade",
      ],
      org_type: [
        "investor",
        "dfi",
        "social_enterprise",
        "government",
        "foundation",
        "accelerator",
        "research",
        "corporate",
        "other",
      ],
      post_type: [
        "discussion",
        "opportunity",
        "event",
        "knowledge",
        "announcement",
      ],
      post_visibility: [
        "all_members",
        "contributor_plus",
        "growth_partner_plus",
        "anchor_plus",
      ],
      registration_status: ["registered", "attended", "cancelled"],
      resource_type: [
        "report",
        "case_study",
        "policy_brief",
        "dataset",
        "presentation",
        "toolkit",
      ],
      rfc_reaction: ["support", "concern", "watching"],
      rfc_status: ["open", "accepted", "parked", "rejected"],
      working_group_status: ["active", "closed", "archived"],
    },
  },
} as const
