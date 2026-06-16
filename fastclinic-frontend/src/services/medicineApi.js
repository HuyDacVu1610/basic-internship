import axios from 'axios';

export const medicineApi = {
  getMedicines: async (page = 1, limit = 20, search = '') => {
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
    const response = await axios.get(`/medicines?page=${page}&limit=${limit}${searchParam}`);
    return response.data;
  },

  createMedicine: async (medicineData) => {
    const response = await axios.post('/medicines', medicineData);
    return response.data;
  },

  updateMedicine: async (id, medicineData) => {
    const response = await axios.put(`/medicines/${id}`, medicineData);
    return response.data;
  },

  deleteMedicine: async (id) => {
    const response = await axios.delete(`/medicines/${id}`);
    return response.data;
  },

  getAlerts: async () => {
    const response = await axios.get('/medicines/alerts');
    return response.data;
  }
};

export default medicineApi;
