import React from 'react';
import { User, FileText, CheckCircle2 } from 'lucide-react';

export interface PatientDetails {
  name?: string | null;
  patientIdCode?: string | null;
  isPrimary?: boolean;
  sex?: string | null;
  age?: string | null;
  bloodType?: string | null;
  cprNumber?: string | null;
  contact?: string | null;
  email?: string | null;
}

interface Props {
  patient?: PatientDetails | null;
}

export const PatientDetailsCard: React.FC<Props> = ({ patient }) => {
  const hasData = Boolean(patient && (patient.name && patient.name !== '--'));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] hover:border-slate-300">
      {/* Subtle background decorative gradient accent */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-teal-50/40 blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center relative z-10">
        {/* Left Column: Avatar & Identity */}
        <div className="flex flex-col items-start min-w-[190px] pr-8 pb-5 md:pb-0 md:border-r md:border-slate-100 transition-all duration-300">
          <div className="relative group">
            <div className="flex h-15 w-15 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200/80 text-slate-400 border border-slate-200 shadow-inner transition-transform duration-300 group-hover:scale-105">
              <User className="h-7 w-7 transition-colors duration-200 group-hover:text-slate-600" />
            </div>
            {hasData && (
              <span className="absolute bottom-0 right-0 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white text-white shadow-xs">
                <CheckCircle2 className="h-3 w-3" />
              </span>
            )}
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">
              {patient?.patientIdCode || '--'}
            </span>
            {hasData && (
              <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-2xs animate-in fade-in zoom-in-95 duration-300">
                Primary
              </span>
            )}
          </div>

          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 transition-colors duration-200">
            {patient?.name || '--'}
          </h2>
        </div>

        {/* Right Grid: Demographics & Contact */}
        <div className="flex-1 md:pl-8 pt-4 md:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 gap-x-8">
            {/* Field item: Sex */}
            <div className="group transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-teal-700 transition-colors">
                Sex
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {patient?.sex || '--'}
              </p>
            </div>

            {/* Field item: Age */}
            <div className="group transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-teal-700 transition-colors">
                Age
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {patient?.age || '--'}
              </p>
            </div>

            {/* Field item: Blood Type */}
            <div className="group transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-teal-700 transition-colors">
                Blood Type
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {patient?.bloodType || '--'}
              </p>
            </div>

            {/* Field item: CPR Number */}
            <div className="group transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-teal-700 transition-colors">
                CPR Number
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900 tracking-tight">
                {patient?.cprNumber || '--'}
              </p>
            </div>

            {/* Field item: Contact */}
            <div className="group transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-teal-700 transition-colors">
                Contact
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {patient?.contact || '--'}
              </p>
            </div>

            {/* Field item: Email */}
            <div className="group transition-all duration-200">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-teal-700 transition-colors">
                Email
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {patient?.email || '--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 animate-in fade-in duration-500">
          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>Patient details will automatically populate here after uploading a clinical lab report.</span>
        </div>
      )}
    </div>
  );
};
