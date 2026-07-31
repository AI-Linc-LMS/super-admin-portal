import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { LedgerParams, PaymentsSummaryParams } from '../types/payments';

export const usePaymentsSummary = (params?: PaymentsSummaryParams) =>
  useQuery({
    queryKey: ['payments-summary', params],
    queryFn: () => apiService.getPaymentsSummary(params),
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const usePaymentsTenants = () =>
  useQuery({
    queryKey: ['payments-tenants'],
    queryFn: () => apiService.getPaymentsTenants(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const usePaymentsLedger = (params?: LedgerParams) =>
  useQuery({
    queryKey: ['payments-ledger', params],
    queryFn: () => apiService.getPaymentsLedger(params),
    retry: false,
    // The ledger is what someone opens mid-incident ("did this payment land?"), so it is kept
    // fresher than the aggregates.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
