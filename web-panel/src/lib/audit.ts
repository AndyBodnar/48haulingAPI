import { supabase } from './supabase'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'download'
  | 'login'
  | 'logout'
  | 'assign'
  | 'unassign'
  | 'approve'
  | 'reject'
  | 'send'
  | 'filter'
  | 'search'
  | 'export'

export type AuditResourceType =
  | 'load'
  | 'driver'
  | 'dvir'
  | 'message'
  | 'document'
  | 'user'
  | 'bol'
  | 'attachment'
  | 'system'

export interface AuditLogParams {
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string | number
  description?: string
  metadata?: Record<string, any>
  status?: 'success' | 'failure' | 'error'
  errorMessage?: string
}

/**
 * Log an audit event
 * @param params Audit log parameters
 * @returns The audit log ID or null if failed
 */
export async function logAudit(params: AuditLogParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_audit', {
      p_action: params.action,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId?.toString() || null,
      p_description: params.description || null,
      p_metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
      p_status: params.status || 'success',
      p_error_message: params.errorMessage || null,
    })

    if (error) {
      console.error('Failed to log audit:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception logging audit:', error)
    return null
  }
}

/**
 * Helper functions for common audit operations
 */
export const audit = {
  // Load operations
  createLoad: (loadId: string | number, loadNumber: string) =>
    logAudit({
      action: 'create',
      resourceType: 'load',
      resourceId: loadId,
      description: `Created load ${loadNumber}`,
      metadata: { load_number: loadNumber },
    }),

  updateLoad: (loadId: string | number, loadNumber: string, changes: Record<string, any>) =>
    logAudit({
      action: 'update',
      resourceType: 'load',
      resourceId: loadId,
      description: `Updated load ${loadNumber}`,
      metadata: { load_number: loadNumber, changes },
    }),

  deleteLoad: (loadId: string | number, loadNumber: string) =>
    logAudit({
      action: 'delete',
      resourceType: 'load',
      resourceId: loadId,
      description: `Deleted load ${loadNumber}`,
      metadata: { load_number: loadNumber },
    }),

  assignDriver: (loadId: string | number, loadNumber: string, driverId: string, driverName: string) =>
    logAudit({
      action: 'assign',
      resourceType: 'load',
      resourceId: loadId,
      description: `Assigned ${driverName} to load ${loadNumber}`,
      metadata: { load_number: loadNumber, driver_id: driverId, driver_name: driverName },
    }),

  // Driver operations
  createDriver: (driverId: string, driverName: string, email: string) =>
    logAudit({
      action: 'create',
      resourceType: 'driver',
      resourceId: driverId,
      description: `Created driver ${driverName}`,
      metadata: { driver_name: driverName, email },
    }),

  updateDriver: (driverId: string, driverName: string, changes: Record<string, any>) =>
    logAudit({
      action: 'update',
      resourceType: 'driver',
      resourceId: driverId,
      description: `Updated driver ${driverName}`,
      metadata: { driver_name: driverName, changes },
    }),

  deleteDriver: (driverId: string, driverName: string) =>
    logAudit({
      action: 'delete',
      resourceType: 'driver',
      resourceId: driverId,
      description: `Deleted driver ${driverName}`,
      metadata: { driver_name: driverName },
    }),

  // DVIR operations
  viewDvir: (dvirId: string, dvirNumber: string) =>
    logAudit({
      action: 'view',
      resourceType: 'dvir',
      resourceId: dvirId,
      description: `Viewed DVIR ${dvirNumber}`,
      metadata: { dvir_number: dvirNumber },
    }),

  approveDvir: (dvirId: string, dvirNumber: string, safeToOperate: boolean) =>
    logAudit({
      action: 'approve',
      resourceType: 'dvir',
      resourceId: dvirId,
      description: `Reviewed DVIR ${dvirNumber} - ${safeToOperate ? 'Safe' : 'Unsafe'} to operate`,
      metadata: { dvir_number: dvirNumber, safe_to_operate: safeToOperate },
    }),

  // Message operations
  sendMessage: (messageId: string, recipientId: string, recipientName: string) =>
    logAudit({
      action: 'send',
      resourceType: 'message',
      resourceId: messageId,
      description: `Sent message to ${recipientName}`,
      metadata: { recipient_id: recipientId, recipient_name: recipientName },
    }),

  viewConversation: (userId: string, userName: string) =>
    logAudit({
      action: 'view',
      resourceType: 'message',
      resourceId: userId,
      description: `Viewed conversation with ${userName}`,
      metadata: { user_name: userName },
    }),

  // Document/BOL operations
  viewDocument: (docId: string, fileName: string, loadNumber?: string) =>
    logAudit({
      action: 'view',
      resourceType: 'document',
      resourceId: docId,
      description: `Viewed document ${fileName}${loadNumber ? ` for load ${loadNumber}` : ''}`,
      metadata: { file_name: fileName, load_number: loadNumber },
    }),

  downloadDocument: (docId: string, fileName: string, loadNumber?: string) =>
    logAudit({
      action: 'download',
      resourceType: 'document',
      resourceId: docId,
      description: `Downloaded document ${fileName}${loadNumber ? ` for load ${loadNumber}` : ''}`,
      metadata: { file_name: fileName, load_number: loadNumber },
    }),

  deleteDocument: (docId: string, fileName: string) =>
    logAudit({
      action: 'delete',
      resourceType: 'document',
      resourceId: docId,
      description: `Deleted document ${fileName}`,
      metadata: { file_name: fileName },
    }),

  // Search/Filter operations
  searchDocuments: (filters: Record<string, any>, resultCount: number) =>
    logAudit({
      action: 'search',
      resourceType: 'document',
      description: `Searched documents with filters`,
      metadata: { filters, result_count: resultCount },
    }),

  filterLoads: (filters: Record<string, any>, resultCount: number) =>
    logAudit({
      action: 'filter',
      resourceType: 'load',
      description: `Filtered loads`,
      metadata: { filters, result_count: resultCount },
    }),

  // Authentication operations
  login: () =>
    logAudit({
      action: 'login',
      resourceType: 'system',
      description: 'Admin logged in',
    }),

  logout: () =>
    logAudit({
      action: 'logout',
      resourceType: 'system',
      description: 'Admin logged out',
    }),

  // Error logging
  error: (action: AuditAction, resourceType: AuditResourceType, errorMessage: string, metadata?: Record<string, any>) =>
    logAudit({
      action,
      resourceType,
      status: 'error',
      errorMessage,
      description: `Error during ${action} ${resourceType}`,
      metadata,
    }),
}

export default audit
