import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { MedicineManagement } from './MedicineManagement';
import { StaffManagement } from './StaffManagement';
import reportApi from '../services/reportApi';
import { StatCard } from '../components/common/StatCard';

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'medicines', 'staff'

  // Date picker states
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getTodayDate());

  // Report states
  const [loading, setLoading] = useState(true);
  const [patientsData, setPatientsData] = useState([]);
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    totalTienKham: 0,
    totalTongPhiCls: 0,
    totalTongTienThuoc: 0,
    totalInvoices: 0,
    breakdown: [],
    paymentMethods: []
  });
  const [topMedicines, setTopMedicines] = useState([]);

  // Fetch report data
  const fetchReports = async () => {
    setLoading(true);
    try {
      const [patientsRes, revenueRes, medicinesRes] = await Promise.all([
        reportApi.getPatients(fromDate, toDate),
        reportApi.getRevenue(fromDate, toDate),
        reportApi.getMedicines(fromDate, toDate)
      ]);

      if (patientsRes.success) {
        setPatientsData(patientsRes.data || []);
      }
      if (revenueRes.success) {
        setRevenueData(revenueRes.data || {
          totalRevenue: 0,
          totalTienKham: 0,
          totalTongPhiCls: 0,
          totalTongTienThuoc: 0,
          totalInvoices: 0,
          breakdown: [],
          paymentMethods: []
        });
      }
      if (medicinesRes.success) {
        setTopMedicines(medicinesRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchReports();
    }
  }, [fromDate, toDate, activeTab]);

  // Export report to CSV
  const handleExportCSV = () => {
    let csvContent = "\uFEFF"; // Unicode BOM for excel vietnamese
    csvContent += "BÁO CÁO THỐNG KÊ FASTCLINIC\n";
    csvContent += `Thời gian: ${fromDate} đến ${toDate}\n\n`;

    csvContent += "I. CHỈ SỐ TỔNG QUAN\n";
    csvContent += `Tổng doanh thu,${revenueData.totalRevenue} VND\n`;
    csvContent += `Doanh thu khám bệnh,${revenueData.totalTienKham} VND\n`;
    csvContent += `Doanh thu cận lâm sàng,${revenueData.totalTongPhiCls} VND\n`;
    csvContent += `Doanh thu thuốc,${revenueData.totalTongTienThuoc} VND\n`;
    csvContent += `Tổng số hóa đơn thanh toán,${revenueData.totalInvoices}\n\n`;

    csvContent += "II. DOANH THU CHI TIẾT THEO NGÀY\n";
    csvContent += "Ngày,Tiền khám,Tiền CLS,Tiền thuốc,Tổng tiền\n";
    if (revenueData.breakdown && revenueData.breakdown.length > 0) {
      revenueData.breakdown.forEach(row => {
        csvContent += `${row.date},${row.tienKham},${row.tongPhiCls},${row.tongTienThuoc},${row.tongTien}\n`;
      });
    } else {
      csvContent += "Không có dữ liệu\n";
    }
    csvContent += "\n";

    csvContent += "III. SỐ LƯỢT KHÁM THEO NGÀY\n";
    csvContent += "Ngày,Số lượt khám\n";
    if (patientsData && patientsData.length > 0) {
      patientsData.forEach(row => {
        csvContent += `${row.date},${row.count}\n`;
      });
    } else {
      csvContent += "Không có dữ liệu\n";
    }
    csvContent += "\n";

    csvContent += "IV. TOP 10 DƯỢC PHẨM TIÊU THỤ\n";
    csvContent += "Mã Thuốc,Tên Thuốc,Hoạt Chất,Đơn Vị,Số Lượng Đã Bán,Tổng Doanh Thu\n";
    if (topMedicines && topMedicines.length > 0) {
      topMedicines.forEach(row => {
        csvContent += `${row.maThuoc},"${row.tenThuoc}","${row.hoatChat}",${row.donVi},${row.totalQuantity},${row.totalRevenue}\n`;
      });
    } else {
      csvContent += "Không có dữ liệu\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaoCao_FastClinic_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom SVG Line Chart for Revenue Trends
  const renderRevenueChart = () => {
    const data = revenueData.breakdown || [];
    if (data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-slate-500 italic">
          Không có dữ liệu doanh thu trong khoảng thời gian này
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...data.map(d => d.tongTien), 100000);

    // Generate line points
    const points = data.map((d, i) => {
      const x = paddingLeft + (i * (chartWidth / (data.length > 1 ? data.length - 1 : 1)));
      const y = paddingTop + chartHeight - (d.tongTien / maxVal) * chartHeight;
      return { x, y, date: d.date, value: d.tongTien };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    // Gradient fill path
    let areaPath = '';
    if (points.length > 0) {
      areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const label = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx} className="opacity-20">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeDasharray="4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  textAnchor="end"
                  className="text-[9px] font-mono font-extrabold"
                >
                  {label.toLocaleString('vi-VN')}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          {areaPath && <path d={areaPath} fill="url(#chartGrad)" />}

          {/* Path Line */}
          {linePath && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Points markers & value tooltips */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#6366f1"
                stroke="#0f172a"
                strokeWidth="1.5"
                className="transition hover:r-6"
              />
              
              {/* Tooltip on Hover */}
              <g className="opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
                <rect
                  x={p.x - 45}
                  y={p.y - 30}
                  width="90"
                  height="22"
                  rx="4"
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth="1"
                />
                <text
                  x={p.x}
                  y={p.y - 15}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="text-[9px] font-bold"
                >
                  {p.value.toLocaleString('vi-VN')} đ
                </text>
              </g>

              {/* Date text label */}
              {data.length < 15 || idx % Math.ceil(data.length / 8) === 0 ? (
                <text
                  x={p.x}
                  y={height - 5}
                  textAnchor="middle"
                  fill="#64748b"
                  className="text-[8px] font-semibold"
                >
                  {p.date.substring(5)}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Custom SVG Bar Chart for Patient Counts
  const renderPatientChart = () => {
    const data = patientsData || [];
    if (data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-xs text-slate-500 italic">
          Không có dữ liệu lượt khám trong khoảng thời gian này
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxCount = Math.max(...data.map(d => d.count), 5);
    const colWidth = chartWidth / data.length;
    const barWidth = colWidth * 0.6;
    const barGap = colWidth * 0.4;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px] h-auto overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingTop + chartHeight * ratio;
            const label = Math.round(maxCount * (1 - ratio));
            return (
              <g key={idx} className="opacity-20">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#cbd5e1"
                  strokeDasharray="4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  fill="#94a3b8"
                  textAnchor="end"
                  className="text-[9px] font-mono font-extrabold"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Render Bars */}
          {data.map((d, i) => {
            const x = paddingLeft + i * colWidth + barGap / 2;
            const barHeight = (d.count / maxCount) * chartHeight;
            const y = paddingTop + chartHeight - barHeight;

            return (
              <g key={i} className="group cursor-pointer">
                {/* Bar Rect */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="2"
                  fill="#10b981"
                  className="transition fill-emerald-500 hover:fill-emerald-400"
                />

                {/* Tooltip on Hover */}
                <g className="opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
                  <rect
                    x={x + barWidth / 2 - 25}
                    y={y - 25}
                    width="50"
                    height="18"
                    rx="4"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 13}
                    textAnchor="middle"
                    fill="#ffffff"
                    className="text-[9px] font-bold"
                  >
                    {d.count} lượt
                  </text>
                </g>

                {/* Date label */}
                {data.length < 15 || i % Math.ceil(data.length / 8) === 0 ? (
                  <text
                    x={x + barWidth / 2}
                    y={height - 5}
                    textAnchor="middle"
                    fill="#64748b"
                    className="text-[8px] font-semibold"
                  >
                    {d.date.substring(5)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <DashboardLayout title="Bảng Điều Khiển Quản Trị Viên (Admin Panel)">
      {/* Tabs Header bar */}
      <div className="flex space-x-2 border-b border-slate-200 mb-8 pb-px">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center space-x-2 ${
            activeTab === 'dashboard'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📊 Tổng quan</span>
        </button>
        
        <button
          onClick={() => setActiveTab('medicines')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center space-x-2 ${
            activeTab === 'medicines'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>💊 Quản lý Thuốc</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center space-x-2 ${
            activeTab === 'staff'
              ? 'border-indigo-600 text-indigo-600 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>👥 Quản lý Nhân viên</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 text-slate-800">
          {/* Date Range Picker Filters Bar */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-extrabold text-slate-900">Lọc khoảng thời gian báo cáo</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Từ</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Đến</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 transition font-mono shadow-sm"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition flex items-center space-x-1.5 shadow shadow-emerald-600/10 ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>

          {/* Overview stats cards container */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Tổng doanh thu"
              value={`${revenueData.totalRevenue.toLocaleString('vi-VN')} đ`}
              description={<span className="text-indigo-600 font-bold">Tổng số hóa đơn: {revenueData.totalInvoices}</span>}
              loading={loading}
            />
            <StatCard
              title="Doanh thu khám bệnh"
              value={`${revenueData.totalTienKham.toLocaleString('vi-VN')} đ`}
              description={<span className="text-emerald-600 font-bold">Mặc định 150.000 đ/lượt</span>}
              loading={loading}
            />
            <StatCard
              title="Doanh thu CLS"
              value={`${revenueData.totalTongPhiCls.toLocaleString('vi-VN')} đ`}
              description={<span className="text-amber-600 font-bold">Phí các xét nghiệm/chụp chiếu</span>}
              loading={loading}
            />
            <StatCard
              title="Doanh thu Thuốc"
              value={`${revenueData.totalTongTienThuoc.toLocaleString('vi-VN')} đ`}
              description={<span className="text-purple-600 font-bold">Khấu hao từ danh mục thuốc</span>}
              loading={loading}
            />
          </div>

          {/* Visual Trends Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue chart card */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5 border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"></span>
                  <span>Biểu đồ Doanh thu (VND)</span>
                </h3>
              </div>
              {loading ? (
                <div className="h-48 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
              ) : (
                renderRevenueChart()
              )}
            </div>

            {/* Patient counts chart card */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5 border-b border-slate-200 pb-3">
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                  <span>Số lượt khám bệnh nhân</span>
                </h3>
              </div>
              {loading ? (
                <div className="h-48 bg-slate-100 border border-slate-200 rounded-xl animate-pulse" />
              ) : (
                renderPatientChart()
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top consumed medicines table */}
            <div className="lg:col-span-2 bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 mb-5 border-b border-slate-200 pb-3 flex items-center space-x-2">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2zm8-4V5a2 2 0 012-2h2a2 2 0 012 2v10a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Top 10 Dược phẩm Tiêu thụ Nhiều nhất</span>
              </h3>

              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-slate-100 border border-slate-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : topMedicines.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  Không có dữ liệu thuốc được bán trong khoảng thời gian này
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="text-[9px] uppercase bg-slate-100/80 text-slate-500 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-2.5">Tên thuốc</th>
                        <th className="p-2.5">Hoạt chất</th>
                        <th className="p-2.5">Đơn vị</th>
                        <th className="p-2.5 text-center">Số lượng bán</th>
                        <th className="p-2.5 text-right">Doanh thu thuốc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {topMedicines.map((med) => (
                        <tr key={med.maThuoc} className="hover:bg-slate-50 transition">
                          <td className="p-2.5 text-slate-800 font-extrabold uppercase text-[11px]">{med.tenThuoc}</td>
                          <td className="p-2.5 text-slate-600 font-medium">{med.hoatChat || '--'}</td>
                          <td className="p-2.5 text-slate-500">{med.donVi}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-700">{med.totalQuantity}</td>
                          <td className="p-2.5 text-right font-mono text-indigo-600 font-extrabold">
                            {med.totalRevenue.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment methods breakdown card */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-extrabold text-slate-800 mb-5 border-b border-slate-200 pb-3 flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Phương thức thanh toán</span>
              </h3>

              {loading ? (
                <div className="space-y-4 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 border border-slate-200 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !revenueData.paymentMethods || revenueData.paymentMethods.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  Không có dữ liệu giao dịch
                </div>
              ) : (
                <div className="space-y-4">
                  {revenueData.paymentMethods.map((pm) => {
                    const methodLabels = {
                      'TIEN_MAT': 'Tiền mặt',
                      'CHUYEN_KHOAN': 'Chuyển khoản (VietQR)',
                      'THE': 'Thẻ ATM/Tín dụng'
                    };
                    const percent = revenueData.totalRevenue > 0 
                      ? Math.round((pm.amount / revenueData.totalRevenue) * 100) 
                      : 0;

                    return (
                      <div key={pm.method} className="space-y-1.5">
                         <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">
                            {methodLabels[pm.method] || pm.method}
                          </span>
                          <span className="font-mono text-slate-500">
                            {pm.count} HĐ ({percent}%)
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <div className="text-right text-[10px] font-mono text-indigo-600 font-bold">
                          {pm.amount.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'medicines' && (
        <div>
          <MedicineManagement />
        </div>
      )}

      {activeTab === 'staff' && (
        <div>
          <StaffManagement />
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminPanel;
