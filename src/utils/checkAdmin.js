// utils/checkAdmin.js
import { adminIds } from '../admins.js';

export function isAdmin(userId) {
  return adminIds.includes(userId);
}
