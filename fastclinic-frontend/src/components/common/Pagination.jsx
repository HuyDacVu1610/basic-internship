import React from 'react';

export const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, label = 'mục' }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
      <span className="text-xs text-slate-500 font-semibold">
        Trang <span className="text-slate-700">{currentPage}</span> / {totalPages} {totalItems !== undefined && `(Tổng cộng ${totalItems} ${label})`}
      </span>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 disabled:bg-slate-50 disabled:border-slate-100 text-slate-700 disabled:text-slate-400 font-bold rounded-lg text-xs transition"
        >
          Trước
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 disabled:bg-slate-50 disabled:border-slate-100 text-slate-700 disabled:text-slate-400 font-bold rounded-lg text-xs transition"
        >
          Sau
        </button>
      </div>
    </div>
  );
};

export default Pagination;
