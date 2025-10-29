import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Eye,
  Edit,
  BookOpen,
  Users,
  Star,
  Clock,
  IndianRupee,
  Download,
  Grid,
  List,
  EyeOff,
  AlertTriangle,
  CheckSquare,
  Square,
  Settings,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CourseDetailsModal from '../components/ui/CourseDetailsModal';
import CourseUpdateModal from '../components/ui/CourseUpdateModal';
import BulkOperationsModal from '../components/ui/BulkOperationsModal';
import BulkOperationProgressModal from '../components/ui/BulkOperationProgressModal';
import { Course } from '../types/course';
import { getDifficultyColor, getStatusColor } from '../utils/helpers';
import { useCourses } from '../hooks/useApi';
import { useUpdateCourse } from '../hooks/useClients';
import { useBulkCourseOperations } from '../hooks/useBulkCourseOperations';
import toast from 'react-hot-toast';

const Courses: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Bulk operations state
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [isBulkOperationsModalOpen, setIsBulkOperationsModalOpen] = useState(false);
  const [isBulkProgressModalOpen, setIsBulkProgressModalOpen] = useState(false);
  const [currentBulkOperation, setCurrentBulkOperation] = useState<'publish' | 'unpublish' | 'make_free' | 'make_paid' | null>(null);
  const [currentBulkPrice, setCurrentBulkPrice] = useState<number | undefined>(undefined);
  
  // Modal state for course details and updates
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<Course | null>(null);
  const [isCourseUpdateModalOpen, setIsCourseUpdateModalOpen] = useState(false);
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] = useState(false);

  const { data: coursesResponse, isLoading, error } = useCourses();
  const updateCourseMutation = useUpdateCourse();
  const bulkOperations = useBulkCourseOperations();

  // Course handlers
  const handleCourseView = (course: Course) => {
    setSelectedCourseForDetails(course);
    setIsCourseDetailsModalOpen(true);
  };

  const handleCourseUpdate = (course: Course) => {
    setSelectedCourse(course);
    setIsCourseUpdateModalOpen(true);
  };

  const handleCourseUpdateConfirm = async (courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean }) => {
    try {
      // Note: For global courses, we'll use a mock client ID since this is a global course management
      // In a real implementation, you might need a different API endpoint for global course updates
      await updateCourseMutation.mutateAsync({
        clientId: 1, // Mock client ID for global courses
        courseId,
        courseData
      });
      toast.success(t('messages.itemUpdatedSuccessfully'));
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error(t('errors.somethingWentWrong'));
      throw error;
    }
  };

  const closeCourseDetailsModal = () => {
    setIsCourseDetailsModalOpen(false);
    setSelectedCourseForDetails(null);
  };

  const closeCourseUpdateModal = () => {
    setIsCourseUpdateModalOpen(false);
    setSelectedCourse(null);
  };

  // Bulk operation handlers
  const handleCourseSelection = (course: Course, isSelected: boolean) => {
    if (isSelected) {
      setSelectedCourses(prev => [...prev, course]);
    } else {
      setSelectedCourses(prev => prev.filter(c => c.id !== course.id));
    }
  };

  const handleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses([...filteredCourses]);
    }
  };

  const handleBulkOperation = () => {
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
      await bulkOperations.executeBulkOperation(selectedCourses, operation, price);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };

  const handleBulkOperationComplete = () => {
    setIsBulkProgressModalOpen(false);
    setSelectedCourses([]);
    setCurrentBulkOperation(null);
    setCurrentBulkPrice(undefined);
    bulkOperations.resetState();
  };

  const isCourseSelected = (course: Course) => {
    return selectedCourses.some(c => c.id === course.id);
  };

  // Mock data for demonstration - updated to match API structure
  const mockCourses: Course[] = [
    {
      id: 1,
      title: 'Web Project Development',
      subtitle: 'Learn modern web development',
      slug: 'web-project-development',
      description: 'Comprehensive introduction to web development concepts and applications.',
      difficulty_level: 'Easy',
      duration_in_hours: 40,
      price: '299.00',
      is_free: false,
      certificate_available: true,
      thumbnail: null,
      published: true,
      enrolled_students_count: 2450,
      instructors: [{ id: 1, name: 'Dr. Sarah Johnson', bio: 'Web development expert' }],
      modules_count: 8,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-05-20T14:45:00Z',
    },
    {
      id: 2,
      title: 'Backend development on MERN',
      subtitle: 'Master the MERN stack',
      slug: 'backend-development-mern',
      description: 'Deep dive into MERN stack backend development.',
      difficulty_level: 'Hard',
      duration_in_hours: 80,
      price: '599.00',
      is_free: false,
      certificate_available: true,
      thumbnail: null,
      published: true,
      enrolled_students_count: 1890,
      instructors: [{ id: 2, name: 'Prof. Michael Chen', bio: 'Backend specialist' }],
      modules_count: 12,
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-05-15T00:00:00Z',
    },
    {
      id: 3,
      title: 'Data Science Bootcamp',
      subtitle: 'Complete data science course',
      slug: 'data-science-bootcamp',
      description: 'Complete data science course from basics to advanced analytics.',
      difficulty_level: 'Medium',
      duration_in_hours: 60,
      price: '0.00',
      is_free: true,
      certificate_available: false,
      thumbnail: null,
      published: false,
      enrolled_students_count: 0,
      instructors: [{ id: 3, name: 'Dr. Emily Davis', bio: 'Data science expert' }],
      modules_count: 10,
      created_at: '2024-03-10T00:00:00Z',
      updated_at: '2024-05-01T00:00:00Z',
    },
  ];

  const coursesData = coursesResponse?.courses || mockCourses;

  const filteredCourses = coursesData.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || course.difficulty_level === difficultyFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'published' && course.published) ||
                         (statusFilter === 'unpublished' && !course.published);
    const matchesPricing = pricingFilter === 'all' ||
                          (pricingFilter === 'free' && course.is_free) ||
                          (pricingFilter === 'paid' && !course.is_free);
    return matchesSearch && matchesDifficulty && matchesStatus && matchesPricing;
  });

  const exportCourses = () => {
    const csvData = filteredCourses.map(course => ({
      Title: course.title,
      Subtitle: course.subtitle || '',
      Difficulty: course.difficulty_level,
      Status: course.published ? 'Published' : 'Unpublished',
      Type: course.is_free ? 'Free' : 'Paid',
      Price: course.is_free ? 'Free' : `₹${course.price}`,
      Enrollments: course.enrolled_students_count,
      Duration: `${course.duration_in_hours}h`,
      Instructor: course.instructors[0]?.name || 'Unknown',
      Modules: course.modules_count,
    }));
    console.log('Exporting courses:', csvData);
    toast.success(t('messages.dataLoadedSuccessfully'));
  };

  // Function to get localized difficulty level
  const getDifficultyLevel = (level: string) => {
    switch (level.toLowerCase()) {
      case 'easy':
        return t('courses.easy');
      case 'medium':
        return t('courses.medium');
      case 'hard':
        return t('courses.hard');
      default:
        return level;
    }
  };

  // Function to get localized status
  const getStatusText = (published: boolean) => {
    return published ? t('courses.published', { defaultValue: 'Published' }) : t('courses.unpublished', { defaultValue: 'Unpublished' });
  };

  const CourseCard: React.FC<{ course: Course; index: number }> = ({ course, index }) => {
    const isSelected = isCourseSelected(course);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card 
          glassmorphism 
          hover 
          className={`h-full relative ${!course.published ? 'bg-gray-50/80 border-2 border-dashed border-gray-300' : ''} ${
            isSelected ? 'ring-2 ring-primary-500 bg-primary-50/50' : ''
          }`}
        >
        {/* Selection checkbox */}
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCourseSelection(course, !isSelected);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-primary-600 border-primary-600 text-white' 
                : 'bg-white border-gray-300 hover:border-primary-500'
            }`}
          >
            {isSelected && <CheckSquare className="w-3 h-3" />}
          </button>
        </div>

        {/* Unpublished overlay banner */}
        {!course.published && (
          <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg rounded-tr-lg flex items-center gap-1 z-10">
            <EyeOff className="w-3 h-3" />
            {t('courses.draft', { defaultValue: 'DRAFT' })}
          </div>
        )}
        
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {/* Show unpublished warning instead of featured for unpublished courses */}
            {!course.published ? (
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {t('courses.unpublished', { defaultValue: 'Unpublished' })}
                </span>
                <span className="text-xs text-gray-500">{t('courses.notVisibleToStudents', { defaultValue: 'Not visible to students' })}</span>
              </div>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700 mb-2">
                ⭐ {t('courses.featured', { defaultValue: 'Featured' })}
              </span>
            )}
            <h3 className={`font-semibold mb-2 line-clamp-2 ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
              {course.title}
            </h3>
            <p className={`text-sm mb-3 line-clamp-2 ${!course.published ? 'text-gray-500' : 'text-gray-600'}`}>
              {course.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty_level)}`}>
            {getDifficultyLevel(course.difficulty_level)}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.published ? 'published' : 'unpublished')}`}>
            {course.published ? (
              <>
                <Eye className="w-3 h-3 mr-1" />
                {t('courses.published', { defaultValue: 'Published' })}
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                {t('courses.unpublished', { defaultValue: 'Unpublished' })}
              </>
            )}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${course.is_free ? 'bg-secondary-100 text-secondary-700' : 'bg-accent-100 text-accent-700'}`}>
            {course.is_free ? t('courses.free', { defaultValue: 'Free' }) : t('courses.paid', { defaultValue: 'Paid' })}
          </span>
        </div>

        <div className={`grid grid-cols-2 gap-4 mb-4 text-sm ${!course.published ? 'text-gray-500' : 'text-gray-600'}`}>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {course.enrolled_students_count.toLocaleString()}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {course.duration_in_hours}{t('dashboard.hours')}
          </div>
          <div className="flex items-center">
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            {course.modules_count}
          </div>
          <div className="flex items-center">
            <IndianRupee className="w-4 h-4 mr-1" />
            {course.price ? `₹${course.price}` : t('courses.free', { defaultValue: 'Free' })}
          </div>
        </div>

        <div className={`border-t border-gray-200 pt-3 ${!course.published ? 'border-gray-300' : ''}`}>
          <div className="flex items-center justify-between text-sm">
            <span className={!course.published ? 'text-gray-400' : 'text-gray-500'}>{t('courses.instructor')}</span>
            <span className={`font-medium ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
              {course.instructors[0]?.name || t('common.noDataAvailable')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className={!course.published ? 'text-gray-400' : 'text-gray-500'}>{t('courses.category')}</span>
            <span className={!course.published ? 'text-gray-600' : 'text-gray-700'}>
              {course.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCourseForDetails(course); setIsCourseDetailsModalOpen(true); }}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedCourse(course); setIsCourseUpdateModalOpen(true); }}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
    );
  };

  // Loading state
  if (isLoading && !coursesResponse) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
        <span className="ml-3 text-gray-600">{t('courses.loadingCourses')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* API Warning */}
      {error && (
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
                <strong>{t('dashboard.demoMode')}:</strong> {t('dashboard.apiWarning')}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('courses.title')}</h1>
          <p className="text-gray-600">{t('courses.subtitle', { defaultValue: 'Manage global AI-Linc course catalog' })}</p>
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
            onClick={exportCourses}
          >
            {t('common.export', { defaultValue: 'Export' })}
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            {t('courses.addCourse')}
          </Button>
        </div>
      </motion.div>

      {/* Bulk Operations Bar */}
      {selectedCourses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-50 border border-primary-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-900">
                  {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-sm text-primary-600 hover:text-primary-800 underline"
              >
                {selectedCourses.length === filteredCourses.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCourses([])}
              >
                Clear Selection
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Settings className="w-4 h-4" />}
                onClick={handleBulkOperation}
              >
                Bulk Operations
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card glassmorphism className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('courses.searchCourses')}
                leftIcon={<Search className="w-4 h-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t('filters.all')} {t('courses.difficultyLevel')}</option>
                <option value="Easy">{t('courses.easy')}</option>
                <option value="Medium">{t('courses.medium')}</option>
                <option value="Hard">{t('courses.hard')}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t('filters.all')} {t('clients.status')}</option>
                <option value="published">{t('courses.published', { defaultValue: 'Published' })}</option>
                <option value="unpublished">{t('courses.unpublished', { defaultValue: 'Unpublished' })}</option>
              </select>
              <select
                value={pricingFilter}
                onChange={(e) => setPricingFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">{t('filters.all')} {t('courses.pricing', { defaultValue: 'Pricing' })}</option>
                <option value="free">{t('courses.free', { defaultValue: 'Free' })}</option>
                <option value="paid">{t('courses.paid', { defaultValue: 'Paid' })}</option>
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Courses Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        ) : (
          <Card glassmorphism padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 hover:text-gray-700"
                      >
                        {selectedCourses.length === filteredCourses.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        Select All
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCourses.map((course) => {
                    const isSelected = isCourseSelected(course);
                    return (
                      <tr 
                        key={course.id} 
                        className={`hover:bg-gray-50 ${!course.published ? 'bg-gray-50/50 opacity-75' : ''} ${
                          isSelected ? 'bg-primary-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleCourseSelection(course, !isSelected)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-primary-600 border-primary-600 text-white' 
                                : 'bg-white border-gray-300 hover:border-primary-500'
                            }`}
                          >
                            {isSelected && <CheckSquare className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                        <div className="relative">
                          {!course.published && (
                            <div className="absolute -left-2 top-0 bottom-0 w-1 bg-red-400 rounded-full"></div>
                          )}
                          <p className={`font-medium ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
                            {course.title}
                            {!course.published && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                <EyeOff className="w-3 h-3 mr-1" />
                                DRAFT
                              </span>
                            )}
                          </p>
                          <p className={`text-sm ${!course.published ? 'text-gray-400' : 'text-gray-500'}`}>
                            {course.instructors[0]?.name || 'Unknown'}
                          </p>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
                        {course.subtitle}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty_level)}`}>
                          {course.difficulty_level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.published ? 'published' : 'unpublished')}`}>
                          {course.published ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Unpublished
                            </>
                          )}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
                        {course.enrolled_students_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Star className={`w-4 h-4 mr-1 ${!course.published ? 'text-gray-400' : 'text-yellow-400'}`} />
                          <span className={`text-sm ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
                            {course.modules_count}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${!course.published ? 'text-gray-600' : 'text-gray-900'}`}>
                        {course.price ? `₹${course.price}` : 'Free'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedCourseForDetails(course); setIsCourseDetailsModalOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedCourse(course); setIsCourseUpdateModalOpen(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('courses.noCoursesAvailable')}</h3>
            <p className="text-gray-500">{t('filters.tryAdjusting', { defaultValue: 'Try adjusting your search or filter criteria' })}</p>
          </div>
        )}
      </motion.div>

      {/* Course Details Modal */}
      {selectedCourseForDetails && (
        <CourseDetailsModal
          isOpen={isCourseDetailsModalOpen}
          onClose={closeCourseDetailsModal}
          course={selectedCourseForDetails}
        />
      )}

      {/* Course Update Modal */}
      {selectedCourse && (
        <CourseUpdateModal
          isOpen={isCourseUpdateModalOpen}
          onClose={closeCourseUpdateModal}
          course={selectedCourse}
          onConfirm={handleCourseUpdateConfirm}
          isLoading={updateCourseMutation.isPending}
        />
      )}

      {/* Bulk Operations Modal */}
      <BulkOperationsModal
        isOpen={isBulkOperationsModalOpen}
        onClose={() => setIsBulkOperationsModalOpen(false)}
        selectedCourses={selectedCourses}
        onConfirm={handleBulkOperationConfirm}
        isLoading={bulkOperations.isExecuting}
      />

      {/* Bulk Operation Progress Modal */}
      <BulkOperationProgressModal
        isOpen={isBulkProgressModalOpen}
        onClose={handleBulkOperationComplete}
        operation={currentBulkOperation!}
        price={currentBulkPrice}
        totalCourses={selectedCourses.length}
        completedCourses={bulkOperations.progress.completed}
        results={bulkOperations.progress.results}
        isComplete={!bulkOperations.isExecuting}
        onRetry={() => {
          if (currentBulkOperation) {
            handleBulkOperationConfirm(currentBulkOperation, currentBulkPrice);
          }
        }}
      />
    </div>
  );
};

export default Courses;