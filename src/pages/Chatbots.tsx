import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Eye,
  Bot,
  Edit,
  Trash2,
  FileText,
  Building2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ChatbotFormModal from '../components/ui/ChatbotFormModal';
import StatusToggle from '../components/ui/StatusToggle';
import { useChatbots, useCreateChatbot, useUpdateChatbot, useDeleteChatbot, useToggleChatbotStatus } from '../hooks/useChatbots';
import { useClients } from '../hooks/useClients';
import { Chatbot } from '../types/chatbot';
import { formatDate, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

const Chatbots: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [clientFilter, setClientFilter] = useState<number | 'all'>('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [chatbotToDelete, setChatbotToDelete] = useState<Chatbot | null>(null);

  // API calls
  const { 
    data: chatbots, 
    isLoading, 
    error
  } = useChatbots();

  const { data: clients } = useClients();

  // Mutations
  const createChatbotMutation = useCreateChatbot();
  const updateChatbotMutation = useUpdateChatbot();
  const deleteChatbotMutation = useDeleteChatbot();
  const toggleStatusMutation = useToggleChatbotStatus();

  // Mock data as fallback
  const fallbackChatbots: Chatbot[] = [];
  const chatbotsData = chatbots || fallbackChatbots;
  const clientsData = clients || [];

  // Enrich chatbots with client names
  const enrichedChatbots = chatbotsData.map(chatbot => {
    const client = clientsData.find(c => c.id === chatbot.client_id);
    return {
      ...chatbot,
      client_name: chatbot.client_name || client?.name || `Client ID: ${chatbot.client_id}`,
    };
  });

  const filteredChatbots = enrichedChatbots.filter(chatbot => {
    const matchesSearch = chatbot.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chatbot.instructions?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chatbot.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = chatbot.is_active === true;
    } else if (statusFilter === 'inactive') {
      matchesStatus = chatbot.is_active === false;
    }

    let matchesClient = true;
    if (clientFilter !== 'all') {
      matchesClient = chatbot.client_id === clientFilter;
    }
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Modal handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedChatbot(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (chatbot: Chatbot) => {
    setModalMode('edit');
    setSelectedChatbot(chatbot);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChatbot(null);
  };

  const handleSubmitChatbot = async (chatbotData: any) => {
    try {
      if (modalMode === 'create') {
        await createChatbotMutation.mutateAsync(chatbotData);
      } else if (modalMode === 'edit' && selectedChatbot) {
        await updateChatbotMutation.mutateAsync({
          id: selectedChatbot.id,
          data: chatbotData,
        });
      }
    } catch (error) {
      console.error('Chatbot submission error:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (chatbotId: number, newStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ id: chatbotId, isActive: newStatus });
      toast.success(t('messages.itemUpdatedSuccessfully', { defaultValue: 'Status updated successfully' }));
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error(t('errors.somethingWentWrong', { defaultValue: 'Something went wrong' }));
      throw error;
    }
  };

  const handleDeleteClick = (chatbot: Chatbot) => {
    setChatbotToDelete(chatbot);
  };

  const handleDeleteConfirm = async () => {
    if (!chatbotToDelete) return;
    
    try {
      await deleteChatbotMutation.mutateAsync(chatbotToDelete.id);
      toast.success('Chatbot deleted successfully!');
      setChatbotToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete chatbot. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const ChatbotCard: React.FC<{ chatbot: Chatbot; index: number }> = ({ chatbot, index }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card 
        glassmorphism 
        hover 
        className={`h-full transition-all duration-300 ${
          chatbot.is_active === false 
            ? 'bg-gray-50 border-gray-200 opacity-75' 
            : 'bg-white border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
              chatbot.is_active === false
                ? 'bg-gray-300'
                : 'bg-gradient-to-br from-primary-500 to-primary-600'
            }`}>
              <Bot className={`w-6 h-6 ${
                chatbot.is_active === false ? 'text-gray-500' : 'text-white'
              }`} />
            </div>
            <div>
              <h3 className={`font-semibold text-lg transition-colors duration-300 ${
                chatbot.is_active === false ? 'text-gray-500' : 'text-gray-900'
              }`}>
                {chatbot.name}
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                chatbot.is_active === false ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {chatbot.client_name || `Client ID: ${chatbot.client_id}`}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              chatbot.is_active === false
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {chatbot.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Warning for inactive chatbots */}
        {chatbot.is_active === false && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm text-orange-700">
              This chatbot is currently inactive.
            </span>
          </div>
        )}

        {/* Instructions Preview */}
        <div className="mb-4">
          <p className={`text-sm transition-colors duration-300 ${
            chatbot.is_active === false ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span className="font-medium">Instructions:</span>{' '}
            {chatbot.instructions.length > 100 
              ? chatbot.instructions.substring(0, 100) + '...' 
              : chatbot.instructions}
          </p>
        </div>

        {/* Knowledge Sources */}
        <div className="space-y-2 mb-4">
          <div className={`flex items-center text-sm transition-colors duration-300 ${
            chatbot.is_active === false ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <FileText className="w-4 h-4 mr-2" />
            <span className="font-medium">
              {chatbot.knowledge_sources?.length || 0} Knowledge Source{chatbot.knowledge_sources?.length !== 1 ? 's' : ''}
            </span>
          </div>
          {chatbot.knowledge_sources && chatbot.knowledge_sources.length > 0 && (
            <div className="pl-6 space-y-1">
              {chatbot.knowledge_sources.slice(0, 3).map((file) => (
                <div key={file.id} className="text-xs text-gray-500">
                  • {file.name} ({formatFileSize(file.size)})
                </div>
              ))}
              {chatbot.knowledge_sources.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{chatbot.knowledge_sources.length - 3} more
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className={`flex items-center justify-between text-sm transition-colors duration-300`}>
            <span className={chatbot.is_active === false ? 'text-gray-400' : 'text-gray-500'}>
              Created
            </span>
            <span className={chatbot.is_active === false ? 'text-gray-500' : 'text-gray-700'}>
              {formatDate(chatbot.created_at)}
            </span>
          </div>
        </div>

        {/* Status Toggle Section */}
        <div className="border-t border-gray-200 pt-3 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <StatusToggle
              isActive={chatbot.is_active !== false}
              onToggle={(newStatus) => handleToggleStatus(chatbot.id, newStatus)}
              size="sm"
              showLabels={false}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Edit className="w-4 h-4" />}
            onClick={() => handleOpenEditModal(chatbot)}
            disabled={toggleStatusMutation.isPending}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => handleDeleteClick(chatbot)}
            disabled={deleteChatbotMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            {t('common.delete')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );

  // Loading state
  if (isLoading && !chatbots) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
        <span className="ml-3 text-gray-600">Loading chatbots...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chatbot Management</h1>
          <p className="text-gray-600">Create and manage chatbots for your clients</p>
        </div>
        
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
          Create Chatbot
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card glassmorphism className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search chatbots..."
                leftIcon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Clients</option>
                {clientsData.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Chatbots Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChatbots.map((chatbot, index) => (
            <ChatbotCard key={chatbot.id} chatbot={chatbot} index={index} />
          ))}
        </div>

        {filteredChatbots.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No chatbots found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
              Create Your First Chatbot
            </Button>
          </div>
        )}
      </motion.div>

      {/* Chatbot Form Modal */}
      <ChatbotFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitChatbot}
        mode={modalMode}
        chatbot={selectedChatbot}
        clients={clientsData}
        isLoading={createChatbotMutation.isPending || updateChatbotMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      {chatbotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Chatbot</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{chatbotToDelete.name}</strong>? This will permanently remove the chatbot and all its associated data.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setChatbotToDelete(null)}
                  disabled={deleteChatbotMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDeleteConfirm}
                  isLoading={deleteChatbotMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chatbots;

