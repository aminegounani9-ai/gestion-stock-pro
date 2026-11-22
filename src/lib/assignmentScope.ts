export type AssignmentScopeData = {
  sites: any[];
  services: any[];
  departments: any[];
  units: any[];
  equipment: any[];
  warehouses: any[];
};

const scopeRank: Record<string, number> = {
  management: 0, site: 1, service: 2, department: 3, unit: 4, equipment: 5, warehouse: 6,
};

export function resolveAssignedContext(scopes: any[], data: AssignmentScopeData) {
  const rows = (scopes || []).filter(
    x => x && x.can_view !== false && scopeRank[x.scope_type] !== undefined && x.scope_type !== "management"
  );
  const paths = rows.map(scope => {
    let site_id = "", service_id = "", department_id = "", unit_id = "", equipment_id = "", warehouse_id = "";
    const by = (list: any[], id: string) => list.find(x => x.id === id);
    if (scope.scope_type === "site") site_id = scope.scope_id;
    if (scope.scope_type === "service") {
      const x = by(data.services, scope.scope_id);
      service_id = scope.scope_id; site_id = x?.site_id || "";
    }
    if (scope.scope_type === "department") {
      const x = by(data.departments, scope.scope_id);
      department_id = scope.scope_id; service_id = x?.service_id || "";
      const sv = by(data.services, service_id); site_id = x?.site_id || sv?.site_id || "";
      unit_id = x?.unit_id || "";
    }
    if (scope.scope_type === "unit") {
      const x = by(data.units, scope.scope_id);
      unit_id = scope.scope_id; department_id = x?.department_id || "";
      const d = by(data.departments, department_id);
      service_id = x?.service_id || d?.service_id || "";
      const sv = by(data.services, service_id);
      site_id = x?.site_id || d?.site_id || sv?.site_id || "";
    }
    if (scope.scope_type === "equipment") {
      const x = by(data.equipment, scope.scope_id);
      equipment_id = scope.scope_id; unit_id = x?.unit_id || "";
      department_id = x?.department_id || by(data.units, unit_id)?.department_id || "";
      const d = by(data.departments, department_id);
      service_id = x?.service_id || d?.service_id || by(data.units, unit_id)?.service_id || "";
      const sv = by(data.services, service_id);
      site_id = x?.site_id || d?.site_id || by(data.units, unit_id)?.site_id || sv?.site_id || "";
    }
    if (scope.scope_type === "warehouse") {
      const x = by(data.warehouses, scope.scope_id);
      warehouse_id = scope.scope_id; site_id = x?.site_id || ""; service_id = x?.service_id || "";
      department_id = x?.department_id || ""; unit_id = x?.unit_id || ""; equipment_id = x?.equipment_id || "";
      if (equipment_id) {
        const e = by(data.equipment, equipment_id);
        unit_id = unit_id || e?.unit_id || ""; department_id = department_id || e?.department_id || "";
        service_id = service_id || e?.service_id || ""; site_id = site_id || e?.site_id || "";
      }
    }
    return { rank: scopeRank[scope.scope_type], site_id, service_id, department_id, unit_id, equipment_id, warehouse_id };
  });
  const fields = ["site_id", "service_id", "department_id", "unit_id", "equipment_id", "warehouse_id"];
  const values: Record<string, string> = {}, locked: Record<string, boolean> = {};
  const broadest = paths.length ? Math.min(...paths.map(x => x.rank)) : 0;
  const ranks: Record<string, number> = {
    site_id: 1, service_id: 2, department_id: 3, unit_id: 4, equipment_id: 5, warehouse_id: 6,
  };
  for (const field of fields) {
    const ids = [...new Set(paths.map(x => (x as any)[field]).filter(Boolean))];
    locked[field] = ids.length === 1 && broadest >= ranks[field];
    values[field] = locked[field] ? ids[0] : "";
  }
  return { values, locked, paths };
}

export function applyAssignedScopeFilter(query: any, scopes: any[], columns: Record<string, string>) {
  const rows = (scopes || []).filter(x => x && scopeRank[x.scope_type] !== undefined);
  if (!rows.length) return query.eq("id", "00000000-0000-0000-0000-000000000000");
  const broadest = Math.min(...rows.map(x => scopeRank[x.scope_type]));
  if (broadest === 0) return query;
  const type = rows.find(x => scopeRank[x.scope_type] === broadest)?.scope_type;
  const column = type ? columns[type] : undefined;
  const ids = [...new Set(rows.filter(x => x.scope_type === type).map(x => x.scope_id).filter(Boolean))];
  if (!column || !ids.length) return query.eq("id", "00000000-0000-0000-0000-000000000000");
  return query.in(column, ids);
}
