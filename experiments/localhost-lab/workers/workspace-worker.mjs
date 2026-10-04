import '../../../encoding.js';
import '../../../csv.js';
import '../../../warehouse.js';
import '../../../workspace.js';
import { installKernel } from '../generated/preparation-kernel.mjs';

installKernel({
  encoding: globalThis.OpenSlottingEncoding,
  core: globalThis.OpenSlottingCsv,
  warehouseModel: globalThis.OpenSlottingWarehouse,
  workspaceModel: globalThis.OpenSlottingWorkspace
});
