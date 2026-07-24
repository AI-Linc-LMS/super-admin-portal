export interface Paginated<T> {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: T[];
}

export interface BankFacets {
  total: number;
  global_verified: number;
  by_source: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_verification: Record<string, number>;
}

export interface QuestionBankStats {
  mcq: BankFacets;
  coding: BankFacets;
}

export interface MCQBankItem {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_style: 'single' | 'multiple';
  correct_option: string;
  correct_options: string[];
  difficulty_level: string;
  explanation: string | null;
  topic: string | null;
  skills: string | null;
  tags: string | null;
  source: string;
  scope: string;
  verification_status: string;
  external_ref: string | null;
  client: number;
  client_name: string;
  created_at: string | null;
}

export interface CodingBankItem {
  id: number;
  title: string;
  difficulty_level: string;
  topic: string | null;
  skills: string | null;
  tags: string | null;
  source: string;
  scope: string;
  verification_status: string;
  external_ref: string | null;
  client: number;
  client_name: string;
  languages: string[];
  test_case_count: number;
  created_at: string | null;
}

export interface CodingBankDetail extends CodingBankItem {
  problem_statement: string;
  input_format: string | null;
  output_format: string | null;
  sample_input: string | null;
  sample_output: string | null;
  constraints: string | null;
  test_cases: { input: string; expected_output: string }[];
  template_code: Record<string, string>;
  solution: Record<string, string> | unknown;
  time_limit: number;
  memory_limit: number;
}

export interface QuestionBankListParams {
  page?: number;
  page_size?: number;
  search?: string;
  source?: string;
  scope?: string;
  difficulty?: string;
  verification_status?: string;
  topic?: string;
  client_id?: number;
}
