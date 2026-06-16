import React, { useState, useEffect } from 'react';
import medicineApi from '../services/medicineApi';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';

export const MedicineManagement = () => {
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Toggle Filters
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeMedicine, setActiveMedicine] = useState(null);

  // Form Fields
  const [tenThuoc, setTenThuoc] = useState('');
  const [hoatChat, setHoatChat] = useState('');
  const [donVi, setDonVi] = useState('');
  const [gia, setGia] = useState('');
  const [soLuongTon, setSoLuongTon] = useState('');
  const [hanDung, setHanDung] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Error Messages
  const [formError, setFormError] = useState('');

  // Fetch medicines list
  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const response = await medicineApi.getMedicines(page, limit, search);
      if (response && response.success) {
        setMedicines(response.data.medicines || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.totalItems || 0);
      }
    } catch (err) {
      console.error('Error fetching medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const response = await medicineApi.getAlerts();
      if (response && response.success) {
        setAlerts(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [page, limit]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchMedicines();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Load alerts once on mount and sync when medicines update
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Expiry check helpers
  const getDaysToExpiry = (expiryDateStr) => {
    if (!expiryDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Reset Form
  const resetForm = () => {
    setTenThuoc('');
    setHoatChat('');
    setDonVi('');
    setGia('');
    setSoLuongTon('');
    setHanDung('');
    setIsActive(true);
    setFormError('');
  };

  // Handle Save (Add)
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!tenThuoc.trim() || !donVi.trim() || !gia) {
      setFormError('Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ten_thuoc: tenThuoc,
        hoat_chat: hoatChat || null,
        don_vi: donVi,
        gia: parseInt(gia, 10),
        so_luong_ton: soLuongTon ? parseInt(soLuongTon, 10) : 0,
        han_dung: hanDung || null,
        is_active: isActive
      };

      const response = await medicineApi.createMedicine(payload);
      if (response && response.success) {
        setShowAddModal(false);
        resetForm();
        fetchMedicines();
        fetchAlerts();
      } else {
        setFormError(response.message || 'Lỗi khi thêm thuốc.');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Populate form for editing
  const openEditModal = (medicine) => {
    setActiveMedicine(medicine);
    setTenThuoc(medicine.ten_thuoc);
    setHoatChat(medicine.hoat_chat || '');
    setDonVi(medicine.don_vi);
    setGia(medicine.gia);
    setSoLuongTon(medicine.so_luong_ton);
    setHanDung(medicine.han_dung || '');
    setIsActive(medicine.is_active);
    setFormError('');
    setShowEditModal(true);
  };

  // Handle Update
  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    if (!tenThuoc.trim() || !donVi.trim() || !gia) {
      setFormError('Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ten_thuoc: tenThuoc,
        hoat_chat: hoatChat || null,
        don_vi: donVi,
        gia: parseInt(gia, 10),
        so_luong_ton: parseInt(soLuongTon, 10),
        han_dung: hanDung || null,
        is_active: isActive
      };

      const response = await medicineApi.updateMedicine(activeMedicine.ma_thuoc, payload);
      if (response && response.success) {
        setShowEditModal(false);
        resetForm();
        fetchMedicines();
        fetchAlerts();
      } else {
        setFormError(response.message || 'Lỗi khi cập nhật thông tin.');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Soft Delete
  const handleDeleteMedicine = async (id, name) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thuốc "${name}" không?`)) {
      try {
        const response = await medicineApi.deleteMedicine(id);
        if (response && response.success) {
          fetchMedicines();
          fetchAlerts();
        } else {
          alert(response.message || 'Không thể xóa thuốc.');
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.');
      }
    }
  };

  // Alerts filtering logic
  const lowStockCount = alerts.filter(m => m.so_luong_ton <= 10).length;
  const expiringCount = alerts.filter(m => {
    const days = getDaysToExpiry(m.han_dung);
    return days !== null && days <= 30 && days >= 0;
  }).length;

  return (
    <div className="space-y-8 text-slate-800">
      {/* Overview stats cards banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Tổng danh mục thuốc"
          value={totalItems}
          description={<span className="text-slate-500">Bao gồm cả đang khóa/ngừng hoạt động</span>}
          loading={loading}
        />
        <StatCard
          title="Cảnh báo tồn kho"
          value={alertsLoading ? '...' : lowStockCount}
          description={<span className="text-rose-600 font-bold">● Tồn kho dưới hoặc bằng 10 đơn vị</span>}
          loading={loading}
          className="relative overflow-hidden group"
        />
        <StatCard
          title="Cảnh báo hạn dùng"
          value={alertsLoading ? '...' : expiringCount}
          description={<span className="text-amber-600 font-bold">▲ Cận ngày hết hạn (&le; 30 ngày)</span>}
          loading={loading}
          className="relative overflow-hidden group"
        />

        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center justify-center">
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="w-full h-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow shadow-indigo-600/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Thêm thuốc mới</span>
          </button>
        </div>
      </div>

      {/* Main Catalog Workspace */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm p-6">
        
        {/* Filters Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="font-extrabold text-slate-800 text-base tracking-wide">Danh mục Thuốc</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên thuốc, hoạt chất..."
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition w-full sm:w-64 placeholder-slate-400 shadow-sm"
            />

            {/* Toggle alerts only filter */}
            <button
              onClick={() => setFilterAlertOnly(!filterAlertOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                filterAlertOnly
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-350'
              }`}
            >
              ⚠️ Chỉ hiện cảnh báo
            </button>

            {/* Limit selector */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="10">10 dòng / trang</option>
              <option value="20">20 dòng / trang</option>
              <option value="50">50 dòng / trang</option>
            </select>
          </div>
        </div>

        {/* Medicines Data Table */}
        {loading ? (
          <div className="space-y-3 py-8" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : medicines.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            Không tìm thấy thuốc nào trong danh mục.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[10px] uppercase bg-slate-100 text-slate-500 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">Tên thuốc</th>
                  <th className="p-3">Hoạt chất</th>
                  <th className="p-3">Đơn vị</th>
                  <th className="p-3">Đơn giá bán</th>
                  <th className="p-3">Tồn kho</th>
                  <th className="p-3">Hạn dùng</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {medicines
                  .filter((item) => {
                    if (!filterAlertOnly) return true;
                    // Low stock OR expiring within 30 days
                    const days = getDaysToExpiry(item.han_dung);
                    return item.so_luong_ton <= 10 || (days !== null && days <= 30);
                  })
                  .map((item) => {
                    const daysToExpiry = getDaysToExpiry(item.han_dung);
                    const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30;

                    // Color indicators for stock
                    let stockBadge = (
                      <span className="font-semibold text-slate-800">{item.so_luong_ton}</span>
                    );
                    if (item.so_luong_ton === 0) {
                      stockBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
                          Hết hàng
                        </span>
                      );
                    } else if (item.so_luong_ton <= 10) {
                      stockBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                          Yếu ({item.so_luong_ton})
                        </span>
                      );
                    }

                    // Expiry dates
                    let expiryBadge = (
                      <span className="text-slate-600 font-medium">
                        {item.han_dung ? new Date(item.han_dung).toLocaleDateString('vi-VN') : 'N/A'}
                      </span>
                    );
                    if (item.han_dung) {
                      if (daysToExpiry <= 0) {
                        expiryBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
                            Hết hạn
                          </span>
                        );
                      } else if (isExpiringSoon) {
                        expiryBadge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
                            Gần hết ({daysToExpiry} ngày)
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={item.ma_thuoc} className="transition hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900 text-xs uppercase">{item.ten_thuoc}</div>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {item.hoat_chat || '--'}
                        </td>
                        <td className="p-3 text-slate-500">{item.don_vi}</td>
                        <td className="p-3 font-mono font-bold text-slate-750">
                          {parseFloat(item.gia).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3 font-mono">{stockBadge}</td>
                        <td className="p-3">{expiryBadge}</td>
                        <td className="p-3 text-center">
                          {item.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 border border-slate-200 text-slate-500 uppercase">
                              Ngừng bán
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1 bg-white border border-slate-200 hover:border-slate-350 text-indigo-600 hover:text-indigo-500 rounded transition"
                              title="Sửa thuốc"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2-2V11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {item.is_active && (
                              <button
                                onClick={() => handleDeleteMedicine(item.ma_thuoc, item.ten_thuoc)}
                                className="p-1 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 hover:text-rose-500 rounded transition"
                                title="Xóa thuốc (Ngừng bán)"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar controls */}
        {!filterAlertOnly && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            label="thuốc"
          />
        )}
      </div>

      {/* Modal: Add Medicine */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Thêm thuốc mới vào danh mục"
      >
        <div className="space-y-6">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-shake">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddMedicine} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên thuốc <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={tenThuoc}
                onChange={(e) => setTenThuoc(e.target.value)}
                placeholder="Ví dụ: Paracetamol 500mg"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Hoạt chất</label>
                <input
                  type="text"
                  value={hoatChat}
                  onChange={(e) => setHoatChat(e.target.value)}
                  placeholder="Ví dụ: Paracetamol"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Đơn vị tính <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={donVi}
                  onChange={(e) => setDonVi(e.target.value)}
                  placeholder="Ví dụ: Viên, Chai, Ống"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Đơn giá bán (VND) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  value={gia}
                  onChange={(e) => setGia(e.target.value)}
                  placeholder="Ví dụ: 2000"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Số lượng tồn</label>
                <input
                  type="number"
                  min="0"
                  value={soLuongTon}
                  onChange={(e) => setSoLuongTon(e.target.value)}
                  placeholder="Ví dụ: 100"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Hạn dùng (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={hanDung}
                  onChange={(e) => setHanDung(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Trạng thái bán</label>
                <label className="flex items-center space-x-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500/20"
                  />
                  <span className="text-xs text-slate-700 font-bold">Mở bán dược phẩm</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition shadow shadow-indigo-600/10"
              >
                {submitting ? 'Đang thêm...' : 'Xác nhận thêm'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal: Edit Medicine */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Chỉnh sửa thông tin thuốc"
      >
        <div className="space-y-6">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl animate-shake">
              {formError}
            </div>
          )}

          <form onSubmit={handleUpdateMedicine} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên thuốc <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={tenThuoc}
                onChange={(e) => setTenThuoc(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Hoạt chất</label>
                <input
                  type="text"
                  value={hoatChat}
                  onChange={(e) => setHoatChat(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Đơn vị tính <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={donVi}
                  onChange={(e) => setDonVi(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Đơn giá bán (VND) <span className="text-red-400">*</span></label>
                <input
                  type="number"
                  required
                  min="0"
                  value={gia}
                  onChange={(e) => setGia(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Số lượng tồn</label>
                <input
                  type="number"
                  min="0"
                  value={soLuongTon}
                  onChange={(e) => setSoLuongTon(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Hạn dùng (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={hanDung}
                  onChange={(e) => setHanDung(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Trạng thái bán</label>
                <label className="flex items-center space-x-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-500/20"
                  />
                  <span className="text-xs text-slate-700 font-bold">Mở bán dược phẩm</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition shadow shadow-indigo-600/10"
              >
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default MedicineManagement;
