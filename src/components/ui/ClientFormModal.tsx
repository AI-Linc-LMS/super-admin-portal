import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2, Building2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { Client } from '../../types/client';
import toast from 'react-hot-toast';

export interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientData: Partial<Client>) => Promise<void>;
  client?: Client | null;
  mode: 'create' | 'edit';
  isLoading?: boolean;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client = null,
  mode,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    slug: '',
    logo_url: '',
    email: '',
    phone_number: '',
    joining_date: '',
    poc_name: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or client changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && client) {
        // Handle different date formats from API
        let formattedDate = '';
        if (client.joining_date) {
          // Handle both formats: "2025-09-11 21:45:49" and "2025-09-11T21:45:49Z"
          const dateStr = client.joining_date.replace(' ', 'T'); // Convert space to T if needed
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toISOString().split('T')[0]; // Extract YYYY-MM-DD
          }
        }

        setFormData({
          name: client.name || '',
          slug: client.slug || '',
          logo_url: client.logo_url || '',
          email: client.email || '',
          phone_number: client.phone_number || '',
          joining_date: formattedDate,
          poc_name: client.poc_name || '',
        });
      } else {
        setFormData({
          name: '',
          slug: '',
          logo_url: '',
          email: '',
          phone_number: '',
          joining_date: new Date().toISOString().split('T')[0],
          poc_name: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, client]);

  // Auto-generate slug from name
  useEffect(() => {
    if (mode === 'create' && formData.name && !formData.slug) {
      const autoSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug: autoSlug }));
    }
  }, [formData.name, mode]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Client name is required';
    }

    if (!formData.slug?.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone_number && formData.phone_number.length > 15) {
      newErrors.phone_number = 'Phone number must be 15 characters or less';
    }

    if (formData.logo_url && !/^https?:\/\/.+/.test(formData.logo_url)) {
      newErrors.logo_url = 'Logo URL must be a valid HTTP/HTTPS URL';
    }

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
      // Prepare submission data
      const submissionData: Partial<Client> = {
        ...formData,
        // Convert empty strings to null for optional fields
        logo_url: formData.logo_url?.trim() || null,
        email: formData.email?.trim() || null,
        phone_number: formData.phone_number?.trim() || null,
        poc_name: formData.poc_name?.trim() || null,
        // Format joining_date properly
        joining_date: formData.joining_date 
          ? `${formData.joining_date}T${new Date().toISOString().split('T')[1]}`
          : new Date().toISOString(),
      };

      await onSubmit(submissionData);
      toast.success(`Client ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(`Failed to ${mode} client. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Add New Client' : `Edit ${client?.name || 'Client'}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Client Name <span className="text-red-500">*</span>
          </label>
          <Input
            id="name"
            type="text"
            placeholder="e.g., TechCorp Solutions"
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            leftIcon={<Building2 className="w-4 h-4" />}
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
            URL Slug <span className="text-red-500">*</span>
          </label>
          <Input
            id="slug"
            type="text"
            placeholder="e.g., techcorp-solutions"
            value={formData.slug || ''}
            onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase())}
            error={errors.slug}
            helpText="Used in URLs. Only lowercase letters, numbers, and hyphens allowed."
            required
          />
        </div>

        {/* Two-column layout for smaller fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="contact@example.com"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone_number || ''}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              error={errors.phone_number}
              maxLength={15}
            />
          </div>
        </div>

        {/* Two-column layout continued */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Point of Contact */}
          <div>
            <label htmlFor="poc_name" className="block text-sm font-medium text-gray-700 mb-2">
              Point of Contact
            </label>
            <Input
              id="poc_name"
              type="text"
              placeholder="John Smith"
              value={formData.poc_name || ''}
              onChange={(e) => handleInputChange('poc_name', e.target.value)}
              error={errors.poc_name}
            />
          </div>

          {/* Joining Date */}
          <div>
            <label htmlFor="joining_date" className="block text-sm font-medium text-gray-700 mb-2">
              Joining Date
            </label>
            <Input
              id="joining_date"
              type="date"
              value={formData.joining_date || ''}
              onChange={(e) => handleInputChange('joining_date', e.target.value)}
              error={errors.joining_date}
            />
          </div>
        </div>

        {/* Logo URL */}
        <div>
          <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
            Logo URL
          </label>
          <Input
            id="logo_url"
            type="url"
            placeholder="https://example.com/logo.png"
            value={formData.logo_url || ''}
            onChange={(e) => handleInputChange('logo_url', e.target.value)}
            error={errors.logo_url}
            helpText="Optional URL to the client's logo image"
          />
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
              ? 'Create Client'
              : 'Update Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ClientFormModal;