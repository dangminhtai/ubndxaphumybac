import { apiClient } from './client';
export interface FieldDefinition { code: string; title: string; groupId: string; owners: Array<{ id: string; fullName: string; username: string }> }
export interface FieldReport { fieldCode: string; fieldName?: string; content: string; difficulties: string; proposals: string; nextTasks: string }
export const getFields = async () => (await apiClient.get<FieldDefinition[]>('/fields')).data;
export const saveMyFields = async (fieldCodes: string[]) => (await apiClient.patch('/fields/mine', { fieldCodes })).data;
export const saveAssignments = async (assignments: Array<{ userId: string; fieldCodes: string[] }>) => (await apiClient.patch('/fields/assignments', { assignments })).data;
