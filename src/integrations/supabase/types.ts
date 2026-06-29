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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          summary: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          summary?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          summary?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      alert_recipients: {
        Row: {
          alert_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_recipients_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          body: string
          created_at: string
          created_by: string
          created_by_name: string | null
          id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          created_by_name?: string | null
          id?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          id?: string
        }
        Relationships: []
      }
      board_decisions: {
        Row: {
          created_at: string
          decided_at: string
          decision: string
          id: string
          meeting_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          decided_at?: string
          decision: string
          id?: string
          meeting_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          decided_at?: string
          decision?: string
          id?: string
          meeting_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_decisions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "board_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      board_meetings: {
        Row: {
          created_at: string
          id: string
          meeting_date: string
          notes: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_date: string
          notes?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_date?: string
          notes?: string | null
          title?: string
        }
        Relationships: []
      }
      brand_documents: {
        Row: {
          body: string
          created_at: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      branding_notes: {
        Row: {
          body: string
          id: string
          updated_at: string
        }
        Insert: {
          body?: string
          id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bugs: {
        Row: {
          created_at: string
          created_by_name: string | null
          description: string | null
          id: string
          severity: Database["public"]["Enums"]["bug_severity"]
          status: Database["public"]["Enums"]["bug_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          id?: string
          severity?: Database["public"]["Enums"]["bug_severity"]
          status?: Database["public"]["Enums"]["bug_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          id?: string
          severity?: Database["public"]["Enums"]["bug_severity"]
          status?: Database["public"]["Enums"]["bug_status"]
          title?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          source_id: string | null
          source_type: string | null
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          source_id?: string | null
          source_type?: string | null
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          source_id?: string | null
          source_type?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      commercial_actions: {
        Row: {
          acted_on: string
          created_at: string
          id: string
          institution_id: string | null
          name: string
          note: string | null
          situation: string | null
          status: Database["public"]["Enums"]["commercial_action_status"]
          type: Database["public"]["Enums"]["commercial_action_type"]
        }
        Insert: {
          acted_on?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          name: string
          note?: string | null
          situation?: string | null
          status?: Database["public"]["Enums"]["commercial_action_status"]
          type: Database["public"]["Enums"]["commercial_action_type"]
        }
        Update: {
          acted_on?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          name?: string
          note?: string | null
          situation?: string | null
          status?: Database["public"]["Enums"]["commercial_action_status"]
          type?: Database["public"]["Enums"]["commercial_action_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_actions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "commercial_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_goals: {
        Row: {
          goal_cafe: number
          goal_email: number
          goal_entrevista: number
          goal_sms_linkedin: number
          goal_visita: number
          id: string
          updated_at: string
        }
        Insert: {
          goal_cafe?: number
          goal_email?: number
          goal_entrevista?: number
          goal_sms_linkedin?: number
          goal_visita?: number
          id?: string
          updated_at?: string
        }
        Update: {
          goal_cafe?: number
          goal_email?: number
          goal_entrevista?: number
          goal_sms_linkedin?: number
          goal_visita?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commercial_institutions: {
        Row: {
          channels: string[]
          contacts: string | null
          created_at: string
          focus: string | null
          id: string
          kind: Database["public"]["Enums"]["commercial_institution_kind"]
          last_contact_at: string | null
          location: string | null
          name: string
          next_action_at: string | null
          notes: string | null
          responsaveis: string | null
          status: Database["public"]["Enums"]["commercial_institution_status"]
          updated_at: string
        }
        Insert: {
          channels?: string[]
          contacts?: string | null
          created_at?: string
          focus?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["commercial_institution_kind"]
          last_contact_at?: string | null
          location?: string | null
          name: string
          next_action_at?: string | null
          notes?: string | null
          responsaveis?: string | null
          status?: Database["public"]["Enums"]["commercial_institution_status"]
          updated_at?: string
        }
        Update: {
          channels?: string[]
          contacts?: string | null
          created_at?: string
          focus?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["commercial_institution_kind"]
          last_contact_at?: string | null
          location?: string | null
          name?: string
          next_action_at?: string | null
          notes?: string | null
          responsaveis?: string | null
          status?: Database["public"]["Enums"]["commercial_institution_status"]
          updated_at?: string
        }
        Relationships: []
      }
      commercial_meetings: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          institution_id: string | null
          meeting_date: string
          notes: string | null
          status: Database["public"]["Enums"]["commercial_meeting_status"]
          title: string
          type: Database["public"]["Enums"]["commercial_meeting_type"]
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          institution_id?: string | null
          meeting_date: string
          notes?: string | null
          status?: Database["public"]["Enums"]["commercial_meeting_status"]
          title: string
          type?: Database["public"]["Enums"]["commercial_meeting_type"]
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          institution_id?: string | null
          meeting_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["commercial_meeting_status"]
          title?: string
          type?: Database["public"]["Enums"]["commercial_meeting_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commercial_meetings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "commercial_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_notes: {
        Row: {
          body: string
          id: string
          updated_at: string
        }
        Insert: {
          body?: string
          id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      commercial_quick_notes: {
        Row: {
          author_name: string | null
          body: string
          created_at: string
          id: string
          institution_id: string | null
        }
        Insert: {
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          institution_id?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string
          created_at?: string
          id?: string
          institution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_quick_notes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "commercial_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_scripts: {
        Row: {
          body: string
          icon: string | null
          id: string
          key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          icon?: string | null
          id?: string
          key: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          icon?: string | null
          id?: string
          key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      costs: {
        Row: {
          amount_cents: number
          area: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          occurred_on: string
          period: Database["public"]["Enums"]["cost_period"]
        }
        Insert: {
          amount_cents?: number
          area: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_on?: string
          period?: Database["public"]["Enums"]["cost_period"]
        }
        Update: {
          amount_cents?: number
          area?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          occurred_on?: string
          period?: Database["public"]["Enums"]["cost_period"]
        }
        Relationships: []
      }
      docs: {
        Row: {
          attachments: Json
          completed: boolean
          content: string | null
          created_at: string
          due_date: string | null
          id: string
          is_blank: boolean | null
          owner_name: string | null
          owner_user_id: string | null
          status: Database["public"]["Enums"]["doc_status"]
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          completed?: boolean
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_blank?: boolean | null
          owner_name?: string | null
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          completed?: boolean
          content?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          is_blank?: boolean | null
          owner_name?: string | null
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["doc_status"]
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          created_at: string
          created_by_name: string | null
          decided_at: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["idea_status"]
          task_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by_name?: string | null
          decided_at?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["idea_status"]
          task_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by_name?: string | null
          decided_at?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["idea_status"]
          task_id?: string | null
          title?: string
        }
        Relationships: []
      }
      meeting_task_links: {
        Row: {
          meeting_id: string
          task_id: string
        }
        Insert: {
          meeting_id: string
          task_id: string
        }
        Update: {
          meeting_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_task_links_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          actions: Json
          completed_at: string | null
          created_at: string
          event_id: string
          id: string
          notes: string
          status: Database["public"]["Enums"]["meeting_status"]
          type: Database["public"]["Enums"]["meeting_type"]
        }
        Insert: {
          actions?: Json
          completed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          notes?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          type: Database["public"]["Enums"]["meeting_type"]
        }
        Update: {
          actions?: Json
          completed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notes?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          type?: Database["public"]["Enums"]["meeting_type"]
        }
        Relationships: [
          {
            foreignKeyName: "meetings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      okrs: {
        Row: {
          created_at: string
          id: string
          key_result: string
          objective: string
          progress: number
          quarter: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_result: string
          objective: string
          progress?: number
          quarter: string
        }
        Update: {
          created_at?: string
          id?: string
          key_result?: string
          objective?: string
          progress?: number
          quarter?: string
        }
        Relationships: []
      }
      personal_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_tasks: {
        Row: {
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          onboarded_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender"]
          id: string
          onboarded_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          onboarded_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          board_only: boolean
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["roadmap_kind"]
          project_id: string | null
          status: string
          target_date: string | null
          title: string
        }
        Insert: {
          board_only?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["roadmap_kind"]
          project_id?: string | null
          status?: string
          target_date?: string | null
          title: string
        }
        Update: {
          board_only?: boolean
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["roadmap_kind"]
          project_id?: string | null
          status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      site_articles: {
        Row: {
          author_name: string | null
          body: string
          category: Database["public"]["Enums"]["article_category"]
          created_at: string
          id: string
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          body?: string
          category?: Database["public"]["Enums"]["article_category"]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          body?: string
          category?: Database["public"]["Enums"]["article_category"]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          assets: Json
          body: string
          created_at: string
          created_by: string | null
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          publish_at: string | null
          status: Database["public"]["Enums"]["post_status"]
        }
        Insert: {
          assets?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          publish_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Update: {
          assets?: Json
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          publish_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          starts_on: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          starts_on: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          starts_on?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          profile_id: string
          task_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id: string
          task_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_name: string | null
          board_only: boolean
          branch: string | null
          created_at: string
          description: string | null
          documented: boolean
          due_date: string | null
          id: string
          needs_documentation: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          roadmap_item_id: string | null
          sprint_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_name?: string | null
          board_only?: boolean
          branch?: string | null
          created_at?: string
          description?: string | null
          documented?: boolean
          due_date?: string | null
          id?: string
          needs_documentation?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          roadmap_item_id?: string | null
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_name?: string | null
          board_only?: boolean
          branch?: string | null
          created_at?: string
          description?: string | null
          documented?: boolean
          due_date?: string | null
          id?: string
          needs_documentation?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          roadmap_item_id?: string | null
          sprint_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "engineer"
      article_category: "company" | "notes" | "research"
      article_status: "draft" | "published"
      bug_severity: "low" | "medium" | "high" | "critical"
      bug_status: "open" | "investigating" | "fixed" | "wontfix"
      commercial_action_status:
        | "por_contactar"
        | "sem_resposta"
        | "contactado"
        | "em_conversa"
        | "reuniao_marcada"
        | "parceria_fechada"
        | "nao_avancou"
      commercial_action_type:
        | "email"
        | "sms_linkedin"
        | "entrevista"
        | "cafe"
        | "visita"
      commercial_institution_kind: "ipss" | "estrategico"
      commercial_institution_status:
        | "por_enviar"
        | "enviado"
        | "agendado"
        | "acordado"
      commercial_meeting_status:
        | "agendada"
        | "confirmada"
        | "concluida"
        | "cancelada"
      commercial_meeting_type:
        | "reuniao"
        | "cafe"
        | "entrevista"
        | "visita"
        | "evento"
      cost_period: "monthly" | "annual" | "one_off"
      doc_status: "draft" | "published"
      event_kind: "meeting" | "task_due" | "doc_due" | "custom"
      gender: "male" | "female"
      idea_status: "pending" | "accepted" | "rejected"
      meeting_status: "scheduled" | "in_progress" | "done"
      meeting_type:
        | "sprint_planning"
        | "sprint_review"
        | "sprint_backlog"
        | "external_partner"
        | "external_investor"
        | "external_press"
        | "external_other"
      post_status: "idea" | "scheduled" | "published"
      project_status: "planning" | "active" | "paused" | "done"
      roadmap_kind: "work_package" | "milestone"
      social_platform:
        | "linkedin_kindtech"
        | "linkedin_compy"
        | "x_kindtech"
        | "tiktok_compy"
        | "facebook_compy"
      task_priority: "low" | "medium" | "important" | "urgent"
      task_status: "todo" | "doing" | "blocked" | "done" | "review"
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
      app_role: ["admin", "engineer"],
      article_category: ["company", "notes", "research"],
      article_status: ["draft", "published"],
      bug_severity: ["low", "medium", "high", "critical"],
      bug_status: ["open", "investigating", "fixed", "wontfix"],
      commercial_action_status: [
        "por_contactar",
        "sem_resposta",
        "contactado",
        "em_conversa",
        "reuniao_marcada",
        "parceria_fechada",
        "nao_avancou",
      ],
      commercial_action_type: [
        "email",
        "sms_linkedin",
        "entrevista",
        "cafe",
        "visita",
      ],
      commercial_institution_kind: ["ipss", "estrategico"],
      commercial_institution_status: [
        "por_enviar",
        "enviado",
        "agendado",
        "acordado",
      ],
      commercial_meeting_status: [
        "agendada",
        "confirmada",
        "concluida",
        "cancelada",
      ],
      commercial_meeting_type: [
        "reuniao",
        "cafe",
        "entrevista",
        "visita",
        "evento",
      ],
      cost_period: ["monthly", "annual", "one_off"],
      doc_status: ["draft", "published"],
      event_kind: ["meeting", "task_due", "doc_due", "custom"],
      gender: ["male", "female"],
      idea_status: ["pending", "accepted", "rejected"],
      meeting_status: ["scheduled", "in_progress", "done"],
      meeting_type: [
        "sprint_planning",
        "sprint_review",
        "sprint_backlog",
        "external_partner",
        "external_investor",
        "external_press",
        "external_other",
      ],
      post_status: ["idea", "scheduled", "published"],
      project_status: ["planning", "active", "paused", "done"],
      roadmap_kind: ["work_package", "milestone"],
      social_platform: [
        "linkedin_kindtech",
        "linkedin_compy",
        "x_kindtech",
        "tiktok_compy",
        "facebook_compy",
      ],
      task_priority: ["low", "medium", "important", "urgent"],
      task_status: ["todo", "doing", "blocked", "done", "review"],
    },
  },
} as const
