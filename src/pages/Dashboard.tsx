import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  Clock,
  Award,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import StatsCard from '../components/charts/StatsCard';
import { useDashboardStats, useCourses, useClients } from '../hooks/useApi';
import { DEBUG_MODE } from '../utils/constants';

const Dashboard: React.FC = () => {
  console.log('📊 Dashboard component rendered');
  const navigate = useNavigate();
  
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: coursesData, isLoading: coursesLoading, error: coursesError } = useCourses();
  const { data: clientsData, isLoading: clientsLoading, error: clientsError } = useClients();

  console.log('📊 Dashboard API states:', {
    statsLoading,
    statsError: !!statsError,
    coursesLoading,
    coursesError: !!coursesError,
    clientsLoading,
    clientsError: !!clientsError,
    hasStatsData: !!dashboardStats,
    hasCoursesData: !!coursesData,
    hasClientsData: !!clientsData,
  });

  // Fallback stats data
  const fallbackStats = {
    total_students: 642,
    total_clients: 8,
    total_courses: 25,
    total_active_clients: 7,
  };

  // Show loading ONLY for the first 3 seconds, then show content regardless
  const [showContent, setShowContent] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 3000);

    if (dashboardStats !== undefined || coursesData !== undefined || clientsData !== undefined || statsError || coursesError || clientsError) {
      setShowContent(true);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [dashboardStats, coursesData, clientsData, statsError, coursesError, clientsError]);

  if (!showContent && (statsLoading || coursesLoading || clientsLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-8 w-8"></div>
        <span className="ml-3 text-gray-600">Loading dashboard data...</span>
      </div>
    );
  }

  const stats = dashboardStats || fallbackStats;
  const courses = coursesData?.courses?.slice(0, 4) || [];
  const clients = clientsData?.slice(0, 4) || [];
  const showApiWarning = !dashboardStats || !coursesData || !clientsData;

  return (
    <div className="space-y-8">
      {/* API Warning */}
      {showApiWarning && (
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
                <strong>Demo Mode:</strong> Some API calls may be using fallback data for preview purposes.
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
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome to the AI-Linc SuperAdmin Dashboard</p>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatsCard
          title="Total Students"
          value={stats.total_students}
          icon={GraduationCap}
          color="primary"
          format="number"
        />
        <StatsCard
          title="Total Clients"
          value={stats.total_clients}
          icon={Building2}
          color="secondary"
        />
        <StatsCard
          title="Total Courses"
          value={stats.total_courses}
          icon={BookOpen}
          color="accent"
        />
        <StatsCard
          title="Active Clients"
          value={stats.total_active_clients}
          icon={UserCheck}
          color="primary"
        />
      </motion.div>

      {/* Courses Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Courses</h2>
          </div>
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            View All Courses
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{course.title}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  course.difficulty_level === 'Easy' ? 'bg-green-100 text-green-800' :
                  course.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {course.difficulty_level}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{course.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.duration_in_hours}h
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {course.enrolled_students_count} students
                </div>
                <div className="flex items-center">
                  <Award className="h-4 w-4 mr-1" />
                  {course.modules_count} modules
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No courses available</p>
          </div>
        )}
      </motion.div>

      {/* Clients Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Recent Clients</h2>
          </div>
          <button
            onClick={() => navigate('/clients')}
            className="flex items-center text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            View All Clients
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                  <Building2 className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.slug}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1" />
                  {client.total_students} students
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  {client.total_courses} courses
                </div>
              </div>
            </div>
          ))}
        </div>

        {clients.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No clients available</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;