import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import visitApi from '../services/visitApi';
import useSocket from '../hooks/useSocket';
import { StatCard } from '../components/common/StatCard';

export const CashierDashboard = () => {
  // Waitlist and historical payments states
  const [waitlist, setWaitlist] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Checkout active state
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [activeVisit, setActiveVisit] = useState(null);
  const [activeVisitLoading, setActiveVisitLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT'); // 'TIEN_MAT', 'CHUYEN_KHOAN', 'THE'
  const [submitting, setSubmitting] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  
  // Search bar
  const [searchQuery, setSearchQuery] = useState('');

  // Socket for real-time waitlist updates
  const { socket } = useSocket('cashier');

  // Fetch the active waiting queue for payments
  const fetchWaitlist = async () => {
    setWaitlistLoading(true);
    try {
      const response = await visitApi.getWaitingList('THU_NGAN');
      if (response && response.success) {
        setWaitlist(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching cashier waitlist:', err);
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Fetch today's cashier logs for statistics
  const fetchTodayPayments = async () => {
    setStatsLoading(true);
    try {
      const response = await visitApi.getTodayPayments();
      if (response && response.success) {
        setTodayPayments(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching today payments:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchWaitlist();
    fetchTodayPayments();
  }, []);

  // Socket syncing
  useEffect(() => {
    if (!socket) return;

    socket.on('queue-updated', () => {
      console.log('CashierDashboard: Queue updated. Refreshing data...');
      fetchWaitlist();
      fetchTodayPayments();
    });

    return () => {
      socket.off('queue-updated');
    };
  }, [socket]);

  // Load detailed patient checkout worksheet
  const handleSelectVisit = async (maLuotKham) => {
    setSelectedVisitId(maLuotKham);
    setActiveVisitLoading(true);
    setAmountReceived('');
    try {
      const response = await visitApi.getVisitDetail(maLuotKham);
      if (response && response.success) {
        setActiveVisit(response.data.visit);
      }
    } catch (err) {
      console.error('Error fetching visit details:', err);
      alert('Không thể tải chi tiết hóa đơn bệnh nhân.');
      setSelectedVisitId(null);
    } finally {
      setActiveVisitLoading(false);
    }
  };

  // Process checkout API
  const handleConfirmPayment = async () => {
    if (!activeVisit) return;
    setSubmitting(true);
    try {
      const payload = {
        phuongThucTT: paymentMethod,
        tienKham: 150000 // default clinic fee
      };
      
      const response = await visitApi.checkout(activeVisit.ma_luot_kham, payload);
      if (response && response.success) {
        setCheckoutResult(response.data);
        // Refresh local dashboard states
        fetchWaitlist();
        fetchTodayPayments();
      } else {
        alert(response.message || 'Lỗi khi xác nhận thanh toán.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error?.message || err.message || 'Lỗi kết nối máy chủ.';
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset checkout worksheet states
  const handleCloseCheckout = () => {
    setSelectedVisitId(null);
    setActiveVisit(null);
    setCheckoutResult(null);
    setPaymentMethod('TIEN_MAT');
    setAmountReceived('');
  };

  // Print function wrapper (K80 format)
  const handlePrint = (type) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const data = checkoutResult || activeVisit;
    if (!data) return;

    const luotKham = data.luotKham || data;
    const benhNhan = luotKham.benhNhan || activeVisit?.benhNhan;
    const donThuoc = luotKham.donThuoc || activeVisit?.donThuoc;
    const ketQuaCLSs = luotKham.ketQuaCLSs || activeVisit?.ketQuaCLSs;
    
    // Construct HTML template for K80 printing
    let contentHtml = '';
    
    if (type === 'INVOICE') {
      const pMethod = data.phuong_thuc_tt || paymentMethod;
      const tienKham = parseFloat(data.tien_kham || 150000);
      const tongPhiCls = parseFloat(data.tong_phi_cls || 0);
      const tongTienThuoc = parseFloat(data.tong_tien_thuoc || 0);
      const tongTien = parseFloat(data.tong_tien || (tienKham + tongPhiCls + tongTienThuoc));
      
      let clsRows = '';
      if (ketQuaCLSs && ketQuaCLSs.length > 0) {
        clsRows = ketQuaCLSs.map(k => `
          <tr>
            <td style="padding: 2px 0;">${k.dichVuCLS?.ten_dich_vu || k.loai_cls}</td>
            <td style="text-align: right; padding: 2px 0;">${parseFloat(k.dichVuCLS?.gia || 0).toLocaleString('vi-VN')} đ</td>
          </tr>
        `).join('');
      }

      let medicineRows = '';
      if (donThuoc && donThuoc.chiTietDonThuocs) {
        medicineRows = donThuoc.chiTietDonThuocs.map(c => `
          <tr>
            <td style="padding: 2px 0;">${c.thuoc?.ten_thuoc || 'Thuốc'} x ${c.so_luong}</td>
            <td style="text-align: right; padding: 2px 0;">${parseFloat(c.thanh_tien).toLocaleString('vi-VN')} đ</td>
          </tr>
        `).join('');
      }

      contentHtml = `
        <div style="font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 2mm; box-sizing: border-box; color: #000; font-size: 11px; line-height: 1.4;">
          <div style="text-align: center; margin-bottom: 4mm;">
            <h2 style="margin: 0; font-size: 15px; font-weight: bold;">FASTCLINIC</h2>
            <p style="margin: 2px 0; font-size: 10px;">123 Nguyễn Trãi, Thanh Xuân, Hà Nội</p>
            <p style="margin: 2px 0; font-size: 10px;">SĐT: 0988.777.666</p>
            <h3 style="margin: 10px 0 5px 0; font-size: 13px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 0;">HÓA ĐƠN THANH TOÁN</h3>
          </div>
          
          <div style="margin-bottom: 3mm;">
            <p style="margin: 2px 0;">Mã hóa đơn: <b>HD-${data.ma_phieu_thu || 'NEW'}</b></p>
            <p style="margin: 2px 0;">Bệnh nhân: <b>${benhNhan?.ho_ten?.toUpperCase() || ''}</b></p>
            <p style="margin: 2px 0;">Ngày khám: ${new Date(data.thoi_gian_tt || new Date()).toLocaleDateString('vi-VN')}</p>
            <p style="margin: 2px 0;">Thu ngân ID: NV-${data.ma_thu_ngan || 'SYS'}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 3px;">Diễn giải</th>
                <th style="text-align: right; padding-bottom: 3px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 3px 0;">Tiền khám bệnh</td>
                <td style="text-align: right;">${tienKham.toLocaleString('vi-VN')} đ</td>
              </tr>
              ${clsRows}
              ${medicineRows}
            </tbody>
          </table>

          <div style="border-top: 1px dashed #000; padding-top: 3px; font-size: 12px; font-weight: bold;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>TỔNG TIỀN:</span>
              <span>${tongTien.toLocaleString('vi-VN')} đ</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: normal; margin-top: 3px;">
              <span>Phương thức:</span>
              <span>${pMethod === 'TIEN_MAT' ? 'Tiền mặt' : pMethod === 'CHUYEN_KHOAN' ? 'Chuyển khoản (VietQR)' : 'Thẻ quẹt'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: normal; margin-top: 2px;">
              <span>Tiền nhận:</span>
              <span>${tongTien.toLocaleString('vi-VN')} đ</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: normal; margin-top: 2px;">
              <span>Tiền thừa:</span>
              <span>0 đ</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 8mm; border-top: 1px dashed #000; padding-top: 4px; font-size: 10px;">
            <p style="margin: 2px 0;">Cảm ơn Quý khách. Hẹn gặp lại!</p>
            <p style="margin: 2px 0; font-style: italic;">FastClinic v1.0</p>
          </div>
        </div>
      `;
    } else if (type === 'PRESCRIPTION') {
      let medicineList = '<tr><td colspan="2" style="text-align: center; padding: 5mm 0; color: #555;">Không có thuốc kê đơn</td></tr>';
      if (donThuoc && donThuoc.chiTietDonThuocs) {
        medicineList = donThuoc.chiTietDonThuocs.map((c, idx) => `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 4px 0; vertical-align: top;">
              <b>${idx + 1}. ${c.thuoc?.ten_thuoc}</b><br/>
              <span style="font-size: 9px; color: #555;"><i>Liều dùng: ${c.lieu_dung || 'Theo hướng dẫn'}</i></span><br/>
              <span style="font-size: 9px; color: #555;"><i>Cách dùng: ${c.cach_dung || 'Theo hướng dẫn'}</i></span>
            </td>
            <td style="text-align: right; vertical-align: top; padding-top: 4px;">
              <b>${c.so_luong}</b> ${c.thuoc?.don_vi || 'Viên'}
            </td>
          </tr>
        `).join('');
      }

      contentHtml = `
        <div style="font-family: 'Courier New', Courier, monospace; width: 80mm; padding: 2mm; box-sizing: border-box; color: #000; font-size: 11px; line-height: 1.4;">
          <div style="text-align: center; margin-bottom: 4mm;">
            <h2 style="margin: 0; font-size: 14px; font-weight: bold;">ĐƠN THUỐC ĐIỆN TỬ</h2>
            <p style="margin: 2px 0; font-size: 9px;">Mã đơn: DT-${donThuoc?.ma_don_thuoc || 'NEW'}</p>
          </div>
          
          <div style="margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 3px;">
            <p style="margin: 2px 0;">Bệnh nhân: <b>${benhNhan?.ho_ten?.toUpperCase() || ''}</b></p>
            <p style="margin: 2px 0;">Tuổi/Giới: ${benhNhan?.gioi_tinh || ''}</p>
            <p style="margin: 2px 0;">Chẩn đoán: <b>${luotKham.chan_doan || activeVisit?.chan_doan || 'Chưa chẩn đoán'}</b></p>
            <p style="margin: 2px 0;">Bác sĩ kê: BS. Nguyễn Văn A</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 4mm; font-size: 11px;">
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 3px;">Tên thuốc / Hướng dẫn</th>
                <th style="text-align: right; padding-bottom: 3px;">SL</th>
              </tr>
            </thead>
            <tbody>
              ${medicineList}
            </tbody>
          </table>

          ${donThuoc?.ghi_chu ? `
            <div style="margin: 3mm 0; font-size: 10px; border: 1px solid #ddd; padding: 3px; border-radius: 3px;">
              <b>Lời dặn:</b> ${donThuoc.ghi_chu}
            </div>
          ` : ''}

          <table style="width: 100%; margin-top: 8mm; font-size: 10px;">
            <tr>
              <td style="text-align: center; width: 50%;">
                Bệnh nhân<br/>
                <span style="font-size: 8px; color: #888;">(Ký và ghi rõ họ tên)</span>
              </td>
              <td style="text-align: center; width: 50%;">
                Bác sĩ điều trị<br/>
                <span style="font-size: 8px; color: #888;">(Ký và ghi rõ họ tên)</span>
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>In Ấn FastClinic K80</title>
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

  // Helper values calculation for Top stats
  const totalRevenueToday = todayPayments.reduce((sum, p) => sum + parseFloat(p.tong_tien), 0);
  const pendingCount = waitlist.length;
  
  // Find favorite payment method count
  const cashCount = todayPayments.filter(p => p.phuong_thuc_tt === 'TIEN_MAT').length;
  const transferCount = todayPayments.filter(p => p.phuong_thuc_tt === 'CHUYEN_KHOAN').length;
  const cardCount = todayPayments.filter(p => p.phuong_thuc_tt === 'THE').length;
  let favoriteMethod = 'Chưa có';
  if (cashCount > 0 || transferCount > 0 || cardCount > 0) {
    if (cashCount >= transferCount && cashCount >= cardCount) favoriteMethod = 'Tiền mặt';
    else if (transferCount >= cashCount && transferCount >= cardCount) favoriteMethod = 'Chuyển khoản';
    else favoriteMethod = 'Thẻ';
  }

  // Filter queue by search query
  const filteredQueue = waitlist.filter(item => {
    const term = searchQuery.toLowerCase();
    return (
      item.benhNhan?.ho_ten?.toLowerCase().includes(term) ||
      item.benhNhan?.so_dien_thoai?.includes(term) ||
      String(item.phieuKham?.so_thu_tu).includes(term)
    );
  });

  return (
    <DashboardLayout title="Quầy Thanh Toán Thu Ngân (Cashier Dashboard)">
      
      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Doanh thu hôm nay"
          value={statsLoading ? '...' : `${totalRevenueToday.toLocaleString('vi-VN')} đ`}
          description={
            <>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
              <span className="text-emerald-600 flex items-center space-x-1">
                <span>▲ {todayPayments.length} giao dịch thành công</span>
              </span>
            </>
          }
          className="relative overflow-hidden group"
        />

        <StatCard
          title="Hóa đơn chờ xử lý"
          value={waitlistLoading ? '...' : <span className="text-amber-600">{pendingCount} lượt</span>}
          description={
            <>
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
              <span className="text-slate-500">Đang chờ tại sảnh thanh toán</span>
            </>
          }
          className="relative overflow-hidden group"
        />

        <StatCard
          title="Hình thức giao dịch"
          value={statsLoading ? '...' : <span className="text-cyan-600 uppercase">{favoriteMethod}</span>}
          description={
            <>
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
              <span className="text-slate-500 font-medium">
                CK: {transferCount} | TM: {cashCount} | Thẻ: {cardCount}
              </span>
            </>
          }
          className="relative overflow-hidden group"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT PANEL: Waitlist Queue (7 columns) */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
            <h3 className="font-extrabold text-slate-800 text-base tracking-wide flex items-center space-x-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Hàng chờ thanh toán</span>
            </h3>
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, SĐT hoặc STT..."
                className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition placeholder-slate-400"
              />
            </div>
          </div>

          {waitlistLoading ? (
            <div className="space-y-3 py-6" aria-busy="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredQueue.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-2xl">
              Không tìm thấy bệnh nhân nào trong hàng chờ thanh toán.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-16">STT</th>
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3">Phòng khám</th>
                    <th className="p-3">Đơn giá dự kiến</th>
                    <th className="p-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredQueue.map((item) => {
                    const isSelected = selectedVisitId === item.ma_luot_kham;
                    // Calculate subtotal
                    const subtotalCls = item.ketQuaCLSs?.filter(Boolean).reduce((sum, k) => sum + parseFloat(k.dichVuCLS?.gia || 0), 0) || 0;
                    const subtotalMedicine = parseFloat(item.donThuoc?.tong_tien_thuoc || 0);
                    const subtotal = 150000 + subtotalCls + subtotalMedicine;

                    return (
                      <tr 
                        key={item.ma_luot_kham} 
                        className={`transition hover:bg-slate-50 ${isSelected ? 'bg-indigo-50 border-indigo-200/50' : ''}`}
                      >
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-extrabold font-mono bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded">
                            {String(item.phieuKham?.so_thu_tu).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 uppercase text-xs">{item.benhNhan?.ho_ten}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{item.benhNhan?.so_dien_thoai}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-600">{item.phongKham?.ten_phong}</div>
                          <div className="text-[10px] text-slate-500">{item.phongKham?.chuyen_khoa}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {subtotal.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleSelectVisit(item.ma_luot_kham)}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition shadow shadow-indigo-600/10"
                          >
                            Tính phí
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

        {/* RIGHT PANEL: Checkout Worksheet (5 columns) */}
        <div className="xl:col-span-5">
          {activeVisitLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-xs font-bold text-slate-500">Đang tải phiếu khám & đơn thuốc...</p>
            </div>
          ) : !activeVisit ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center py-24 text-slate-500 italic text-xs">
              Chọn một bệnh nhân từ hàng chờ để lập hóa đơn và xác nhận thanh toán.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
              
              {/* Patient administrative header card */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                <div>
                  <h4 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wide">Chi tiết thanh toán</h4>
                  <h3 className="text-base font-black text-slate-800 uppercase mt-0.5">{activeVisit.benhNhan?.ho_ten}</h3>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Mã BN: BN{String(activeVisit.benhNhan?.ma_benh_nhan).padStart(4, '0')} | SĐT: {activeVisit.benhNhan?.so_dien_thoai}
                  </div>
                </div>
                <button
                  onClick={handleCloseCheckout}
                  className="text-slate-400 hover:text-slate-600 font-extrabold text-xs"
                >
                  Đóng
                </button>
              </div>

              {/* Checkout success modal overlay inside card */}
              {checkoutResult ? (
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-600">Thanh Toán Thành Công!</h4>
                    <p className="text-xs text-slate-500 mt-1">Đơn hàng đã được trừ kho và lưu trữ.</p>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Mã hóa đơn:</span>
                      <span className="font-bold text-slate-850">HD-{checkoutResult.ma_phieu_thu}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tổng thu tiền:</span>
                      <span className="font-bold text-indigo-650">{parseFloat(checkoutResult.tong_tien || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handlePrint('INVOICE')}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition"
                    >
                      In hóa đơn (K80)
                    </button>
                    <button
                      onClick={() => handlePrint('PRESCRIPTION')}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs transition"
                    >
                      In đơn thuốc (K80)
                    </button>
                  </div>

                  <button
                    onClick={handleCloseCheckout}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition"
                  >
                    Hoàn tất & Quay lại
                  </button>
                </div>
              ) : (
                /* Uncompleted Checkout view */
                <div className="space-y-6">
                  
                  {/* Fee Items breakdown */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Các mục thu phí</h5>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      
                      {/* Clinic fee item */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-slate-700">Tiền khám lâm sàng</div>
                          <div className="text-[10px] text-slate-500">Khám tại phòng {activeVisit.phongKham?.ten_phong}</div>
                        </div>
                        <span className="font-mono text-xs text-slate-800 font-bold">150,000 đ</span>
                      </div>

                      {/* CLS ordered items */}
                      {activeVisit.ketQuaCLSs?.filter(Boolean).map((k) => (
                        <div key={k.ma_ket_qua} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-slate-700">{k.dichVuCLS?.ten_dich_vu || k.loai_cls}</div>
                            <div className="text-[10px] text-emerald-600 font-semibold">Cận lâm sàng - Đã có KQ</div>
                          </div>
                          <span className="font-mono text-xs text-slate-800 font-bold">
                            {parseFloat(k.dichVuCLS?.gia || 0).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      ))}

                      {/* Prescribed medicines */}
                      {activeVisit.donThuoc?.chiTietDonThuocs?.map((c) => (
                        <div key={c.ma_ct} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                          <div>
                            <div className="text-xs font-bold text-slate-700">{c.thuoc?.ten_thuoc}</div>
                            <div className="text-[10px] text-slate-500">
                              Kê {c.so_luong} {c.thuoc?.don_vi} &times; {parseFloat(c.don_gia).toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                          <span className="font-mono text-xs text-slate-800 font-bold">
                            {parseFloat(c.thanh_tien).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      ))}

                    </div>
                  </div>

                  {/* Payment Method selectors */}
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hình thức thanh toán</h5>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'TIEN_MAT', label: 'Tiền mặt', icon: '💵' },
                        { id: 'CHUYEN_KHOAN', label: 'Chuyển khoản', icon: '📱' },
                        { id: 'THE', label: 'Thẻ quẹt', icon: '💳' }
                      ].map((method) => {
                        const active = paymentMethod === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-3 rounded-xl border text-center transition ${
                              active
                                ? 'bg-indigo-50 border-indigo-500/30 text-indigo-700 font-bold'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-lg block mb-1">{method.icon}</span>
                            <span className="text-[10px] block">{method.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR Code section for Transfer */}
                  {paymentMethod === 'CHUYEN_KHOAN' && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center space-y-3 animate-fadeIn">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        {/* Mock QR display container */}
                        <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-slate-800 font-extrabold text-[10px] text-center p-2 uppercase font-mono">
                          VietQR MBBank<br/>STK: 0988777666<br/>FastClinic SĐT
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-700 uppercase">QUÉT MÃ VIETQR ĐỂ CHUYỂN KHOAN</p>
                        <p className="text-[9px] text-slate-500 mt-1">Hệ thống sẽ tự động cập nhật trạng thái sau khi thu tiền.</p>
                      </div>
                    </div>
                  )}

                  {/* Grand total calculation */}
                  {(() => {
                    const subtotalCls = activeVisit.ketQuaCLSs?.filter(Boolean).reduce((sum, k) => sum + parseFloat(k.dichVuCLS?.gia || 0), 0) || 0;
                    const subtotalMedicine = parseFloat(activeVisit.donThuoc?.tong_tien_thuoc || 0);
                    const grandTotal = 150000 + subtotalCls + subtotalMedicine;
                    
                    return (
                      <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Tiền khám:</span>
                          <span className="font-mono text-slate-700 font-bold">150,000 đ</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Cận lâm sàng:</span>
                          <span className="font-mono text-slate-700 font-bold">{subtotalCls.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Thuốc điều trị:</span>
                          <span className="font-mono text-slate-700 font-bold">{subtotalMedicine.toLocaleString('vi-VN')} đ</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-dashed border-slate-200">
                          <span className="text-slate-800">Tổng hóa đơn:</span>
                          <span className="font-mono text-base text-indigo-650 font-black">
                            {grandTotal.toLocaleString('vi-VN')} đ
                          </span>
                        </div>


                        
                        <button
                          type="button"
                          onClick={handleConfirmPayment}
                          disabled={submitting}
                          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 font-bold rounded-xl text-sm text-white transition shadow shadow-indigo-600/10 mt-2"
                        >
                          {submitting ? 'Đang xác nhận...' : 'Xác nhận & Hoàn tất thanh toán'}
                        </button>
                      </div>
                    );
                  })()}

                </div>
              )}
              
            </div>
          )}
        </div>
        
      </div>
    </DashboardLayout>
  );
};

export default CashierDashboard;
