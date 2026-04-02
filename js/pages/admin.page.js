import { createAdminController } from '../features/admin/admin.controller.js';

export function renderAdminPage(ctx) {
  const controller = createAdminController(ctx);
  controller.render();
}
