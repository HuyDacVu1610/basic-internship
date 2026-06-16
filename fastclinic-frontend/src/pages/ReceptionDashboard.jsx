import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PatientForm } from './reception/PatientForm';
import queueApi from '../services/queueApi';
import useSocket from '../hooks/useSocket';


export const ReceptionDashboard = () => {
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' or 'queue'
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Queue stats and lists states
  const [stats, setStats] = useState({
    totalRegistered: 0,
    waitingVitals: 0,
    waitingDoctor: 0,
    examining: 0,
    finished: 0
  });
  const [queueList, setQueueList] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('');
  const [selectedTargetRoom, setSelectedTargetRoom] = useState('');

  // Connect to the Socket.io server
  const { socket } = useSocket('reception');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchQueueList = useCallback(async () => {
    try {
      const res = await queueApi.getQueueList(selectedRoomFilter);
      if (res.success) {
        setQueueList(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hàng đợi:', err);
    }
  }, [selectedRoomFilter]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, statsRes] = await Promise.all([
        queueApi.getActiveRooms(),
        queueApi.getQueueStats()
      ]);
      
      if (roomsRes.success) {
        setActiveRooms(roomsRes.data);
        if (roomsRes.data.length > 0) {
          setSelectedTargetRoom(roomsRes.data[0].ma_phong);
        }
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      
      await fetchQueueList();
    } catch (err) {
      console.error('Lỗi tải dữ liệu hàng đợi:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchQueueList]);

  // Fetch rooms list and initial queue data
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch queue list when room filter changes
  useEffect(() => {
    fetchQueueList();
  }, [fetchQueueList]);

  // Real-time queue updates from socket
  useEffect(() => {
    if (!socket) return;

    const handleQueueUpdated = async () => {
      console.log('ReceptionDashboard: Socket queue-updated. Refreshing stats & queue list.');
      const statsRes = await queueApi.getQueueStats();
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      await fetchQueueList();
    };

    socket.on('queue-updated', handleQueueUpdated);

    return () => {
      socket.off('queue-updated', handleQueueUpdated);
    };
  }, [socket, fetchQueueList]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setMessage({ type: '', text: '' });
  };

  const handlePrintSTT = (ticket) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const contentHtml = `
      <div style="font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 2mm; box-sizing: border-box; color: #000; font-size: 11px; line-height: 1.4; text-align: center;">
        <h2 style="margin: 0; font-size: 15px; font-weight: bold;">FASTCLINIC</h2>
        <p style="margin: 2px 0; font-size: 9px;">123 Nguyễn Trãi, Thanh Xuân, Hà Nội</p>
        <h3 style="margin: 8px 0; font-size: 12px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0;">PHIẾU LẤY SỐ THỨ TỰ</h3>
        
        <div style="margin: 5mm 0;">
          <span style="font-size: 10px; color: #555; display: block; margin-bottom: 2px;">SỐ THỨ TỰ CỦA BẠN:</span>
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 1px;">${String(ticket.so_thu_tu).padStart(2, '0')}</span>
        </div>

        <div style="text-align: left; margin: 3mm 0; border-bottom: 1px dashed #000; padding-bottom: 4px;">
          <p style="margin: 3px 0; font-size: 10px;">Bệnh nhân: <b>${ticket.benhNhan?.ho_ten?.toUpperCase() || ''}</b></p>
          <p style="margin: 3px 0; font-size: 10px;">Phòng khám: <b>${ticket.phongKham?.ten_phong || ''}</b></p>
          <p style="margin: 3px 0; font-size: 10px;">Chuyên khoa: <b>${ticket.phongKham?.chuyen_khoa || ''}</b></p>
          <p style="margin: 3px 0; font-size: 10px;">Giờ lấy số: ${ticket.thoi_gian_lay_so ? new Date(ticket.thoi_gian_lay_so).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
          <p style="margin: 3px 0; font-size: 10px;">Ngày khám: ${ticket.ngay_kham ? new Date(ticket.ngay_kham).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <p style="margin: 8px 0; font-size: 8px; font-style: italic;">Vui lòng theo dõi màn hình hiển thị để được gọi khám.</p>
        <p style="margin: 2px 0; font-size: 8px;">FastClinic v1.0</p>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>In Số Thứ Tự K80</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; background-color: #fff; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${contentHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Issue STT Ticket
  const handleIssueTicket = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoặc tìm kiếm bệnh nhân trước.' });
      return;
    }
    if (!selectedTargetRoom) {
      setMessage({ type: 'error', text: 'Vui lòng chọn phòng khám chỉ định.' });
      return;
    }

    setActionLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await queueApi.issueTicket(selectedPatient.ma_benh_nhan, selectedTargetRoom);
      if (res.success) {
        const ticket = res.data;
        setMessage({
          type: 'success',
          text: `Cấp STT thành công! Số thứ tự: #${ticket.so_thu_tu}. Phòng: ${ticket.phongKham?.ten_phong}.`,
          ticket
        });
        setSelectedPatient(null); // Clear selected patient after successful issue
        
        // Refresh stats and queue tables
        const statsRes = await queueApi.getQueueStats();
        if (statsRes.success) setStats(statsRes.data);
        await fetchQueueList();
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi cấp số thứ tự khám bệnh.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
    case 'CHO_DO_SINH_HIEU':
      return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">Chờ sinh hiệu</span>;
    case 'CHO_BAC_SI':
      return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">Chờ bác sĩ</span>;
    case 'DANG_KHAM':
      return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">Đang khám</span>;
    case 'CHO_CLS':
      return <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">Chờ CLS</span>;
    case 'CHO_THANH_TOAN':
      return <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold">Chờ T.Toán</span>;
    case 'HOAN_TAT':
      return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">Hoàn tất</span>;
    default:
      return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-650 border border-slate-200">{status}</span>;
    }
  };

  return (
    <DashboardLayout title="Bảng Làm Việc Lễ Tân (Reception Dashboard)">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('patient')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition duration-150 ${
            activeTab === 'patient'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tiếp nhận & Hồ sơ Bệnh nhân
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition duration-150 ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hàng đợi phòng khám
        </button>
      </div>

      {activeTab === 'patient' ? (
        <div className="space-y-6">
          {/* Patient Selection Status and Ticket Issuance Form */}
          {selectedPatient ? (
            <div className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
              <div>
                <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Bệnh nhân được chọn</span>
                <span className="font-bold text-slate-800 text-lg">{selectedPatient.ho_ten}</span>
                <span className="font-mono text-slate-500 text-xs ml-2">(SĐT: {selectedPatient.so_dien_thoai})</span>
              </div>
              
              <form onSubmit={handleIssueTicket} className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex flex-col">
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Chọn phòng chỉ định</label>
                  <select
                    value={selectedTargetRoom}
                    onChange={(e) => setSelectedTargetRoom(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    required
                  >
                    {activeRooms.map(room => (
                      <option key={room.ma_phong} value={room.ma_phong}>
                        {room.ten_phong} ({room.chuyen_khoa})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end self-end h-full">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition uppercase tracking-wider"
                  >
                    {actionLoading ? 'Đang cấp số...' : 'Cấp số thứ tự'}
                  </button>
                </div>
                
                <div className="flex items-end self-end h-full">
                  <button 
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                  >
                    Hủy chọn
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 shadow-sm">
              Vui lòng tìm kiếm bệnh nhân hoặc điền thông tin tạo hồ sơ để chọn bệnh nhân trước khi cấp số thứ tự.
            </div>
          )}

          {message.text && (
            <div className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span>{message.text}</span>
              {message.type === 'success' && message.ticket && (
                <button
                  type="button"
                  onClick={() => handlePrintSTT(message.ticket)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition flex items-center space-x-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>In Phiếu</span>
                </button>
              )}
            </div>
          )}

          <PatientForm onSelectPatient={handleSelectPatient} />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đăng ký mới</div>
              <div className="text-2xl font-extrabold text-slate-800">{stats.totalRegistered}</div>
              <span className="text-[9px] text-slate-500">Phiếu khám hôm nay</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Chờ sinh hiệu</div>
              <div className="text-2xl font-extrabold text-amber-600">{stats.waitingVitals}</div>
              <span className="text-[9px] text-slate-500">Tại quầy điều dưỡng</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Chờ khám bác sĩ</div>
              <div className="text-2xl font-extrabold text-blue-600">{stats.waitingDoctor}</div>
              <span className="text-[9px] text-slate-500">Tại các phòng chuyên khoa</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đang khám</div>
              <div className="text-2xl font-extrabold text-purple-650">{stats.examining}</div>
              <span className="text-[9px] text-slate-500">Trong phòng bác sĩ</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Đã hoàn thành</div>
              <div className="text-2xl font-extrabold text-emerald-600">{stats.finished}</div>
              <span className="text-[9px] text-slate-500">Đã thanh toán / ra về</span>
            </div>
          </div>

          {/* Queue Filter and Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800">Danh sách tiếp nhận hôm nay</h3>
                <p className="text-xs text-slate-550 mt-1">Hàng đợi khám bệnh theo thời gian thực.</p>
              </div>
              
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Lọc phòng:</span>
                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500 text-slate-800 w-full sm:w-48"
                >
                  <option value="">Tất cả phòng khám</option>
                  {activeRooms.map(room => (
                    <option key={room.ma_phong} value={room.ma_phong}>
                      {room.ten_phong}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-12">
                <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs text-slate-500 mt-3">Đang tải danh sách hàng đợi...</span>
              </div>
            ) : queueList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
                Không có bệnh nhân nào trong hàng đợi hôm nay.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">STT</th>
                      <th className="p-3.5">Họ và tên bệnh nhân</th>
                      <th className="p-3.5">Mã bệnh nhân</th>
                      <th className="p-3.5">Số điện thoại</th>
                      <th className="p-3.5">Phòng khám chỉ định</th>
                      <th className="p-3.5">Giờ lấy số</th>
                      <th className="p-3.5 text-center">Trạng thái</th>
                      <th className="p-3.5 text-center w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {queueList.map((ticket) => (
                      <tr key={ticket.ma_phieu} className="hover:bg-slate-50 transition text-xs">
                        <td className="p-3.5 font-mono font-extrabold text-blue-600 text-sm">
                          #{String(ticket.so_thu_tu).padStart(2, '0')}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {ticket.benhNhan?.ho_ten}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          #{ticket.benhNhan?.ma_benh_nhan}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {ticket.benhNhan?.so_dien_thoai}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {ticket.phongKham?.ten_phong}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {ticket.thoi_gian_lay_so ? new Date(ticket.thoi_gian_lay_so).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </td>
                        <td className="p-3.5 text-center">
                          {getStatusBadge(ticket.trang_thai)}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintSTT(ticket)}
                            className="p-1 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 hover:text-indigo-500 rounded transition"
                            title="In lại phiếu STT"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};
