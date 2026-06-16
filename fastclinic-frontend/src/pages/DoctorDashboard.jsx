import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import queueApi from '../services/queueApi';
import useSocket from '../hooks/useSocket';

export const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(() => {
    return localStorage.getItem('fc_doctor_room') || '';
  });
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Real-time socket updates for queue
  const { socket } = useSocket('doctor');

  // Load clinic rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await queueApi.getActiveRooms();
        if (response && response.success) {
          setRooms(response.data);
          // Auto select first room if none selected
          if (!selectedRoom && response.data.length > 0) {
            setSelectedRoom(response.data[0].ma_phong.toString());
            localStorage.setItem('fc_doctor_room', response.data[0].ma_phong.toString());
          }
        }
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    };
    fetchRooms();
  }, [selectedRoom]);

  // Load queue for selected room
  const fetchQueue = async () => {
    if (!selectedRoom) return;
    setLoading(true);
    try {
      setError('');
      const response = await queueApi.getQueueList(selectedRoom);
      if (response && response.success) {
        setQueueList(response.data);
      } else {
        setError(response.message || 'Lỗi khi tải danh sách hàng đợi.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedRoom]);

  // Socket listener for queue updates
  useEffect(() => {
    if (!socket) return;
    
    const handleQueueUpdate = () => {
      console.log('DoctorDashboard: queue-updated event received. Refreshing list...');
      fetchQueue();
    };

    socket.on('queue-updated', handleQueueUpdate);
    return () => {
      socket.off('queue-updated', handleQueueUpdate);
    };
  }, [socket, selectedRoom]);

  // Handle room selection change
  const handleRoomChange = (e) => {
    const val = e.target.value;
    setSelectedRoom(val);
    localStorage.setItem('fc_doctor_room', val);
  };

  // Call/recall patient action
  const handleCallPatient = async (maPhieu) => {
    try {
      setError('');
      const response = await queueApi.callPatient(maPhieu);
      if (response && response.success) {
        fetchQueue();
      } else {
        setError(response.message || 'Lỗi khi gọi khám.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Lỗi khi gọi khám.');
    }
  };

  // Calculate age helper
  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return 'N/A';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} tuổi` : '0 tuổi';
  };

  // Vitals threshold checker
  const checkVitalsThreshold = (sinhHieu) => {
    if (!sinhHieu) return { abnormal: false, bpHigh: false, hrHigh: false, tempHigh: false };
    const { huyet_ap, nhip_tim, nhiet_do } = sinhHieu;
    
    let bpHigh = false;
    let hrHigh = false;
    let tempHigh = false;

    if (huyet_ap) {
      const parts = huyet_ap.split('/');
      if (parts.length === 2) {
        const sys = parseInt(parts[0], 10);
        const dia = parseInt(parts[1], 10);
        if (sys > 140 || dia > 90) bpHigh = true;
      }
    }
    if (nhip_tim && parseInt(nhip_tim, 10) > 100) hrHigh = true;
    if (nhiet_do && parseFloat(nhiet_do) > 38.0) tempHigh = true;

    return {
      abnormal: bpHigh || hrHigh || tempHigh,
      bpHigh,
      hrHigh,
      tempHigh
    };
  };

  // Get vitals display status object
  const getVitalSignsStatus = (sinhHieu) => {
    if (!sinhHieu) return { abnormal: false, text: 'Chưa đo sinh hiệu' };
    const { huyet_ap, nhip_tim, nhiet_do } = sinhHieu;
    const thresh = checkVitalsThreshold(sinhHieu);
    
    const texts = [];
    if (huyet_ap) texts.push(`HA: ${huyet_ap}`);
    if (nhip_tim) texts.push(`Mạch: ${nhip_tim}`);
    if (nhiet_do) texts.push(`T°: ${nhiet_do}°C`);
    
    return {
      abnormal: thresh.abnormal,
      text: texts.join(', ') || 'N/A'
    };
  };

  // Split queue list into stats counts
  const stats = queueList.reduce((acc, item) => {
    if (item.trang_thai === 'CHO_DO_SINH_HIEU') acc.waitingVitals++;
    else if (item.trang_thai === 'CHO_BAC_SI') acc.waitingDoctor++;
    else if (item.trang_thai === 'DANG_KHAM') acc.examining++;
    else if (item.trang_thai === 'HOAN_TAT') acc.finished++;
    return acc;
  }, { waitingVitals: 0, waitingDoctor: 0, examining: 0, finished: 0 });

  return (
    <DashboardLayout title="Bảng Khám Bệnh Bác Sĩ (Doctor Dashboard)">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-slate-800">
        <div>
          <label htmlFor="room-select" className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Chọn phòng làm việc hiện tại
          </label>
          <select 
            id="room-select"
            value={selectedRoom}
            onChange={handleRoomChange}
            className="bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-bold text-slate-800 px-4 py-2 w-64 focus:outline-none transition cursor-pointer"
          >
            <option value="" disabled>-- Chọn phòng khám --</option>
            {rooms.map((room) => (
              <option key={room.ma_phong} value={room.ma_phong.toString()}>
                {room.ten_phong} ({room.chuyen_khoa || 'Tổng hợp'})
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={fetchQueue}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition flex items-center space-x-1.5 align-self-end sm:align-self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M21 21v-5h-.581m0 0a8.003 8.003 0 01-15.357-2M21 16h-5"></path>
          </svg>
          <span>Làm mới hàng đợi</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Đang chờ đo sinh hiệu</div>
          <div className="text-3xl font-black text-slate-700 font-mono">{stats.waitingVitals}</div>
          <div className="text-xs text-slate-500 mt-1">Bệnh nhân chưa đo sinh hiệu</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Chờ bác sĩ khám</div>
          <div className={`text-3xl font-black font-mono ${stats.waitingDoctor > 0 ? 'text-amber-600 animate-pulse font-bold' : 'text-slate-700'}`}>
            {stats.waitingDoctor}
          </div>
          <div className="text-xs text-slate-500 mt-1">Sẵn sàng gọi khám</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Đang khám</div>
          <div className="text-3xl font-black text-indigo-600 font-mono">{stats.examining}</div>
          <div className="text-xs text-slate-500 mt-1">Lượt đang khám trong phòng</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Đã khám hôm nay</div>
          <div className="text-3xl font-black text-emerald-600 font-mono">{stats.finished}</div>
          <div className="text-xs text-slate-500 mt-1">Lượt khám xong trong ngày</div>
        </div>
      </div>

      {/* Patients queue list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-slate-800">
        <h3 className="text-lg font-bold text-slate-800 mb-5 tracking-wide">Danh sách bệnh nhân trong phòng chờ</h3>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center space-x-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!selectedRoom ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-slate-500 font-bold">Vui lòng chọn phòng khám làm việc phía trên</p>
          </div>
        ) : loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-slate-500">Đang tải danh sách hàng đợi...</p>
          </div>
        ) : queueList.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <p className="text-slate-500 font-bold">Không có bệnh nhân trong phòng chờ hôm nay</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4 w-20">Số TT</th>
                  <th className="p-4 w-36">Mã bệnh nhân</th>
                  <th className="p-4">Họ và tên</th>
                  <th className="p-4">Tuổi / Giới tính</th>
                  <th className="p-4">Chỉ số sinh hiệu</th>
                  <th className="p-4 w-44">Trạng thái</th>
                  <th className="p-4 w-44">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {queueList.map((ticket) => {
                  const activeVisit = ticket.luotKhams?.[0];
                  const sinhHieu = activeVisit?.sinhHieu;
                  const vitals = getVitalSignsStatus(sinhHieu);
                  const isAbnormal = vitals.abnormal;

                  return (
                    <tr key={ticket.ma_phieu} className="hover:bg-slate-50 transition duration-150">
                      <td className="p-4">
                        <span className="text-sm font-extrabold font-mono text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded">
                          {String(ticket.so_thu_tu).padStart(3, '0')}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-slate-500 text-xs">
                        BN{String(ticket.benhNhan?.ma_benh_nhan).padStart(5, '0')}
                      </td>
                      <td className="p-4 font-bold text-slate-800 uppercase tracking-wide">
                        {ticket.benhNhan?.ho_ten}
                      </td>
                      <td className="p-4 text-slate-650 text-xs font-semibold">
                        {calculateAge(ticket.benhNhan?.ngay_sinh)} / {ticket.benhNhan?.gioi_tinh === 'Nam' ? 'Nam' : 'Nữ'}
                      </td>
                      <td className="p-4">
                        {ticket.trang_thai === 'CHO_DO_SINH_HIEU' ? (
                          <span className="text-slate-500 text-xs italic">Đang chờ đo...</span>
                        ) : activeVisit && sinhHieu ? (
                          <span className={`text-xs font-mono font-semibold ${isAbnormal ? 'text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200' : 'text-slate-650'}`}>
                            {vitals.text}
                          </span>
                        ) : (
                          <span className="text-rose-700 text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">Chưa đo sinh hiệu</span>
                        )}
                      </td>
                      <td className="p-4">
                        {ticket.trang_thai === 'CHO_DO_SINH_HIEU' && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-lg border border-slate-200">Chờ đo SH</span>
                        )}
                        {ticket.trang_thai === 'CHO_BAC_SI' && (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-lg border border-amber-200 animate-pulse font-semibold">Sẵn sàng khám</span>
                        )}
                        {ticket.trang_thai === 'DANG_KHAM' && (
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-lg border border-indigo-200 font-semibold">Đang khám</span>
                        )}
                        {ticket.trang_thai === 'HOAN_TAT' && (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase rounded-lg border border-emerald-200 font-semibold">Hoàn tất</span>
                        )}
                      </td>
                      <td className="p-4">
                        {ticket.trang_thai === 'CHO_BAC_SI' && (
                          <button 
                            onClick={() => handleCallPatient(ticket.ma_phieu)}
                            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-550 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 shadow shadow-blue-600/10"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                            </svg>
                            <span>Gọi khám</span>
                          </button>
                        )}
                        
                        {ticket.trang_thai === 'DANG_KHAM' && activeVisit && (
                          <div className="flex gap-2 w-full">
                            <button 
                              onClick={() => navigate(`/doctor/examine/${activeVisit.ma_luot_kham}`)}
                              className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-555 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-0.5 shadow shadow-emerald-600/10"
                            >
                              <span>Khám tiếp</span>
                            </button>
                            <button 
                              onClick={() => handleCallPatient(ticket.ma_phieu)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center"
                              title="Gọi loa nhắc nhở bệnh nhân"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                              </svg>
                            </button>
                          </div>
                        )}

                        {ticket.trang_thai === 'CHO_DO_SINH_HIEU' && (
                          <span className="text-slate-400 text-xs font-semibold block text-center italic">Chờ sinh hiệu</span>
                        )}
                        
                        {ticket.trang_thai === 'HOAN_TAT' && (
                          <span className="text-emerald-600 text-xs font-bold block text-center">Đã hoàn tất</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default DoctorDashboard;
