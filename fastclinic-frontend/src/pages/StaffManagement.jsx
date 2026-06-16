import React, { useState, useEffect } from 'react';
import staffApi from '../services/staffApi';
import { StatCard } from '../components/common/StatCard';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';

export const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeStaff, setActiveStaff] = useState(null);

  // Form Fields
  const [hoTen, setHoTen] = useState('');
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [vaiTro, setVaiTro] = useState('LE_TAN');
  const [isActive, setIsActive] = useState(true);

  // Error Messages
  const [formError, setFormError] = useState('');

  // Fetch staff list
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await staffApi.getStaff(page, limit, search);
      if (response && response.success) {
        setStaffList(response.data.staff || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.totalItems || 0);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [page, limit]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchStaff();
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Reset Form
  const resetForm = () => {
    setHoTen('');
    setTenDangNhap('');
    setMatKhau('');
    setVaiTro('LE_TAN');
    setIsActive(true);
    setFormError('');
  };

  // Handle Save (Add Staff)
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!hoTen.trim() || !tenDangNhap.trim() || !matKhau.trim() || !vaiTro) {
      setFormError('Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        hoTen: hoTen.trim(),
        tenDangNhap: tenDangNhap.trim().toLowerCase(),
        matKhau,
        vaiTro,
        isActive
      };

      const response = await staffApi.createStaff(payload);
      if (response && response.success) {
        setShowAddModal(false);
        resetForm();
        fetchStaff();
      } else {
        setFormError(response.message || 'Lỗi khi thêm nhân viên.');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Populate form for editing
  const openEditModal = (staff) => {
    setActiveStaff(staff);
    setHoTen(staff.ho_ten);
    setTenDangNhap(staff.ten_dang_nhap);
    setMatKhau(''); // Empty by default on edit
    setVaiTro(staff.vai_tro);
    setIsActive(staff.is_active);
    setFormError('');
    setShowEditModal(true);
  };

  // Handle Update Staff
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!hoTen.trim() || !tenDangNhap.trim() || !vaiTro) {
      setFormError('Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        hoTen: hoTen.trim(),
        tenDangNhap: tenDangNhap.trim().toLowerCase(),
        vaiTro,
        isActive
      };

      // Only pass password if it was entered
      if (matKhau.trim()) {
        payload.matKhau = matKhau;
      }

      const response = await staffApi.updateStaff(activeStaff.ma_nhan_vien, payload);
      if (response && response.success) {
        setShowEditModal(false);
        resetForm();
        fetchStaff();
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

  // Handle Toggle Lock (Active/Locked)
  const handleToggleLock = async (staff) => {
    const isTempLocked = staff.khoa_den && new Date(staff.khoa_den) > new Date();
    const actionText = isTempLocked ? 'mở khóa tạm thời' : (staff.is_active ? 'khóa' : 'mở khóa');
    if (window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của "${staff.ho_ten}" không?`)) {
      try {
        const response = await staffApi.toggleLock(staff.ma_nhan_vien);
        if (response && response.success) {
          fetchStaff();
        } else {
          alert(response.message || `Không thể ${actionText} tài khoản.`);
        }
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.');
      }
    }
  };

  // Helper to render role badge with corresponding color
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/10 border border-red-500/20 text-red-400 uppercase">
            Quản trị viên
          </span>
        );
      case 'BAC_SI':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase">
            Bác sĩ
          </span>
        );
      case 'LE_TAN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase">
            Lễ tân
          </span>
        );
      case 'DIEU_DUONG':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-500/10 border border-teal-500/20 text-teal-400 uppercase">
            Điều dưỡng
          </span>
        );
      case 'THU_NGAN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase">
            Thu ngân
          </span>
        );
      case 'NV_CLS':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase">
            Kỹ thuật viên CLS
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 border border-slate-700 text-slate-400 uppercase">
            {role}
          </span>
        );
    }
  };

  const activeCount = staffList.filter(s => s.is_active).length;
  const lockedCount = staffList.filter(s => !s.is_active).length;

  return (
    <div className="space-y-8 text-slate-800">
      {/* Overview statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Tổng số nhân viên"
          value={totalItems}
          description={<span className="text-slate-500">Đăng ký trong cơ sở dữ liệu</span>}
          loading={loading}
        />
        <StatCard
          title="Tài khoản hoạt động"
          value={loading ? '...' : staffList.filter(s => s.is_active).length + (totalItems > staffList.length ? (totalItems - staffList.length) : 0)}
          description={<span className="text-emerald-600 font-semibold">● Sẵn sàng đăng nhập vào hệ thống</span>}
          loading={loading}
          className="relative overflow-hidden group"
        />
        <StatCard
          title="Tài khoản bị khóa"
          value={loading ? '...' : staffList.filter(s => !s.is_active).length}
          description={<span className="text-rose-600 font-semibold">🔒 Không thể truy cập hệ thống</span>}
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
            <span>Tạo nhân viên mới</span>
          </button>
        </div>
      </div>

      {/* Main Catalog Workspace */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        
        {/* Filters Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="font-extrabold text-slate-800 text-base tracking-wide">Danh sách Nhân viên</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm họ tên, tên đăng nhập..."
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition w-full sm:w-64 placeholder-slate-400"
            />

            {/* Limit selector */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        {/* Staff Data Table */}
        {loading ? (
          <div className="space-y-3 py-8" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            Không tìm thấy nhân viên nào trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">Mã NV</th>
                  <th className="p-3">Họ tên nhân viên</th>
                  <th className="p-3">Tên đăng nhập</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staffList.map((item) => (
                  <tr key={item.ma_nhan_vien} className="transition hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-indigo-600">
                      #{item.ma_nhan_vien}
                    </td>
                    <td className="p-3 font-extrabold text-slate-800 text-xs">
                      {item.ho_ten}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {item.ten_dang_nhap}
                    </td>
                    <td className="p-3">
                      {renderRoleBadge(item.vai_tro)}
                    </td>
                    <td className="p-3 text-center">
                      {item.is_active ? (
                        item.khoa_den && new Date(item.khoa_den) > new Date() ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-600 uppercase">
                            Khóa tạm thời
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 uppercase">
                            Hoạt động
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-600 uppercase">
                          Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Edit Action Button */}
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 hover:text-indigo-500 rounded transition"
                          title="Sửa thông tin"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Lock / Unlock Toggle Button */}
                        <button
                          onClick={() => handleToggleLock(item)}
                          className={`p-1 bg-white border border-slate-200 rounded transition ${
                            item.khoa_den && new Date(item.khoa_den) > new Date()
                              ? 'hover:bg-emerald-50 text-emerald-650 hover:text-emerald-550 border-amber-300'
                              : item.is_active
                              ? 'hover:bg-rose-50 text-rose-600 hover:text-rose-500'
                              : 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-500'
                          }`}
                          title={
                            item.khoa_den && new Date(item.khoa_den) > new Date()
                              ? 'Mở khóa tài khoản tạm thời'
                              : item.is_active
                              ? 'Khóa tài khoản'
                              : 'Mở khóa tài khoản'
                          }
                        >
                          {item.khoa_den && new Date(item.khoa_den) > new Date() ? (
                            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          ) : item.is_active ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar controls */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          label="nhân viên"
        />
      </div>

      {/* Modal: Add Staff */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Tạo tài khoản nhân viên mới"
      >
        <div className="space-y-6">
          {formError && (
            <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Họ và tên nhân viên <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={hoTen}
                onChange={(e) => setHoTen(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên đăng nhập <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={tenDangNhap}
                  onChange={(e) => setTenDangNhap(e.target.value)}
                  placeholder="Ví dụ: letana01"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mật khẩu khởi tạo <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  required
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="Tối thiểu 4 ký tự"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Vai trò nhân sự <span className="text-red-400">*</span></label>
                <select
                  value={vaiTro}
                  onChange={(e) => setVaiTro(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  <option value="BAC_SI">Bác sĩ (BAC_SI)</option>
                  <option value="LE_TAN">Lễ tân (LE_TAN)</option>
                  <option value="DIEU_DUONG">Điều dưỡng (DIEU_DUONG)</option>
                  <option value="THU_NGAN">Thu ngân (THU_NGAN)</option>
                  <option value="NV_CLS">Kỹ thuật viên CLS (NV_CLS)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Trạng thái hoạt động</label>
                <label className="flex items-center space-x-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-350"
                  />
                  <span className="text-xs text-slate-700 font-bold">Kích hoạt tài khoản</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition shadow shadow-indigo-600/10"
              >
                {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal: Edit Staff */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Chỉnh sửa tài khoản nhân viên"
      >
        <div className="space-y-6">
          {formError && (
            <div className="p-3.5 bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl">
              {formError}
            </div>
          )}

          <form onSubmit={handleUpdateStaff} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Họ và tên nhân viên <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={hoTen}
                onChange={(e) => setHoTen(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Tên đăng nhập <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={tenDangNhap}
                  onChange={(e) => setTenDangNhap(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mật khẩu mới (Để trống nếu không đổi)</label>
                <input
                  type="password"
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="Tối thiểu 4 ký tự"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Vai trò nhân sự <span className="text-red-400">*</span></label>
                <select
                  value={vaiTro}
                  onChange={(e) => setVaiTro(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                  <option value="BAC_SI">Bác sĩ (BAC_SI)</option>
                  <option value="LE_TAN">Lễ tân (LE_TAN)</option>
                  <option value="DIEU_DUONG">Điều dưỡng (DIEU_DUONG)</option>
                  <option value="THU_NGAN">Thu ngân (THU_NGAN)</option>
                  <option value="NV_CLS">Kỹ thuật viên CLS (NV_CLS)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Trạng thái hoạt động</label>
                <label className="flex items-center space-x-2.5 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-350"
                  />
                  <span className="text-xs text-slate-700 font-bold">Kích hoạt tài khoản</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition font-semibold"
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

export default StaffManagement;
