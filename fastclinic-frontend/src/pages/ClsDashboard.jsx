import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import visitApi from '../services/visitApi';
import useSocket from '../hooks/useSocket';
import axios from 'axios';

export const ClsDashboard = () => {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  // States for the input forms inside details panel
  // We will map maKetQua -> { noiDung: string, file: File | null }
  const [inputForms, setInputForms] = useState({});
  const [submitting, setSubmitting] = useState({});

  // Socket for real-time queue reload
  const { socket } = useSocket('cls');

  const fetchWaitlist = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const response = await visitApi.getWaitingList('NV_CLS');
      if (response && response.success) {
        setWaitlist(response.data);
        
        // Sync selectedVisit if one is currently opened
        if (selectedVisit) {
          const updatedVisit = response.data.find(
            v => v.ma_luot_kham.toString() === selectedVisit.ma_luot_kham.toString()
          );
          setSelectedVisit(updatedVisit || null);
        }
      }
    } catch (err) {
      console.error('Error fetching CLS waitlist:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchWaitlist(true);
  }, []);

  // Socket trigger
  useEffect(() => {
    if (!socket) return;

    socket.on('queue-updated', () => {
      console.log('ClsDashboard: Socket queue-updated event. Refreshing waitlist...');
      fetchWaitlist(false);
    });

    return () => {
      socket.off('queue-updated');
    };
  }, [socket, selectedVisit]);

  // Sync inputForms when selectedVisit changes
  useEffect(() => {
    if (!selectedVisit) {
      setInputForms({});
      return;
    }

    const forms = {};
    selectedVisit.ketQuaCLSs?.filter(Boolean).forEach((order) => {
      forms[order.ma_ket_qua] = {
        noiDung: order.noi_dung || '',
        file: null
      };
    });
    setInputForms(forms);
  }, [selectedVisit]);

  // Input changes handler
  const handleTextChange = (maKetQua, value) => {
    setInputForms(prev => ({
      ...prev,
      [maKetQua]: {
        ...prev[maKetQua],
        noiDung: value
      }
    }));
  };

  // File selection validation
  const handleFileChange = (e, maKetQua) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file extension/type (PDF, JPG, PNG only)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Định dạng tệp không hỗ trợ! Chỉ cho phép tải lên tệp PDF, JPG hoặc PNG.');
      e.target.value = ''; // Reset input
      return;
    }

    // Size limit check (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Dung lượng tệp vượt quá giới hạn (Tối đa 10MB)! Vui lòng chọn tệp nhỏ hơn.');
      e.target.value = ''; // Reset input
      return;
    }

    setInputForms(prev => ({
      ...prev,
      [maKetQua]: {
        ...prev[maKetQua],
        file: file
      }
    }));
  };

  // Submit result handler
  const handleSaveResult = async (maKetQua) => {
    const formDataState = inputForms[maKetQua];
    if (!formDataState || !formDataState.noiDung || !formDataState.noiDung.trim()) {
      alert('Vui lòng nhập nội dung kết quả cận lâm sàng.');
      return;
    }

    setSubmitting(prev => ({ ...prev, [maKetQua]: true }));
    try {
      const formData = new FormData();
      formData.append('noiDung', formDataState.noiDung);
      if (formDataState.file) {
        formData.append('file', formDataState.file);
      }

      const response = await visitApi.updateLabResult(maKetQua, formData);
      if (response && response.success) {
        alert('Cập nhật kết quả cận lâm sàng thành công!');
        
        // Re-load waitlist to sync state
        await fetchWaitlist(false);
      } else {
        alert(response.message || 'Lỗi khi lưu kết quả.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.';
      alert(errMsg);
    } finally {
      setSubmitting(prev => ({ ...prev, [maKetQua]: false }));
    }
  };

  // Calculations for dashboard indicators
  const statsWaiting = waitlist.length;
  const statsCompletedToday = 0; // Backend statistic stub or display placeholder

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

  const getBackendBaseUrl = () => {
    return (axios.defaults.baseURL || 'http://localhost:5000/api').replace('/api', '');
  };

  return (
    <DashboardLayout title="Bảng Thực Hiện Cận Lâm Sàng">
      
      {/* Top Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1">
            Bệnh nhân đang chờ CLS
          </div>
          <div className="text-3xl font-extrabold text-slate-800 flex items-center space-x-2">
            <span>{statsWaiting} Bệnh nhân</span>
            {statsWaiting > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </div>
          <div className="text-xs text-amber-700 font-medium mt-1">Đang đợi chỉ định dịch vụ / nhập kết quả</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1">
            Quy trình đính kèm tệp
          </div>
          <div className="text-sm font-bold text-emerald-700 mt-1">
            Cho phép: PDF, JPG, PNG &lt; 10MB
          </div>
          <div className="text-xs text-slate-400 mt-1">Hệ thống tự động kiểm duyệt dung lượng</div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-550 mb-1">
            Hàng đợi tự động
          </div>
          <div className="text-3xl font-extrabold text-indigo-650">SOCKET READY</div>
          <div className="text-xs text-slate-400 mt-1">Đồng bộ tự động với bác sĩ điều trị</div>
        </div>
      </div>

      {/* Main Grid: Waiting List and Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Queue list (7 cols or full) */}
        <div className={`${selectedVisit ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-2xl shadow-sm p-5 transition-all duration-300`}>
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-200">
            <h3 className="text-base font-extrabold text-slate-800">Danh sách chỉ định cận lâm sàng</h3>
            <button 
              onClick={() => fetchWaitlist(true)} 
              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
              <span>Làm mới</span>
            </button>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-3 text-slate-500 text-xs font-semibold">Đang tải danh sách chờ...</p>
            </div>
          ) : waitlist.length === 0 ? (
            <div className="py-20 text-center text-slate-550 border border-dashed border-slate-200 rounded-2xl">
              <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="font-bold text-sm">Hàng chờ trống</p>
              <p className="text-xs text-slate-450 mt-1">Hiện không có bệnh nhân nào đang chờ kết quả cận lâm sàng.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-4">STT</th>
                    <th className="p-4">Bệnh nhân</th>
                    <th className="p-4">Phòng chỉ định</th>
                    <th className="p-4">Số kỹ thuật</th>
                    <th className="p-4">Tiến độ</th>
                    <th className="p-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {waitlist.map((item) => {
                    const isSelected = selectedVisit?.ma_luot_kham === item.ma_luot_kham;
                    const ordersCount = item.ketQuaCLSs?.length || 0;
                    const completedCount = item.ketQuaCLSs?.filter(Boolean).filter(o => o.noi_dung !== null).length || 0;
                    
                    return (
                      <tr 
                        key={item.ma_luot_kham} 
                        className={`transition hover:bg-slate-50 ${
                          isSelected ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <td className="p-4 font-mono font-bold text-slate-700">
                          {String(item.phieuKham?.so_thu_tu || 0).padStart(3, '0')}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          <div>{item.benhNhan?.ho_ten}</div>
                          <div className="text-[10px] text-slate-450 font-mono">
                            BN{String(item.benhNhan?.ma_benh_nhan).padStart(4, '0')}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 text-xs">
                          {item.phongKham?.ten_phong}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-600 text-xs">
                          {ordersCount} chỉ định
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            completedCount === ordersCount
                              ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                              : 'bg-amber-50 border-amber-250 text-amber-700'
                          }`}>
                            {completedCount}/{ordersCount} Đã xong
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setSelectedVisit(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              isSelected
                                ? 'bg-slate-100 border border-slate-200 text-indigo-700'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-600/10'
                            }`}
                          >
                            Nhập kết quả
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Detail and submit form (5 cols) */}
        {selectedVisit && (
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-slate-850 text-base">Chi tiết chỉ định kỹ thuật</h3>
                <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide">
                  Bệnh nhân: <span className="text-indigo-650 font-bold">{selectedVisit.benhNhan?.ho_ten}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedVisit(null)}
                className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Patient Administrative Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Giới tính:</span>
                <span className="font-bold text-slate-700">{selectedVisit.benhNhan?.gioi_tinh}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tuổi:</span>
                <span className="font-bold text-slate-700">{calculateAge(selectedVisit.benhNhan?.ngay_sinh)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Số điện thoại:</span>
                <span className="font-bold text-slate-700">{selectedVisit.benhNhan?.so_dien_thoai || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Huyết áp / Nhịp tim đo tại phòng khám:</span>
                <span className="font-bold text-rose-700">
                  {selectedVisit.sinhHieu?.huyet_ap || '--'} mmHg / {selectedVisit.sinhHieu?.nhip_tim || '--'} bpm
                </span>
              </div>
            </div>

            {/* List of Ordered CLS and input forms */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {selectedVisit.ketQuaCLSs?.filter(Boolean).map((order) => {
                const isCompleted = order.noi_dung !== null;
                const formState = inputForms[order.ma_ket_qua] || { noiDung: '', file: null };
                const isSaving = submitting[order.ma_ket_qua] || false;

                return (
                  <div key={order.ma_ket_qua} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="font-extrabold text-sm text-slate-750">
                        {order.dichVuCLS?.ten_dich_vu || order.loai_cls}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                          : 'bg-amber-50 border-amber-250 text-amber-705'
                      }`}>
                        {isCompleted ? 'Đã nhập kết quả' : 'Chờ kết quả'}
                      </span>
                    </div>

                    {!isCompleted ? (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Kết luận kỹ thuật <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows="3"
                            value={formState.noiDung}
                            onChange={(e) => handleTextChange(order.ma_ket_qua, e.target.value)}
                            placeholder="Nhập kết quả chuyên môn chi tiết..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition placeholder-slate-450 resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Đính kèm hình ảnh/tệp PDF kết quả
                          </label>
                          <input
                            type="file"
                            accept=".pdf, .jpg, .jpeg, .png"
                            onChange={(e) => handleFileChange(e, order.ma_ket_qua)}
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-705 hover:file:bg-slate-200 file:cursor-pointer bg-white border border-slate-200 rounded-xl p-2 focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            Chấp nhận .pdf, .jpg, .png, .jpeg (Tối đa 10MB)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveResult(order.ma_ket_qua)}
                          disabled={isSaving || !formState.noiDung.trim()}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-bold rounded-xl text-xs text-white transition shadow shadow-indigo-600/10 flex items-center justify-center space-x-1"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
                              <span>Đang lưu...</span>
                            </>
                          ) : (
                            <span>Lưu kết quả kỹ thuật</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 text-xs text-slate-600 bg-white border border-slate-200 p-3 rounded-xl">
                        <div>
                          <span className="text-[10px] text-slate-450 font-semibold block uppercase">Kết luận chuyên môn:</span>
                          <p className="font-semibold text-slate-750 whitespace-pre-line mt-1">{order.noi_dung}</p>
                        </div>
                        {order.file_dinh_kem && (
                          <div className="pt-2 border-t border-slate-100">
                            <a
                              href={`${getBackendBaseUrl()}/${order.file_dinh_kem}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-700 font-extrabold text-xs transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Tải xuống / Xem tệp kết quả</span>
                            </a>
                          </div>
                        )}
                        <div className="text-[9px] text-slate-400 pt-1 text-right">
                          Nhập lúc: {new Date(order.thoi_gian_nhap).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ClsDashboard;
