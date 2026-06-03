import React from 'react';

export const PageContainer = ({ title, subtitle, children, className = '' }) => {
  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${className}`}>
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">{title}</h1>
        {subtitle && <p className="text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
};
