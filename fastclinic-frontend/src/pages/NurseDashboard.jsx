import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import visitApi from '../services/visitApi';
import useSocket from '../hooks/useSocket';

export const NurseDashboard = () => {
  const [waitingList, setWaitingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  
  // Vital signs form fields
  const [huyetAp, setHuyetAp] = useState('');
  const [nhipTim, setNhipTim] = useState('');
  const [nhietDo, setNhietDo] = useState('');
  const [chieuCao, setChieuCao] = useState('');
  const [canNang, setCanNang] = useState('');

  // Local Storage for measured patient count
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
    const month = d.toLocaleDateString('en-US', { month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    const day = d.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    return `${year}-${month}-${day}`;
  };

  const todayKey = `fc_measured_count_${getLocalDateString()}`;
  const [measuredCount, setMeasuredCount] = useState(() => {
    const stored = localStorage.getItem(todayKey);
    return stored ? parseInt(stored, 10) : 0;
  });

  // Fetch the waiting list
  const fetchWaitingList = async () => {
    try {
      setError('');
      const response = await visitApi.getWaitingList('DIEU_DUONG');
      if (response && response.success) {
        setWaitingList(response.data);
      } else {
        setError(response.message || 'Lỗi khi tải danh sách hàng chờ.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchWaitingList();
  }, []);

  // Listen to socket.io events for real-time queue updates
  const { socket } = useSocket('nurse');

  useEffect(() => {
    if (!socket) return;

    socket.on('queue-updated', () => {
      console.log('NurseDashboard: queue-updated event received. Refreshing list...');
      fetchWaitingList();
    });

    return () => {
      socket.off('queue-updated');
    };
  }, [socket]);

  // Open vital signs modal
  const handleOpenModal = (visit) => {
    setSelectedVisit(visit);
    setHuyetAp('');
    setNhipTim('');
    setNhietDo('');
    setChieuCao('');
    setCanNang('');
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  // Close vital signs modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVisit(null);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    // Pre-validate format and clinical ranges of blood pressure if entered
    if (huyetAp) {
      if (!/^\d{2,3}\/\d{2,3}$/.test(huyetAp)) {
        setFormError('Huyết áp phải có định dạng chuẩn (ví dụ: 120/80).');
        setSubmitting(false);
        return;
      }
      const [sys, dia] = huyetAp.split('/').map(Number);
      if (sys < 50 || sys > 250) {
        setFormError('Huyết áp tâm thu không hợp lệ (từ 50 đến 250 mmHg).');
        setSubmitting(false);
        return;
      }
      if (dia < 30 || dia > 150) {
        setFormError('Huyết áp tâm trương không hợp lệ (từ 30 đến 150 mmHg).');
        setSubmitting(false);
        return;
      }
      if (sys <= dia) {
        setFormError('Huyết áp tâm thu phải lớn hơn huyết áp tâm trương.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        huyetAp: huyetAp || null,
        nhipTim: nhipTim ? parseInt(nhipTim, 10) : null,
        nhietDo: nhietDo ? parseFloat(nhietDo) : null,
        chieuCao: chieuCao ? parseFloat(chieuCao) : null,
        canNang: canNang ? parseFloat(canNang) : null
      };

      const response = await visitApi.recordVitalSigns(selectedVisit.ma_luot_kham, payload);

      if (response && response.success) {
        setFormSuccess('Lưu sinh hiệu thành công!');
        
        // Update measured count
        const nextCount = measuredCount + 1;
        setMeasuredCount(nextCount);
        localStorage.setItem(todayKey, nextCount.toString());

        // Refresh list
        await fetchWaitingList();

        // Close modal after success animation delay
        setTimeout(() => {
          handleCloseModal();
        }, 1000);
      } else {
        setFormError(response.message || 'Lỗi khi lưu sinh hiệu.');
      }
    } catch (err) {
      console.error(err);
      const errResponse = err.response?.data;
      setFormError(errResponse?.error?.message || err.message || 'Lỗi khi kết nối đến máy chủ.');
    } finally {
      setSubmitting(false);
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

  return (
    <DashboardLayout title="Bảng Thực Hiện Sinh Hiệu Điều Dưỡng (Nurse Dashboard)">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-550 mb-1">Đã đo sinh hiệu hôm nay</div>
          <div className="text-4xl font-black text-emerald-600">
            {measuredCount}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">Số bệnh nhân đã hoàn thành đo sinh hiệu</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-550 mb-1">Đang chờ đo sinh hiệu</div>
          <div className={`text-4xl font-black ${waitingList.length > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
            {waitingList.length}
          </div>
          <div className="text-xs text-slate-400 mt-1.5">Bệnh nhân đang đợi kiểm tra sinh hiệu</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-550 mb-1">Trạng thái công việc</div>
          <div className="text-xl font-bold text-indigo-600 mt-2 flex items-center">
            <span className="relative flex h-3.5 w-3.5 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-600"></span>
            </span>
            Sẵn sàng làm việc
          </div>
          <div className="text-xs text-slate-400 mt-2">Đồng bộ dữ liệu thời gian thực</div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 tracking-wide">Danh sách hàng đợi đo chỉ số sinh hiệu</h3>
          <button 
            onClick={fetchWaitingList}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-sm transition flex items-center space-x-1"
            title="Tải lại danh sách"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M21 21v-5h-.581m0 0a8.003 8.003 0 01-15.357-2M21 16h-5"></path>
            </svg>
            <span>Làm mới</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center space-x-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-sm text-slate-500">Đang tải dữ liệu hàng chờ sinh hiệu...</p>
          </div>
        ) : waitingList.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
            </svg>
            <p className="text-slate-500 font-bold">Không có bệnh nhân chờ đo sinh hiệu</p>
            <p className="text-slate-450 text-xs mt-1">Khi có bệnh nhân mới được tiếp nhận, danh sách sẽ tự động cập nhật.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-4 w-20">Số TT</th>
                  <th className="p-4 w-32">Mã lượt khám</th>
                  <th className="p-4">Họ và tên</th>
                  <th className="p-4">Tuổi / Giới tính</th>
                  <th className="p-4">Phòng khám chỉ định</th>
                  <th className="p-4">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {waitingList.map((visit) => (
                  <tr key={visit.ma_luot_kham} className="hover:bg-slate-50 transition duration-150">
                    <td className="p-4">
                      <span className="text-sm font-extrabold font-mono text-indigo-755 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {String(visit.phieuKham?.so_thu_tu).padStart(3, '0')}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-500 text-xs">
                      #{visit.ma_luot_kham}
                    </td>
                    <td className="p-4 font-bold text-slate-800 uppercase tracking-wide">
                      {visit.benhNhan?.ho_ten}
                    </td>
                    <td className="p-4 text-slate-600 text-xs font-semibold">
                      {calculateAge(visit.benhNhan?.ngay_sinh)} / {visit.benhNhan?.gioi_tinh === 'NAM' ? 'Nam' : 'Nữ'}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700 text-xs">{visit.phongKham?.ten_phong}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{visit.phongKham?.chuyen_khoa}</div>
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleOpenModal(visit)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-bold transition shadow shadow-indigo-600/10 flex items-center space-x-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <span>Đo sinh hiệu</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Light Clinical Vital Signs Form Modal */}
      {isModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">Nhập Chỉ Số Sinh Hiệu</h3>
                <p className="text-xs text-indigo-650 font-semibold tracking-wider uppercase mt-0.5">Bệnh nhân: {selectedVisit.benhNhan?.ho_ten}</p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-700 transition p-1 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Patient mini dashboard */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-700">
                <div>
                  <div className="text-slate-500 font-bold">Số thứ tự</div>
                  <div className="text-base font-extrabold text-indigo-650 font-mono mt-0.5">
                    {String(selectedVisit.phieuKham?.so_thu_tu).padStart(3, '0')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 font-bold">Lượt khám</div>
                  <div className="text-sm font-semibold text-slate-600 font-mono mt-0.5">#{selectedVisit.ma_luot_kham}</div>
                </div>
                <div>
                  <div className="text-slate-500 font-bold">Phòng khám</div>
                  <div className="text-xs font-semibold text-slate-600 truncate mt-1" title={selectedVisit.phongKham?.ten_phong}>
                    {selectedVisit.phongKham?.ten_phong}
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs flex items-center space-x-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Form Input fields */}
              <div className="space-y-4">
                {/* Blood Pressure Input */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label htmlFor="huyetAp" className="text-sm font-bold text-slate-700">
                    Huyết áp <span className="text-red-500">*</span>
                  </label>
                  <div className="col-span-2">
                    <input 
                      type="text" 
                      id="huyetAp"
                      value={huyetAp}
                      onChange={(e) => setHuyetAp(e.target.value)}
                      placeholder="Ví dụ: 120/80"
                      className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 focus:outline-none transition font-mono"
                      autoFocus
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Đơn vị: mmHg. Định dạng: tâm thu / tâm trương</span>
                  </div>
                </div>

                {/* Heart Rate Input */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label htmlFor="nhipTim" className="text-sm font-bold text-slate-700">Nhịp tim</label>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      id="nhipTim"
                      value={nhipTim}
                      onChange={(e) => setNhipTim(e.target.value)}
                      placeholder="Ví dụ: 80"
                      min="30"
                      max="200"
                      className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 focus:outline-none transition font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Đơn vị: lần/phút (Khoảng hợp lệ: 30 - 200)</span>
                  </div>
                </div>

                {/* Temperature Input */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label htmlFor="nhietDo" className="text-sm font-bold text-slate-700">Nhiệt độ</label>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      step="0.1"
                      id="nhietDo"
                      value={nhietDo}
                      onChange={(e) => setNhietDo(e.target.value)}
                      placeholder="Ví dụ: 36.5"
                      min="30"
                      max="45"
                      className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 focus:outline-none transition font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Đơn vị: °C (Khoảng hợp lệ: 30.0 - 45.0)</span>
                  </div>
                </div>

                {/* Height Input */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label htmlFor="chieuCao" className="text-sm font-bold text-slate-700">Chiều cao</label>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      step="0.1"
                      id="chieuCao"
                      value={chieuCao}
                      onChange={(e) => setChieuCao(e.target.value)}
                      placeholder="Ví dụ: 165"
                      min="30"
                      max="250"
                      className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 focus:outline-none transition font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Đơn vị: cm (Khoảng hợp lệ: 30 - 250)</span>
                  </div>
                </div>

                {/* Weight Input */}
                <div className="grid grid-cols-3 items-center gap-4">
                  <label htmlFor="canNang" className="text-sm font-bold text-slate-700">Cân nặng</label>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      step="0.1"
                      id="canNang"
                      value={canNang}
                      onChange={(e) => setCanNang(e.target.value)}
                      placeholder="Ví dụ: 55"
                      min="1"
                      max="500"
                      className="w-full px-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-sm text-slate-800 focus:outline-none transition font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Đơn vị: kg (Khoảng hợp lệ: 1.0 - 500.0)</span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-bold transition"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex items-center space-x-1.5 shadow shadow-indigo-600/10"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Lưu kết quả</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default NurseDashboard;
