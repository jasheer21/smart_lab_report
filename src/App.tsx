import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { SingleReportPage } from './pages/SingleReportPage';
import { MultiInsightsPage } from './pages/MultiInsightsPage';
import { FileText, Layers, Activity } from 'lucide-react';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-[#f8fafc] to-slate-100/60 text-slate-900 flex flex-col antialiased">
        {/* Top Application Header with Route Navigation */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left: Breadcrumbs & App Branding */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span className="text-slate-400">Bookings</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-800 font-semibold">Diagnostic Details</span>
              </div>
              <span className="hidden sm:inline-block h-3.5 w-[1px] bg-slate-200" />
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                <Activity className="h-3 w-3 text-teal-600" />
                <span>Smart Health Suite</span>
              </div>
            </div>

            {/* Right: Route Switcher Navigation Tabs */}
            <nav
              aria-label="Route Navigation"
              className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-2xs select-none"
            >
              {/* Route: Single Report Page (/) */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Single Report Flow</span>
              </NavLink>

              {/* Route: Multi-Report & Optimized Insights Page (/multi-insights) */}
              <NavLink
                to="/multi-insights"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#15803D] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Multi-Upload & Insights</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                  Graphical
                </span>
              </NavLink>
            </nav>
          </div>
        </header>

        {/* Main Content View with Route Outlet */}
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8">
          <Routes>
            <Route path="/" element={<SingleReportPage />} />
            <Route path="/multi-insights" element={<MultiInsightsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
