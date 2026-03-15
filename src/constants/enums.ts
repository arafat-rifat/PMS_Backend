export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
}

export const validTaskTransitions: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.RUNNING, TaskStatus.COMPLETED],
  [TaskStatus.RUNNING]: [TaskStatus.PENDING, TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [TaskStatus.RUNNING, TaskStatus.PENDING],
};
