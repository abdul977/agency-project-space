import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SecurityManager from '@/lib/security';

export const useSecurity = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await SecurityManager.isAdmin(user.id);
        setIsAdmin(adminStatus);
      }
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [user]);

  const canAccessProject = async (projectId: string): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;
    return await SecurityManager.canAccessProject(user.id, projectId);
  };

  const canAccessFolder = async (folderId: string): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;
    return await SecurityManager.canAccessFolder(user.id, folderId);
  };

  const sanitizeInput = (input: string): string => {
    return SecurityManager.sanitizeInput(input);
  };

  const validateFileUpload = (file: File, allowedTypes: string[], maxSizeMB: number) => {
    return SecurityManager.validateFileUpload(file, allowedTypes, maxSizeMB);
  };

  const checkRateLimit = (action: string, maxAttempts?: number, windowMs?: number): boolean => {
    if (!user) return false;
    return SecurityManager.checkRateLimit(user.id, action, maxAttempts, windowMs);
  };

  const logSecurityEvent = async (event: string, details?: any): Promise<void> => {
    if (user) {
      await SecurityManager.logSecurityEvent(user.id, event, details);
    }
  };

  return {
    isAdmin,
    isLoading,
    canAccessProject,
    canAccessFolder,
    sanitizeInput,
    validateFileUpload,
    checkRateLimit,
    logSecurityEvent
  };
};
