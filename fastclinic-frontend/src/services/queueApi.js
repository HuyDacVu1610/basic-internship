import axios from 'axios';

export const queueApi = {
  getQueueList: async (maPhong = '') => {
    const query = maPhong ? `?maPhong=${maPhong}` : '';
    const response = await axios.get(`/queue${query}`);
    return response.data;
  },

  getQueueStats: async () => {
    const response = await axios.get('/queue/stats');
    return response.data;
  },

  issueTicket: async (maBenhNhan, maPhong) => {
    const response = await axios.post('/queue', { maBenhNhan, maPhong });
    return response.data;
  },

  getActiveRooms: async () => {
    const response = await axios.get('/queue/rooms');
    return response.data;
  },

  getQueueDisplay: async () => {
    const response = await axios.get('/queue/display');
    return response.data;
  },

  callPatient: async (maPhieu) => {
    const response = await axios.patch(`/queue/${maPhieu}/call`);
    return response.data;
  }
};

export default queueApi;
