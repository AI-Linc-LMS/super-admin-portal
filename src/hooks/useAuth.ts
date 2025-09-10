import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const authState = useAuthStore();
  return authState;
};

export default useAuth;