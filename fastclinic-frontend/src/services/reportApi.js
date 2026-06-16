import axios from 'axios';

export const reportApi = {
  getPatients: async (from, to) => {
    const response = await axios.get(
      `/reports/patients?from=${from}&to=${to}`
    );
    return response.data;
  },

  getRevenue: async (from, to) => {
    const response = await axios.get(
      `/reports/revenue?from=${from}&to=${to}`
    );
    return response.data;
  },

  getMedicines: async (from, to) => {
    const response = await axios.get(
      `/reports/medicines?from=${from}&to=${to}`
    );
    return response.data;
  }
};

export default reportApi;
