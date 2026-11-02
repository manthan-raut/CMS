'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/modules/auth/ProtectedRoute';
import { useAuth } from '@/modules/auth/AuthContext';
import { apiListTasks, apiCreateTask, apiUpdateTaskStatus, apiDeleteTask, Task } from '@/lib/tasks-api';
import { apiFetch } from '@/lib/api';
import { ClipboardCheck, Plus, Trash2, Calendar, AlertCircle, RefreshCw, MessageSquare, User, ShieldAlert } from 'lucide-react';

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-rose-100 text-rose-800',
};

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'assigned_by_me' | 'org_tasks'>('my_tasks');
  
  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [updateModal, setUpdateModal] = useState<Task | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assignedToId: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    dueDate: '',
  });
  const [updateForm, setUpdateForm] = useState({
    status: 'PENDING' as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED',
    updateRemark: '',
  });

  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const isSenior = user && user.role !== 'EMPLOYEE';
  const isOrgViewer = user && (user.role === 'HOD' || user.role === 'HR_ADMIN');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const res = await apiListTasks();
    if (res.success && res.data) {
      setTasks(res.data);
    }
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    if (!isSenior) return;
    try {
      const res = await apiFetch<any[]>('/api/users?limit=1000');
      if (res.success && res.data) {
        // Filter out inactive users
        setUsers(res.data.filter((u: any) => u.status === 'ACTIVE'));
      }
    } catch (e) {
      console.error(e);
    }
  }, [isSenior]);

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, [loadTasks, loadUsers]);

  // Handle Tab Switch default for Employees
  useEffect(() => {
    if (user && user.role === 'EMPLOYEE') {
      setActiveTab('my_tasks');
    }
  }, [user]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!createForm.title || !createForm.assignedToId) {
      setFormError('Title and Assignee are required.');
      setFormLoading(false);
      return;
    }

    const payload = {
      title: createForm.title,
      description: createForm.description || undefined,
      assignedToId: createForm.assignedToId,
      priority: createForm.priority,
      dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : null,
    };

    const res = await apiCreateTask(payload);
    setFormLoading(false);
    if (res.success) {
      setCreateModal(false);
      setCreateForm({ title: '', description: '', assignedToId: '', priority: 'MEDIUM', dueDate: '' });
      loadTasks();
    } else {
      setFormError(res.message || 'Failed to assign task.');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateModal) return;
    setFormError('');
    setFormLoading(true);

    const res = await apiUpdateTaskStatus(updateModal.id, {
      status: updateForm.status,
      updateRemark: updateForm.updateRemark || undefined,
    });
    setFormLoading(false);
    if (res.success) {
      setUpdateModal(null);
      setUpdateForm({ status: 'PENDING', updateRemark: '' });
      loadTasks();
    } else {
      setFormError(res.message || 'Failed to update task.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const res = await apiDeleteTask(id);
    if (res.success) {
      loadTasks();
    } else {
      alert(res.message || 'Failed to delete task.');
    }
  };

  // Filter tasks based on selected tab
  const getFilteredTasks = () => {
    if (!user) return [];
    if (activeTab === 'my_tasks') {
      return tasks.filter(t => t.assignedToId === user.id);
    }
    if (activeTab === 'assigned_by_me') {
      return tasks.filter(t => t.assignedById === user.id);
    }
    if (activeTab === 'org_tasks') {
      return tasks;
    }
    return [];
  };

  const filteredTasks = getFilteredTasks();

  return (
    <ProtectedRoute>
      <div className="p-6 md:p-8 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.04em] uppercase text-[#696969] flex items-center gap-1 mb-1">
                <span className="text-[#F37338]">•</span> Employee tasks
              </p>
              <h1 className="text-3xl font-medium text-[#141413] tracking-tight">Task Board</h1>
              <p className="text-sm text-[#696969] mt-1">Manage and update organizational operations tasks</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={loadTasks} 
                className="p-2.5 rounded-[16px] border border-[#141413]/10 hover:bg-[#F3F0EE]/50 text-[#141413] transition-colors"
                title="Refresh Tasks"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              {isSenior && (
                <button
                  onClick={() => setCreateModal(true)}
                  className="px-5 py-2.5 rounded-[16px] bg-[#141413] text-white text-sm font-medium hover:bg-[#262627] transition-all flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Assign Task
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          {isSenior && (
            <div className="flex border-b border-[#141413]/10 gap-6 mb-8">
              <button
                onClick={() => setActiveTab('my_tasks')}
                className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'my_tasks' ? 'text-[#141413]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Assigned to Me
                {activeTab === 'my_tasks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#141413] rounded-full" />}
              </button>
              <button
                onClick={() => setActiveTab('assigned_by_me')}
                className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'assigned_by_me' ? 'text-[#141413]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Assigned by Me
                {activeTab === 'assigned_by_me' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#141413] rounded-full" />}
              </button>
              {isOrgViewer && (
                <button
                  onClick={() => setActiveTab('org_tasks')}
                  className={`pb-4 text-sm font-semibold transition-all relative ${activeTab === 'org_tasks' ? 'text-[#141413]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  All Organization Tasks
                  {activeTab === 'org_tasks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#141413] rounded-full" />}
                </button>
              )}
            </div>
          )}

          {/* Tasks Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#141413]" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white border border-[#141413]/10 rounded-[28px] p-16 text-center shadow-sm">
              <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No tasks found in this category.</p>
              {activeTab === 'assigned_by_me' && (
                <button 
                  onClick={() => setCreateModal(true)} 
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#141413] text-white text-xs font-semibold rounded-[12px] hover:bg-[#262627]"
                >
                  Create Your First Assignment
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTasks.map(task => {
                const isAssignee = user && task.assignedToId === user.id;
                const isCreator = user && task.assignedById === user.id;

                return (
                  <div key={task.id} className="bg-white border border-[#141413]/10 rounded-[24px] p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                    {/* Top status & priority */}
                    <div>
                      <div className="flex justify-between items-center gap-2 mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_COLORS[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority} Priority
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#141413] mb-2 leading-snug">{task.title}</h3>
                      <p className="text-sm text-gray-500 mb-5 whitespace-pre-line leading-relaxed">{task.description || <span className="italic text-gray-400">No description provided.</span>}</p>
                    </div>

                    {/* Metadata */}
                    <div className="border-t border-[#141413]/5 pt-4 space-y-2.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          <strong className="text-gray-700 font-semibold">Assigned To:</strong> {task.assignedTo.name} ({task.assignedTo.employeeId})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>
                          <strong className="text-gray-700 font-semibold">Assigned By:</strong> {task.assignedBy.name}
                        </span>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            <strong className="text-gray-700 font-semibold">Due Date:</strong> {new Date(task.dueDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      )}
                      
                      {/* Update remark banner */}
                      {task.updateRemark && (
                        <div className="mt-3 bg-[#F3F0EE] rounded-[14px] p-3 text-[11px] text-gray-700 flex gap-2 items-start">
                          <MessageSquare className="w-3.5 h-3.5 text-[#F37338] shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-gray-900 font-bold mb-0.5">Latest Update:</strong>
                            <p className="italic leading-relaxed">"{task.updateRemark}"</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#141413]/5">
                      {isAssignee && task.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => {
                            setUpdateModal(task);
                            setUpdateForm({ status: task.status, updateRemark: task.updateRemark || '' });
                          }}
                          className="px-4 py-1.5 rounded-[12px] bg-[#141413] text-white hover:bg-[#262627] text-xs font-semibold transition-colors"
                        >
                          Update Status
                        </button>
                      ) : (
                        <div />
                      )}

                      {isCreator && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 rounded-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CREATE TASK MODAL */}
          {createModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[28px] shadow-xl w-full max-w-md p-6 overflow-hidden animate-scale-up">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-[#141413]">New Task Assignment</h2>
                  <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                </div>
                
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Task Title *</label>
                    <input
                      type="text"
                      required
                      value={createForm.title}
                      onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Verify Rent Agreements"
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Add details about task requirements..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Assign To User *</label>
                    <select
                      required
                      value={createForm.assignedToId}
                      onChange={e => setCreateForm(p => ({ ...p, assignedToId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                    >
                      <option value="">Select Assignee</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} — {u.role.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Priority</label>
                      <select
                        value={createForm.priority}
                        onChange={e => setCreateForm(p => ({ ...p, priority: e.target.value as any }))}
                        className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Due Date</label>
                      <input
                        type="date"
                        value={createForm.dueDate}
                        onChange={e => setCreateForm(p => ({ ...p, dueDate: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-[10px] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setCreateModal(false)}
                      className="w-1/2 py-2.5 rounded-[14px] border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-1/2 py-2.5 rounded-[14px] bg-[#141413] text-white text-sm font-semibold hover:bg-[#262627] disabled:opacity-50 transition-colors"
                    >
                      {formLoading ? 'Assigning...' : 'Assign'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* UPDATE TASK STATUS MODAL */}
          {updateModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[28px] shadow-xl w-full max-w-md p-6 overflow-hidden animate-scale-up">
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-[#141413]">Update Task Status</h2>
                  <button onClick={() => setUpdateModal(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                </div>
                
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-[16px] border border-gray-100 mb-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Task</h4>
                    <p className="text-sm font-bold text-gray-800">{updateModal.title}</p>
                    {updateModal.description && <p className="text-xs text-gray-500 mt-1">{updateModal.description}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Status *</label>
                    <select
                      required
                      value={updateForm.status}
                      onChange={e => setUpdateForm(p => ({ ...p, status: e.target.value as any }))}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Progress Update / Remarks *</label>
                    <textarea
                      required
                      value={updateForm.updateRemark}
                      onChange={e => setUpdateForm(p => ({ ...p, updateRemark: e.target.value }))}
                      placeholder="Write what work has been done, or why the task is blocked..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-[12px] border border-gray-200 text-sm focus:outline-none focus:border-[#141413] bg-gray-50 resize-none"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-[10px] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setUpdateModal(null)}
                      className="w-1/2 py-2.5 rounded-[14px] border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-1/2 py-2.5 rounded-[14px] bg-[#141413] text-white text-sm font-semibold hover:bg-[#262627] disabled:opacity-50 transition-colors"
                    >
                      {formLoading ? 'Saving...' : 'Save Update'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </ProtectedRoute>
  );
}
