import React, { useState, useEffect, useCallback } from 'react';
import queueApi from '../../services/queueApi';
import useSocket from '../../hooks/useSocket';

export const QueueDisplay = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Connect to the Socket.io server in the 'display' room
  const { socket, isConnected } = useSocket('display');

  // Clock ticking effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch the latest display queue data
  const fetchData = useCallback(async () => {
    try {
      const response = await queueApi.getQueueDisplay();
      if (response && response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error fetching display data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('Real-time update event received.');
      fetchData();
    };

    socket.on('queue-updated', handleUpdate);
    socket.on('patient-called', handleUpdate);

    return () => {
      socket.off('queue-updated', handleUpdate);
      socket.off('patient-called', handleUpdate);
    };
  }, [socket, fetchData]);

  // Handle connection state and fallback polling timer
  // If disconnected for > 5 seconds, switch to REST API polling every 10 seconds.
  useEffect(() => {
    let timeoutId = null;
    let intervalId = null;

    if (isConnected) {
      setIsPolling(false);
    } else {
      timeoutId = setTimeout(() => {
        setIsPolling(true);
        console.warn('Socket disconnected. Switched to backup REST API polling mode.');
        fetchData(); // Trigger immediate fetch
        intervalId = setInterval(fetchData, 10000); // Poll every 10s
      }, 5000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isConnected, fetchData]);

  // Format the time string
  const formatTime = (date) =>
    date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Format date string
  const formatDate = (date) =>
    date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Get status indicator badge settings
  const getStatusConfig = () => {
    if (isConnected) {
      return {
        pingClass: 'bg-emerald-400 animate-ping',
        dotClass: 'bg-emerald-500',
        textClass: 'text-emerald-400',
        label: 'Kết nối trực tuyến'
      };
    }
    if (isPolling) {
      return {
        pingClass: 'bg-amber-400 animate-pulse',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-400',
        label: 'Chế độ dự phòng (Polling)'
      };
    }
    return {
      pingClass: '',
      dotClass: 'bg-red-500 animate-pulse',
      textClass: 'text-red-400',
      label: 'Đang kết nối lại...'
    };
  };

  const status = getStatusConfig();

  const marqueeMessages = [
    '⚠️ Quý bệnh nhân vui lòng chuẩn bị sẵn phiếu khám bệnh, thẻ BHYT và giấy tờ tùy thân trước khi vào phòng khám.',
    '🔔 Vui lòng chú ý theo dõi màn hình hiển thị để di chuyển vào phòng khám đúng số thứ tự của mình.',
    '🏥 Bệnh viện cam kết hỗ trợ tối đa cho quý bệnh nhân. Chúc quý bệnh nhân mau chóng khỏe lại!'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-indigo-950 text-white flex flex-col justify-between font-sans overflow-hidden">
      
      {/* Header */}
      <header className="px-8 py-5 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-indigo-400">FASTCLINIC</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Hệ Thống Hàng Đợi Real-time</p>
          </div>
        </div>

        {/* Live Indicator and Clock */}
        <div className="flex items-center space-x-6">
          {/* Connection Status Badge */}
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-800/80 border border-gray-700/60 text-xs font-bold uppercase tracking-wider shadow-inner">
            <span className="relative flex h-2 w-2">
              {status.pingClass && (
                <span className={`${status.pingClass} absolute inline-flex h-full w-full rounded-full opacity-75`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dotClass}`}></span>
            </span>
            <span className={status.textClass}>{status.label}</span>
          </div>

          <div className="text-right border-l border-gray-800 pl-6">
            <div className="text-3xl font-black font-mono tracking-widest text-indigo-300">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs font-medium text-slate-400 mt-0.5">
              {formatDate(currentTime)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-8 overflow-y-auto">
        {loading ? (
          <div className="h-full w-full flex flex-col justify-center items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
            <p className="mt-4 text-lg text-slate-400 font-medium animate-pulse">Đang tải dữ liệu hàng đợi...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full w-full flex flex-col justify-center items-center border-2 border-dashed border-gray-800 rounded-3xl p-16">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-xl text-slate-400 font-bold">Không có phòng khám nào hoạt động</p>
            <p className="text-sm text-slate-500 mt-2">Vui lòng kiểm tra lại thiết lập phòng khám trong quản trị.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-full mx-auto">
            {data.map((room) => (
              <div 
                key={room.ma_phong} 
                className="bg-gray-800/30 backdrop-blur-md border border-gray-700/50 rounded-3xl shadow-xl hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Room Header */}
                <div className="px-6 py-4 bg-gray-900/40 border-b border-gray-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase">{room.ten_phong}</h2>
                    <p className="text-xs text-indigo-400 font-semibold tracking-wider mt-0.5">{room.chuyen_khoa || 'Phòng Khám'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    Phòng {room.ma_phong}
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
                  {/* Current Patient Section */}
                  <div className="bg-emerald-950/20 border border-emerald-500/15 rounded-2xl p-5 text-center flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500/30"></div>
                    <span className="text-xs font-bold tracking-widest text-emerald-500 uppercase mb-1">Đang gọi khám</span>
                    
                    {room.dang_kham ? (
                      <>
                        <div className="text-7xl font-black font-mono tracking-wider text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] animate-pulse">
                          {String(room.dang_kham.so_thu_tu).padStart(3, '0')}
                        </div>
                        <div className="text-xl font-black text-slate-100 mt-2 truncate max-w-full uppercase tracking-wide">
                          {room.dang_kham.ho_ten}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-7xl font-light font-mono text-slate-600 tracking-wider">
                          ---
                        </div>
                        <div className="text-sm font-semibold text-slate-500 mt-2 tracking-wide uppercase">
                          Đang trống
                        </div>
                      </>
                    )}
                  </div>

                  {/* Waiting List Section */}
                  <div className="flex-grow flex flex-col">
                    <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-3 block">Danh sách chờ khám</span>
                    
                    {room.hang_cho && room.hang_cho.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {room.hang_cho.map((patient) => (
                          <div 
                            key={patient.ma_phieu}
                            className="bg-gray-900/40 border border-gray-800 hover:border-gray-700/80 rounded-xl p-2.5 flex items-center space-x-2.5 transition-all duration-200"
                          >
                            <span className="text-base font-extrabold font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {String(patient.so_thu_tu).padStart(3, '0')}
                            </span>
                            <span className="text-xs font-bold text-slate-300 truncate uppercase" title={patient.ho_ten}>
                              {patient.ho_ten}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-grow flex items-center justify-center bg-gray-900/20 border border-dashed border-gray-800 rounded-xl p-6 text-slate-600 font-medium text-xs uppercase tracking-wider">
                        Không có bệnh nhân chờ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Scrolling Footer Marquee */}
      <footer className="bg-gray-950/80 border-t border-gray-800 text-slate-300 py-3.5 text-base font-medium backdrop-blur-md overflow-hidden relative shadow-2xl">
        <div className="whitespace-nowrap flex space-x-8 animate-[marquee_25s_linear_infinite] w-max select-none">
          {[...marqueeMessages, ...marqueeMessages].map((msg, index) => (
            <React.Fragment key={index}>
              <span>{msg}</span>
              {index < marqueeMessages.length * 2 - 1 && <span>•</span>}
            </React.Fragment>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default QueueDisplay;
