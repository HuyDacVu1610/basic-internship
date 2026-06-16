import React from 'react';

export const StatCard = ({ title, value, description, loading = false, className = '' }) => {
  if (loading) {
    return (
      <div className="bg-slate-100 border border-slate-200 p-5 rounded-2xl animate-pulse shadow-sm h-24" />
    );
  }

  return (
    <div className={`bg-white border border-slate-200 p-5 rounded-2xl shadow-sm ${className}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</div>
      <div className="text-2xl font-black text-slate-900 font-mono">
        {value}
      </div>
      {description && (
        <div className="text-[10px] mt-2 font-bold text-slate-600">
          {description}
        </div>
      )}
    </div>
  );
};

export default StatCard;
