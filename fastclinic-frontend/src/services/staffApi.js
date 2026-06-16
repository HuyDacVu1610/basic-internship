import axios from 'axios';

export const staffApi = {
  getStaff: async (page = 1, limit = 20, search = '') => {
    const response = await axios.get(
      `/staff?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
    );
    return response.data;
  },

  createStaff: async (data) => {
    const response = await axios.post('/staff', data);
    return response.data;
  },

  updateStaff: async (id, data) => {
    const response = await axios.put(`/staff/${id}`, data);
    return response.data;
  },

  toggleLock: async (id) => {
    const response = await axios.patch(`/staff/${id}/lock`);
    return response.data;
  }
};

export default staffApi;
