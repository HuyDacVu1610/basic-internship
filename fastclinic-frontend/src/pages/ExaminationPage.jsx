import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import visitApi from '../services/visitApi';
import queueApi from '../services/queueApi';
import useSocket from '../hooks/useSocket';
import axios from 'axios';

const getStatusBadge = (status) => {
  switch (status) {
    case 'CHO_BAC_SI':
      return <span className="text-amber-750 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Chờ khám</span>;
    case 'DANG_KHAM':
      return <span className="text-indigo-750 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Đang khám</span>;
    default:
      return <span className="text-slate-500 italic">Đang chờ CLS</span>;
  }
};

const getBackendBaseUrl = () => {
  return (axios.defaults.baseURL || 'http://localhost:5000/api').replace('/api', '');
};

export const ExaminationPage = () => {
  const { maLuotKham } = useParams();
  const navigate = useNavigate();
  
  // Room ID from local storage
  const maPhong = localStorage.getItem('fc_doctor_room') || '';

  // Core data states
  const [visit, setVisit] = useState(null);
  const [history, setHistory] = useState([]);
  const [waitlist, setWaitlist] = useState([]);

  // Tab and CLS states
  const [activeTab, setActiveTab] = useState('examine'); // 'examine', 'cls', 'prescription'
  const [clsServices, setClsServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [clsLoading, setClsLoading] = useState(false);
  const [clsSubmitting, setClsSubmitting] = useState(false);
  
  // Prescription states
  const [medicineQuery, setMedicineQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [qtyInput, setQtyInput] = useState('');
  const [dosageInput, setDosageInput] = useState('');
  const [usageInput, setUsageInput] = useState('');
  const [tempPrescription, setTempPrescription] = useState([]);
  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isPrescriptionSubmitting, setIsPrescriptionSubmitting] = useState(false);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form input states
  const [trieuChung, setTrieuChung] = useState('');
  const [chanDoan, setChanDoan] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  
  // Status message states
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });

  // Socket for real-time waitlist updates
  const { socket } = useSocket('doctor');

  // Helper for age
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

  // Helper for BMI calculation
  const calculateBMI = (weight, height) => {
    if (!weight || !height) return { bmi: 'N/A', status: 'N/A', color: 'text-slate-500' };
    const hMeter = height / 100;
    const bmiVal = (weight / (hMeter * hMeter)).toFixed(1);
    
    let status = 'Bình thường';
    let color = 'text-emerald-700';
    
    if (bmiVal < 18.5) {
      status = 'Gầy';
      color = 'text-sky-700';
    } else if (bmiVal >= 25 && bmiVal < 30) {
      status = 'Thừa cân';
      color = 'text-amber-700';
    } else if (bmiVal >= 30) {
      status = 'Béo phì';
      color = 'text-rose-700';
    }
    return { bmi: bmiVal, status, color };
  };

  // Check vitals threshold
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
    if (nhip_tim && nhip_tim > 100) hrHigh = true;
    if (nhiet_do && parseFloat(nhiet_do) > 38.0) tempHigh = true;

    return {
      abnormal: bpHigh || hrHigh || tempHigh,
      bpHigh,
      hrHigh,
      tempHigh
    };
  };

  // Toast auto-dismiss helper
  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage({ type: '', text: '' });
    }, 4000);
  };

  // Helper for expiry check
  const getDaysToExpiry = (expiryDateStr) => {
    if (!expiryDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Fetch the active patient details
  const fetchVisitDetail = async () => {
    setLoading(true);
    try {
      setError('');
      const response = await visitApi.getVisitDetail(maLuotKham);
      if (response && response.success) {
        const { visit: visitData, history: historyData } = response.data;
        setVisit(visitData);
        setHistory(historyData);
        // Pre-fill form fields
        setTrieuChung(visitData.trieu_chung || '');
        setChanDoan(visitData.chan_doan || '');
        setGhiChu(visitData.ghi_chu || '');

        // Pre-fill prescription if exists
        if (visitData.donThuoc) {
          setPrescriptionNote(visitData.donThuoc.ghi_chu || '');
          if (visitData.donThuoc.chiTietDonThuocs) {
            const items = visitData.donThuoc.chiTietDonThuocs.map(ct => ({
              maThuoc: ct.ma_thuoc,
              tenThuoc: ct.thuoc?.ten_thuoc || '',
              donViTinh: ct.thuoc?.don_vi_tinh || '',
              soLuongTon: ct.thuoc?.so_luong_ton || 0,
              gia: ct.don_gia || 0,
              hanDung: ct.thuoc?.han_dung || null,
              soLuong: ct.so_luong,
              lieuDung: ct.lieu_dung || '',
              cachDung: ct.cach_dung || ''
            }));
            setTempPrescription(items);
          }
        } else {
          setPrescriptionNote('');
          setTempPrescription([]);
        }
      } else {
        setError(response.message || 'Lỗi khi tải thông tin chi tiết lượt khám.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch only the room waitlist (for real-time socket or manual refresh)
  const fetchWaitlist = async () => {
    if (!maPhong) return;
    setWaitlistLoading(true);
    try {
      const response = await queueApi.getQueueList(maPhong);
      if (response && response.success) {
        // Exclude current visiting patient if desired, or show all
        setWaitlist(response.data);
      }
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    } finally {
      setWaitlistLoading(false);
    }
  };

  const fetchClsServices = async () => {
    setClsLoading(true);
    try {
      const response = await visitApi.getClsServices();
      if (response && response.success) {
        setClsServices(response.data);
      }
    } catch (err) {
      console.error('Error fetching CLS services:', err);
    } finally {
      setClsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchVisitDetail();
    fetchWaitlist();
    fetchClsServices();
  }, [maLuotKham]);

  // Autocomplete suggestions query handler
  useEffect(() => {
    if (medicineQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await visitApi.searchMedicines(medicineQuery);
        if (response && response.success) {
          setSuggestions(response.data || []);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Lỗi khi tìm kiếm thuốc:', err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [medicineQuery]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Socket subscription - ONLY update the waitlist sidebar, NEVER reset the examination form!
  useEffect(() => {
    if (!socket) return;

    socket.on('queue-updated', () => {
      console.log('ExaminationPage: Socket queue-updated. Refreshing sidebar waitlist ONLY.');
      fetchWaitlist();
    });

    socket.on('lab-result-updated', (payload) => {
      console.log('ExaminationPage: Socket lab-result-updated. Checking match...');
      if (payload.maLuotKham && payload.maLuotKham.toString() === maLuotKham.toString()) {
        showToast('success', `Đã có kết quả cận lâm sàng của bệnh nhân ${payload.hoTen}!`);
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Kết quả Cận lâm sàng', {
            body: `Đã có kết quả CLS mới cho BN ${payload.hoTen}`,
            icon: '/favicon.ico'
          });
        }
        
        fetchVisitDetail();
      }
    });

    return () => {
      socket.off('queue-updated');
      socket.off('lab-result-updated');
    };
  }, [socket, maPhong, maLuotKham]);

  // Form submission / Examination Save
  const handleSave = async (statusOverride = null) => {
    setSubmitting(true);
    try {
      const payload = {
        trieuChung,
        chanDoan,
        ghiChu,
        trangThai: statusOverride || undefined
      };

      const response = await visitApi.saveExamination(maLuotKham, payload);
      if (response && response.success) {
        if (statusOverride) {
          // If status changed (e.g. CHO_CLS, CHO_THANH_TOAN), navigate back to dashboard
          const statusLabels = {
            CHO_CLS: 'chỉ định Cận lâm sàng',
            CHO_THANH_TOAN: 'hoàn tất khám & chuyển thanh toán'
          };
          alert(`Đã ${statusLabels[statusOverride] || 'cập nhật trạng thái'} thành công!`);
          navigate('/doctor');
        } else {
          showToast('success', 'Đã lưu nháp tiến trình khám bệnh thành công.');
          // Update local visit data to reflect saved fields
          setVisit(prev => ({
            ...prev,
            trieu_chung: trieuChung,
            chan_doan: chanDoan,
            ghi_chu: ghiChu
          }));
        }
      } else {
        showToast('error', response.message || 'Lỗi khi lưu kết quả khám.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.';
      showToast('error', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleService = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleOrderCLS = async () => {
    if (selectedServices.length === 0) {
      alert('Vui lòng chọn ít nhất một dịch vụ cận lâm sàng.');
      return;
    }
    setClsSubmitting(true);
    try {
      const response = await visitApi.createLabOrders(maLuotKham, selectedServices);
      if (response && response.success) {
        showToast('success', 'Chỉ định cận lâm sàng thành công.');
        setSelectedServices([]); // clear selection
        await fetchVisitDetail(); // reload visit details to reflect the new ordered list
        // Refresh waitlist
        fetchWaitlist();
      } else {
        showToast('error', response.message || 'Lỗi khi chỉ định cận lâm sàng.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.';
      showToast('error', errMsg);
    } finally {
      setClsSubmitting(false);
    }
  };

  // Call or recall a patient from the sidebar waitlist
  const handleCallPatient = async (ticketId) => {
    try {
      const response = await queueApi.callPatient(ticketId);
      if (response && response.success) {
        // Navigate to the newly called patient's visit
        navigate(`/doctor/examine/${response.data.ma_luot_kham}`);
      } else {
        alert(response.message || 'Lỗi khi gọi khám.');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error?.message || err.message || 'Lỗi khi gọi khám.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Phòng Khám Bác Sĩ (Examination)">
        <div className="py-32 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-500 font-bold">Đang tải thông tin lượt khám bệnh nhân...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !visit) {
    return (
      <DashboardLayout title="Phòng Khám Bác Sĩ (Examination)">
        <div className="max-w-xl mx-auto my-16 p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p className="font-bold text-lg mb-2">Không tìm thấy lượt khám</p>
          <p className="text-sm text-slate-500 mb-6">{error || 'Thông tin lượt khám không hợp lệ hoặc đã bị xóa.'}</p>
          <button onClick={() => navigate('/doctor')} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200 transition">
            Quay lại trang chủ
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const sinhHieu = visit.sinhHieu;
  const vitalsStatus = checkVitalsThreshold(sinhHieu);
  const bmiInfo = calculateBMI(sinhHieu?.can_nang, sinhHieu?.chieu_cao);

  const orderedServiceIds = new Set((visit?.ketQuaCLSs || []).filter(Boolean).map(k => k.ma_dich_vu).filter(Boolean));

  return (
    <DashboardLayout title={`Khám Bệnh: ${visit.benhNhan?.ho_ten}`}>
      
      {/* Toast alert system */}
      {toastMessage.text && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center space-x-2 border transition duration-300 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-250 text-emerald-700' 
            : 'bg-red-50 border border-red-250 text-red-700'
        }`}>
          {toastMessage.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          )}
          <span className="text-sm font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* 3-Panel Grid with Sidebar layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* SIDEBAR: WAITLIST (3 cols) */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 self-stretch">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide flex items-center space-x-1.5">
              <svg className="w-4 h-4 text-indigo-650" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Hàng chờ trong phòng</span>
            </h3>
            <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">
              {waitlist.length} BN
            </span>
          </div>

          {waitlistLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Đang cập nhật...</div>
          ) : waitlist.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Không có bệnh nhân chờ.</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {waitlist.map((ticket) => {
                const isCurrent = ticket.luotKhams?.[0]?.ma_luot_kham?.toString() === maLuotKham;
                const activeVisit = ticket.luotKhams?.[0];
                return (
                  <div 
                    key={ticket.ma_phieu} 
                    className={`p-3 rounded-xl border transition flex flex-col space-y-2 ${
                      isCurrent 
                        ? 'bg-indigo-50/70 border-indigo-250 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[10px] font-extrabold font-mono px-2 py-0.5 rounded ${
                          isCurrent 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {String(ticket.so_thu_tu).padStart(3, '0')}
                        </span>
                        <span className="font-bold text-xs text-slate-800 max-w-[110px] truncate uppercase">
                          {ticket.benhNhan?.ho_ten}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">
                        BN{String(ticket.benhNhan?.ma_benh_nhan).padStart(4, '0')}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        {getStatusBadge(ticket.trang_thai)}
                      
                      {/* Call/Recall controls */}
                      {ticket.trang_thai === 'CHO_BAC_SI' && (
                        <button 
                          onClick={() => handleCallPatient(ticket.ma_phieu)}
                          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-[9px] transition"
                        >
                          Gọi khám
                        </button>
                      )}
                      {ticket.trang_thai === 'DANG_KHAM' && !isCurrent && activeVisit && (
                        <button 
                          onClick={() => navigate(`/doctor/examine/${activeVisit.ma_luot_kham}`)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[9px] transition"
                        >
                          Vào khám
                        </button>
                      )}
                      {isCurrent && (
                        <button 
                          onClick={() => handleCallPatient(ticket.ma_phieu)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[9px] border border-slate-200 flex items-center space-x-0.5"
                          title="Gọi lại bệnh nhân này"
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
                          </svg>
                          <span>Gọi loa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN LEFT: PATIENT INFO & VITALS (3 cols) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Patient Administrative Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-500 text-sm mb-4 tracking-wide pb-1 border-b border-slate-100 uppercase">
              Thông tin hành chính
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-450 block">Mã bệnh nhân</label>
                <div className="text-sm font-mono font-bold text-indigo-650">
                  BN{String(visit.benhNhan?.ma_benh_nhan).padStart(5, '0')}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-450 block">Họ và tên</label>
                <div className="text-base font-extrabold text-slate-800 uppercase">{visit.benhNhan?.ho_ten}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Giới tính</label>
                  <div className="text-sm font-bold text-slate-700">{visit.benhNhan?.gioi_tinh}</div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-450 block">Tuổi</label>
                  <div className="text-sm font-bold text-slate-700">{calculateAge(visit.benhNhan?.ngay_sinh)}</div>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-450 block">Số điện thoại</label>
                <div className="text-sm font-semibold text-slate-700">{visit.benhNhan?.so_dien_thoai || 'N/A'}</div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-450 block">Địa chỉ</label>
                <div className="text-xs text-slate-600 leading-relaxed">{visit.benhNhan?.dia_chi || 'N/A'}</div>
              </div>
            </div>

            {/* Allergies Highlight Card (Critically Important for Doctors!) */}
            <div className="mt-5">
              {visit.benhNhan?.tien_su_di_ung ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700">
                  <div className="flex items-center space-x-1.5 font-bold text-xs uppercase tracking-wide mb-1">
                    <svg className="w-4 h-4 text-red-650 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <span>Tiền sử dị ứng</span>
                  </div>
                  <p className="text-xs font-semibold">{visit.benhNhan.tien_su_di_ung}</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-450 text-xs italic text-center">
                  Không ghi nhận tiền sử dị ứng
                </div>
              )}
            </div>
          </div>

          {/* Vitals Highlights Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-slate-500 text-sm mb-4 tracking-wide pb-1 border-b border-slate-100 uppercase">
              Chỉ số sinh hiệu
            </h3>
            
            {!sinhHieu ? (
              <div className="py-6 text-center text-xs text-slate-450 border border-dashed border-slate-200 rounded-xl">
                Bệnh nhân chưa đo sinh hiệu
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Blood Pressure */}
                <div className={`p-3 rounded-xl border ${
                  vitalsStatus.bpHigh 
                    ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Huyết áp</span>
                    {vitalsStatus.bpHigh && <span className="animate-pulse">Bất thường!</span>}
                  </div>
                  <div className="text-lg font-black font-mono">
                    {sinhHieu.huyet_ap} <span className="text-xs font-normal text-slate-400">mmHg</span>
                  </div>
                </div>

                {/* Heart Rate */}
                <div className={`p-3 rounded-xl border ${
                  vitalsStatus.hrHigh 
                    ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Nhịp tim</span>
                    {vitalsStatus.hrHigh && <span className="animate-pulse">Bất thường!</span>}
                  </div>
                  <div className="text-lg font-black font-mono">
                    {sinhHieu.nhip_tim} <span className="text-xs font-normal text-slate-400">bpm</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className={`p-3 rounded-xl border ${
                  vitalsStatus.tempHigh 
                    ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                    : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Nhiệt độ</span>
                    {vitalsStatus.tempHigh && <span className="animate-pulse">Sốt!</span>}
                  </div>
                  <div className="text-lg font-black font-mono">
                    {sinhHieu.nhiet_do}°C
                  </div>
                </div>

                {/* Anthropometrics & BMI */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-slate-450 font-bold block">Chiều cao</span>
                    <span className="text-sm font-extrabold text-slate-800 font-mono">{sinhHieu.chieu_cao || '--'}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">cm</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-slate-450 font-bold block">Cân nặng</span>
                    <span className="text-sm font-extrabold text-slate-800 font-mono">{sinhHieu.can_nang || '--'}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">kg</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block">Chỉ số BMI</span>
                    <span className="text-lg font-black text-slate-800 font-mono">{bmiInfo.bmi}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-450 font-bold block">Phân loại</span>
                    <span className={`text-xs font-bold ${bmiInfo.color}`}>{bmiInfo.status}</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* COLUMN MIDDLE: EXAMINATION FORM & TABS (4 cols) */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col min-h-[600px]">
          
          {/* Tab Selection Headers */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab('examine')}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition ${
                activeTab === 'examine'
                  ? 'border-indigo-650 text-slate-850'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Khám lâm sàng
            </button>
            <button
              onClick={() => setActiveTab('cls')}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition flex items-center justify-center space-x-1.5 ${
                activeTab === 'cls'
                  ? 'border-indigo-650 text-slate-850'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Chỉ định CLS</span>
              {visit?.ketQuaCLSs?.filter(Boolean).length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  visit.ketQuaCLSs.filter(Boolean).every(k => k.noi_dung !== null)
                    ? 'bg-emerald-50 border border-emerald-250 text-emerald-700'
                    : 'bg-amber-50 border border-amber-250 text-amber-700'
                }`}>
                  {visit.ketQuaCLSs.filter(Boolean).filter(k => k.noi_dung !== null).length}/{visit.ketQuaCLSs.filter(Boolean).length} Đã có KQ
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('prescription')}
              className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition ${
                activeTab === 'prescription'
                  ? 'border-indigo-650 text-slate-850'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Kê đơn thuốc
            </button>
          </div>

          {activeTab === 'examine' ? (
            <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <label htmlFor="trieu-chung" className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Triệu chứng lâm sàng <span className="text-slate-400">*</span>
                  </label>
                  <textarea 
                    id="trieu-chung"
                    rows="4" 
                    value={trieuChung}
                    onChange={(e) => setTrieuChung(e.target.value)}
                    placeholder="Nhập triệu chứng bệnh nhân khai..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition resize-none placeholder-slate-400"
                  />
                </div>

                <div>
                  <label htmlFor="chan-doan" className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Chẩn đoán xác định <span className="text-slate-400">*</span>
                  </label>
                  <textarea 
                    id="chan-doan"
                    rows="4" 
                    value={chanDoan}
                    onChange={(e) => setChanDoan(e.target.value)}
                    placeholder="Nhập chẩn đoán lâm sàng..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition resize-none placeholder-slate-400"
                  />
                </div>

                <div>
                  <label htmlFor="ghi-chu" className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Ghi chú điều trị / Lời khuyên bác sĩ
                  </label>
                  <textarea 
                    id="ghi-chu"
                    rows="3" 
                    value={ghiChu}
                    onChange={(e) => setGhiChu(e.target.value)}
                    placeholder="Nhập ghi chú hoặc hướng dẫn điều trị thêm..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition resize-none placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Action buttons list */}
              <div className="pt-4 border-t border-slate-200 space-y-3 mt-auto">
                <button 
                  type="button"
                  onClick={() => handleSave(null)}
                  disabled={submitting || !trieuChung || !chanDoan}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 text-slate-700 border border-slate-200 disabled:border-slate-200 font-bold rounded-xl text-sm transition shadow-sm"
                >
                  {submitting ? 'Đang thực hiện...' : 'Lưu nháp tiến trình'}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveTab('cls');
                    }}
                    disabled={submitting || !trieuChung || !chanDoan}
                    className="py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-100 disabled:text-slate-400 font-bold rounded-xl text-xs text-white transition shadow shadow-amber-600/10 text-center"
                  >
                    Chỉ định Cận lâm sàng
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSave('CHO_THANH_TOAN')}
                    disabled={submitting || !trieuChung || !chanDoan}
                    className="py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 font-bold rounded-xl text-xs text-white transition shadow shadow-indigo-600/10"
                  >
                    Cho đơn & Hoàn tất
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => navigate('/doctor')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Quay lại bảng điều khiển
                </button>
              </div>
            </form>
          ) : activeTab === 'cls' ? (
            <div className="flex-1 flex flex-col space-y-6">
              {/* List of current ordered CLS */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Danh sách chỉ định cận lâm sàng hiện tại
                </h4>
                
                {!visit?.ketQuaCLSs || visit.ketQuaCLSs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-450 border border-dashed border-slate-200 rounded-xl">
                    Chưa có chỉ định cận lâm sàng nào cho lượt khám này.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {(visit.ketQuaCLSs || []).filter(Boolean).map((item) => {
                      const hasResult = item.noi_dung !== null;
                      return (
                        <div key={item.ma_ket_qua} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-slate-800">
                              {item.dichVuCLS?.ten_dich_vu || item.loai_cls}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              hasResult
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-700'
                                : 'bg-amber-50 border-amber-250 text-amber-750 animate-pulse'
                            }`}>
                              {hasResult ? 'Đã có kết quả' : 'Chờ kết quả'}
                            </span>
                          </div>
                          {hasResult && (
                            <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                              <div className="text-[10px] text-slate-450 font-semibold mb-1">
                                Kết quả:
                              </div>
                              <p className="whitespace-pre-line font-medium mb-1.5">{item.noi_dung}</p>
                              
                              {item.file_dinh_kem && (
                                <a
                                  href={`${getBackendBaseUrl()}/${item.file_dinh_kem}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-500 font-bold text-xs transition"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.0" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span>Xem tài liệu đính kèm</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order form */}
              <div className="flex-1 flex flex-col border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Chỉ định dịch vụ mới
                </h4>

                {clsLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Đang tải danh mục...</div>
                ) : clsServices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">Không có dịch vụ cận lâm sàng.</div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 mb-4">
                      {(Array.isArray(clsServices) ? clsServices : []).filter(Boolean).map((service) => {
                        const isSelected = selectedServices.includes(service.ma_dich_vu);
                        const isOrdered = orderedServiceIds.has(service.ma_dich_vu);
                        
                        return (
                          <label 
                            key={service.ma_dich_vu}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                              isOrdered
                                ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-50/50 border-indigo-200'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                disabled={isOrdered}
                                onChange={() => handleToggleService(service.ma_dich_vu)}
                                className="w-4 h-4 rounded text-indigo-650 focus:ring-indigo-500 bg-white border-slate-350"
                              />
                              <span className="text-xs font-bold text-slate-700">{service.ten_dich_vu}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                              {parseFloat(service.gia || service.gia_dich_vu || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="space-y-2 mt-auto">
                      <button 
                        type="button"
                        onClick={handleOrderCLS}
                        disabled={clsSubmitting || selectedServices.length === 0}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-405 disabled:border-slate-200 font-bold rounded-xl text-sm text-white transition shadow shadow-indigo-600/10"
                      >
                        {clsSubmitting ? 'Đang gửi chỉ định...' : `Xác nhận chỉ định CLS (${selectedServices.length})`}
                      </button>
                      
                      <button 
                        type="button"
                        onClick={() => setActiveTab('prescription')}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
                      >
                        Chuyển sang Tab Kê đơn
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab 3: Prescription Form */
            <div className="flex-1 flex flex-col space-y-6">
              {/* Autocomplete Search input */}
              <div className="relative">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Tìm kiếm thuốc kê đơn <span className="text-indigo-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={medicineQuery}
                    onChange={(e) => setMedicineQuery(e.target.value)}
                    placeholder="Tìm thuốc theo tên hoặc hoạt chất (gõ >= 2 ký tự)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition placeholder-slate-400"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-3.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                    </div>
                  )}
                </div>
                
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((med) => {
                      const daysToExpiry = getDaysToExpiry(med.han_dung);
                      const isExpiringSoon = daysToExpiry !== null && daysToExpiry < 7;
                      
                      let stockBadgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-250';
                      let stockLabel = `Còn: ${med.so_luong_ton} ${med.don_vi_tinh}`;
                      if (med.so_luong_ton === 0) {
                         stockBadgeColor = 'text-rose-700 bg-rose-50 border-rose-250';
                        stockLabel = 'Hết hàng';
                      } else if (med.so_luong_ton <= 10) {
                         stockBadgeColor = 'text-amber-700 bg-amber-50 border-amber-250';
                        stockLabel = `Còn ít: ${med.so_luong_ton} ${med.don_vi_tinh}`;
                      }

                      return (
                        <button
                          key={med.ma_thuoc}
                          type="button"
                          onClick={() => {
                            setSelectedMedicine(med);
                            setMedicineQuery('');
                            setSuggestions([]);
                            setQtyInput('1');
                            setDosageInput('');
                            setUsageInput('');
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 flex justify-between items-center transition"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-800 uppercase">{med.ten_thuoc}</div>
                            <div className="text-[10px] text-slate-500">
                              {med.hoat_chat} {med.ham_luong ? `- ${med.ham_luong}` : ''}
                            </div>
                            {med.han_dung && (
                              <div className="text-[9px] text-slate-400">
                                Hạn dùng: {new Date(med.han_dung).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${stockBadgeColor}`}>
                              {stockLabel}
                            </span>
                            {isExpiringSoon && (
                              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-yellow-550/10 border border-yellow-500/20 text-yellow-700 animate-pulse">
                                Hạn gần ({daysToExpiry} ngày)
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form input details */}
              {selectedMedicine && (
                <div className="p-4 bg-slate-50 border border-indigo-200 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wide">Thuốc đã chọn</h5>
                      <div className="text-sm font-extrabold text-slate-800 uppercase">{selectedMedicine.ten_thuoc}</div>
                      <div className="text-xs text-slate-500">
                        {selectedMedicine.hoat_chat} {selectedMedicine.ham_luong ? `(${selectedMedicine.ham_luong})` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMedicine(null)}
                      className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                        Số lượng ({selectedMedicine.don_vi_tinh})
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Đơn giá</label>
                      <div className="text-sm font-extrabold font-mono text-slate-700 mt-2">
                        {selectedMedicine.gia.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>

                  {/* Real-time stock limit validation */}
                  {parseInt(qtyInput, 10) > selectedMedicine.so_luong_ton && (
                    <div className="text-xs font-bold text-rose-600 flex items-center space-x-1.5">
                      <svg className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Số lượng kê đơn vượt quá tồn kho (Tối đa: {selectedMedicine.so_luong_ton})</span>
                    </div>
                  )}

                  {parseInt(qtyInput, 10) <= 0 && (
                    <div className="text-xs font-bold text-rose-650">
                      Số lượng kê đơn phải lớn hơn hoặc bằng 1.
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Liều dùng</label>
                      <input
                        type="text"
                        value={dosageInput}
                        onChange={(e) => setDosageInput(e.target.value)}
                        placeholder="Ví dụ: Sáng 1 viên, tối 1 viên sau ăn"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Cách dùng</label>
                      <input
                        type="text"
                        value={usageInput}
                        onChange={(e) => setUsageInput(e.target.value)}
                        placeholder="Ví dụ: Uống với nước ấm"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !qtyInput ||
                      parseInt(qtyInput, 10) <= 0 ||
                      parseInt(qtyInput, 10) > selectedMedicine.so_luong_ton
                    }
                    onClick={() => {
                      const newItem = {
                        maThuoc: selectedMedicine.ma_thuoc,
                        tenThuoc: selectedMedicine.ten_thuoc,
                        donViTinh: selectedMedicine.don_vi_tinh,
                        soLuongTon: selectedMedicine.so_luong_ton,
                        gia: parseFloat(selectedMedicine.gia),
                        hanDung: selectedMedicine.han_dung,
                        soLuong: parseInt(qtyInput, 10),
                        lieuDung: dosageInput,
                        cachDung: usageInput
                      };

                      setTempPrescription(prev => {
                        const index = prev.findIndex(item => item.maThuoc === newItem.maThuoc);
                        if (index > -1) {
                          const updated = [...prev];
                          updated[index] = newItem;
                          return updated;
                        }
                        return [...prev, newItem];
                      });

                      setSelectedMedicine(null);
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-bold rounded-xl text-xs text-white transition"
                  >
                    Thêm vào đơn thuốc
                  </button>
                </div>
              )}

              {/* Temporary Prescription list */}
              <div className="flex-1 flex flex-col border-t border-slate-200 pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Danh sách đơn thuốc tạm thời
                  </h4>
                  <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">
                    {tempPrescription.length} thuốc
                  </span>
                </div>

                {tempPrescription.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    Chưa có thuốc nào trong đơn. Tìm kiếm ở trên để thêm.
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 mb-4">
                      {tempPrescription.map((item) => {
                        const daysToExpiry = getDaysToExpiry(item.hanDung);
                        const isExpiringSoon = daysToExpiry !== null && daysToExpiry < 7;
                        const itemTotal = item.gia * item.soLuong;

                        return (
                          <div key={item.maThuoc} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                            <button
                              type="button"
                              onClick={() => {
                                setTempPrescription(prev => prev.filter(i => i.maThuoc !== item.maThuoc));
                              }}
                              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-rose-600 transition"
                              title="Xóa khỏi đơn"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>

                            <div className="pr-6">
                              <div className="font-bold text-xs text-slate-800 uppercase">{item.tenThuoc}</div>
                              <div className="text-[10px] text-slate-500">
                                Số lượng: <span className="font-extrabold text-slate-700 font-mono">{item.soLuong}</span> {item.donViTinh} &times; {item.gia.toLocaleString('vi-VN')} đ
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-200">
                              <div className="text-slate-500 italic truncate max-w-[200px]" title={item.lieuDung}>
                                HD: {item.lieuDung || 'Chưa nhập liều'} {item.cachDung ? `(${item.cachDung})` : ''}
                              </div>
                              <div className="font-mono font-bold text-indigo-700">
                                {itemTotal.toLocaleString('vi-VN')} đ
                              </div>
                            </div>

                            {isExpiringSoon && (
                              <div className="mt-1 flex items-center space-x-1.5 bg-yellow-50 border border-yellow-200 text-yellow-850 rounded-lg px-2 py-0.5 text-[9px] font-semibold">
                                <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Cảnh báo: Thuốc sắp hết hạn (còn {daysToExpiry} ngày)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Prescription Note */}
                    <div className="mb-4">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Ghi chú đơn thuốc</label>
                      <input
                        type="text"
                        value={prescriptionNote}
                        onChange={(e) => setPrescriptionNote(e.target.value)}
                        placeholder="Lời dặn bác sĩ về đơn thuốc..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Submit action */}
                    <div className="space-y-3 pt-3 border-t border-slate-200 mt-auto">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">Tổng chi phí:</span>
                        <span className="text-base font-black text-indigo-750 font-mono">
                          {tempPrescription.reduce((sum, item) => sum + item.gia * item.soLuong, 0).toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setIsPrescriptionSubmitting(true);
                          try {
                            // Save clinical examination details first to persist diagnosis
                            await visitApi.saveExamination(maLuotKham, {
                              trieuChung,
                              chanDoan,
                              ghiChu
                            });

                            const payload = {
                              ghiChu: prescriptionNote,
                              thuocs: tempPrescription.map(item => ({
                                maThuoc: item.maThuoc,
                                soLuong: item.soLuong,
                                lieuDung: item.lieuDung,
                                cachDung: item.cachDung
                              }))
                            };

                            const res = await visitApi.savePrescription(maLuotKham, payload);
                            if (res && res.success) {
                              if (res.data?.warnings && res.data.warnings.length > 0) {
                                alert(`Đơn thuốc đã được lưu thành công!\n\nLưu ý cảnh báo hạn dùng:\n${res.data.warnings.join('\n')}`);
                              } else {
                                alert('Kê đơn thuốc thành công!');
                              }
                              navigate('/doctor');
                            } else {
                              alert(res.message || 'Lỗi khi lưu đơn thuốc.');
                            }
                          } catch (err) {
                            console.error(err);
                            const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.';
                            alert(errMsg);
                          } finally {
                            setIsPrescriptionSubmitting(false);
                          }
                        }}
                        disabled={isPrescriptionSubmitting || tempPrescription.length === 0}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-bold rounded-xl text-sm text-white transition shadow shadow-indigo-600/10"
                      >
                        {isPrescriptionSubmitting ? 'Đang gửi...' : 'Xác nhận & Lưu đơn thuốc'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('examine')}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
                      >
                        Quay lại Tab Khám lâm sàng
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMN RIGHT: HISTORICAL VISITS (2 cols) */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-slate-500 text-sm mb-4 tracking-wide pb-1 border-b border-slate-100 uppercase">
            Lịch sử khám (3 lượt)
          </h3>

          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Không có dữ liệu lịch sử
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((histVisit, idx) => {
                const histVitals = checkVitalsThreshold(histVisit.sinhHieu);
                return (
                  <div key={histVisit.ma_luot_kham} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-indigo-700 font-bold">
                      <span>Lượt #{idx + 1}</span>
                      <span className="text-slate-400">{new Date(histVisit.thoi_gian_kham || histVisit.ma_luot_kham).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Chẩn đoán</span>
                      <p className="text-xs text-slate-700 font-semibold line-clamp-2" title={histVisit.chan_doan}>
                        {histVisit.chan_doan || 'Chưa chẩn đoán'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Triệu chứng</span>
                      <p className="text-xs text-slate-600 line-clamp-2" title={histVisit.trieu_chung}>
                        {histVisit.trieu_chung || 'Chưa ghi nhận'}
                      </p>
                    </div>
                    
                    {histVisit.sinhHieu && (
                      <div className="pt-1 border-t border-slate-200 text-[10px] text-slate-455 flex justify-between">
                        <span>HA: {histVisit.sinhHieu.huyet_ap || '--'}</span>
                        <span>T°: {histVisit.sinhHieu.nhiet_do || '--'}°C</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </DashboardLayout>
  );
};

export default ExaminationPage;
