import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Users,
  BookOpen,
  TrendingUp,
  MapPin,
  Download,
  Grid,
  List,
  Building2,
  Edit,
  AlertCircle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ClientFormModal from '../components/ui/ClientFormModal';
import StatusToggle from '../components/ui/StatusToggle';
import { useClients, useCreateClient, useUpdateClient, useToggleClientStatus } from '../hooks/useClients';
import { Client } from '../types/client';
import { formatDate, formatNumber, getStatusColor } from '../utils/helpers';
import toast from 'react-hot-toast';

const Clients: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // API calls without search parameters - we'll filter client-side
  const { 
    data: clients, 
    isLoading, 
    error
  } = useClients();

  // Mutations
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const toggleStatusMutation = useToggleClientStatus();

  // Mock data as fallback when API fails - updated with is_active field
  const fallbackClients: Client[] = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      slug: 'techcorp-solutions',
      organization_name: 'TechCorp Solutions Ltd.',
      email: 'admin@techcorp.com',
      phone: '+1-555-0123',
      phone_number: '+1-555-0123',
      joining_date: '2023-08-15T10:30:00Z',
      poc_name: 'John Smith',
      address: '123 Business Ave, San Francisco, CA',
      status: 'active',
      subscription_tier: 'enterprise',
      is_active: true,
      total_students: 1250,
      student_count: 1250,
      students_count: 1250,
      instructor_count: 45,
      course_count: 24,
      courses_count: 24,
      total_courses: 24,
      active_enrollments: 980,
      created_at: '2023-08-15T10:30:00Z',
      updated_at: '2024-05-20T14:45:00Z',
      last_login: '2024-05-20T14:45:00Z',
      total_revenue: 125000,
      monthly_revenue: 12500,
      logo_url: undefined,
      contact_person: 'John Smith',
      industry: 'Technology',
    },
    {
      id: 2,
      name: 'EduMaster Institute',
      slug: 'edumaster-institute',
      organization_name: 'EduMaster Institute Inc.',
      email: 'contact@edumaster.edu',
      phone: '+1-555-0456',
      phone_number: '+1-555-0456',
      joining_date: '2023-11-20T09:15:00Z',
      poc_name: 'Dr. Sarah Johnson',
      address: '456 Education Blvd, Boston, MA',
      status: 'active',
      subscription_tier: 'premium',
      is_active: true,
      total_students: 890,
      student_count: 890,
      students_count: 890,
      instructor_count: 32,
      course_count: 18,
      courses_count: 18,
      total_courses: 18,
      active_enrollments: 765,
      created_at: '2023-11-20T09:15:00Z',
      updated_at: '2024-05-19T11:20:00Z',
      last_login: '2024-05-19T11:20:00Z',
      total_revenue: 89000,
      monthly_revenue: 8900,
      logo_url: undefined,
      contact_person: 'Dr. Sarah Johnson',
      industry: 'Education',
    },
    {
      id: 3,
      name: 'Healthcare Training Co',
      slug: 'healthcare-training-co',
      organization_name: 'Healthcare Training Company',
      email: 'info@healthtraining.com',
      phone: '+1-555-0789',
      phone_number: '+1-555-0789',
      joining_date: '2024-01-10T16:45:00Z',
      poc_name: 'Michael Davis',
      address: '789 Medical Center Dr, Chicago, IL',
      status: 'inactive',
      subscription_tier: 'basic',
      is_active: false,
      total_students: 345,
      student_count: 345,
      students_count: 345,
      instructor_count: 12,
      course_count: 8,
      courses_count: 8,
      total_courses: 8,
      active_enrollments: 234,
      created_at: '2024-01-10T16:45:00Z',
      updated_at: '2024-05-18T08:30:00Z',
      last_login: '2024-05-18T08:30:00Z',
      total_revenue: 28000,
      monthly_revenue: 2800,
      logo_url: undefined,
      contact_person: 'Michael Davis',
      industry: 'Healthcare',
    },
  ];

  // Use API data if available, otherwise fallback to mock data
  const clientsData = clients || fallbackClients;

  const filteredClients = clientsData.filter(client => {
    const matchesSearch = client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.poc_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = client.is_active === true;
    } else if (statusFilter === 'inactive') {
      matchesStatus = client.is_active === false;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Modal handlers
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setSelectedClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setModalMode('edit');
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleSubmitClient = async (clientData: Partial<Client>) => {
    try {
      if (modalMode === 'create') {
        await createClientMutation.mutateAsync(clientData);
      } else if (modalMode === 'edit' && selectedClient) {
        // Use PATCH for partial updates
        await updateClientMutation.mutateAsync({
          id: selectedClient.id,
          data: clientData,
          method: 'PATCH'
        });
      }
    } catch (error) {
      console.error('Client submission error:', error);
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  const handleToggleStatus = async (clientId: number, newStatus: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ id: clientId, isActive: newStatus });
      toast.success(`Client ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Status toggle error:', error);
      toast.error('Failed to update client status. Please try again.');
      throw error;
    }
  };

  const exportClients = () => {
    const csvData = filteredClients.map(client => ({
      Name: client.name,
      Organization: client.organization_name || client.name,
      Email: client.email,
      Phone: client.phone_number || client.phone,
      'POC Name': client.poc_name || client.contact_person,
      Status: client.is_active ? 'Active' : 'Inactive',
      'Subscription Tier': client.subscription_tier,
      Students: client.total_students,
      Courses: client.total_courses,
      'Monthly Revenue': client.monthly_revenue,
      'Joining Date': formatDate(client.joining_date || client.created_at),
    }));
    
    // Create CSV content
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Client data exported successfully!');
  };

  const ClientCard: React.FC<{ client: Client; index: number }> = ({ client, index }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card 
        glassmorphism 
        hover 
        className={`h-full transition-all duration-300 ${
          client.is_active === false 
            ? 'bg-gray-50 border-gray-200 opacity-75' 
            : 'bg-white border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
              client.is_active === false
                ? 'bg-gray-300'
                : 'bg-gradient-to-br from-primary-500 to-primary-600'
            }`}>
              {client.logo_url ? (
                <img 
                  src={client.logo_url} 
                  alt={client.name} 
                  className={`w-8 h-8 rounded transition-all duration-300 ${
                    client.is_active === false ? 'grayscale' : ''
                  }`} 
                />
              ) : (
                <Building2 className={`w-6 h-6 ${
                  client.is_active === false ? 'text-gray-500' : 'text-white'
                }`} />
              )}
            </div>
            <div>
              <h3 className={`font-semibold text-lg transition-colors duration-300 ${
                client.is_active === false ? 'text-gray-500' : 'text-gray-900'
              }`}>
                {client.name}
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                client.is_active === false ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {client.organization_name || client.name}
              </p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              client.is_active === false
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {client.is_active === false ? 'Inactive' : 'Active'}
            </span>
          </div>
        </div>

        {/* Warning for inactive clients */}
        {client.is_active === false && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm text-orange-700">
              This client is currently inactive and cannot access the platform.
            </span>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div className={`flex items-center text-sm transition-colors duration-300 ${
            client.is_active === false ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Users className="w-4 h-4 mr-2" />
            {formatNumber(client.total_students)} students
          </div>
          <div className={`flex items-center text-sm transition-colors duration-300 ${
            client.is_active === false ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <BookOpen className="w-4 h-4 mr-2" />
            {client.total_courses} courses
          </div>
          {client.monthly_revenue && (
            <div className={`flex items-center text-sm transition-colors duration-300 ${
              client.is_active === false ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <TrendingUp className="w-4 h-4 mr-2" />
              ${formatNumber(client.monthly_revenue)}/month
            </div>
          )}
          <div className={`flex items-center text-sm transition-colors duration-300 ${
            client.is_active === false ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <MapPin className="w-4 h-4 mr-2" />
            {client.industry || 'Not specified'}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className={`flex items-center justify-between text-sm transition-colors duration-300`}>
            <span className={client.is_active === false ? 'text-gray-400' : 'text-gray-500'}>Contact</span>
            <span className={client.is_active === false ? 'text-gray-500' : 'text-gray-900'}>
              {client.poc_name || client.contact_person || 'Not available'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className={client.is_active === false ? 'text-gray-400' : 'text-gray-500'}>Joined</span>
            <span className={client.is_active === false ? 'text-gray-500' : 'text-gray-700'}>
              {formatDate(client.joining_date || client.created_at)}
            </span>
          </div>
          {client.email && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className={client.is_active === false ? 'text-gray-400' : 'text-gray-500'}>Email</span>
              <span className={`truncate transition-colors duration-300 ${
                client.is_active === false ? 'text-gray-500' : 'text-gray-700'
              }`}>
                {client.email}
              </span>
            </div>
          )}
        </div>

        {/* Status Toggle Section */}
        <div className="border-t border-gray-200 pt-3 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Client Status</span>
            <StatusToggle
              isActive={client.is_active !== false}
              onToggle={(newStatus) => handleToggleStatus(client.id, newStatus)}
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
            onClick={() => handleOpenEditModal(client)}
            disabled={toggleStatusMutation.isPending}
          >
            Edit
          </Button>
          <Link to={`/clients/${client.id}`}>
            <Button variant="outline" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
              View Details
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );

  // Loading state
  if (isLoading && !clients) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
        <span className="ml-3 text-gray-600">Loading clients...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* API Warning */}
      {!!error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> Unable to connect to API. Showing demo data for preview purposes.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
          <p className="text-gray-600">Manage your AI-Linc platform clients</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/50 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={exportClients}
          >
            Export
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            Add Client
          </Button>
        </div>
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
                placeholder="Search clients..."
                leftIcon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
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

      {/* Clients Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, index) => (
              <ClientCard key={client.id} client={client} index={index} />
            ))}
          </div>
        ) : (
          <Card glassmorphism padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toggle</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr 
                      key={client.id} 
                      className={`hover:bg-gray-50 transition-all duration-300 ${
                        client.is_active === false ? 'bg-gray-50 opacity-75' : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              client.is_active === false
                                ? 'bg-gray-300'
                                : 'bg-gradient-to-br from-primary-500 to-primary-600'
                            }`}>
                              {client.logo_url ? (
                                <img 
                                  src={client.logo_url} 
                                  alt={client.name} 
                                  className={`w-6 h-6 rounded transition-all duration-300 ${
                                    client.is_active === false ? 'grayscale' : ''
                                  }`} 
                                />
                              ) : (
                                <Building2 className={`w-5 h-5 ${
                                  client.is_active === false ? 'text-gray-500' : 'text-white'
                                }`} />
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className={`text-sm font-medium transition-colors duration-300 ${
                              client.is_active === false ? 'text-gray-500' : 'text-gray-900'
                            }`}>
                              {client.name}
                            </div>
                            <div className={`text-sm transition-colors duration-300 ${
                              client.is_active === false ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {client.email || 'No email provided'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          client.is_active === false
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {client.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        client.is_active === false ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {formatNumber(client.total_students)}
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        client.is_active === false ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {client.total_courses}
                      </td>
                      <td className={`px-6 py-4 text-sm transition-colors duration-300 ${
                        client.is_active === false ? 'text-gray-400' : 'text-gray-900'
                      }`}>
                        {client.poc_name || client.contact_person || 'Not available'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusToggle
                          isActive={client.is_active !== false}
                          onToggle={(newStatus) => handleToggleStatus(client.id, newStatus)}
                          size="sm"
                          showLabels={false}
                        />
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit className="w-4 h-4" />}
                            onClick={() => handleOpenEditModal(client)}
                            disabled={toggleStatusMutation.isPending}
                          >
                            Edit
                          </Button>
                          <Link to={`/clients/${client.id}`}>
                            <Button variant="outline" size="sm" leftIcon={<Eye className="w-4 h-4" />}>
                              View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </motion.div>

      {/* Client Form Modal */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitClient}
        mode={modalMode}
        client={selectedClient}
      />
    </div>
  );
};

export default Clients;