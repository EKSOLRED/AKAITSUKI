import { authRepository } from '../repositories/auth.repository.js';

export const authApi = {
  getSession: () => authRepository.getSession(),
  setSession: (userId) => authRepository.setSession(userId),
  clearSession: () => authRepository.clearSession(),
  listUsers: () => authRepository.listUsers(),
  getUserById: (userId) => authRepository.getUserById(userId),
  getUserByEmail: (emailNormalized) => authRepository.getUserByEmail(emailNormalized),
  createUser: (user) => authRepository.createUser(user),
  updateUserRole: (userId, role) => authRepository.updateUserRole(userId, role),
};
