import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  BookOpen,
  Globe,
  Mail,
  Download,
  Search,
  Eye,
  Edit,
  User,
  Phone,
  Calendar,
  Shield,
  ShieldCheck,
  UserCog,
  Settings,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatsCard from '../components/charts/StatsCard';
import StudentDetailsModal from '../components/ui/StudentDetailsModal';
import AdminDetailsModal from '../components/ui/AdminDetailsModal';
import SuperAdminDetailsModal from '../components/ui/SuperAdminDetailsModal';
import ChangeRoleModal from '../components/ui/ChangeRoleModal';
import CourseUpdateModal from '../components/ui/CourseUpdateModal';
import CourseDetailsModal from '../components/ui/CourseDetailsModal';
import Modal from '../components/ui/Modal';
import { formatDate, formatCurrency, getDifficultyColor, getStatusColor } from '../utils/helpers';
import { useClientDetails, useChangeUserRole, useUpdateCourse } from '../hooks/useClients';
import { Student, Admin, SuperAdmin, ClientCourse } from '../types/client';
import toast from 'react-hot-toast';
import { getSiteByName, createSite } from '../services/netlify';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'admins' | 'superadmins'>('courses');
  const [courseSearch, setCourseSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [superAdminSearch, setSuperAdminSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [superAdminStatusFilter, setSuperAdminStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<SuperAdmin | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  // Role change modal state
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<Student | Admin | SuperAdmin | null>(null);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);

  // Course update modal state
  const [selectedCourse, setSelectedCourse] = useState<ClientCourse | null>(null);
  const [isCourseUpdateModalOpen, setIsCourseUpdateModalOpen] = useState(false);

  // Course details modal state
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<ClientCourse | null>(null);
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] = useState(false);

  // Netlify deploy modal state
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployEnv, setDeployEnv] = useState({
    VITE_API_URL: import.meta.env.VITE_API_URL || '',
    VITE_CLIENT_ID: '',
    VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    VITE_PAYMENT_ENCRYPTION_KEY: import.meta.env.VITE_PAYMENT_ENCRYPTION_KEY || '',
  });
  const [isDeploying, setIsDeploying] = useState(false);

  const githubPat = import.meta.env.VITE_GITHUB_PAT;

  const clientId = parseInt(id || '0');
  const { data: client, isLoading, error } = useClientDetails(clientId);
  const changeRoleMutation = useChangeUserRole();
  const updateCourseMutation = useUpdateCourse();

  const [netlifyStatus, setNetlifyStatus] = useState<'checking' | 'deployed' | 'not-deployed' | 'error'>('checking');
  const [netlifySite, setNetlifySite] = useState<any>(null);

  React.useEffect(() => {
    async function checkNetlify() {
      setNetlifyStatus('checking');
      try {
        // Use client.slug as site name
        const site = await getSiteByName(client?.slug);
        if (site) {
          setNetlifyStatus('deployed');
          setNetlifySite(site);
        } else {
          setNetlifyStatus('not-deployed');
          setNetlifySite(null);
        }
      } catch (e) {
        setNetlifyStatus('error');
        setNetlifySite(null);
      }
    }
    if (client?.slug) checkNetlify();
  }, [client?.slug]);

  const handleOpenDeployModal = () => {
    setIsDeployModalOpen(true);
  };

  const handleCloseDeployModal = () => {
    setIsDeployModalOpen(false);
    setDeployEnv({
      VITE_API_URL: '',
      VITE_CLIENT_ID: '',
      VITE_GOOGLE_CLIENT_ID: '',
      VITE_PAYMENT_ENCRYPTION_KEY: '',
    });
  };

  const handleDeployInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // All fields are non-editable, so do nothing
  };

  const handleConfirmDeploy = async () => {
    if (!client) return;
    setIsDeploying(true);
    try {
      await createSite({
        name: client.slug,
        env: {
          VITE_API_URL: deployEnv.VITE_API_URL,
          VITE_CLIENT_ID: String(client.id),
          VITE_GOOGLE_CLIENT_ID: deployEnv.VITE_GOOGLE_CLIENT_ID,
          VITE_PAYMENT_ENCRYPTION_KEY: deployEnv.VITE_PAYMENT_ENCRYPTION_KEY,
        },
      });
      toast.success('Netlify project created and deployed!');
      handleCloseDeployModal();
    } catch (e) {
      toast.error('Failed to deploy to Netlify.');
    } finally {
      setIsDeploying(false);
    }
  };

  const filteredCourses = client?.courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || course.difficulty_level === difficultyFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'published' && course.published) ||
                         (statusFilter === 'unpublished' && !course.published);
    return matchesSearch && matchesDifficulty && matchesStatus;
  }) || [];

  const filteredStudents = client?.students?.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                         student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
                         student.username.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesStatus = studentStatusFilter === 'all' || 
                         (studentStatusFilter === 'active' && student.is_active) ||
                         (studentStatusFilter === 'inactive' && !student.is_active);
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredAdmins = client?.admins?.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         admin.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
                         admin.username.toLowerCase().includes(adminSearch.toLowerCase());
    const matchesStatus = adminStatusFilter === 'all' || 
                         (adminStatusFilter === 'active' && admin.is_active) ||
                         (adminStatusFilter === 'inactive' && !admin.is_active);
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredSuperAdmins = client?.superadmins?.filter(superadmin => {
    const matchesSearch = superadmin.name.toLowerCase().includes(superAdminSearch.toLowerCase()) ||
                         superadmin.email.toLowerCase().includes(superAdminSearch.toLowerCase()) ||
                         superadmin.username.toLowerCase().includes(superAdminSearch.toLowerCase());
    const matchesStatus = superAdminStatusFilter === 'all' || 
                         (superAdminStatusFilter === 'active' && superadmin.is_active) ||
                         (superAdminStatusFilter === 'inactive' && !superadmin.is_active);
    return matchesSearch && matchesStatus;
  }) || [];

  const exportData = () => {
    if (activeTab === 'courses') {
      const csvData = filteredCourses.map(course => ({
        Title: course.title,
        Difficulty: course.difficulty_level,
        Status: course.published ? 'Published' : 'Unpublished',
        Type: course.is_free ? 'Free' : 'Paid',
        Enrollments: course.enrolled_students_count,
        Price: course.price && course.price !== '0' ? formatCurrency(parseFloat(course.price)) : 'Free',
      }));
      console.log('Exporting courses:', csvData);
    } else if (activeTab === 'students') {
      const csvData = filteredStudents.map(student => ({
        Name: student.name,
        Email: student.email,
        Status: student.is_active ? 'Active' : 'Inactive',
        'Phone Number': student.phone_number || 'N/A',
        'Date of Birth': student.date_of_birth ? formatDate(student.date_of_birth) : 'N/A',
        'Joined Date': formatDate(student.created_at),
      }));
      console.log('Exporting students:', csvData);
    } else if (activeTab === 'admins') {
      const csvData = filteredAdmins.map(admin => ({
        Name: admin.name,
        Email: admin.email,
        Status: admin.is_active ? 'Active' : 'Inactive',
        'Phone Number': admin.phone_number || 'N/A',
        'Date of Birth': admin.date_of_birth ? formatDate(admin.date_of_birth) : 'N/A',
        'Joined Date': formatDate(admin.created_at),
      }));
      console.log('Exporting admins:', csvData);
    } else if (activeTab === 'superadmins') {
      const csvData = filteredSuperAdmins.map(superadmin => ({
        Name: superadmin.name,
        Email: superadmin.email,
        Status: superadmin.is_active ? 'Active' : 'Inactive',
        'Phone Number': superadmin.phone_number || 'N/A',
        'Date of Birth': superadmin.date_of_birth ? formatDate(superadmin.date_of_birth) : 'N/A',
        'Joined Date': formatDate(superadmin.created_at),
      }));
      console.log('Exporting superadmins:', csvData);
    }
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleAdminClick = (admin: Admin) => {
    setSelectedAdmin(admin);
    setIsAdminModalOpen(true);
  };

  const handleSuperAdminClick = (superadmin: SuperAdmin) => {
    setSelectedSuperAdmin(superadmin);
    setIsSuperAdminModalOpen(true);
  };

  const closeStudentModal = () => {
    setIsStudentModalOpen(false);
    setSelectedStudent(null);
  };

  const closeAdminModal = () => {
    setIsAdminModalOpen(false);
    setSelectedAdmin(null);
  };

  const closeSuperAdminModal = () => {
    setIsSuperAdminModalOpen(false);
    setSelectedSuperAdmin(null);
  };

  // Role change handlers
  const handleChangeRole = (user: Student | Admin | SuperAdmin) => {
    setSelectedUserForRoleChange(user);
    setIsChangeRoleModalOpen(true);
  };

  const handleRoleChangeConfirm = async (userId: number, newRole: string) => {
    try {
      await changeRoleMutation.mutateAsync({
        clientId,
        userId,
        newRole
      });
      toast.success(`User role changed to ${newRole} successfully!`);
    } catch (error) {
      console.error('Failed to change user role:', error);
      toast.error('Failed to change user role. Please try again.');
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const closeChangeRoleModal = () => {
    setIsChangeRoleModalOpen(false);
    setSelectedUserForRoleChange(null);
  };

  // Course update handlers
  const handleCourseUpdate = (course: ClientCourse) => {
    setSelectedCourse(course);
    setIsCourseUpdateModalOpen(true);
  };

  const handleCourseUpdateConfirm = async (courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean }) => {
    try {
      await updateCourseMutation.mutateAsync({
        clientId,
        courseId,
        courseData
      });
      toast.success('Course updated successfully!');
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error('Failed to update course. Please try again.');
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const closeCourseUpdateModal = () => {
    setIsCourseUpdateModalOpen(false);
    setSelectedCourse(null);
  };

  // Course details handlers
  const handleCourseView = (course: ClientCourse) => {
    setSelectedCourseForDetails(course);
    setIsCourseDetailsModalOpen(true);
  };

  const closeCourseDetailsModal = () => {
    setIsCourseDetailsModalOpen(false);
    setSelectedCourseForDetails(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
        <span className="ml-3 text-gray-600">Loading client details...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-lg font-medium text-gray-900">Could not load client details</h3>
        <p className="mt-1 text-sm text-gray-500">
          There was an error fetching the data for this client.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Go Back
        </Button>
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
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{client.name}</h1>
          <p className="text-gray-600">Client Live Dashboard</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={exportData}
        >
          Export Data
        </Button>
      </motion.div>

      {/* Client Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card glassmorphism>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{client.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    {client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                  {client.is_active !== undefined && (
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        client.is_active ? 'active' : 'inactive'
                      )}`}
                    >
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>

              {client.description && (
                <p className="text-gray-700 mb-4">{client.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Joined:</span>
                  <p className="font-medium">{formatDate(client.joining_date || client.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Subscription:</span>
                  <p className="font-medium">{client.subscription_plan || client.subscription_tier || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Contact Person:</span>
                  <p className="font-medium">{client.poc_name || client.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{client.phone_number || client.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard
          title="Total Students"
          value={client.total_students || 0}
          icon={Users}
        />
        <StatsCard
          title="Total Courses"
          value={client.courses?.length || 0}
          icon={BookOpen}
        />
        <StatsCard
          title="Total Admins"
          value={client.total_admins || client.admins?.length || 0}
          icon={Shield}
        />
        <StatsCard
          title="Total SuperAdmins"
          value={client.total_superadmins || client.superadmins?.length || 0}
          icon={ShieldCheck}
        />
      </motion.div>

      {/* Netlify Deployment Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card glassmorphism className="mb-6">
          <div className="flex items-center gap-4">
            <Globe className="w-6 h-6 text-primary-500" />
            <div className="flex-1">
              <h2 className="text-lg font-bold">Netlify Deployment</h2>
              {netlifyStatus === 'checking' && <span className="text-gray-500">Checking deployment status...</span>}
              {netlifyStatus === 'deployed' && netlifySite && (
                <span className="text-green-600">Deployed: <a href={netlifySite.ssl_url || netlifySite.url} target="_blank" rel="noopener noreferrer" className="underline">{netlifySite.ssl_url || netlifySite.url}</a></span>
              )}
              {netlifyStatus === 'not-deployed' && (
                <span className="text-orange-600">Not deployed</span>
              )}
              {netlifyStatus === 'error' && (
                <span className="text-red-600">Error checking deployment status</span>
              )}
            </div>
            {netlifyStatus === 'not-deployed' && (
              <Button
                variant="primary"
                onClick={handleOpenDeployModal}
                isLoading={isDeploying}
              >
                Deploy
              </Button>
            )}
            {netlifyStatus === 'deployed' && netlifySite && (
              <a
                href={netlifySite.ssl_url || netlifySite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                View Site
              </a>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Tabbed Content Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card glassmorphism>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('courses')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'courses'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Courses ({filteredCourses.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'students'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Students ({filteredStudents.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admins'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admins ({filteredAdmins.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('superadmins')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'superadmins'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  SuperAdmins ({filteredSuperAdmins.length})
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'courses' ? (
            <>
              {/* Courses Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">Courses</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search courses..."
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              {/* Courses Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Difficulty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enrollments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCourses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{course.title}</div>
                            {course.subtitle && (
                              <div className="text-sm text-gray-500">{course.subtitle}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                              course.difficulty_level
                            )}`}
                          >
                            {course.difficulty_level}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              course.published ? 'published' : 'unpublished'
                            )}`}
                          >
                            {course.published ? 'Published' : 'Unpublished'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{course.enrolled_students_count}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {course.price && course.price !== '0' ? formatCurrency(parseFloat(course.price)) : 'Free'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              className="text-primary-600 hover:text-primary-900 p-1 rounded-md hover:bg-primary-50 transition-colors"
                              onClick={() => handleCourseView(course)}
                              title="View course details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50 transition-colors"
                              onClick={() => handleCourseUpdate(course)}
                              title="Update course settings"
                              disabled={updateCourseMutation.isPending}
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCourses.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No courses found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filters to find courses.
                  </p>
                </div>
              )}
            </>
          ) : activeTab === 'students' ? (
            <>
              {/* Students Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">Students</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {student.profile_pic_url ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={student.profile_pic_url}
                                  alt={student.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center ${student.profile_pic_url ? 'hidden' : ''}`}>
                                <span className="text-white font-medium text-sm">
                                  {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              student.is_active ? 'active' : 'inactive'
                            )}`}
                          >
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {student.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(student.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-primary-600 hover:text-primary-900 p-1 rounded-md hover:bg-primary-50 transition-colors"
                              onClick={() => handleStudentClick(student)}
                              title="View student details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                              onClick={() => handleChangeRole(student)}
                              title="Change user role"
                              disabled={changeRoleMutation.isPending}
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filters to find students.
                  </p>
                </div>
              )}
            </>
          ) : activeTab === 'admins' ? (
            <>
              {/* Admins Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">Admins</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search admins..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={adminStatusFilter}
                    onChange={(e) => setAdminStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Admins Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {admin.profile_pic_url ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={admin.profile_pic_url}
                                  alt={admin.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center ${admin.profile_pic_url ? 'hidden' : ''}`}>
                                <span className="text-white font-medium text-sm">
                                  {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              admin.is_active ? 'active' : 'inactive'
                            )}`}
                          >
                            {admin.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {admin.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(admin.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-primary-600 hover:text-primary-900 p-1 rounded-md hover:bg-primary-50 transition-colors"
                              onClick={() => handleAdminClick(admin)}
                              title="View admin details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                              onClick={() => handleChangeRole(admin)}
                              title="Change user role"
                              disabled={changeRoleMutation.isPending}
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAdmins.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No admins found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filters to find admins.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* SuperAdmins Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">SuperAdmins</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search superadmins..."
                      value={superAdminSearch}
                      onChange={(e) => setSuperAdminSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={superAdminStatusFilter}
                    onChange={(e) => setSuperAdminStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* SuperAdmins Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SuperAdmin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuperAdmins.map((superadmin) => (
                      <tr key={superadmin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {superadmin.profile_pic_url ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={superadmin.profile_pic_url}
                                  alt={superadmin.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center ${superadmin.profile_pic_url ? 'hidden' : ''}`}>
                                <span className="text-white font-medium text-sm">
                                  {superadmin.first_name.charAt(0)}{superadmin.last_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{superadmin.name}</div>
                              <div className="text-sm text-gray-500">{superadmin.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              superadmin.is_active ? 'active' : 'inactive'
                            )}`}
                          >
                            {superadmin.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {superadmin.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(superadmin.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-primary-600 hover:text-primary-900 p-1 rounded-md hover:bg-primary-50 transition-colors"
                              onClick={() => handleSuperAdminClick(superadmin)}
                              title="View superadmin details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-orange-600 hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                              onClick={() => handleChangeRole(superadmin)}
                              title="Change user role"
                              disabled={changeRoleMutation.isPending}
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredSuperAdmins.length === 0 && (
                <div className="text-center py-12">
                  <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No superadmins found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or filters to find superadmins.
                  </p>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* Student Details Modal */}
      {selectedStudent && (
        <StudentDetailsModal
          isOpen={isStudentModalOpen}
          onClose={closeStudentModal}
          student={selectedStudent}
        />
      )}

      {/* Admin Details Modal */}
      {selectedAdmin && (
        <AdminDetailsModal
          isOpen={isAdminModalOpen}
          onClose={closeAdminModal}
          admin={selectedAdmin}
        />
      )}

      {/* SuperAdmin Details Modal */}
      {selectedSuperAdmin && (
        <SuperAdminDetailsModal
          isOpen={isSuperAdminModalOpen}
          onClose={closeSuperAdminModal}
          superAdmin={selectedSuperAdmin}
        />
      )}

      {/* Change Role Modal */}
      {selectedUserForRoleChange && (
        <ChangeRoleModal
          isOpen={isChangeRoleModalOpen}
          onClose={closeChangeRoleModal}
          onConfirm={handleRoleChangeConfirm}
          user={selectedUserForRoleChange}
          clientId={clientId}
          isLoading={changeRoleMutation.isPending}
        />
      )}

      {/* Course Update Modal */}
      {selectedCourse && (
        <CourseUpdateModal
          isOpen={isCourseUpdateModalOpen}
          onClose={closeCourseUpdateModal}
          onConfirm={handleCourseUpdateConfirm}
          course={selectedCourse}
          isLoading={updateCourseMutation.isPending}
        />
      )}

      {/* Course Details Modal */}
      {selectedCourseForDetails && (
        <CourseDetailsModal
          isOpen={isCourseDetailsModalOpen}
          onClose={closeCourseDetailsModal}
          course={selectedCourseForDetails}
        />
      )}

      {/* Netlify Deploy Modal */}
      {isDeployModalOpen && client && (
        <Modal isOpen={isDeployModalOpen} onClose={handleCloseDeployModal}>
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Deploy Netlify Project</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name (slug)</label>
              <input type="text" value={client.slug} disabled className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VITE_API_URL</label>
              <input name="VITE_API_URL" value={deployEnv.VITE_API_URL} disabled className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VITE_CLIENT_ID</label>
              <input name="VITE_CLIENT_ID" value={client.id} disabled className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VITE_GOOGLE_CLIENT_ID</label>
              <input name="VITE_GOOGLE_CLIENT_ID" value={deployEnv.VITE_GOOGLE_CLIENT_ID} disabled className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VITE_PAYMENT_ENCRYPTION_KEY</label>
              <input name="VITE_PAYMENT_ENCRYPTION_KEY" value={deployEnv.VITE_PAYMENT_ENCRYPTION_KEY} disabled className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCloseDeployModal} disabled={isDeploying}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirmDeploy} isLoading={isDeploying} disabled={isDeploying}>
                Deploy
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClientDetails;