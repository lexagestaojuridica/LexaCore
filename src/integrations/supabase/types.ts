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
      rh_colaboradores: {
        Row: {
          admission_date: string
          base_salary: number | null
          created_at: string
          department: string
          document_cpf: string | null
          email: string | null
          employment_type: string | null
          full_name: string
          id: string
          organization_id: string
          phone: string | null
          position: string
          rg: string | null
          status: string | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
          work_format: string | null
        }
        Insert: {
          admission_date: string
          base_salary?: number | null
          created_at?: string
          department: string
          document_cpf?: string | null
          email?: string | null
          employment_type?: string | null
          full_name: string
          id?: string
          organization_id: string
          phone?: string | null
          position: string
          rg?: string | null
          status?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          work_format?: string | null
        }
        Update: {
          admission_date?: string
          base_salary?: number | null
          created_at?: string
          department?: string
          document_cpf?: string | null
          email?: string | null
          employment_type?: string | null
          full_name?: string
          id?: string
          organization_id?: string
          phone?: string | null
          position?: string
          rg?: string | null
          status?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
          work_format?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_colaboradores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_colaboradores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      rh_ponto_registros: {
        Row: {
          created_at: string
          device_info: string | null
          employee_id: string
          event_time: string
          event_type: string
          id: string
          ip_address: string | null
          location_data: Json | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          employee_id: string
          event_time?: string
          event_type: string
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          employee_id?: string
          event_time?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_ponto_registros_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "rh_colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_ponto_registros_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      rh_recrutamento_candidatos: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          job_id: string
          notes: string | null
          organization_id: string
          phone: string | null
          pipeline_stage: string | null
          portfolio_url: string | null
          rating: number | null
          resume_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          job_id: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          pipeline_stage?: string | null
          portfolio_url?: string | null
          rating?: number | null
          resume_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          job_id?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          pipeline_stage?: string | null
          portfolio_url?: string | null
          rating?: number | null
          resume_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_recrutamento_candidatos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rh_recrutamento_vagas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_recrutamento_candidatos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      rh_recrutamento_vagas: {
        Row: {
          created_at: string
          department: string
          description: string | null
          id: string
          organization_id: string
          requirements: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          description?: string | null
          id?: string
          organization_id: string
          requirements?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          organization_id?: string
          requirements?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_recrutamento_vagas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string
          details: Json | null
          executed_at: string
          id: string
          organization_id: string
          status: string
          trigger_source: string
        }
        Insert: {
          automation_id: string
          details?: Json | null
          executed_at?: string
          id?: string
          organization_id: string
          status: string
          trigger_source: string
        }
        Update: {
          automation_id?: string
          details?: Json | null
          executed_at?: string
          id?: string
          organization_id?: string
          status?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "workflow_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          name: string
          organization_id: string
          process_id: string | null
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          name: string
          organization_id: string
          process_id?: string | null
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          organization_id?: string
          process_id?: string | null
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_edited: boolean
          reply_to: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          reply_to?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          reply_to?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      clients: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          asaas_customer_id: string | null
          auth_user_id: string | null
          birth_date: string | null
          client_type: string | null
          company_name: string | null
          company_position: string | null
          created_at: string
          document: string | null
          email: string | null
          gender: string | null
          id: string
          marital_status: string | null
          name: string
          nationality: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          profession: string | null
          rg: string | null
          secondary_email: string | null
          secondary_phone: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          asaas_customer_id?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          client_type?: string | null
          company_name?: string | null
          company_position?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          profession?: string | null
          rg?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          asaas_customer_id?: string | null
          auth_user_id?: string | null
          birth_date?: string | null
          client_type?: string | null
          company_name?: string | null
          company_position?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          profession?: string | null
          rg?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          organization_id: string
          status?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          amount: number
          asaas_billing_id: string | null
          asaas_invoice_url: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string
          due_date: string
          gateway_id: string | null
          id: string
          organization_id: string
          payment_link: string | null
          pix_code: string | null
          pix_qr_code_base64: string | null
          process_id: string | null
          status: string
        }
        Insert: {
          amount: number
          asaas_billing_id?: string | null
          asaas_invoice_url?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description: string
          due_date: string
          gateway_id?: string | null
          id?: string
          organization_id: string
          payment_link?: string | null
          pix_code?: string | null
          pix_qr_code_base64?: string | null
          process_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          asaas_billing_id?: string | null
          asaas_invoice_url?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          gateway_id?: string | null
          id?: string
          organization_id?: string
          payment_link?: string | null
          pix_code?: string | null
          pix_qr_code_base64?: string | null
          process_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_settings: {
        Row: {
          api_key: string
          created_at: string
          environment: string | null
          gateway_name: string
          id: string
          organization_id: string
          status: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          environment?: string | null
          gateway_name?: string
          id?: string
          organization_id: string
          status?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          environment?: string | null
          gateway_name?: string
          id?: string
          organization_id?: string
          status?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gateway_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      conversas_ia: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          process_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          process_id?: string | null
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          process_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_ia_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_ia_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          completed: boolean | null
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          organization_id: string
          time: string | null
          title: string
          type: string
        }
        Insert: {
          completed?: boolean | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          organization_id: string
          time?: string | null
          title: string
          type?: string
        }
        Update: {
          completed?: boolean | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          time?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          city: string | null
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          score: number | null
          source: string | null
          state: string | null
          tags: string[] | null
          type: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          score?: number | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          type?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          score?: number | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          due_date: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          probability: number | null
          stage: string | null
          value: number | null
        }
        Insert: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          probability?: number | null
          stage?: string | null
          value?: number | null
        }
        Update: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          probability?: number | null
          stage?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          created_at: string | null
          date: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          priority: string | null
          stage_id: string | null
          value: number | null
        }
        Insert: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          priority?: string | null
          stage_id?: string | null
          value?: number | null
        }
        Update: {
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          priority?: string | null
          stage_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          client_id: string | null
          created_at: string
          document_id: string
          expires_at: string
          id: string
          ip_address: string | null
          location_data: Json | null
          organization_id: string
          signature_hash: string | null
          signed_at: string | null
          signer_document: string | null
          signer_email: string
          signer_name: string
          status: string
          token: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          document_id: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          organization_id: string
          signature_hash?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_email: string
          signer_name: string
          status?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          document_id?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          organization_id?: string
          signature_hash?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_email?: string
          signer_name?: string
          status?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          client_id: string | null
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          folder_path: string | null
          id: string
          organization_id: string
          process_id: string | null
          size: number | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          folder_path?: string | null
          id?: string
          organization_id: string
          process_id?: string | null
          size?: number | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          folder_path?: string | null
          id?: string
          organization_id?: string
          process_id?: string | null
          size?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_agenda: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          end_time: string
          google_event_id: string | null
          id: string
          organization_id: string
          process_id: string | null
          recurrence_rule: string | null
          start_time: string
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          google_event_id?: string | null
          id?: string
          organization_id: string
          process_id?: string | null
          recurrence_rule?: string | null
          start_time: string
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          google_event_id?: string | null
          id?: string
          organization_id?: string
          process_id?: string | null
          recurrence_rule?: string | null
          start_time?: string
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_agenda_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_agenda_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          organization_id: string
          refresh_token: string
          sync_enabled: boolean | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id: string
          refresh_token: string
          sync_enabled?: boolean | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          refresh_token?: string
          sync_enabled?: boolean | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      minutas_documents: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          favorite: boolean | null
          id: string
          organization_id: string
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          favorite?: boolean | null
          id?: string
          organization_id: string
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          favorite?: boolean | null
          id?: string
          organization_id?: string
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "minutas_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      minutas_versions: {
        Row: {
          content: string | null
          document_id: string
          id: string
          label: string | null
          saved_at: string | null
        }
        Insert: {
          content?: string | null
          document_id: string
          id?: string
          label?: string | null
          saved_at?: string | null
        }
        Update: {
          content?: string | null
          document_id?: string
          id?: string
          label?: string | null
          saved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "minutas_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "minutas_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          escavador_token: string | null
          id: string
          jusbrasil_token: string | null
          name: string
          updated_at: string
          whatsapp_enabled: boolean | null
          whatsapp_instance_id: string | null
          whatsapp_token: string | null
        }
        Insert: {
          created_at?: string
          escavador_token?: string | null
          id?: string
          jusbrasil_token?: string | null
          name: string
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_instance_id?: string | null
          whatsapp_token?: string | null
        }
        Update: {
          created_at?: string
          escavador_token?: string | null
          id?: string
          jusbrasil_token?: string | null
          name?: string
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_instance_id?: string | null
          whatsapp_token?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          max_processes: number | null
          max_users: number
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          max_processes?: number | null
          max_users?: number
          name: string
          price_cents?: number
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          max_processes?: number | null
          max_users?: number
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      process_captures: {
        Row: {
          capture_date: string
          content: string
          created_at: string
          id: string
          process_id: string
          source: string
        }
        Insert: {
          capture_date: string
          content: string
          created_at?: string
          id?: string
          process_id: string
          source: string
        }
        Update: {
          capture_date?: string
          content?: string
          created_at?: string
          id?: string
          process_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_captures_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_juridicos: {
        Row: {
          area_direito: string | null
          auto_capture_enabled: boolean | null
          client_id: string | null
          comarca: string | null
          court: string | null
          created_at: string
          data_distribuicao: string | null
          estimated_value: number | null
          fase_processual: string | null
          id: string
          instancia: string | null
          notes: string | null
          number: string | null
          organization_id: string
          parte_contraria: string | null
          responsible_user_id: string | null
          status: string
          subject: string | null
          tipo_acao: string | null
          title: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          area_direito?: string | null
          auto_capture_enabled?: boolean | null
          client_id?: string | null
          comarca?: string | null
          court?: string | null
          created_at?: string
          data_distribuicao?: string | null
          estimated_value?: number | null
          fase_processual?: string | null
          id?: string
          instancia?: string | null
          notes?: string | null
          number?: string | null
          organization_id: string
          parte_contraria?: string | null
          responsible_user_id?: string | null
          status?: string
          subject?: string | null
          tipo_acao?: string | null
          title: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          area_direito?: string | null
          auto_capture_enabled?: boolean | null
          client_id?: string | null
          comarca?: string | null
          court?: string | null
          created_at?: string
          data_distribuicao?: string | null
          estimated_value?: number | null
          fase_processual?: string | null
          id?: string
          instancia?: string | null
          notes?: string | null
          number?: string | null
          organization_id?: string
          parte_contraria?: string | null
          responsible_user_id?: string | null
          status?: string
          subject?: string | null
          tipo_acao?: string | null
          title?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_juridicos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_juridicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_role_id: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_role_id?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_entries: {
        Row: {
          billing_status: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          ended_at: string | null
          hourly_rate: number | null
          id: string
          notes: string | null
          organization_id: string
          process_id: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_status?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          process_id?: string | null
          started_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_status?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          hourly_rate?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          process_id?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_headquarters: boolean
          manager_id: string | null
          name: string
          organization_id: string
          phone: string | null
          slug: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_headquarters?: boolean
          manager_id?: string | null
          name: string
          organization_id: string
          phone?: string | null
          slug: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_headquarters?: boolean
          manager_id?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_juridica: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          is_public: boolean
          organization_id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_public?: boolean
          organization_id: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_public?: boolean
          organization_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "wiki_juridica_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_juridica_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      workflow_automations: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          is_active: boolean | null
          name: string
          nodes: Json
          organization_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json
          organization_id: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json
          organization_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          id: string
          organization_id: string
          priority: string | null
          sector_id: string | null
          status: string | null
          template_emoji: string | null
          template_id: string | null
          template_name: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          id?: string
          organization_id: string
          priority?: string | null
          sector_id?: string | null
          status?: string | null
          template_emoji?: string | null
          template_id?: string | null
          template_name: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          id?: string
          organization_id?: string
          priority?: string | null
          sector_id?: string | null
          status?: string | null
          template_emoji?: string | null
          template_id?: string | null
          template_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          sort_order: number | null
          title: string
          workflow_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          sort_order?: number | null
          title: string
          workflow_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          sort_order?: number | null
          title?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          organization_id: string | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_employees: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string
          gender: string | null
          hire_date: string
          id: string
          job_id: string | null
          manager_id: string | null
          marital_status: string | null
          oab_number: string | null
          oab_uf: string | null
          organization_id: string
          phone: string | null
          pis_pasep: string | null
          rg: string | null
          status: string | null
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          hire_date?: string
          id?: string
          job_id?: string | null
          manager_id?: string | null
          marital_status?: string | null
          oab_number?: string | null
          oab_uf?: string | null
          organization_id: string
          phone?: string | null
          pis_pasep?: string | null
          rg?: string | null
          status?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          hire_date?: string
          id?: string
          job_id?: string | null
          manager_id?: string | null
          marital_status?: string | null
          oab_number?: string | null
          oab_uf?: string | null
          organization_id?: string
          phone?: string | null
          pis_pasep?: string | null
          rg?: string | null
          status?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_contracts: {
        Row: {
          base_salary: number
          benefits: Json | null
          contract_type: string
          created_at: string
          currency: string | null
          employee_id: string
          end_date: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          start_date: string
          updated_at: string
          weekly_hours: number | null
          work_model: string | null
        }
        Insert: {
          base_salary: number
          benefits?: Json | null
          contract_type: string
          created_at?: string
          currency?: string | null
          employee_id: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          start_date: string
          updated_at?: string
          weekly_hours?: number | null
          work_model?: string | null
        }
        Update: {
          base_salary?: number
          benefits?: Json | null
          contract_type?: string
          created_at?: string
          currency?: string | null
          employee_id?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          start_date?: string
          updated_at?: string
          weekly_hours?: number | null
          work_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_jobs: {
        Row: {
          base_salary: number | null
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          organization_id: string
          requirements: string | null
          title: string
          updated_at: string
        }
        Insert: {
          base_salary?: number | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          organization_id: string
          requirements?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          base_salary?: number | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          requirements?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_time_entries: {
        Row: {
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          location_in: Json | null
          location_out: Json | null
          notes: string | null
          organization_id: string
          status: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          employee_id: string
          id?: string
          location_in?: Json | null
          location_out?: Json | null
          notes?: string | null
          organization_id: string
          status?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          location_in?: Json | null
          location_out?: Json | null
          notes?: string | null
          organization_id?: string
          status?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          organization_id: string
          reason: string | null
          start_date: string
          status: string | null
          total_days: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          notes?: string | null
          organization_id: string
          reason?: string | null
          start_date: string
          status?: string | null
          total_days?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          organization_id?: string
          reason?: string | null
          start_date?: string
          status?: string | null
          total_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_job_postings: {
        Row: {
          created_at: string
          department_id: string | null
          description: string
          id: string
          job_id: string | null
          location: string | null
          organization_id: string
          requirements: string | null
          salary_range: string | null
          status: string | null
          title: string
          updated_at: string
          work_model: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          description: string
          id?: string
          job_id?: string | null
          location?: string | null
          organization_id: string
          requirements?: string | null
          salary_range?: string | null
          status?: string | null
          title: string
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          description?: string
          id?: string
          job_id?: string | null
          location?: string | null
          organization_id?: string
          requirements?: string | null
          salary_range?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          work_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_job_postings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_postings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_job_postings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_candidates: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          job_posting_id: string
          linkedin_url: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          portfolio_url: string | null
          resume_url: string | null
          score: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          job_posting_id: string
          linkedin_url?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_posting_id?: string
          linkedin_url?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_candidates_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "hr_job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_performance_cycles: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          organization_id: string
          start_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          organization_id: string
          start_date: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          organization_id?: string
          start_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_performance_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_performance_reviews: {
        Row: {
          created_at: string
          cycle_id: string
          employee_id: string
          feedback: string | null
          final_score: number | null
          id: string
          manager_assessment: number | null
          organization_id: string
          peer_assessment: number | null
          reviewer_id: string
          self_assessment: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          employee_id: string
          feedback?: string | null
          final_score?: number | null
          id?: string
          manager_assessment?: number | null
          organization_id: string
          peer_assessment?: number | null
          reviewer_id: string
          self_assessment?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          employee_id?: string
          feedback?: string | null
          final_score?: number | null
          id?: string
          manager_assessment?: number | null
          organization_id?: string
          peer_assessment?: number | null
          reviewer_id?: string
          self_assessment?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_performance_reviews_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "hr_performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      hr_employees_safe: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          bank_pix_key: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          department_id: string | null
          email: string | null
          employment_type: string | null
          full_name: string
          hire_date: string
          id: string
          job_id: string | null
          manager_id: string | null
          phone: string | null
          pis_pasep: string | null
          rg: string | null
          social_name: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          work_shift: string | null
          organization_id: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "hr_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hr_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "hr_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "advogado" | "estagiario" | "financeiro" | "cliente"
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
      app_role: ["admin", "advogado", "estagiario", "financeiro", "cliente"],
    },
  },
} as const
