import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  BookOpen,
  ClipboardList,
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
  Copy,
  Trash2,
  CheckSquare,
  Square,
  Sparkles,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import StatsCard from '../components/charts/StatsCard';
import StudentDetailsModal from '../components/ui/StudentDetailsModal';
import AdminDetailsModal from '../components/ui/AdminDetailsModal';
import SuperAdminDetailsModal from '../components/ui/SuperAdminDetailsModal';
import CourseManagerDetailsModal from '../components/ui/CourseManagerDetailsModal';
import ChangeRoleModal from '../components/ui/ChangeRoleModal';
import CourseUpdateModal from '../components/ui/CourseUpdateModal';
import CourseDetailsModal from '../components/ui/CourseDetailsModal';
import CourseDuplicationModal from '../components/ui/CourseDuplicationModal';
import CourseDeletionModal from '../components/ui/CourseDeletionModal';
import OperationProgressModal from '../components/ui/OperationProgressModal';
import BulkOperationsModal from '../components/ui/BulkOperationsModal';
import BulkOperationProgressModal from '../components/ui/BulkOperationProgressModal';
import { formatDate, formatCurrency, getDifficultyColor, getStatusColor } from '../utils/helpers';
import { 
  useClientDetails, 
  useChangeUserRole, 
  useUpdateCourse,
  useDuplicateCourse,
  useDeleteCourse,
  useAvailableFeatures,
  useClientFeatures,
  useUpdateClientFeatures,
  useUpdateClient
} from '../hooks/useClients';
import { useBulkCourseOperations } from '../hooks/useBulkCourseOperations';
import { useBulkDuplicateCoursesProgress } from '../hooks/useBulkDuplicateCourses';
import { Student, Admin, SuperAdmin, ClientCourse, CourseManager } from '../types/client';
import toast from 'react-hot-toast';
import BulkDuplicateCoursesModal from '../components/ui/BulkDuplicateCoursesModal';
import ClientFeaturesSelector from '../components/ui/ClientFeaturesSelector';
import StatusToggle from '../components/ui/StatusToggle';
import ClientFilesBrowser from '../components/files/ClientFilesBrowser';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'course_managers' | 'admins' | 'superadmins' | 'files'>('courses');
  const [courseSearch, setCourseSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [courseManagerSearch, setCourseManagerSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [superAdminSearch, setSuperAdminSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [courseManagerStatusFilter, setCourseManagerStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [superAdminStatusFilter, setSuperAdminStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCourseManager, setSelectedCourseManager] = useState<CourseManager | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState<SuperAdmin | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isCourseManagerModalOpen, setIsCourseManagerModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  // Role change modal state
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<Student | Admin | SuperAdmin | CourseManager | null>(null);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);

  // Course update modal state
  const [selectedCourse, setSelectedCourse] = useState<ClientCourse | null>(null);
  const [isCourseUpdateModalOpen, setIsCourseUpdateModalOpen] = useState(false);

  // Course details modal state
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<ClientCourse | null>(null);
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] = useState(false);

  // Course Operations modal state
  const [selectedCourseForDuplication, setSelectedCourseForDuplication] = useState<ClientCourse | null>(null);
  const [selectedCourseForDeletion, setSelectedCourseForDeletion] = useState<ClientCourse | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [currentOperationId, setCurrentOperationId] = useState<string>('');
  const [currentOperationType, setCurrentOperationType] = useState<'duplicate' | 'bulk_duplicate' | 'delete'>('duplicate');

  // Bulk operations state (Courses tab)
  const [selectedCourses, setSelectedCourses] = useState<ClientCourse[]>([]);
  const [isBulkOperationsModalOpen, setIsBulkOperationsModalOpen] = useState(false);
  const [isBulkProgressModalOpen, setIsBulkProgressModalOpen] = useState(false);
  const [currentBulkOperation, setCurrentBulkOperation] = useState<'publish' | 'unpublish' | 'make_free' | 'make_paid' | null>(null);
  const [currentBulkPrice, setCurrentBulkPrice] = useState<number | undefined>(undefined);

  // Bulk duplicate modal state
  const [isBulkDuplicateModalOpen, setIsBulkDuplicateModalOpen] = useState(false);
  const [isBulkDuplicateProgressModalOpen, setIsBulkDuplicateProgressModalOpen] = useState(false);
  const [bulkDuplicateTargetClientId, setBulkDuplicateTargetClientId] = useState<number | null>(null);
  const bulkDuplicate = useBulkDuplicateCoursesProgress();

  // Netlify deployments are now driven by the backend on tenant approval
  // (provisioning/tasks.py:provision_tenant). The legacy in-browser deploy
  // modal and its env-var entry form are removed.

  const clientId = parseInt(id || '0');
  const { data: client, isLoading, error } = useClientDetails(clientId);
  const changeRoleMutation = useChangeUserRole();
  const updateCourseMutation = useUpdateCourse();
  const duplicateCourseMutation = useDuplicateCourse();
  const deleteCourseMutation = useDeleteCourse();
  const bulkOperations = useBulkCourseOperations();
  const { data: availableFeaturesData, isLoading: isLoadingFeatures } = useAvailableFeatures();
  const { data: clientFeaturesData, isLoading: isLoadingClientFeatures } = useClientFeatures(clientId);
  const updateClientFeaturesMutation = useUpdateClientFeatures();
  const updateClientMutation = useUpdateClient();

  // Per-client boolean toggle for adaptive-article AI images (default off; PATCH so other client
  // fields aren't clobbered). Mutation invalidates client-details, so the toggle reflects the save.
  const handleToggleArticleImages = async (next: boolean) => {
    try {
      await updateClientMutation.mutateAsync({
        id: clientId,
        data: { generate_adaptive_article_images: next },
        method: 'PATCH',
      });
      toast.success(`Adaptive article images ${next ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      console.error('Failed to update adaptive article images setting:', error);
    }
  };

  // Update selectedCourseForDetails when client data changes (e.g., after course manager assignment)
  useEffect(() => {
    if (selectedCourseForDetails && client?.courses) {
      const updatedCourse = client.courses.find(c => c.id === selectedCourseForDetails.id);
      if (updatedCourse) {
        setSelectedCourseForDetails(updatedCourse);
      }
    }
  }, [client?.courses]);

  const handleUpdateFeatures = async (clientId: number, featureIds: number[]) => {
    try {
      await updateClientFeaturesMutation.mutateAsync({ clientId, featureIds });
      toast.success('Client features updated successfully!');
    } catch (error) {
      // Error is handled by API service error handler
      console.error('Failed to update client features:', error);
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

  // Bulk selection helpers
  const isCourseSelected = (course: ClientCourse) => selectedCourses.some(c => c.id === course.id);
  const handleCourseSelection = (course: ClientCourse, isSelected: boolean) => {
    if (isSelected) setSelectedCourses(prev => [...prev, course]);
    else setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
  };
  const handleSelectAllCourses = () => {
    if (selectedCourses.length === filteredCourses.length) setSelectedCourses([]);
    else setSelectedCourses([...filteredCourses]);
  };
  const handleBulkOperationOpen = () => {
    if (selectedCourses.length === 0) {
      toast.error('Please select at least one course');
      return;
    }
    setIsBulkOperationsModalOpen(true);
  };
  const handleBulkOperationConfirm = async (operation: 'publish' | 'unpublish' | 'make_free' | 'make_paid', price?: number) => {
    setCurrentBulkOperation(operation);
    setCurrentBulkPrice(price);
    setIsBulkOperationsModalOpen(false);
    setIsBulkProgressModalOpen(true);
    try {
      await bulkOperations.executeBulkOperation(
        selectedCourses.map(c => ({ id: c.id, title: c.title })),
        operation,
        price,
        clientId
      );
    } catch (e) {
      // handled in hook
    }
  };
  const handleBulkOperationComplete = () => {
    setIsBulkProgressModalOpen(false);
    setSelectedCourses([]);
    setCurrentBulkOperation(null);
    setCurrentBulkPrice(undefined);
    bulkOperations.resetState();
  };

  const filteredStudents = client?.students?.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                         student.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
                         student.username.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesStatus = studentStatusFilter === 'all' || 
                         (studentStatusFilter === 'active' && student.is_active) ||
                         (studentStatusFilter === 'inactive' && !student.is_active);
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredCourseManagers = client?.course_managers?.filter(courseManager => {
    const matchesSearch = courseManager.name.toLowerCase().includes(courseManagerSearch.toLowerCase()) ||
                         courseManager.email.toLowerCase().includes(courseManagerSearch.toLowerCase()) ||
                         courseManager.username.toLowerCase().includes(courseManagerSearch.toLowerCase());
    const matchesStatus = courseManagerStatusFilter === 'all' || 
                         (courseManagerStatusFilter === 'active' && courseManager.is_active) ||
                         (courseManagerStatusFilter === 'inactive' && !courseManager.is_active);
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
    } else if (activeTab === 'course_managers') {
      const csvData = filteredCourseManagers.map(courseManager => ({
        Name: courseManager.name,
        Email: courseManager.email,
        Status: courseManager.is_active ? 'Active' : 'Inactive',
        'Phone Number': courseManager.phone_number || 'N/A',
        'Date of Birth': courseManager.date_of_birth ? formatDate(courseManager.date_of_birth) : 'N/A',
        'Joined Date': formatDate(courseManager.created_at),
      }));
      console.log('Exporting course managers:', csvData);
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

  const handleCourseManagerClick = (courseManager: CourseManager) => {
    setSelectedCourseManager(courseManager);
    setIsCourseManagerModalOpen(true);
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

  const closeCourseManagerModal = () => {
    setIsCourseManagerModalOpen(false);
    setSelectedCourseManager(null);
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
  const handleChangeRole = (user: Student | Admin | SuperAdmin | CourseManager) => {
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

  const handleCourseUpdateConfirm = async (courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean; content_lock_enabled?: boolean }) => {
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

  // Course Operations handlers
  const handleCourseDuplicate = (course: ClientCourse) => {
    setSelectedCourseForDuplication(course);
    setIsDuplicateModalOpen(true);
  };

  const handleCourseDelete = (course: ClientCourse) => {
    setSelectedCourseForDeletion(course);
    setIsDeleteModalOpen(true);
  };

  const handleDuplicateConfirm = async (courseId: number, fromClientId: number, toClientId: number) => {
    try {
      const response = await duplicateCourseMutation.mutateAsync({
        course_id: courseId,
        from_client_id: fromClientId,
        to_client_id: toClientId,
      });
      
      // Show progress modal
      setCurrentOperationId(response.operation_id);
      setCurrentOperationType('duplicate');
      setIsProgressModalOpen(true);
      
      toast.success('Course duplication initiated successfully!');
    } catch (error) {
      console.error('Failed to initiate course duplication:', error);
      toast.error('Failed to initiate course duplication. Please try again.');
      throw error;
    }
  };

  const handleDeleteConfirm = async (courseId: number, clientId: number) => {
    try {
      const response = await deleteCourseMutation.mutateAsync({
        course_id: courseId,
        client_id: clientId,
        confirm_deletion: true,
      });
      
      // Show progress modal
      setCurrentOperationId(response.operation_id);
      setCurrentOperationType('delete');
      setIsProgressModalOpen(true);
      
      toast.success('Course deletion initiated successfully!');
    } catch (error) {
      console.error('Failed to initiate course deletion:', error);
      toast.error('Failed to initiate course deletion. Please try again.');
      throw error;
    }
  };

  const closeDuplicateModal = () => {
    setIsDuplicateModalOpen(false);
    setSelectedCourseForDuplication(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedCourseForDeletion(null);
  };

  const closeProgressModal = () => {
    setIsProgressModalOpen(false);
    setCurrentOperationId('');
  };

  const handleOperationComplete = (result: any) => {
    // Handle successful operation completion
    if (currentOperationType === 'duplicate') {
      toast.success(`Course duplicated successfully! New course ID: ${result.new_course_id}`);
    } else if (currentOperationType === 'delete') {
      toast.success('Course deleted successfully!');
      // Refresh client details to update course list
      window.location.reload();
    }
  };

  const handleBulkDuplicateOpen = () => {
    if (selectedCourses.length === 0) {
      toast.error('Please select at least one course');
      return;
    }
    setIsBulkDuplicateModalOpen(true);
  };

  const handleBulkDuplicateConfirm = async (destinationClientId: number) => {
    setBulkDuplicateTargetClientId(destinationClientId);
    setIsBulkDuplicateModalOpen(false);
    setIsBulkDuplicateProgressModalOpen(true);
    await bulkDuplicate.executeBulkDuplicate(
      selectedCourses.map(c => ({ id: c.id, title: c.title })),
      clientId,
      destinationClientId
    );
  };

  const handleBulkDuplicateProgressComplete = () => {
    setIsBulkDuplicateProgressModalOpen(false);
    setBulkDuplicateTargetClientId(null);
    setSelectedCourses([]);
    bulkDuplicate.resetState();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full border-2 border-themed border-t-brand-cyan h-8 w-8"></div>
        <span className="ml-3 text-text-dim">Loading client details...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-lg font-medium text-text">Could not load client details</h3>
        <p className="mt-1 text-sm text-text-mute">
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
          <h1 className="text-3xl font-bold text-text mb-2">{client.name}</h1>
          <p className="text-text-dim">Client Live Dashboard</p>
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
                  <h2 className="text-xl font-bold text-text mb-1">{client.name}</h2>
                  <div className="flex items-center gap-4 text-sm text-text-dim mb-2">
                    {client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-brand-cyan">
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
                <p className="text-text mb-4">{client.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-mute">Joined:</span>
                  <p className="font-medium">{formatDate(client.joining_date || client.created_at)}</p>
                </div>
                <div>
                  <span className="text-text-mute">Subscription:</span>
                  <p className="font-medium">{client.subscription_plan || client.subscription_tier || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-text-mute">Contact Person:</span>
                  <p className="font-medium">{client.poc_name || client.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-text-mute">Phone:</span>
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
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
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
          title="Course Managers"
          value={client.total_course_managers || client.course_managers?.length || 0}
          icon={ClipboardList}
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
            <Globe className="w-6 h-6 text-brand-cyan" />
            <div className="flex-1">
              <h2 className="text-lg font-bold">Netlify Deployment</h2>
              <span className="text-text-mute">
                Deployments run automatically when a tenant request is approved.
                Check the Tenant Requests page for live provisioning status.
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Client Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card glassmorphism className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Sparkles className="w-6 h-6 text-brand-cyan" />
            <h2 className="text-lg font-bold">Client Features</h2>
          </div>
          <ClientFeaturesSelector
            availableFeatures={availableFeaturesData?.features || []}
            currentFeatureIds={clientFeaturesData?.features?.map(f => f.id) || client?.features?.map(f => f.id) || []}
            clientId={clientId}
            onUpdate={handleUpdateFeatures}
            isLoading={isLoadingFeatures || isLoadingClientFeatures}
          />
        </Card>
      </motion.div>

      {/* Adaptive Course Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <Card glassmorphism className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <ImageIcon className="w-6 h-6 text-brand-cyan" />
            <h2 className="text-lg font-bold">Adaptive Course Settings</h2>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">Generate images in adaptive articles</p>
              <p className="text-sm text-gray-400">
                When on, AI illustrations are generated and attached to this client&apos;s adaptive
                articles. Off by default — leave off to skip the extra generation cost.
              </p>
            </div>
            <StatusToggle
              isActive={client?.generate_adaptive_article_images ?? false}
              onToggle={handleToggleArticleImages}
              disabled={updateClientMutation.isLoading}
              size="lg"
            />
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
          <div className="border-b border-themed mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('courses')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'courses'
                    ? 'border-primary-500 text-brand-cyan'
                    : 'border-transparent text-text-mute hover:text-text hover:border-themed-2'
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
                    ? 'border-primary-500 text-brand-cyan'
                    : 'border-transparent text-text-mute hover:text-text hover:border-themed-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Students ({filteredStudents.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('course_managers')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'course_managers'
                    ? 'border-primary-500 text-brand-cyan'
                    : 'border-transparent text-text-mute hover:text-text hover:border-themed-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Course Managers ({filteredCourseManagers.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'admins'
                    ? 'border-primary-500 text-brand-cyan'
                    : 'border-transparent text-text-mute hover:text-text hover:border-themed-2'
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
                    ? 'border-primary-500 text-brand-cyan'
                    : 'border-transparent text-text-mute hover:text-text hover:border-themed-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  SuperAdmins ({filteredSuperAdmins.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'files'
                    ? 'border-primary-500 text-brand-cyan'
                    : 'border-transparent text-text-mute hover:text-text hover:border-themed-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Files
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-mute w-4 h-4" />
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
                    className="px-3 py-2 border border-themed-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-themed-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published</option>
                    <option value="unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              {/* Bulk Operations Bar */}
              {selectedCourses.length > 0 && (
                <div className="bg-brand-cyan/5 border border-primary-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-brand-cyan" />
                        <span className="font-medium text-primary-900">
                          {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <button onClick={handleSelectAllCourses} className="text-sm text-brand-cyan hover:text-primary-800 underline">
                        {selectedCourses.length === filteredCourses.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedCourses([])}>Clear Selection</Button>
                      <Button variant="primary" size="sm" leftIcon={<Settings className="w-4 h-4" />} onClick={handleBulkOperationOpen}>Bulk Operations</Button>
                      <Button variant="primary" size="sm" leftIcon={<Copy className="w-4 h-4" />} onClick={handleBulkDuplicateOpen}>
                        Bulk Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Courses Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-themed">
                  <thead className="bg-line/[0.03]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        <button onClick={handleSelectAllCourses} className="flex items-center gap-2 hover:text-text">
                          {selectedCourses.length === filteredCourses.length ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                          Select All
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Difficulty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Enrollments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-ink-1/60 divide-y divide-themed">
                    {filteredCourses.map((course) => {
                      const selected = isCourseSelected(course);
                      return (
                      <tr key={course.id} className={`hover:bg-line/[0.04] ${selected ? 'bg-brand-cyan/5' : ''}`}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleCourseSelection(course, !selected)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selected ? 'bg-primary-600 border-primary-600 text-white' : 'bg-ink-1/60 border-themed-2 hover:border-brand-cyan/50'
                            }`}
                          >
                            {selected && <CheckSquare className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-text">{course.title}</div>
                            {course.subtitle && (
                              <div className="text-sm text-text-mute">{course.subtitle}</div>
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
                        <td className="px-6 py-4 text-sm text-text">{course.enrolled_students_count}</td>
                        <td className="px-6 py-4 text-sm text-text">
                          {course.price && course.price !== '0' ? formatCurrency(parseFloat(course.price)) : 'Free'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button 
                              className="text-brand-cyan hover:text-primary-900 p-1 rounded-md hover:bg-brand-cyan/5 transition-colors"
                              onClick={() => handleCourseView(course)}
                              title="View course details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-emerald-400 hover:text-green-900 p-1 rounded-md hover:bg-green-50 transition-colors"
                              onClick={() => handleCourseUpdate(course)}
                              title="Update course settings"
                              disabled={updateCourseMutation.isPending}
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-brand-cyan hover:text-text p-1 rounded-md hover:bg-brand-cyan/5 transition-colors"
                              onClick={() => handleCourseDuplicate(course)}
                              title="Duplicate course to another client"
                              disabled={duplicateCourseMutation.isPending}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              className="text-danger-500 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                              onClick={() => handleCourseDelete(course)}
                              title="Delete course permanently"
                              disabled={deleteCourseMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {filteredCourses.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-text-mute" />
                  <h3 className="mt-2 text-sm font-medium text-text">No courses found</h3>
                  <p className="mt-1 text-sm text-text-mute">
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-mute w-4 h-4" />
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
                    className="px-3 py-2 border border-themed-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-themed">
                  <thead className="bg-line/[0.03]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-ink-1/60 divide-y divide-themed">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-line/[0.04]">
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
                              <div className="text-sm font-medium text-text">{student.name}</div>
                              <div className="text-sm text-text-mute">{student.email}</div>
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
                        <td className="px-6 py-4 text-sm text-text">
                          {student.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">
                          {formatDate(student.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-brand-cyan hover:text-primary-900 p-1 rounded-md hover:bg-brand-cyan/5 transition-colors"
                              onClick={() => handleStudentClick(student)}
                              title="View student details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-brand-gold hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
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
                  <Users className="mx-auto h-12 w-12 text-text-mute" />
                  <h3 className="mt-2 text-sm font-medium text-text">No students found</h3>
                  <p className="mt-1 text-sm text-text-mute">
                    Try adjusting your search or filters to find students.
                  </p>
                </div>
              )}
            </>
          ) : activeTab === 'course_managers' ? (
            <>
              {/* Course Managers Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">Course Managers</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-mute w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search course managers..."
                      value={courseManagerSearch}
                      onChange={(e) => setCourseManagerSearch(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  <select
                    value={courseManagerStatusFilter}
                    onChange={(e) => setCourseManagerStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-themed-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Course Managers Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-themed">
                  <thead className="bg-line/[0.03]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Course Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-ink-1/60 divide-y divide-themed">
                    {filteredCourseManagers.map((courseManager) => (
                      <tr key={courseManager.id} className="hover:bg-line/[0.04]">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {courseManager.profile_pic_url ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={courseManager.profile_pic_url}
                                  alt={courseManager.name}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center ${courseManager.profile_pic_url ? 'hidden' : ''}`}>
                                <span className="text-white font-medium text-sm">
                                  {courseManager.first_name.charAt(0)}{courseManager.last_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-text">{courseManager.name}</div>
                              <div className="text-sm text-text-mute">{courseManager.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              courseManager.is_active ? 'active' : 'inactive'
                            )}`}
                          >
                            {courseManager.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text">
                          {courseManager.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">
                          {formatDate(courseManager.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-brand-cyan hover:text-primary-900 p-1 rounded-md hover:bg-brand-cyan/5 transition-colors"
                              onClick={() => handleCourseManagerClick(courseManager)}
                              title="View course manager details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-brand-gold hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
                              onClick={() => handleChangeRole(courseManager)}
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

              {filteredCourseManagers.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-text-mute" />
                  <h3 className="mt-2 text-sm font-medium text-text">No course managers found</h3>
                  <p className="mt-1 text-sm text-text-mute">
                    Try adjusting your search or filters to find course managers.
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-mute w-4 h-4" />
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
                    className="px-3 py-2 border border-themed-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Admins Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-themed">
                  <thead className="bg-line/[0.03]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-ink-1/60 divide-y divide-themed">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-line/[0.04]">
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
                              <div className="text-sm font-medium text-text">{admin.name}</div>
                              <div className="text-sm text-text-mute">{admin.email}</div>
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
                        <td className="px-6 py-4 text-sm text-text">
                          {admin.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">
                          {formatDate(admin.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-brand-cyan hover:text-primary-900 p-1 rounded-md hover:bg-brand-cyan/5 transition-colors"
                              onClick={() => handleAdminClick(admin)}
                              title="View admin details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-brand-gold hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
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
                  <Shield className="mx-auto h-12 w-12 text-text-mute" />
                  <h3 className="mt-2 text-sm font-medium text-text">No admins found</h3>
                  <p className="mt-1 text-sm text-text-mute">
                    Try adjusting your search or filters to find admins.
                  </p>
                </div>
              )}
            </>
          ) : activeTab === 'superadmins' ? (
            <>
              {/* SuperAdmins Filters */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold">SuperAdmins</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-mute w-4 h-4" />
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
                    className="px-3 py-2 border border-themed-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* SuperAdmins Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-themed">
                  <thead className="bg-line/[0.03]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        SuperAdmin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Joined Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-mute uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-ink-1/60 divide-y divide-themed">
                    {filteredSuperAdmins.map((superadmin) => (
                      <tr key={superadmin.id} className="hover:bg-line/[0.04]">
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
                              <div className="text-sm font-medium text-text">{superadmin.name}</div>
                              <div className="text-sm text-text-mute">{superadmin.email}</div>
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
                        <td className="px-6 py-4 text-sm text-text">
                          {superadmin.phone_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">
                          {formatDate(superadmin.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-brand-cyan hover:text-primary-900 p-1 rounded-md hover:bg-brand-cyan/5 transition-colors"
                              onClick={() => handleSuperAdminClick(superadmin)}
                              title="View superadmin details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              className="text-brand-gold hover:text-orange-900 p-1 rounded-md hover:bg-orange-50 transition-colors"
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
                  <ShieldCheck className="mx-auto h-12 w-12 text-text-mute" />
                  <h3 className="mt-2 text-sm font-medium text-text">No superadmins found</h3>
                  <p className="mt-1 text-sm text-text-mute">
                    Try adjusting your search or filters to find superadmins.
                  </p>
                </div>
              )}
            </>
          ) : (
            // Files tab — S3 file browser for this client
            <ClientFilesBrowser clientId={Number(id)} />
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

      {/* Course Manager Details Modal */}
      {selectedCourseManager && (
        <CourseManagerDetailsModal
          isOpen={isCourseManagerModalOpen}
          onClose={closeCourseManagerModal}
          courseManager={selectedCourseManager}
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
      {selectedCourseForDetails && id && (
        <CourseDetailsModal
          isOpen={isCourseDetailsModalOpen}
          onClose={closeCourseDetailsModal}
          course={selectedCourseForDetails}
          clientId={parseInt(id)}
          courseManagers={client?.course_managers || []}
          onCourseManagerUpdate={() => {
            // Refetch client details to get updated course manager info
            queryClient.invalidateQueries({ queryKey: ['client-details', parseInt(id)] });
          }}
        />
      )}

      {/* Bulk Operations Modal (Courses) */}
      <BulkOperationsModal
        isOpen={isBulkOperationsModalOpen}
        onClose={() => setIsBulkOperationsModalOpen(false)}
        selectedCourses={selectedCourses.map(c => ({ id: c.id, title: c.title, published: c.published, is_free: c.is_free, price: c.price }))}
        onConfirm={handleBulkOperationConfirm}
        isLoading={bulkOperations.isExecuting}
      />

      {/* Bulk Operation Progress Modal (Courses) */}
      {isBulkProgressModalOpen && currentBulkOperation && (
        <BulkOperationProgressModal
          isOpen={isBulkProgressModalOpen}
          onClose={handleBulkOperationComplete}
          operation={currentBulkOperation || 'publish'}
          price={currentBulkPrice}
          totalCourses={selectedCourses.length}
          completedCourses={bulkOperations.progress.completed}
          results={bulkOperations.progress.results}
          isComplete={!bulkOperations.isExecuting}
          onRetry={currentBulkOperation ? () => handleBulkOperationConfirm(currentBulkOperation, currentBulkPrice) : undefined}
        />
      )}

      {/* Course Duplication Modal */}
      {selectedCourseForDuplication && (
        <CourseDuplicationModal
          isOpen={isDuplicateModalOpen}
          onClose={closeDuplicateModal}
          onConfirm={handleDuplicateConfirm}
          course={selectedCourseForDuplication}
          currentClientId={clientId}
          isLoading={duplicateCourseMutation.isPending}
        />
      )}

      {/* Course Deletion Modal */}
      {selectedCourseForDeletion && (
        <CourseDeletionModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          course={selectedCourseForDeletion}
          clientId={clientId}
          isLoading={deleteCourseMutation.isPending}
        />
      )}

      {/* Operation Progress Modal */}
      {currentOperationId && (
        <OperationProgressModal
          isOpen={isProgressModalOpen}
          onClose={closeProgressModal}
          operationId={currentOperationId}
          operationType={currentOperationType}
          onComplete={handleOperationComplete}
        />
      )}

      {/* Bulk Duplicate Modal */}
      <BulkDuplicateCoursesModal
        isOpen={isBulkDuplicateModalOpen}
        onClose={() => setIsBulkDuplicateModalOpen(false)}
        onConfirm={handleBulkDuplicateConfirm}
        selectedCourses={selectedCourses.map(c => ({ id: c.id, title: c.title }))}
        currentClientId={clientId}
        isLoading={bulkDuplicate.isExecuting}
      />

      {/* Bulk Duplicate Operation Progress Modal */}
      {isBulkDuplicateProgressModalOpen && (
        <BulkOperationProgressModal
          isOpen={isBulkDuplicateProgressModalOpen}
          onClose={handleBulkDuplicateProgressComplete}
          operation="make_free"
          price={undefined}
          totalCourses={selectedCourses.length}
          completedCourses={bulkDuplicate.progress.completed}
          results={bulkDuplicate.progress.results.map(r => ({
            courseId: r.courseId,
            courseTitle: r.courseTitle,
            success: r.success,
            error: r.error
          }))}
          isComplete={!bulkDuplicate.isExecuting}
          onRetry={
            bulkDuplicateTargetClientId
              ? () => bulkDuplicate.executeBulkDuplicate(
                  selectedCourses.map(c => ({ id: c.id, title: c.title })),
                  clientId,
                  bulkDuplicateTargetClientId
              )
              : undefined
          }
        />
      )}

    </div>
  );
};

export default ClientDetails;