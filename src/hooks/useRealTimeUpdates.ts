import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RealTimeSubscription {
  unsubscribe: () => void;
}

/**
 * Hook for real-time system alerts updates
 */
export const useRealTimeSystemAlerts = (onUpdate: (payload: any) => void) => {
  const { toast } = useToast();

  useEffect(() => {
    const subscription = supabase
      .channel('system_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_alerts'
        },
        (payload) => {
          console.log('System alert change:', payload);
          
          // Show toast for new alerts
          if (payload.eventType === 'INSERT' && payload.new) {
            const alert = payload.new;
            if (alert.is_active && alert.target_audience !== 'clients') {
              toast({
                title: `New ${alert.type} Alert`,
                description: alert.title,
                variant: alert.priority === 'critical' || alert.priority === 'high' ? 'destructive' : 'default',
              });
            }
          }
          
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate, toast]);
};

/**
 * Hook for real-time security alerts updates
 */
export const useRealTimeSecurityAlerts = (onUpdate: (payload: any) => void) => {
  const { toast } = useToast();

  useEffect(() => {
    const subscription = supabase
      .channel('security_alerts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_alerts'
        },
        (payload) => {
          console.log('Security alert change:', payload);
          
          // Show toast for new high-severity security alerts
          if (payload.eventType === 'INSERT' && payload.new) {
            const alert = payload.new;
            if (alert.severity === 'high' || alert.severity === 'critical') {
              toast({
                title: `Security Alert: ${alert.title}`,
                description: alert.description,
                variant: 'destructive',
              });
            }
          }
          
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate, toast]);
};

/**
 * Hook for real-time broadcast updates
 */
export const useRealTimeBroadcasts = (onUpdate: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('broadcasts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcasts'
        },
        (payload) => {
          console.log('Broadcast change:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate]);
};

/**
 * Hook for real-time project updates
 */
export const useRealTimeProjects = (onUpdate: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('projects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Project change:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate]);
};

/**
 * Hook for real-time user updates
 */
export const useRealTimeUsers = (onUpdate: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('User change:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate]);
};

/**
 * Hook for real-time deliverable updates
 */
export const useRealTimeDeliverables = (onUpdate: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('deliverables_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliverables'
        },
        (payload) => {
          console.log('Deliverable change:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate]);
};

/**
 * Hook for real-time system settings updates
 */
export const useRealTimeSystemSettings = (onUpdate: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('system_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings'
        },
        (payload) => {
          console.log('System settings change:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate]);
};

/**
 * Hook for real-time project templates updates
 */
export const useRealTimeProjectTemplates = (onUpdate: (payload: any) => void) => {
  useEffect(() => {
    const subscription = supabase
      .channel('project_templates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_templates'
        },
        (payload) => {
          console.log('Project template change:', payload);
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [onUpdate]);
};

/**
 * Comprehensive real-time updates hook for admin dashboard
 */
export const useAdminRealTimeUpdates = (callbacks: {
  onSystemAlert?: (payload: any) => void;
  onSecurityAlert?: (payload: any) => void;
  onBroadcast?: (payload: any) => void;
  onProject?: (payload: any) => void;
  onUser?: (payload: any) => void;
  onDeliverable?: (payload: any) => void;
  onSystemSettings?: (payload: any) => void;
  onProjectTemplate?: (payload: any) => void;
}) => {
  // System alerts
  useRealTimeSystemAlerts(useCallback((payload) => {
    callbacks.onSystemAlert?.(payload);
  }, [callbacks.onSystemAlert]));

  // Security alerts
  useRealTimeSecurityAlerts(useCallback((payload) => {
    callbacks.onSecurityAlert?.(payload);
  }, [callbacks.onSecurityAlert]));

  // Broadcasts
  useRealTimeBroadcasts(useCallback((payload) => {
    callbacks.onBroadcast?.(payload);
  }, [callbacks.onBroadcast]));

  // Projects
  useRealTimeProjects(useCallback((payload) => {
    callbacks.onProject?.(payload);
  }, [callbacks.onProject]));

  // Users
  useRealTimeUsers(useCallback((payload) => {
    callbacks.onUser?.(payload);
  }, [callbacks.onUser]));

  // Deliverables
  useRealTimeDeliverables(useCallback((payload) => {
    callbacks.onDeliverable?.(payload);
  }, [callbacks.onDeliverable]));

  // System settings
  useRealTimeSystemSettings(useCallback((payload) => {
    callbacks.onSystemSettings?.(payload);
  }, [callbacks.onSystemSettings]));

  // Project templates
  useRealTimeProjectTemplates(useCallback((payload) => {
    callbacks.onProjectTemplate?.(payload);
  }, [callbacks.onProjectTemplate]));
};
