import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chatbot, CreateChatbotData, UpdateChatbotData } from '../types/chatbot';

// Mock data storage (simulating a backend)
let mockChatbots: Chatbot[] = [
  {
    id: 1,
    name: 'Customer Support Bot',
    client_id: 1,
    client_name: 'TechCorp Solutions',
    instructions: 'You are a helpful customer support assistant. Always be polite and professional. Help users with their questions about our products and services.',
    knowledge_sources: [
      {
        id: '1',
        name: 'product-guide.pdf',
        type: 'pdf',
        size: 1024000,
        uploaded_at: '2024-01-15T10:30:00Z',
      },
      {
        id: '2',
        name: 'faq.docx',
        type: 'docx',
        size: 512000,
        uploaded_at: '2024-01-15T10:35:00Z',
      },
    ],
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:35:00Z',
  },
  {
    id: 2,
    name: 'Educational Assistant',
    client_id: 2,
    client_name: 'EduMaster Institute',
    instructions: 'You are an educational assistant. Help students with their learning questions. Provide clear explanations and encourage learning.',
    knowledge_sources: [
      {
        id: '3',
        name: 'course-materials.pdf',
        type: 'pdf',
        size: 2048000,
        uploaded_at: '2024-01-20T09:15:00Z',
      },
    ],
    is_active: true,
    created_at: '2024-01-20T09:00:00Z',
    updated_at: '2024-01-20T09:15:00Z',
  },
];

let nextId = 3;

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useChatbots = (clientId?: number) => {
  return useQuery({
    queryKey: ['chatbots', clientId],
    queryFn: async () => {
      await delay(500); // Simulate network delay
      let filtered = [...mockChatbots];
      if (clientId) {
        filtered = filtered.filter(c => c.client_id === clientId);
      }
      // Populate client names from clients list if available
      // This would normally come from the API, but for mock we'll keep it as is
      return filtered;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useChatbotDetails = (chatbotId: number) => {
  return useQuery<Chatbot | null>({
    queryKey: ['chatbot-details', chatbotId],
    queryFn: async () => {
      await delay(300);
      const chatbot = mockChatbots.find(c => c.id === chatbotId);
      return chatbot || null;
    },
    enabled: !!chatbotId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCreateChatbot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateChatbotData) => {
      await delay(800); // Simulate file upload delay
      
      // Simulate file processing
      const knowledgeSources = (data.knowledge_sources || []).map((file, index) => ({
        id: String(Date.now() + index),
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'docx' | 'txt' | 'md',
        size: file.size,
        uploaded_at: new Date().toISOString(),
      }));

      const newChatbot: Chatbot = {
        id: nextId++,
        name: data.name,
        client_id: data.client_id,
        client_name: undefined, // Will be populated by the UI from clients list
        instructions: data.instructions,
        knowledge_sources: knowledgeSources,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockChatbots.push(newChatbot);
      return newChatbot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });
};

export const useUpdateChatbot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateChatbotData }) => {
      await delay(800);
      
      const chatbotIndex = mockChatbots.findIndex(c => c.id === id);
      if (chatbotIndex === -1) {
        throw new Error('Chatbot not found');
      }

      const existingChatbot = mockChatbots[chatbotIndex];
      
      // Process new files if any
      let newKnowledgeSources: typeof existingChatbot.knowledge_sources = [];
      if (data.knowledge_sources && data.knowledge_sources.length > 0) {
        newKnowledgeSources = data.knowledge_sources.map((file, index) => ({
          id: String(Date.now() + index),
          name: file.name,
          type: file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'docx' | 'txt' | 'md',
          size: file.size,
          uploaded_at: new Date().toISOString(),
        }));
      }

      const updatedChatbot: Chatbot = {
        ...existingChatbot,
        name: data.name ?? existingChatbot.name,
        instructions: data.instructions ?? existingChatbot.instructions,
        knowledge_sources: [
          ...existingChatbot.knowledge_sources,
          ...newKnowledgeSources,
        ],
        is_active: data.is_active ?? existingChatbot.is_active,
        updated_at: new Date().toISOString(),
      };

      mockChatbots[chatbotIndex] = updatedChatbot;
      return updatedChatbot;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      queryClient.invalidateQueries({ queryKey: ['chatbot-details', id] });
    },
  });
};

export const useDeleteChatbot = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (chatbotId: number) => {
      await delay(500);
      const index = mockChatbots.findIndex(c => c.id === chatbotId);
      if (index === -1) {
        throw new Error('Chatbot not found');
      }
      mockChatbots.splice(index, 1);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
    },
  });
};

export const useToggleChatbotStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await delay(300);
      const chatbot = mockChatbots.find(c => c.id === id);
      if (!chatbot) {
        throw new Error('Chatbot not found');
      }
      chatbot.is_active = isActive;
      chatbot.updated_at = new Date().toISOString();
      return chatbot;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['chatbots'] });
      queryClient.invalidateQueries({ queryKey: ['chatbot-details', id] });
    },
  });
};

