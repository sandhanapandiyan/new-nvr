/**
 * LightNVR Web Interface Users View Component
 * Preact component for the user management page
 */

import { useState, useCallback, useEffect } from 'preact/hooks';
import { showStatusMessage } from './ToastContainer.jsx';
import { useQuery, useMutation, fetchJSON } from '../../query-client.js';
import { MainLayout } from './MainLayout.jsx';

// Import user components
import { USER_ROLES } from './users/UserRoles.js';
import { UsersTable } from './users/UsersTable.jsx';
import { AddUserModal } from './users/AddUserModal.jsx';
import { EditUserModal } from './users/EditUserModal.jsx';
import { DeleteUserModal } from './users/DeleteUserModal.jsx';
import { ApiKeyModal } from './users/ApiKeyModal.jsx';
import { validateSession } from '../../utils/auth-utils.js';

/**
 * UsersView component
 * @returns {JSX.Element} UsersView component
 */
export function UsersView() {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [userRole, setUserRole] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 1,
    is_active: true
  });

  useEffect(() => {
    async function fetchUserRole() {
      const session = await validateSession();
      if (session.valid) {
        setUserRole(session.role);
      } else {
        setUserRole('');
      }
    }
    fetchUserRole();
  }, []);

  const getAuthHeaders = useCallback(() => {
    const auth = localStorage.getItem('auth');
    return auth ? { 'Authorization': 'Basic ' + auth } : {};
  }, []);

  const {
    data: usersData,
    isLoading: loading,
    error,
    refetch: refetchUsers
  } = useQuery(
    ['users'],
    '/api/auth/users',
    {
      headers: getAuthHeaders(),
      cache: 'no-store',
      timeout: 15000,
      retries: 2,
      retryDelay: 1000
    }
  );

  const users = usersData?.users || [];
  const adminCount = users.filter(u => u.role === 1).length;
  const activeCount = users.filter(u => u.is_active).length;

  const handleAddUserClick = useCallback(() => {
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 1,
      is_active: true
    });
    setActiveModal('add');
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : (name === 'role' ? parseInt(value, 10) : value)
    }));
  }, []);

  const addUserMutation = useMutation({
    mutationFn: async (userData) => {
      return await fetchJSON('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(userData),
        timeout: 15000,
        retries: 1,
        retryDelay: 1000
      });
    },
    onSuccess: () => {
      setActiveModal(null);
      showStatusMessage('User added successfully');
      refetchUsers();
    },
    onError: (error) => {
      showStatusMessage(`Error adding user: ${error.message}`);
    }
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      return await fetchJSON(`/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(userData),
        timeout: 15000,
        retries: 1,
        retryDelay: 1000
      });
    },
    onSuccess: () => {
      setActiveModal(null);
      showStatusMessage('User updated successfully');
      refetchUsers();
    },
    onError: (error) => {
      showStatusMessage(`Error updating user: ${error.message}`);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await fetchJSON(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        timeout: 15000,
        retries: 1,
        retryDelay: 1000
      });
    },
    onSuccess: () => {
      setActiveModal(null);
      showStatusMessage('User deleted successfully');
      refetchUsers();
    },
    onError: (error) => {
      showStatusMessage(`Error deleting user: ${error.message}`);
    }
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async (userId) => {
      return await fetchJSON(`/api/auth/users/${userId}/api-key`, {
        method: 'POST',
        headers: getAuthHeaders(),
        timeout: 20000,
        retries: 1,
        retryDelay: 2000
      });
    },
    onMutate: () => {
      setApiKey('Generating...');
    },
    onSuccess: (data) => {
      setApiKey(data.api_key);
      showStatusMessage('API key generated successfully');
      setTimeout(() => {
        refetchUsers();
      }, 100);
    },
    onError: (error) => {
      setApiKey('');
      showStatusMessage(`Error generating API key: ${error.message}`);
    }
  });

  const handleAddUser = useCallback((e) => {
    if (e) e.preventDefault();
    addUserMutation.mutate(formData);
  }, [formData]);

  const handleEditUser = useCallback((e) => {
    if (e) e.preventDefault();
    editUserMutation.mutate({
      userId: selectedUser.id,
      userData: formData
    });
  }, [selectedUser, formData]);

  const handleDeleteUser = useCallback(() => {
    deleteUserMutation.mutate(selectedUser.id);
  }, [selectedUser]);

  const handleGenerateApiKey = useCallback(() => {
    generateApiKeyMutation.mutate(selectedUser.id);
  }, [selectedUser]);

  const copyApiKey = useCallback(() => {
    navigator.clipboard.writeText(apiKey)
      .then(() => {
        showStatusMessage('API key copied to clipboard');
      })
      .catch((err) => {
        showStatusMessage('Failed to copy API key');
      });
  }, [apiKey]);

  const openEditModal = useCallback((user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      role: user.role,
      is_active: user.is_active
    });
    setActiveModal('edit');
  }, []);

  const openDeleteModal = useCallback((user) => {
    setSelectedUser(user);
    setActiveModal('delete');
  }, []);

  const openApiKeyModal = useCallback((user) => {
    setSelectedUser(user);
    setApiKey('');
    setActiveModal('apiKey');
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return (
    <MainLayout currentPath="/users.html">
      <div className="min-h-screen bg-[#0f172a] text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </span>
                SECURITY & ACCESS
              </h1>
              <p className="text-gray-400 mt-2 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20 animate-pulse"></span>
                User Management & Permission Matrix
              </p>
            </div>

            <button
              onClick={handleAddUserClick}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-indigo-900/40 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              NEW OPERATOR
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Authenticated Units</p>
              <h3 className="text-3xl font-black text-white">{users.length} <span className="text-sm font-medium text-gray-400 uppercase tracking-normal">Users</span></h3>
            </div>
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Administrative Tier</p>
              <h3 className="text-3xl font-black text-indigo-400">{adminCount} <span className="text-sm font-medium text-gray-400 uppercase tracking-normal">Admins</span></h3>
            </div>
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Authorized Status</p>
              <h3 className="text-3xl font-black text-emerald-400">{activeCount} <span className="text-sm font-medium text-gray-400 uppercase tracking-normal">Active</span></h3>
            </div>
          </div>

          <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-1 shadow-2xl overflow-hidden">
            <div className="p-8">
              <h3 className="text-xs font-black text-gray-500 tracking-[0.2em] uppercase mb-8">Access Control List</h3>
              <UsersTable
                users={users}
                onEdit={openEditModal}
                onDelete={openDeleteModal}
                onApiKey={openApiKeyModal}
              />
            </div>
          </div>

          {/* Modals - using existing styling but wrapped in premium container if possible, 
              though they are likely portals. We'll stick to the core logic. */}
          {activeModal === 'add' && (
            <AddUserModal
              formData={formData}
              handleInputChange={handleInputChange}
              handleAddUser={handleAddUser}
              onClose={closeModal}
            />
          )}

          {activeModal === 'edit' && (
            <EditUserModal
              currentUser={selectedUser}
              formData={formData}
              handleInputChange={handleInputChange}
              handleEditUser={handleEditUser}
              onClose={closeModal}
            />
          )}

          {activeModal === 'delete' && (
            <DeleteUserModal
              currentUser={selectedUser}
              handleDeleteUser={handleDeleteUser}
              onClose={closeModal}
            />
          )}

          {activeModal === 'apiKey' && (
            <ApiKeyModal
              currentUser={selectedUser}
              newApiKey={apiKey}
              handleGenerateApiKey={handleGenerateApiKey}
              copyApiKey={copyApiKey}
              onClose={closeModal}
            />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
