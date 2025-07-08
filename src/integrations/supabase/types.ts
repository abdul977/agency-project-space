export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      collaborations: {
        Row: {
          created_at: string | null
          id: number
          requested_email: string | null
          requester_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          requested_email?: string | null
          requester_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          requested_email?: string | null
          requester_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      deliverables: {
        Row: {
          content: string
          created_at: string | null
          delivered_at: string | null
          id: string
          project_id: string
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          project_id: string
          title: string
          type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          project_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          created_at: string | null
          file_path: string
          file_size: number
          filename: string
          id: string
          mime_type: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_path: string
          file_size: number
          filename: string
          id?: string
          mime_type: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          mime_type?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_inputs: {
        Row: {
          content: string
          created_at: string | null
          folder_id: string
          id: string
          order_index: number
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          folder_id: string
          id?: string
          order_index?: number
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          folder_id?: string
          id?: string
          order_index?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_inputs_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      note_entries: {
        Row: {
          audio_url: string | null
          content: string | null
          created_at: string | null
          entry_order: number
          id: string
          note_id: string | null
          updated_at: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          created_at?: string | null
          entry_order: number
          id?: string
          note_id?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          created_at?: string | null
          entry_order?: number
          id?: string
          note_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_entries_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          collaborators: Json | null
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          collaborators?: Json | null
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          collaborators?: Json | null
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          features: string[]
          id: string
          image_url: string | null
          image_urls: string[] | null
          is_featured: boolean | null
          is_hidden: boolean
          is_new: boolean | null
          name: string
          ordered_media: Json | null
          original_id: string | null
          original_price: number | null
          price: number
          updated_at: string | null
          video_url: string | null
          video_urls: string[] | null
          whatsapp_link: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          features?: string[]
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_featured?: boolean | null
          is_hidden?: boolean
          is_new?: boolean | null
          name: string
          ordered_media?: Json | null
          original_id?: string | null
          original_price?: number | null
          price: number
          updated_at?: string | null
          video_url?: string | null
          video_urls?: string[] | null
          whatsapp_link: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          features?: string[]
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          is_featured?: boolean | null
          is_hidden?: boolean
          is_new?: boolean | null
          name?: string
          ordered_media?: Json | null
          original_id?: string | null
          original_price?: number | null
          price?: number
          updated_at?: string | null
          video_url?: string | null
          video_urls?: string[] | null
          whatsapp_link?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          room_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          room_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          room_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          room_id: string | null
          user_id: string
          user_image: string | null
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          room_id?: string | null
          user_id: string
          user_image?: string | null
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          room_id?: string | null
          user_id?: string
          user_image?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_shared_videos: {
        Row: {
          id: string
          room_id: string | null
          shared_at: string | null
          shared_by: string
          video_id: string | null
        }
        Insert: {
          id?: string
          room_id?: string | null
          shared_at?: string | null
          shared_by: string
          video_id?: string | null
        }
        Update: {
          id?: string
          room_id?: string | null
          shared_at?: string | null
          shared_by?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_shared_videos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_shared_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "user_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      room_video_state: {
        Row: {
          id: string
          is_playing: boolean | null
          last_sync_timestamp: string | null
          playback_rate: number | null
          room_id: string | null
          sync_version: number | null
          updated_at: string | null
          updated_by: string | null
          video_current_time: number | null
          video_duration: number | null
          video_type: string | null
          video_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          id?: string
          is_playing?: boolean | null
          last_sync_timestamp?: string | null
          playback_rate?: number | null
          room_id?: string | null
          sync_version?: number | null
          updated_at?: string | null
          updated_by?: string | null
          video_current_time?: number | null
          video_duration?: number | null
          video_type?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          id?: string
          is_playing?: boolean | null
          last_sync_timestamp?: string | null
          playback_rate?: number | null
          room_id?: string | null
          sync_version?: number | null
          updated_at?: string | null
          updated_by?: string | null
          video_current_time?: number | null
          video_duration?: number | null
          video_type?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_video_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          url: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image?: string | null
          name: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          url?: string
        }
        Relationships: []
      }
      sync_commands: {
        Row: {
          client_timestamp: string | null
          command_data: Json
          command_type: string
          created_at: string | null
          executed_by: string | null
          id: string
          room_id: string
          server_timestamp: string | null
          sync_id: string
        }
        Insert: {
          client_timestamp?: string | null
          command_data: Json
          command_type: string
          created_at?: string | null
          executed_by?: string | null
          id?: string
          room_id: string
          server_timestamp?: string | null
          sync_id: string
        }
        Update: {
          client_timestamp?: string | null
          command_data?: Json
          command_type?: string
          created_at?: string | null
          executed_by?: string | null
          id?: string
          room_id?: string
          server_timestamp?: string | null
          sync_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_commands_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_videos: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          file_name: string
          file_size: number
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_name: string
          file_size: number
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          upload_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          password_hash: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          password_hash: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          password_hash?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      video_sync_state: {
        Row: {
          created_at: string | null
          id: string
          is_playing: boolean | null
          playback_rate: number | null
          room_id: string
          server_timestamp: string | null
          sync_version: number | null
          updated_at: string | null
          updated_by: string | null
          video_current_time: number | null
          video_duration: number | null
          video_type: string | null
          video_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_playing?: boolean | null
          playback_rate?: number | null
          room_id: string
          server_timestamp?: string | null
          sync_version?: number | null
          updated_at?: string | null
          updated_by?: string | null
          video_current_time?: number | null
          video_duration?: number | null
          video_type?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_playing?: boolean | null
          playback_rate?: number | null
          room_id?: string
          server_timestamp?: string | null
          sync_version?: number | null
          updated_at?: string | null
          updated_by?: string | null
          video_current_time?: number | null
          video_duration?: number | null
          video_type?: string | null
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_sync_state_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_whatsapp_numbers: {
        Row: {
          browser_fingerprint: string | null
          country_code: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: unknown | null
          is_mobile: boolean | null
          referrer: string | null
          source_page: string
          source_url: string | null
          updated_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp_number: string
        }
        Insert: {
          browser_fingerprint?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          is_mobile?: boolean | null
          referrer?: string | null
          source_page: string
          source_url?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_number: string
        }
        Update: {
          browser_fingerprint?: string | null
          country_code?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          is_mobile?: boolean | null
          referrer?: string | null
          source_page?: string
          source_url?: string | null
          updated_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_user: {
        Args: { phone: string; password: string }
        Returns: {
          user_id: string
          phone_number: string
          full_name: string
          company_name: string
          is_admin: boolean
        }[]
      }
      debug_jwt_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_cinema_sync_data: {
        Args: { p_room_id: string; p_client_timestamp?: string }
        Returns: Json
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_precise_sync_time: {
        Args: { p_room_id: string; p_client_timestamp?: string }
        Returns: Json
      }
      get_server_time: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      record_sync_command: {
        Args: {
          p_room_id: string
          p_command_type: string
          p_command_data: Json
          p_sync_id: string
          p_client_timestamp?: string
        }
        Returns: Json
      }
      update_cinema_sync_state: {
        Args: {
          p_room_id: string
          p_user_id: string
          p_video_url?: string
          p_video_type?: string
          p_youtube_video_id?: string
          p_is_playing?: boolean
          p_current_time?: number
          p_duration?: number
          p_playback_rate?: number
        }
        Returns: Json
      }
      update_room_video_from_library: {
        Args: { p_room_id: string; p_video_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
