/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from '../components/Toast';
import {
  getProjectTasksApi,
  createTaskApi,
  updateTaskApi,
  updateTaskStatusApi,
  completeTaskApi,
  getMyTasksApi,
  getMyTasksSummaryApi,
  deleteTaskApi,
} from '../api/taskApi';

const TaskContext = createContext(null);

const extractApiError = (err, defaultMsg = 'An error occurred.') => {
  if (!err) return defaultMsg;
  if (err.response) {
    const status = err.response.status;
    const detail = err.response.data?.detail;

    if (status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (status === 403) {
      return typeof detail === 'string'
        ? detail
        : "You don't have permission to modify this task.";
    }
    if (status === 400) {
      return typeof detail === 'string'
        ? detail
        : 'Invalid task request. Please check assignee and due date.';
    }
    if (status === 404) {
      return typeof detail === 'string' ? detail : 'Task or project not found.';
    }
    if (status === 422) {
      if (Array.isArray(detail)) {
        return detail.map((d) => d.msg || 'Invalid input').join(', ');
      }
      return typeof detail === 'string' ? detail : 'Please provide a valid task title.';
    }
    if (status >= 500) {
      return 'Something went wrong. Please try again.';
    }
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return err.message || defaultMsg;
};

export const TaskProvider = ({ children }) => {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // My Tasks state
  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myTasksError, setMyTasksError] = useState(null);
  const [myTasksSummary, setMyTasksSummary] = useState({
    assigned_to_me: 0,
    due_today: 0,
    overdue: 0,
    completed: 0,
  });

  // Active filters for project tasks
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    assignee_id: 'all',
  });

  // Load all tasks for a project
  const loadTasks = useCallback(
    async (companyId, projectId, customFilters = {}) => {
      if (!companyId || !projectId) {
        setTasks([]);
        return [];
      }

      const activeFilters = { ...filters, ...customFilters };
      setLoading(true);
      setError(null);
      try {
        const data = await getProjectTasksApi(companyId, projectId, activeFilters);
        const safeData = Array.isArray(data) ? data : [];
        setTasks(safeData);
        return safeData;
      } catch (err) {
        const errorMsg = extractApiError(err, 'Failed to load project tasks.');
        setError(errorMsg);
        setTasks([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Load tasks assigned to current user across all projects
  const fetchMyTasks = useCallback(
    async (companyId, customFilters = {}) => {
      if (!companyId) {
        setMyTasks([]);
        setMyTasksLoading(false);
        return [];
      }

      setMyTasksLoading(true);
      setMyTasksError(null);
      try {
        const data = await getMyTasksApi(companyId, customFilters);
        const safeData = Array.isArray(data) ? data : [];
        setMyTasks(safeData);
        return safeData;
      } catch (err) {
        const errorMsg = extractApiError(err, 'Failed to load assigned tasks.');
        setMyTasksError(errorMsg);
        setMyTasks([]);
        return [];
      } finally {
        setMyTasksLoading(false);
      }
    },
    []
  );

  // Load summary KPI metrics for current user
  const fetchMyTasksSummary = useCallback(
    async (companyId) => {
      if (!companyId) return null;
      try {
        const stats = await getMyTasksSummaryApi(companyId);
        if (stats && typeof stats === 'object') {
          setMyTasksSummary(stats);
        }
        return stats;
      } catch {
        return null;
      }
    },
    []
  );

  // Unified loader for My Tasks and Summary
  const loadMyTasksAll = useCallback(
    async (companyId, customFilters = {}) => {
      if (!companyId) {
        setMyTasks([]);
        setMyTasksLoading(false);
        return { tasks: [], summary: null };
      }

      setMyTasksLoading(true);
      setMyTasksError(null);

      try {
        const [tasksResult, summaryResult] = await Promise.allSettled([
          getMyTasksApi(companyId, customFilters),
          getMyTasksSummaryApi(companyId),
        ]);

        let fetchedTasks = [];
        if (tasksResult.status === 'fulfilled') {
          fetchedTasks = Array.isArray(tasksResult.value) ? tasksResult.value : [];
          setMyTasks(fetchedTasks);
        } else {
          const errorMsg = extractApiError(tasksResult.reason, 'Failed to load assigned tasks.');
          setMyTasksError(errorMsg);
          setMyTasks([]);
        }

        let fetchedSummary = null;
        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          fetchedSummary = summaryResult.value;
          setMyTasksSummary(fetchedSummary);
        }

        return { tasks: fetchedTasks, summary: fetchedSummary };
      } finally {
        setMyTasksLoading(false);
      }
    },
    []
  );

  // Create a new task
  const createTask = useCallback(
    async (companyId, projectId, taskData) => {
      try {
        const created = await createTaskApi(companyId, projectId, taskData);
        setTasks((prev) => [...prev, created]);
        
        // Refresh personal task views
        if (companyId) {
          fetchMyTasks(companyId);
          fetchMyTasksSummary(companyId);
        }

        const assigneeName =
          created.assignee?.full_name ||
          created.assignee?.username ||
          taskData.assignee_name;

        const message = assigneeName
          ? `Task "${created.title}" created and assigned to ${assigneeName}.`
          : `Task "${created.title}" created successfully.`;

        addToast({
          type: 'success',
          message,
        });
        return created;
      } catch (err) {
        const errorMsg = extractApiError(err, 'Failed to create task.');
        addToast({
          type: 'error',
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }
    },
    [addToast, fetchMyTasks, fetchMyTasksSummary]
  );

  // Update an existing task
  const updateTask = useCallback(
    async (companyId, projectId, taskId, taskData) => {
      try {
        const updated = await updateTaskApi(companyId, projectId, taskId, taskData);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        setMyTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

        // Refresh personal task views
        if (companyId) {
          fetchMyTasks(companyId);
          fetchMyTasksSummary(companyId);
        }

        addToast({
          type: 'success',
          message: `Task "${updated.title}" updated successfully.`,
        });
        return updated;
      } catch (err) {
        const errorMsg = extractApiError(err, 'Failed to update task.');
        addToast({
          type: 'error',
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }
    },
    [addToast, fetchMyTasks, fetchMyTasksSummary]
  );

  // Move task status (Optimistic Kanban movement)
  const updateTaskStatus = useCallback(
    async (companyId, projectId, taskId, newStatus, newPosition = null) => {
      const originalTasks = [...tasks];
      const targetTask = originalTasks.find((t) => t.id === taskId);

      // Optimistic update in local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                position: typeof newPosition === 'number' ? newPosition : t.position,
              }
            : t
        )
      );

      const statusLabels = {
        TODO: 'To Do',
        IN_PROGRESS: 'In Progress',
        REVIEW: 'Review',
        DONE: 'Done',
      };

      try {
        const updated = await updateTaskStatusApi(companyId, projectId, taskId, {
          status: newStatus,
          position: newPosition,
        });
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        setMyTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

        // Refresh personal task views
        if (companyId) {
          fetchMyTasks(companyId);
          fetchMyTasksSummary(companyId);
        }

        addToast({
          type: 'success',
          message: `Task moved to ${statusLabels[newStatus] || newStatus}`,
        });
        return updated;
      } catch (err) {
        // Rollback on failure
        if (targetTask) setTasks(originalTasks);
        const errorMsg = extractApiError(err, 'Failed to move task status.');
        addToast({
          type: 'error',
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }
    },
    [tasks, addToast, fetchMyTasks, fetchMyTasksSummary]
  );

  // Explicitly mark task completed
  const markTaskComplete = useCallback(
    async (companyId, projectId, taskId) => {
      try {
        const updated = await completeTaskApi(companyId, projectId, taskId);
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        setMyTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));

        // Refresh personal task views
        if (companyId) {
          fetchMyTasks(companyId);
          fetchMyTasksSummary(companyId);
        }

        addToast({
          type: 'success',
          message: `Task "${updated.title}" marked as completed.`,
        });
        return updated;
      } catch (err) {
        const errorMsg = extractApiError(err, 'Failed to complete task.');
        addToast({
          type: 'error',
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }
    },
    [addToast, fetchMyTasks, fetchMyTasksSummary]
  );

  // Delete a task
  const deleteTask = useCallback(
    async (companyId, projectId, taskId) => {
      try {
        await deleteTaskApi(companyId, projectId, taskId);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setMyTasks((prev) => prev.filter((t) => t.id !== taskId));

        // Refresh personal task views
        if (companyId) {
          fetchMyTasks(companyId);
          fetchMyTasksSummary(companyId);
        }

        addToast({
          type: 'success',
          message: 'Task deleted successfully.',
        });
      } catch (err) {
        const errorMsg = extractApiError(err, 'Failed to delete task.');
        addToast({
          type: 'error',
          message: errorMsg,
        });
        throw new Error(errorMsg);
      }
    },
    [addToast, fetchMyTasks, fetchMyTasksSummary]
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        myTasks,
        myTasksLoading,
        myTasksError,
        myTasksSummary,
        clearMyTasksError: () => setMyTasksError(null),
        filters,
        setFilters,
        loadTasks,
        fetchMyTasks,
        fetchMyTasksSummary,
        loadMyTasksAll,
        createTask,
        updateTask,
        updateTaskStatus,
        markTaskComplete,
        deleteTask,
        setTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

export default TaskContext;
