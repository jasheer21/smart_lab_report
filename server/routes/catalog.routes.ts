import { Router } from 'express';
import {
  DISCLAIMER,
  MARKERS,
  PANEL_DISPLAY_NAMES,
  PANEL_ORDER,
} from '../../src/modules/smart-report/smartReport.catalog';

export const catalogRouter = Router();

/** GET /api/catalog — biomarkers the parser recognises, with the reference ranges used for status. */
catalogRouter.get('/', (_req, res) => {
  const markers = Object.entries(MARKERS).map(([markerId, def]) => ({
    markerId,
    name: def.name,
    panel: def.panel,
    panelName: def.panelName,
    aliases: def.aliases,
    unitHints: def.unitHints,
    referenceRange: def.referenceRange,
    higherIsBetter: Boolean(def.higherIsBetter),
  }));
  res.json({
    success: true,
    data: { disclaimer: DISCLAIMER, panelOrder: PANEL_ORDER, panelNames: PANEL_DISPLAY_NAMES, markers },
  });
});
