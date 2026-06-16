import axios from 'axios';

export const patientApi = {
  searchPatients: async (q) => {
    const response = await axios.get(`/patients/search?q=${encodeURIComponent(q)}`);
    return response.data;
  },
  
  getPatientById: async (id) => {
    const response = await axios.get(`/patients/${id}`);
    return response.data;
  },
  
  createPatient: async (data) => {
    const response = await axios.post('/patients', data);
    return response.data;
  },
  
  updatePatient: async (id, data) => {
    const response = await axios.put(`/patients/${id}`, data);
    return response.data;
  },
  
  getPatientHistory: async (id, page = 1, limit = 5) => {
    const response = await axios.get(`/patients/${id}/history?page=${page}&limit=${limit}`);
    return response.data;
  }
};
export default patientApi;
