import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2, Building2, Globe } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { Client } from '../../types/client';
import toast from 'react-hot-toast';

/**
 * Turn whatever the operator pasted into the bare host the backend stores.
 *
 * Operators copy the address out of a browser, so what lands in this field is "https://test.fde.
 * academy/" far more often than "test.fde.academy". The backend already strips a pasted scheme;
 * rejecting the paste here instead would mean the UI refuses input the API would have accepted,
 * which reads as a bug. Path, query and fragment go too: a custom domain is a host, and keeping
 * "/login" would produce a site_url nobody can reach.
 */
const normalizeCustomDomain = (raw: string): string =>
  raw
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.+$/, '')
    .toLowerCase();

/**
 * The same hostname shape the backend enforces: labels of 1 to 63 characters, no leading or
 * trailing hyphen, at least one dot.
 *
 * Written with explicit label groups instead of the backend's lookbehind form because a lookbehind
 * in a shipped bundle is a runtime SyntaxError on browsers that predate ES2018, and a regex that
 * throws while validating would take the whole client form down, not just this field.
 */
const HOSTNAME_RE =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

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
    custom_domain: '',
    hide_available_courses_from_students: false,
    hide_certificates_from_students: false,
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
          // Seeded from custom_domain, never from site_url: site_url may be a Netlify address or a
          // slug guess, and pre-filling the field with one of those would turn merely opening the
          // edit modal and saving into pinning a domain nobody chose.
          custom_domain: client.custom_domain || '',
          hide_available_courses_from_students: client.hide_available_courses_from_students ?? false,
          hide_certificates_from_students: client.hide_certificates_from_students ?? false,
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
          custom_domain: '',
          hide_available_courses_from_students: false,
          hide_certificates_from_students: false,
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

    // Mirrors the backend rule in superadmin_portal/serializers.py::validate_custom_domain rather
    // than sitting looser than it. Anything this form lets through that the API refuses comes back
    // as a 400 that handleSubmit below can only render as "Failed to update client", so the
    // operator learns the save failed but not which character caused it. A port is the case that
    // really happens: the API rejects one outright, but a looser check here accepted
    // "learn.example.com:8443" and turned a one-word correction into an unexplained failure.
    const domain = normalizeCustomDomain(formData.custom_domain || '');
    if (domain && /:\d+$/.test(domain)) {
      newErrors.custom_domain = 'No port here: the tenant site is always reached over https on 443';
    } else if (domain && !domain.includes('.')) {
      newErrors.custom_domain = 'Needs a full hostname, for example learn.example.com';
    } else if (domain && (domain.length > 253 || !HOSTNAME_RE.test(domain))) {
      newErrors.custom_domain = 'Enter a hostname such as learn.example.com';
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
        // Empty string, not null: the contract types custom_domain as a string that is "" when
        // unset, and "" is also how an operator un-pins a domain and drops the tenant back to the
        // Netlify or slug fallback. Normalized again here so a paste that never lost focus, and so
        // never hit the blur handler, is still stored as the bare host.
        custom_domain: normalizeCustomDomain(formData.custom_domain || ''),
        hide_available_courses_from_students: !!formData.hide_available_courses_from_students,
        hide_certificates_from_students: !!formData.hide_certificates_from_students,
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
          <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
            Client Name <span className="text-danger-500">*</span>
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
          <label htmlFor="slug" className="block text-sm font-medium text-text mb-2">
            URL Slug <span className="text-danger-500">*</span>
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
            <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
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
            <label htmlFor="phone_number" className="block text-sm font-medium text-text mb-2">
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
            <label htmlFor="poc_name" className="block text-sm font-medium text-text mb-2">
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
            <label htmlFor="joining_date" className="block text-sm font-medium text-text mb-2">
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
          <label htmlFor="logo_url" className="block text-sm font-medium text-text mb-2">
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

        {/* Custom domain */}
        <div>
          <label htmlFor="custom_domain" className="block text-sm font-medium text-text mb-2">
            Custom domain
          </label>
          <Input
            id="custom_domain"
            type="text"
            placeholder="learn.example.com"
            value={formData.custom_domain || ''}
            onChange={(e) => handleInputChange('custom_domain', e.target.value)}
            // Normalized on blur rather than on every keystroke so the operator can see exactly
            // what will be saved before submitting, without the field fighting them mid-word.
            onBlur={(e) => handleInputChange('custom_domain', normalizeCustomDomain(e.target.value))}
            error={errors.custom_domain}
            leftIcon={<Globe className="w-4 h-4" />}
            helpText="Optional. Where this client's LMS actually lives. Paste the address or type the bare host, either works. Leave blank to fall back to the Netlify site, or to <slug>.ailinc.com if there is none, which is only a guess and may not resolve."
          />
        </div>

        {/* Course Visibility */}
        <div className="rounded-lg border border-themed p-4">
          <label htmlFor="hide_available_courses_from_students" className="flex items-start gap-3 cursor-pointer">
            <input
              id="hide_available_courses_from_students"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={!!formData.hide_available_courses_from_students}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hide_available_courses_from_students: e.target.checked,
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-text">
                Hide available (non-enrolled) courses from students
              </span>
              <span className="block text-xs text-text-secondary mt-1">
                When enabled, students of this client only see courses they're enrolled in.
                The "Available Courses" list is hidden from the student course module.
              </span>
            </span>
          </label>
        </div>

        {/* Student certificates */}
        <div className="rounded-lg border border-themed p-4">
          <label htmlFor="hide_certificates_from_students" className="flex items-start gap-3 cursor-pointer">
            <input
              id="hide_certificates_from_students"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={!!formData.hide_certificates_from_students}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hide_certificates_from_students: e.target.checked,
                }))
              }
            />
            <span>
              <span className="block text-sm font-medium text-text">
                Hide the Certificates module from students
              </span>
              <span className="block text-xs text-text-secondary mt-1">
                When enabled, students of this client do not see the Certificates page, its nav
                entry or the points ladder, and cannot claim new certificates. Admin certificate
                management is separate and is unaffected. Certificates already issued keep working:
                their public verification links stay live for anyone holding one.
              </span>
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-themed">
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