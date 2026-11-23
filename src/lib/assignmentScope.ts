export type AssignmentScopeData = {
  sites: any[];
  services: any[];
  departments?: any[];
  units: any[];
  equipment: any[];
  warehouses: any[];
};

const scopeRank: Record<string, number> = {
  site: 1, service: 2, unit: 3, equipment: 4, warehouse: 5,
};

export function resolveAssignedContext(scopes: any[], data: AssignmentScopeData) {
  // Management is deliberately not an access scope. Only explicit Site, Service,
  // Unit, Equipment or Warehouse assignments can populate the user's context.
  const rows = (scopes || []).filter(x => x && x.can_view === true && scopeRank[x.scope_type] !== undefined);
  const by = (list: any[], id: string) => list.find(x => x.id === id);
  const paths = rows.map(scope => {
    let site_id = "", service_id = "", unit_id = "", equipment_id = "", warehouse_id = "";
    if (scope.scope_type === "site") site_id = scope.scope_id;
    if (scope.scope_type === "service") {
      const x = by(data.services, scope.scope_id);
      service_id = scope.scope_id; site_id = x?.site_id || "";
    }
    if (scope.scope_type === "unit") {
      const x = by(data.units, scope.scope_id);
      unit_id = scope.scope_id; service_id = x?.service_id || "";
      const service = by(data.services, service_id);
      site_id = x?.site_id || service?.site_id || "";
    }
    if (scope.scope_type === "equipment") {
      const x = by(data.equipment, scope.scope_id);
      equipment_id = scope.scope_id; unit_id = x?.unit_id || "";
      const unit = by(data.units, unit_id);
      service_id = x?.service_id || unit?.service_id || "";
      const service = by(data.services, service_id);
      site_id = x?.site_id || unit?.site_id || service?.site_id || "";
    }
    if (scope.scope_type === "warehouse") {
      const x = by(data.warehouses, scope.scope_id);
      warehouse_id = scope.scope_id; site_id = x?.site_id || "";
      service_id = x?.service_id || ""; unit_id = x?.unit_id || "";
      equipment_id = x?.equipment_id || "";
      if (equipment_id) {
        const equipment = by(data.equipment, equipment_id);
        unit_id = unit_id || equipment?.unit_id || "";
        service_id = service_id || equipment?.service_id || "";
        site_id = site_id || equipment?.site_id || "";
      }
    }
    return { rank: scopeRank[scope.scope_type], site_id, service_id, unit_id, equipment_id, warehouse_id };
  });
  const fields = ["site_id", "service_id", "unit_id", "equipment_id", "warehouse_id"];
  const values: Record<string, string> = {}, locked: Record<string, boolean> = {};
  const broadest = paths.length ? Math.min(...paths.map(x => x.rank)) : 0;
  const ranks: Record<string, number> = { site_id: 1, service_id: 2, unit_id: 3, equipment_id: 4, warehouse_id: 5 };
  for (const field of fields) {
    const ids = [...new Set(paths.map(x => (x as any)[field]).filter(Boolean))];
    locked[field] = ids.length === 1 && broadest >= ranks[field];
    values[field] = locked[field] ? ids[0] : "";
  }
  return { values, locked, paths };
}

export function applyAssignedScopeFilter(query: any, scopes: any[], _columns: Record<string, string>, emptyColumn = "id") {
  const rows = (scopes || []).filter(x => x && x.can_view === true && scopeRank[x.scope_type] !== undefined);
  if (!rows.length) return query.eq(emptyColumn, "00000000-0000-0000-0000-000000000000");
  // RLS remains the authorization boundary; this helper only blocks empty scope sets.
  return query;
}
