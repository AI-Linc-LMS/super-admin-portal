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
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useClients } from '../hooks/useApi';
import { Client } from '../types/client';
import { formatDate, formatNumber, getStatusColor } from '../utils/helpers';

const Clients: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // API call without search parameters - we'll filter client-side
  const { 
    data: clients, 
    isLoading, 
    error
  } = useClients();

  // Mock data as fallback when API fails
  const fallbackClients: Client[] = [
    {
      id: 1,
      name: 'TechCorp Solutions',
      slug: 'techcorp-solutions',
      organization_name: 'TechCorp Solutions Ltd.',
      email: 'admin@techcorp.com',
      phone: '+1-555-0123',
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
      address: '789 Medical Center Dr, Chicago, IL',
      status: 'pending',
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
                         client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportClients = () => {
    const csvData = filteredClients.map(client => ({
      Name: client.name,
      Organization: client.organization_name,
      Email: client.email,
      Phone: client.phone,
      Status: client.status,
      'Subscription Tier': client.subscription_tier,
      Students: client.total_students || client.students_count || 0,
      Courses: client.total_courses || client.courses_count || 0,
      'Monthly Revenue': client.monthly_revenue,
      'Created Date': formatDate(client.created_at),
    }));
    console.log('Exporting clients:', csvData);
  };

  const ClientCard: React.FC<{ client: Client; index: number }> = ({ client, index }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card glassmorphism hover className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              {client.logo_url ? (
                <img src={client.logo_url} alt={client.name} className="w-8 h-8 rounded" />
              ) : (
                <Building2 className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
              <p className="text-sm text-gray-600">{client.organization_name}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
            {client.status}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            {formatNumber(client.total_students || client.students_count || 0)} students
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <BookOpen className="w-4 h-4 mr-2" />
            {client.total_courses || client.courses_count || 0} courses
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 mr-2" />
            ${formatNumber(client.monthly_revenue || 0)}/month
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {client.industry || 'Not specified'}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Contact</span>
            <span className="text-gray-900">{client.contact_person || 'Not available'}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-500">Joined</span>
            <span className="text-gray-700">{formatDate(client.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
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
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 0 00-1-1z" clipRule="evenodd" />
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
          <Button leftIcon={<Plus className="w-4 h-4" />}>
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
                <option value="pending">Pending</option>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatNumber(client.total_students || client.students_count || 0)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{client.total_courses || client.courses_count || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${formatNumber(client.monthly_revenue || 0)}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <Link to={`/clients/${client.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
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
    </div>
  );
};

export default Clients;