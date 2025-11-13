export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md';
  size: number; // in bytes
  uploaded_at: string;
  url?: string; // Mock file URL
}

export interface Chatbot {
  id: number;
  name: string;
  client_id: number;
  client_name?: string;
  instructions: string;
  knowledge_sources: KnowledgeSource[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChatbotData {
  name: string;
  client_id: number;
  instructions: string;
  knowledge_sources?: File[];
}

export interface UpdateChatbotData {
  name?: string;
  instructions?: string;
  knowledge_sources?: File[];
  is_active?: boolean;
}

