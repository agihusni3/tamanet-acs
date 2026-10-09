import axios from 'axios';

export const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 6000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('acs_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // 401 Unauthorized: Sesi kadaluarsa atau token dibatalkan
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('acs_access_token');
      localStorage.removeItem('acs_refresh_token');
      localStorage.removeItem('acs_user_profile');
      window.location.href = '/login';
    }

    // Kembalikan error asli agar operator NOC mendapatkan informasi riil dan jujur
    return Promise.reject(err);
  },
);

export const logoutApi = async () => {
  try {
    await api.post('/auth/logout');
  } catch {}
};

// ============================================================================
// OLT API CLIENT HELPERS
// ============================================================================
export const getOltsApi = async () => {
  const res = await api.get('/olts');
  return res.data;
};

export const createOltApi = async (data: any) => {
  const res = await api.post('/olts', data);
  return res.data;
};

export const updateOltApi = async (id: string, data: any) => {
  const res = await api.put(`/olts/${id}`, data);
  return res.data;
};

export const updateOltPortApi = async (oltId: string, portNumber: number, data: { name?: string; description?: string }) => {
  const res = await api.put(`/olts/${oltId}/ports/${portNumber}`, data);
  return res.data;
};

export const deleteOltApi = async (id: string) => {
  const res = await api.delete(`/olts/${id}`);
  return res.data;
};

export const pollOltCollectorApi = async () => {
  const res = await api.post('/olt-collector/poll-now');
  return res.data;
};

export const pollSingleOltApi = async (id: string) => {
  const res = await api.post(`/olt-collector/poll/${id}`);
  return res.data;
};

export const testOltConnectionApi = async (id: string) => {
  const res = await api.post(`/olt-collector/test-connection/${id}`);
  return res.data;
};


