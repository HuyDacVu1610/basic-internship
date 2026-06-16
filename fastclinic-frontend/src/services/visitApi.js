import axios from 'axios';

export const visitApi = {
  getWaitingList: async (role, maPhong = '') => {
    const maPhongQuery = maPhong ? `&maPhong=${maPhong}` : '';
    const response = await axios.get(`/visits/waiting?role=${role}${maPhongQuery}`);
    return response.data;
  },

  recordVitalSigns: async (maLuotKham, vitalSigns) => {
    const response = await axios.post(`/visits/${maLuotKham}/vital-signs`, vitalSigns);
    return response.data;
  },

  getVisitDetail: async (maLuotKham) => {
    const response = await axios.get(`/visits/${maLuotKham}`);
    return response.data;
  },

  saveExamination: async (maLuotKham, examData) => {
    const response = await axios.put(`/visits/${maLuotKham}/examine`, examData);
    return response.data;
  },

  getClsServices: async () => {
    const response = await axios.get('/visits/dich-vu-cls/list');
    return response.data;
  },

  createLabOrders: async (maLuotKham, maDichVus) => {
    const response = await axios.post(`/visits/${maLuotKham}/lab-orders`, { maDichVus });
    return response.data;
  },

  updateLabResult: async (maKetQua, formData) => {
    const response = await axios.put(`/visits/lab-results/${maKetQua}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  searchMedicines: async (q) => {
    const response = await axios.get(`/medicines/search?q=${encodeURIComponent(q)}`);
    return response.data;
  },

  savePrescription: async (maLuotKham, prescriptionData) => {
    const response = await axios.post(`/visits/${maLuotKham}/prescription`, prescriptionData);
    return response.data;
  },

  checkout: async (maLuotKham, checkoutData) => {
    const response = await axios.post(`/visits/${maLuotKham}/checkout`, checkoutData);
    return response.data;
  },

  getTodayPayments: async () => {
    const response = await axios.get('/visits/payments/today');
    return response.data;
  }
};

export default visitApi;
