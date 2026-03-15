import { dashboardRepository } from './repository';

const relationOne = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

export const dashboardService = {
  async getDashboard(userId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [projectCount, taskCounts, progressBars, nextTodos, currentRunningTask, dailySummary] = await Promise.all([
      dashboardRepository.countProjects(),
      dashboardRepository.countTasks(),
      dashboardRepository.projectProgress(),
      dashboardRepository.nextTodos(userId),
      dashboardRepository.currentRunningTask(userId),
      dashboardRepository.dailyWorkSummary(userId, today),
    ]);

    return {
      totals: {
        projects: projectCount,
        tasks: taskCounts.total,
        pendingTasks: taskCounts.pending,
        runningTasks: taskCounts.running,
        completedTasks: taskCounts.completed,
      },
      projectProgressBars: progressBars,
      recentlyAssignedTasks: taskCounts.recent,
      nextTaskToDo: nextTodos.map((todo) => {
        const task = relationOne(todo.tasks);
        return {
          id: todo.id,
          task_id: todo.task_id,
          title: task?.title ?? 'Untitled task',
          planned_date: todo.planned_date,
          planned_time: todo.planned_time,
          priority: todo.priority,
        };
      }),
      currentRunningTask,
      dailyWorkSummary: dailySummary,
    };
  },
};
