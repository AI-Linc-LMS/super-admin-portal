import { useState, useCallback } from 'react';
import { useUpdateCourse } from './useClients';
import toast from 'react-hot-toast';

interface OperationResult {
  courseId: number;
  courseTitle: string;
  success: boolean;
  error?: string;
}

interface BulkOperationState {
  isExecuting: boolean;
  progress: {
    total: number;
    completed: number;
    results: OperationResult[];
  };
}

export const useBulkCourseOperations = () => {
  const [state, setState] = useState<BulkOperationState>({
    isExecuting: false,
    progress: {
      total: 0,
      completed: 0,
      results: []
    }
  });

  const updateCourseMutation = useUpdateCourse();

  const executeBulkOperation = useCallback(async (
    courses: Array<{ id: number; title: string }>,
    operation: 'publish' | 'unpublish' | 'make_free' | 'make_paid',
    price?: number,
    clientId?: number
  ): Promise<OperationResult[]> => {
    setState({
      isExecuting: true,
      progress: {
        total: courses.length,
        completed: 0,
        results: []
      }
    });

    const results: OperationResult[] = [];

    try {
      // Process courses sequentially to avoid overwhelming the API
      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        
        try {
          // Prepare update data based on operation
          const updateData: { price?: number; is_free?: boolean; published?: boolean } = {};
          
          switch (operation) {
            case 'publish':
              updateData.published = true;
              break;
            case 'unpublish':
              updateData.published = false;
              break;
            case 'make_free':
              updateData.is_free = true;
              updateData.price = 0;
              break;
            case 'make_paid':
              updateData.is_free = false;
              if (price !== undefined) {
                updateData.price = price;
              }
              break;
          }

          // Call the update API
          await updateCourseMutation.mutateAsync({
            clientId: clientId ?? 1,
            courseId: course.id,
            courseData: updateData
          });

          // Record success
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            success: true
          });

        } catch (error) {
          // Record failure
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
        }

        // Update progress
        setState(prev => ({
          ...prev,
          progress: {
            ...prev.progress,
            completed: i + 1,
            results: [...results]
          }
        }));

        // Small delay to prevent overwhelming the API
        if (i < courses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Show completion toast
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (errorCount === 0) {
        toast.success(`Successfully updated ${successCount} course${successCount !== 1 ? 's' : ''}`);
      } else if (successCount === 0) {
        toast.error(`Failed to update all ${errorCount} course${errorCount !== 1 ? 's' : ''}`);
      } else {
        toast.success(`Updated ${successCount} course${successCount !== 1 ? 's' : ''}, ${errorCount} failed`);
      }

    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error('Bulk operation failed');
    } finally {
      setState(prev => ({
        ...prev,
        isExecuting: false
      }));
    }

    return results;
  }, [updateCourseMutation]);

  const resetState = useCallback(() => {
    setState({
      isExecuting: false,
      progress: {
        total: 0,
        completed: 0,
        results: []
      }
    });
  }, []);

  return {
    ...state,
    executeBulkOperation,
    resetState
  };
};
