import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2, Bot, Upload, FileText, XCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { Chatbot, CreateChatbotData, UpdateChatbotData, KnowledgeSource } from '../../types/chatbot';
import { Client } from '../../types/client';
import toast from 'react-hot-toast';

export interface ChatbotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chatbotData: CreateChatbotData | UpdateChatbotData) => Promise<void>;
  chatbot?: Chatbot | null;
  mode: 'create' | 'edit';
  clients: Client[];
  isLoading?: boolean;
}

const ChatbotFormModal: React.FC<ChatbotFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  chatbot = null,
  mode,
  clients,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    client_id: number | '';
    instructions: string;
    knowledge_sources: File[];
  }>({
    name: '',
    client_id: '',
    instructions: '',
    knowledge_sources: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingFiles, setExistingFiles] = useState<KnowledgeSource[]>([]);

  // Reset form when modal opens/closes or chatbot changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && chatbot) {
        setFormData({
          name: chatbot.name || '',
          client_id: chatbot.client_id || '',
          instructions: chatbot.instructions || '',
          knowledge_sources: [],
        });
        setExistingFiles(chatbot.knowledge_sources || []);
      } else {
        setFormData({
          name: '',
          client_id: '',
          instructions: '',
          knowledge_sources: [],
        });
        setExistingFiles([]);
      }
      setErrors({});
    }
  }, [isOpen, mode, chatbot]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Chatbot name is required';
    }

    if (!formData.client_id) {
      newErrors.client_id = 'Please select a client';
    }

    if (!formData.instructions?.trim()) {
      newErrors.instructions = 'Instructions are required';
    } else if (formData.instructions.length < 10) {
      newErrors.instructions = 'Instructions must be at least 10 characters';
    }

    // Validate file types
    formData.knowledge_sources.forEach((file, index) => {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
      const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        newErrors[`file_${index}`] = `File ${file.name} has an invalid type. Allowed: PDF, DOCX, TXT, MD`;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        newErrors[`file_${index}`] = `File ${file.name} is too large. Maximum size is 10MB`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData: CreateChatbotData | UpdateChatbotData = {
        name: formData.name.trim(),
        instructions: formData.instructions.trim(),
        knowledge_sources: formData.knowledge_sources.length > 0 ? formData.knowledge_sources : undefined,
      };

      if (mode === 'create') {
        (submissionData as CreateChatbotData).client_id = formData.client_id as number;
      }

      await onSubmit(submissionData);
      toast.success(`Chatbot ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(`Failed to ${mode} chatbot. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      knowledge_sources: [...prev.knowledge_sources, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      knowledge_sources: prev.knowledge_sources.filter((_, i) => i !== index),
    }));
  };

  const removeExistingFile = (fileId: string) => {
    setExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create New Chatbot' : `Edit ${chatbot?.name || 'Chatbot'}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Chatbot Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Chatbot Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="e.g., Customer Support Bot"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            leftIcon={<Bot className="w-4 h-4" />}
            required
          />
        </div>

        {/* Client Selection */}
        {mode === 'create' && (
          <div>
            <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-2">
              Client <span className="text-red-500">*</span>
            </label>
            <select
              id="client_id"
              value={formData.client_id}
              onChange={(e) => handleInputChange('client_id', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.client_id ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-1 text-sm text-red-600">{errors.client_id}</p>
            )}
          </div>
        )}

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
            Instructions <span className="text-red-500">*</span>
          </label>
          <textarea
            id="instructions"
            rows={6}
            placeholder="Enter instructions for the chatbot. For example: 'You are a helpful customer support assistant. Always be polite and professional...'"
            value={formData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.instructions ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {errors.instructions && (
            <p className="mt-1 text-sm text-red-600">{errors.instructions}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Provide clear instructions on how the chatbot should behave and respond to users.
          </p>
        </div>

        {/* Knowledge Sources */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Knowledge Sources
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Upload documents (PDF, DOCX, TXT, MD) that the chatbot can use as knowledge base. Maximum file size: 10MB per file.
          </p>

          {/* Existing Files (Edit Mode) */}
          {mode === 'edit' && existingFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Existing Files:</p>
              {existingFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.type.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingFile(file.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Remove file"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New Files */}
          {formData.knowledge_sources.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">New Files to Upload:</p>
              {formData.knowledge_sources.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.name)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                    title="Remove file"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* File Upload Input */}
          <div className="relative">
            <input
              type="file"
              id="knowledge_sources"
              multiple
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="knowledge_sources"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
              </span>
            </label>
          </div>
          {Object.keys(errors).filter(key => key.startsWith('file_')).length > 0 && (
            <div className="mt-2 space-y-1">
              {Object.entries(errors)
                .filter(([key]) => key.startsWith('file_'))
                .map(([key, value]) => (
                  <p key={key} className="text-sm text-red-600">
                    {value}
                  </p>
                ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoading}
            leftIcon={
              isSubmitting || isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
          >
            {isSubmitting || isLoading
              ? mode === 'create'
                ? 'Creating...'
                : 'Updating...'
              : mode === 'create'
              ? 'Create Chatbot'
              : 'Update Chatbot'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChatbotFormModal;

