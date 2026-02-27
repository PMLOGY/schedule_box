/**
 * Multi-Location Organization Types
 * Used by organization management, location switching, and org dashboards
 */

export type OrgRole = 'franchise_owner' | 'location_manager';

export interface Organization {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  owner_user_id: number;
  max_locations: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  company_id: number | null; // null = all locations (franchise_owner)
  role: OrgRole;
  created_at: string;
}

/** API response shape for organization with locations */
export interface OrganizationWithLocations extends Organization {
  locations: OrganizationLocation[];
  member_count: number;
}

/** Location summary within an organization */
export interface OrganizationLocation {
  company_uuid: string;
  company_name: string;
  company_slug: string;
  address_city: string | null;
  is_active: boolean;
}

/** Location metrics for org dashboard */
export interface LocationMetrics {
  company_uuid: string;
  company_name: string;
  bookings_count: number;
  revenue_total: string;
  occupancy_percent: number | null;
}

/** Switch location request */
export interface SwitchLocationRequest {
  company_uuid: string;
}

/** Switch location response */
export interface SwitchLocationResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  company: {
    uuid: string;
    name: string;
    slug: string;
  };
}
