import { useState, useCallback } from 'react';
import { useDuplicateCourse } from './useClients';
import toast from 'react-hot-toast';

interface BulkDuplicateResult {
  courseId: number;
  courseTitle: string;
  success: boolean;
  newCourseId?: number;
  error?: string;
}

interface BulkDuplicateProgress {
  total: number;
  completed: number;
  results: BulkDuplicateResult[];
}

export const useBulkDuplicateCoursesProgress = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<BulkDuplicateProgress>({
    total: 0,
    completed: 0,
    results: []
  });

  const duplicateCourseMutation = useDuplicateCourse();

  const executeBulkDuplicate = useCallback(async (
    courses: Array<{ id: number; title: string }>,
    fromClientId: number,
    toClientId: number
  ): Promise<BulkDuplicateResult[]> => {
    setIsExecuting(true);
    setProgress({
      total: courses.length,
      completed: 0,
      results: []
    });
    const results: BulkDuplicateResult[] = [];
    try {
      for (let i = 0; i < courses.length; i++) {
        const course = courses[i];
        try {
          const response = await duplicateCourseMutation.mutateAsync({
            course_id: course.id,
            from_client_id: fromClientId,
            to_client_id: toClientId
          });
          // Try to parse new course id from mock/real response
          const newCourseId = response?.operation_id?.match(/\d+/)?.[0]
            ? parseInt(response.operation_id.match(/\d+/)[0])
            : undefined;
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            success: true,
            newCourseId
          });
        } catch (error: any) {
          results.push({
            courseId: course.id,
            courseTitle: course.title,
            success: false,
            error: error?.message || 'Unknown error occurred.'
          });
        }
        setProgress(prev => ({
          ...prev,
          completed: i + 1,
          results: [...results]
        }));
        if (i < courses.length - 1) {
          await new Promise(res => setTimeout(res, 100));
        }
      }
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      if (errorCount === 0) {
        toast.success(`Duplicated ${successCount} course${successCount !== 1 ? 's' : ''} successfully!`);
      } else if (successCount === 0) {
        toast.error(`Failed to duplicate all selected courses.`);
      } else {
        toast.success(`Duplicated ${successCount}, ${errorCount} failed`);
      }
    } finally {
      setIsExecuting(false);
    }
    return results;
  }, [duplicateCourseMutation]);

  const resetState = useCallback(() => {
    setIsExecuting(false);
    setProgress({ total: 0, completed: 0, results: [] });
  }, []);

  return {
    isExecuting,
    progress,
    executeBulkDuplicate,
    resetState
  };
};
