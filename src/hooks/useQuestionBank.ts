import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { QuestionBankListParams } from '../types/questionBank';

export const useQuestionBankStats = () =>
  useQuery({
    queryKey: ['qbank-stats'],
    queryFn: () => apiService.getQuestionBankStats(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useQuestionBankMcqs = (params: QuestionBankListParams, enabled = true) =>
  useQuery({
    queryKey: ['qbank-mcqs', params],
    queryFn: () => apiService.getQuestionBankMcqs(params),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useQuestionBankCoding = (params: QuestionBankListParams, enabled = true) =>
  useQuery({
    queryKey: ['qbank-coding', params],
    queryFn: () => apiService.getQuestionBankCoding(params),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useCodingProblemDetail = (id: number | null) =>
  useQuery({
    queryKey: ['qbank-coding-detail', id],
    queryFn: () => apiService.getQuestionBankCodingDetail(id as number),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
