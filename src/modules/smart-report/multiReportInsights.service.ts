import { SmartReport, SmartReportMarker } from './smartReport.types';

export interface MultiReportEntry {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  report: SmartReport;
  reportingDate: string;
  labName: string;
  markerCount: number;
  outOfRangeCount: number;
}

export interface BiomarkerTrajectory {
  markerId: string;
  name: string;
  unit: string;
  category: string;
  referenceRange: { low: number | null; high: number | null };
  history: {
    date: string;
    value: number;
    status: 'low' | 'normal' | 'high';
    reportId: string;
    labName?: string;
  }[];
  latestValue: number;
  previousValue: number | null;
  deltaPercent: number | null;
  trajectory: 'improving' | 'worsening' | 'stable' | 'single';
  trajectoryText: string;
  optimizationNote: string;
}

export interface OrganSystemScore {
  system: 'Cardiovascular' | 'Metabolic & Glycemic' | 'Renal & Kidney' | 'Hepatic & Liver' | 'Hematology';
  status: 'optimal' | 'moderate' | 'needs-attention';
  score: number; // 0 to 100
  markerCount: number;
  abnormalCount: number;
  summary: string;
  actionableInsight: string;
}

export interface OptimizedInsightsResult {
  reports: MultiReportEntry[];
  patientSummary: {
    name: string;
    idCode: string;
    cprNumber: string;
    contact: string;
    age: string;
    sex: string;
  };
  totalMarkersTracked: number;
  totalAbnormalCurrent: number;
  improvingCount: number;
  worseningCount: number;
  trajectories: BiomarkerTrajectory[];
  organSystems: OrganSystemScore[];
  keyHighlights: {
    type: 'positive' | 'warning' | 'info';
    title: string;
    detail: string;
    biomarkers: string[];
  }[];
}

/**
 * Aggregates multiple SmartReport payloads into unified longitudinal insights.
 */
export function buildOptimizedMultiReportInsights(
  entries: MultiReportEntry[]
): OptimizedInsightsResult {
  if (entries.length === 0) {
    return {
      reports: [],
      patientSummary: {
        name: '--',
        idCode: '--',
        cprNumber: '--',
        contact: '--',
        age: '--',
        sex: '--',
      },
      totalMarkersTracked: 0,
      totalAbnormalCurrent: 0,
      improvingCount: 0,
      worseningCount: 0,
      trajectories: [],
      organSystems: [],
      keyHighlights: [],
    };
  }

  // Sort reports chronologically by date if possible
  const sortedReports = [...entries].sort((a, b) => {
    const da = new Date(a.reportingDate).getTime() || 0;
    const db = new Date(b.reportingDate).getTime() || 0;
    return da - db;
  });

  // Extract best patient info available from latest report
  const latestReport = sortedReports[sortedReports.length - 1].report;
  const patientSummary = {
    name: latestReport.summary.patientName || '--',
    idCode: latestReport.summary.patientIdCode || latestReport.summary.labId || '--',
    cprNumber: latestReport.summary.cprNumber || '--',
    contact: latestReport.summary.contact || '--',
    age: latestReport.summary.age || '--',
    sex: latestReport.summary.sex || '--',
  };

  // Map each biomarker across reports
  const markerMap = new Map<string, BiomarkerTrajectory>();

  sortedReports.forEach((entry) => {
    entry.report.panels.forEach((panel) => {
      panel.markers.forEach((marker: SmartReportMarker) => {
        let existing = markerMap.get(marker.markerId);
        if (!existing) {
          existing = {
            markerId: marker.markerId,
            name: marker.name,
            unit: marker.unit,
            category: panel.panelName,
            referenceRange: marker.referenceRange,
            history: [],
            latestValue: marker.value,
            previousValue: null,
            deltaPercent: null,
            trajectory: 'single',
            trajectoryText: 'First recorded test',
            optimizationNote: marker.explanation,
          };
          markerMap.set(marker.markerId, existing);
        }

        existing.history.push({
          date: entry.reportingDate || entry.uploadedAt,
          value: marker.value,
          status: marker.status,
          reportId: entry.id,
          labName: entry.labName,
        });

        existing.latestValue = marker.value;
      });
    });
  });

  const trajectories: BiomarkerTrajectory[] = Array.from(markerMap.values()).map(
    (traj) => {
      if (traj.history.length > 1) {
        const prev = traj.history[traj.history.length - 2];
        const curr = traj.history[traj.history.length - 1];
        traj.previousValue = prev.value;

        if (prev.value !== 0) {
          traj.deltaPercent = Math.round(((curr.value - prev.value) / prev.value) * 100);
        } else {
          traj.deltaPercent = 0;
        }

        // Determine if movement is positive or negative based on reference range
        const low = traj.referenceRange.low;
        const high = traj.referenceRange.high;

        const wasAbnormal = prev.status !== 'normal';
        const isNowNormal = curr.status === 'normal';
        const isNowAbnormal = curr.status !== 'normal';

        if (wasAbnormal && isNowNormal) {
          traj.trajectory = 'improving';
          traj.trajectoryText = `Normalized (${traj.deltaPercent > 0 ? '+' : ''}${traj.deltaPercent}%)`;
          traj.optimizationNote = `Positive response: value moved into normal reference range (${low ?? 0} - ${high ?? '--'} ${traj.unit}).`;
        } else if (!wasAbnormal && isNowAbnormal) {
          traj.trajectory = 'worsening';
          traj.trajectoryText = `Shifted out of range (${traj.deltaPercent > 0 ? '+' : ''}${traj.deltaPercent}%)`;
          traj.optimizationNote = `Clinical attention suggested: marker progressed outside target reference threshold.`;
        } else if (isNowAbnormal && wasAbnormal) {
          // Both abnormal: check if moving closer to target
          const target = high ?? low ?? 100;
          const prevDist = Math.abs(prev.value - target);
          const currDist = Math.abs(curr.value - target);
          if (currDist < prevDist) {
            traj.trajectory = 'improving';
            traj.trajectoryText = `Trending toward normal (${traj.deltaPercent > 0 ? '+' : ''}${traj.deltaPercent}%)`;
            traj.optimizationNote = `Progressing in the desired direction toward healthy target limit.`;
          } else {
            traj.trajectory = 'worsening';
            traj.trajectoryText = `Elevating further (${traj.deltaPercent > 0 ? '+' : ''}${traj.deltaPercent}%)`;
            traj.optimizationNote = `Persistent elevation observed across reports. Consider reviewing with clinician.`;
          }
        } else {
          traj.trajectory = 'stable';
          traj.trajectoryText = `Stable (${traj.deltaPercent > 0 ? '+' : ''}${traj.deltaPercent}%)`;
          traj.optimizationNote = `Remains consistent within healthy physiological margins.`;
        }
      }
      return traj;
    }
  );

  const totalMarkersTracked = trajectories.length;
  const totalAbnormalCurrent = trajectories.filter(
    (t) => t.history[t.history.length - 1]?.status !== 'normal'
  ).length;

  const improvingCount = trajectories.filter((t) => t.trajectory === 'improving').length;
  const worseningCount = trajectories.filter((t) => t.trajectory === 'worsening').length;

  // Organ system health synthesis
  const organSystems: OrganSystemScore[] = [
    {
      system: 'Cardiovascular',
      status: 'optimal',
      score: 88,
      markerCount: 0,
      abnormalCount: 0,
      summary: 'Lipid balance & circulatory markers',
      actionableInsight: 'Maintain dietary fiber and regular aerobic cardiovascular activity.',
    },
    {
      system: 'Metabolic & Glycemic',
      status: 'optimal',
      score: 82,
      markerCount: 0,
      abnormalCount: 0,
      summary: 'Glucose regulation & insulin response',
      actionableInsight: 'Steady blood sugar levels observed across sequential tests.',
    },
    {
      system: 'Renal & Kidney',
      status: 'optimal',
      score: 95,
      markerCount: 0,
      abnormalCount: 0,
      summary: 'Electrolytes, filtration & hydration',
      actionableInsight: 'Filtration and creatinine values demonstrate healthy kidney function.',
    },
    {
      system: 'Hepatic & Liver',
      status: 'optimal',
      score: 90,
      markerCount: 0,
      abnormalCount: 0,
      summary: 'Enzymatic metabolism & clearance',
      actionableInsight: 'Liver enzymes (ALT/AST) reflect normal clearance rates.',
    },
    {
      system: 'Hematology',
      status: 'optimal',
      score: 92,
      markerCount: 0,
      abnormalCount: 0,
      summary: 'Complete blood cell counts & oxygen transport',
      actionableInsight: 'Hemoglobin and red/white blood cell distributions are stable.',
    },
  ];

  // Adjust scores based on actual mapped markers
  trajectories.forEach((t) => {
    const isAbnormal = t.history[t.history.length - 1]?.status !== 'normal';
    const cat = t.category.toLowerCase();
    let sys = organSystems[4]; // Hematology fallback

    if (cat.includes('lipid') || t.name.toLowerCase().includes('cholesterol') || t.name.toLowerCase().includes('triglyceride')) {
      sys = organSystems[0]; // Cardiovascular
    } else if (cat.includes('glycemic') || cat.includes('diabetes') || t.name.toLowerCase().includes('glucose') || t.name.toLowerCase().includes('hba1c')) {
      sys = organSystems[1]; // Metabolic
    } else if (cat.includes('kidney') || cat.includes('renal') || t.name.toLowerCase().includes('creatinine') || t.name.toLowerCase().includes('urea')) {
      sys = organSystems[2]; // Renal
    } else if (cat.includes('liver') || cat.includes('hepatic') || t.name.toLowerCase().includes('alt') || t.name.toLowerCase().includes('ast')) {
      sys = organSystems[3]; // Hepatic
    }

    sys.markerCount++;
    if (isAbnormal) {
      sys.abnormalCount++;
      sys.score = Math.max(45, sys.score - 15);
    }
  });

  organSystems.forEach((s) => {
    if (s.abnormalCount > 1) {
      s.status = 'needs-attention';
      s.actionableInsight = `${s.abnormalCount} biomarkers require clinical correlation. Discuss these trends with your healthcare practitioner.`;
    } else if (s.abnormalCount === 1) {
      s.status = 'moderate';
      s.actionableInsight = 'Mild deviation observed. Follow-up monitoring recommended.';
    } else {
      s.status = 'optimal';
    }
  });

  // Key Cross-Report Highlights
  const keyHighlights: OptimizedInsightsResult['keyHighlights'] = [];

  const improvedMarkers = trajectories.filter((t) => t.trajectory === 'improving');
  if (improvedMarkers.length > 0) {
    keyHighlights.push({
      type: 'positive',
      title: `${improvedMarkers.length} Biomarkers Show Clinical Improvement`,
      detail: `Positive trajectory recorded across tests for ${improvedMarkers.map((m) => m.name).join(', ')}.`,
      biomarkers: improvedMarkers.map((m) => m.name),
    });
  }

  const worsenedMarkers = trajectories.filter((t) => t.trajectory === 'worsening');
  if (worsenedMarkers.length > 0) {
    keyHighlights.push({
      type: 'warning',
      title: `${worsenedMarkers.length} Biomarkers Warrant Medical Attention`,
      detail: `Persistent elevation or out-of-range progression detected in ${worsenedMarkers.map((m) => m.name).join(', ')}.`,
      biomarkers: worsenedMarkers.map((m) => m.name),
    });
  }

  keyHighlights.push({
    type: 'info',
    title: `Multi-Laboratory Synthesis Active`,
    detail: `Integrated data across ${entries.length} separate diagnostic submissions covering ${totalMarkersTracked} clinical biomarkers.`,
    biomarkers: entries.map((e) => e.fileName),
  });

  return {
    reports: sortedReports,
    patientSummary,
    totalMarkersTracked,
    totalAbnormalCurrent,
    improvingCount,
    worseningCount,
    trajectories,
    organSystems,
    keyHighlights,
  };
}
