import React, { useState, useEffect } from 'react';
import patientApi from '../../services/patientApi';

export const PatientForm = ({ onSelectPatient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Patient form state
  const [maBenhNhan, setMaBenhNhan] = useState(null);
  const [hoTen, setHoTen] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [cccd, setCccd] = useState('');
  const [ngaySinh, setNgaySinh] = useState('');
  const [gioiTinh, setGioiTinh] = useState('Nam');
  const [diaChi, setDiaChi] = useState('');
  const [tienSuDiUng, setTienSuDiUng] = useState('');
  
  // Notification states
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  
  // Encounter history pagination state
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search patients
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setMessage({ type: '', text: '' });
    
    try {
      const res = await patientApi.searchPatients(searchQuery);
      if (res.success) {
        setSearchResults(res.data);
        if (res.data.length === 0) {
          // No patient found, reset form for new patient entry
          handleResetForm();
          setSoDienThoai(searchQuery); // Pre-fill search query into phone field
          setMessage({ type: 'info', text: 'Không tìm thấy bệnh nhân. Vui lòng điền thông tin để tạo hồ sơ mới.' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi tìm kiếm bệnh nhân.' });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search for patient autocomplete recommendations
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await patientApi.searchPatients(query);
        if (res.success) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error('Lỗi gợi ý tìm kiếm bệnh nhân:', err);
      }
    }, 300); // 300ms debounce to optimize performance

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Reset form to blank state
  const handleResetForm = () => {
    setMaBenhNhan(null);
    setHoTen('');
    setSoDienThoai('');
    setCccd('');
    setNgaySinh('');
    setGioiTinh('Nam');
    setDiaChi('');
    setTienSuDiUng('');
    setHistory([]);
    setHistoryPage(1);
    setHistoryTotalPages(1);
    setHistoryTotal(0);
    setMessage({ type: '', text: '' });
    setSearchQuery('');
    setSearchResults([]);
  };

  // Select patient from search results
  const handleSelectPatient = (patient) => {
    setMaBenhNhan(patient.ma_benh_nhan);
    setHoTen(patient.ho_ten || '');
    setSoDienThoai(patient.so_dien_thoai || '');
    setCccd(patient.cccd || '');
    setNgaySinh(patient.ngay_sinh || '');
    setGioiTinh(patient.gioi_tinh || 'Nam');
    setDiaChi(patient.dia_chi || '');
    setTienSuDiUng(patient.tien_su_di_ung || '');
    setSearchResults([]);
    setSearchQuery('');
    setMessage({ type: 'success', text: `Đã tải hồ sơ bệnh nhân: ${patient.ho_ten}` });

    if (onSelectPatient) {
      onSelectPatient(patient);
    }
  };

  // Load encounter history
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await patientApi.getPatientHistory(maBenhNhan, historyPage, 5);
        if (res.success) {
          setHistory(res.data.history);
          setHistoryTotalPages(res.data.totalPages);
          setHistoryTotal(res.data.total);
        }
      } catch (err) {
        console.error('Lỗi tải lịch sử khám bệnh:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (maBenhNhan) {
      fetchHistory();
    }
  }, [maBenhNhan, historyPage]);

  // Save patient profile (create / update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hoTen.trim() || !soDienThoai.trim() || !ngaySinh || !diaChi.trim()) {
      setMessage({ type: 'error', text: 'Họ tên, Số điện thoại, Ngày sinh và Địa chỉ là bắt buộc.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const payload = {
      hoTen,
      soDienThoai,
      cccd: cccd || null,
      ngaySinh: ngaySinh || null,
      gioiTinh,
      diaChi: diaChi || null,
      tienSuDiUng: tienSuDiUng || null
    };

    try {
      let res;
      if (maBenhNhan) {
        res = await patientApi.updatePatient(maBenhNhan, payload);
        if (res.success) {
          setMessage({ type: 'success', text: 'Cập nhật hồ sơ bệnh nhân thành công.' });
          // Refresh list selection
          if (onSelectPatient) onSelectPatient(res.data);
        }
      } else {
        res = await patientApi.createPatient(payload);
        if (res.success) {
          setMaBenhNhan(res.data.ma_benh_nhan);
          setMessage({ type: 'success', text: `Tạo mới hồ sơ thành công! Mã BN: ${res.data.ma_benh_nhan}` });
          if (onSelectPatient) onSelectPatient(res.data);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi lưu thông tin bệnh nhân.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Tìm kiếm bệnh nhân</h3>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập Số điện thoại hoặc CCCD..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-sm"
          >
            {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
          >
            Làm mới form
          </button>
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 max-h-60 overflow-y-auto shadow-md">
            {searchResults.map((p) => (
              <button
                key={p.ma_benh_nhan}
                onClick={() => handleSelectPatient(p)}
                className="w-full text-left p-3 hover:bg-slate-50 transition flex justify-between items-center text-sm"
              >
                <div>
                  <span className="font-bold text-slate-800">{p.ho_ten}</span>
                  <span className="text-slate-500 text-xs ml-3 font-mono">#{p.ma_benh_nhan}</span>
                </div>
                <div className="text-right text-xs text-slate-600">
                  <span className="font-mono">{p.so_dien_thoai}</span>
                  {p.cccd && <span className="ml-3 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 font-mono text-[10px] text-slate-700">{p.cccd}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form and History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-slate-850">
              {maBenhNhan ? `Cập nhật hồ sơ (#${maBenhNhan})` : 'Tạo hồ sơ bệnh nhân mới'}
            </h3>
            {maBenhNhan && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Bệnh nhân đã đăng ký
              </span>
            )}
          </div>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm flex items-start space-x-2 border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                message.type === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Họ và tên bệnh nhân *</label>
                <input
                  type="text"
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  placeholder="Nhập họ tên đầy đủ"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Số điện thoại *</label>
                <input
                  type="text"
                  value={soDienThoai}
                  onChange={(e) => setSoDienThoai(e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Căn cước công dân (CCCD)</label>
                <input
                  type="text"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  placeholder="12 chữ số"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Ngày sinh *</label>
                <input
                  type="date"
                  value={ngaySinh}
                  onChange={(e) => setNgaySinh(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Giới tính</label>
                <select
                  value={gioiTinh}
                  onChange={(e) => setGioiTinh(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nu">Nữ</option>
                  <option value="Khac">Khác</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Địa chỉ *</label>
              <input
                type="text"
                value={diaChi}
                onChange={(e) => setDiaChi(e.target.value)}
                placeholder="Nhập số nhà, tên đường, xã/phường, quận/huyện..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tiền sử dị ứng / Bệnh lý nền</label>
              <textarea
                value={tienSuDiUng}
                onChange={(e) => setTienSuDiUng(e.target.value)}
                placeholder="Ghi chú về dị ứng thuốc, thức ăn, hoặc tiền sử bệnh tim mạch, tiểu đường..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 text-xs"
              />
            </div>

            <div className="pt-4 flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-grow py-2.5 bg-blue-600 hover:bg-blue-550 text-white font-bold rounded-lg transition shadow-sm"
              >
                {loading ? 'Đang lưu...' : maBenhNhan ? 'Cập nhật hồ sơ bệnh nhân' : 'Tạo hồ sơ bệnh nhân'}
              </button>
              {maBenhNhan && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-semibold"
                >
                  Tạo BN mới
                </button>
              )}
            </div>
          </form>
        </div>

        {/* History panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4">Lịch sử khám bệnh gần đây</h3>
            
            {!maBenhNhan ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Vui lòng chọn hoặc lưu thông tin bệnh nhân để hiển thị lịch sử khám.
              </p>
            ) : loadingHistory ? (
              <div className="flex flex-col items-center py-8">
                <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs text-slate-550 mt-2 font-medium">Đang tải lịch sử...</span>
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Bệnh nhân chưa có lượt khám nào trước đây.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.maLuotKham} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-700">
                          {h.phongKham?.tenPhong || 'Phòng khám'}
                        </span>
                        <span className="font-mono text-slate-500">
                          {h.thoiGianKham ? new Date(h.thoiGianKham).toLocaleDateString('vi-VN') : 'Đang khám'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        <span className="font-semibold">Bác sĩ:</span> {h.bacSi?.hoTen || 'Chưa phân công'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold">Chẩn đoán:</span> {h.chanDoan || 'Chưa ghi nhận'}
                      </div>
                      <div className="mt-2 flex justify-between items-center text-[10px]">
                        <span className={`px-2 py-0.5 rounded font-medium border ${
                          h.trangThai === 'HOAN_TAT' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-blue-50 text-blue-700 border-blue-250'
                        }`}>
                          {h.trangThai === 'HOAN_TAT' ? 'Hoàn tất' : h.trangThai}
                        </span>
                        <span className="text-slate-500 font-mono">Mã lượt: #{h.maLuotKham}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {historyTotalPages > 1 && (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-750 rounded disabled:opacity-40 transition font-semibold"
                    >
                      Trước
                    </button>
                    <span className="text-slate-500 font-medium">
                      Trang {historyPage} / {historyTotalPages} ({historyTotal} lượt)
                    </span>
                    <button
                      onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage === historyTotalPages}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-755 rounded disabled:opacity-40 transition font-semibold"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientForm;
