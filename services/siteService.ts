import { supabase } from './supabaseService.js';
import { saveSiteInstance, getAllSites } from './storageService.js';
import { GeneratedSiteData, SiteInstance, GeneratorInputs } from '../types.js';

/**
 * Save a site to IndexedDB + Supabase (if authenticated).
 * IndexedDB is saved first for instant UI. Supabase is fire-and-forget.
 */
export const saveSite = async (
  site: SiteInstance,
  formInputs: GeneratorInputs,
  userId: string | null
): Promise<void> => {
  // Always save locally first (fast)
  await saveSiteInstance(site);

  // If authenticated, also persist to Supabase (non-blocking)
  if (userId) {
    supabase
      .from('sites')
      .upsert({
        id: site.id,
        user_id: userId,
        company_name: formInputs.companyName,
        industry: formInputs.industry,
        service_area: formInputs.location,
        phone: formInputs.phone,
        brand_colour: formInputs.brandColor,
        site_data: site.data,
      })
      .then(({ error }) => {
        if (error) console.error('Supabase saveSite error:', error);
      });
  }
};

/**
 * Update site content (after inline edits) in IndexedDB + Supabase.
 * IndexedDB is saved first. Supabase update is fire-and-forget.
 */
export const updateSiteContent = async (
  site: SiteInstance,
  userId: string | null
): Promise<void> => {
  // Always save locally first
  await saveSiteInstance(site);

  // If authenticated, update Supabase (non-blocking)
  if (userId) {
    supabase
      .from('sites')
      .update({ site_data: site.data })
      .eq('id', site.id)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) console.error('Supabase updateSiteContent error:', error);
      });
  }
};

/**
 * Load the most recent site for a user from Supabase.
 */
export const loadUserSite = async (userId: string): Promise<SiteInstance | null> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Supabase loadUserSite error:', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    data: data.site_data as GeneratedSiteData,
    lastSaved: new Date(data.updated_at).getTime(),
    formInputs: {
      companyName: data.company_name || '',
      industry: data.industry || '',
      location: data.service_area || '',
      phone: data.phone || '',
      brandColor: data.brand_colour || '#2563eb',
    },
  };
};

/**
 * Load the most recent site from IndexedDB.
 */
export const loadLocalSite = async (): Promise<SiteInstance | null> => {
  const sites = await getAllSites();
  if (sites.length === 0) return null;
  return sites.sort((a, b) => b.lastSaved - a.lastSaved)[0];
};

/**
 * Migrate a local IndexedDB site to Supabase for a newly-authenticated user.
 * Extracts form fields from site.data.contact + site.formInputs if available.
 */
export const migrateLocalToSupabase = async (
  site: SiteInstance,
  userId: string
): Promise<void> => {
  const { error } = await supabase.from('sites').upsert({
    id: site.id,
    user_id: userId,
    company_name: site.formInputs?.companyName || site.data.contact.companyName || '',
    industry: site.formInputs?.industry || '',
    service_area: site.formInputs?.location || site.data.contact.location || '',
    phone: site.formInputs?.phone || site.data.contact.phone || '',
    brand_colour: site.formInputs?.brandColor || '#2563eb',
    site_data: site.data,
  });

  if (error) {
    console.error('Supabase migrateLocalToSupabase error:', error);
    throw error;
  }
};

/**
 * Update deployment info in Supabase after successful Vercel deploy.
 */
export const updateDeployment = async (
  siteId: string,
  userId: string | null,
  deployedUrl: string
): Promise<void> => {
  if (!userId) return;

  const { error } = await supabase
    .from('sites')
    .update({
      deployed_url: deployedUrl,
      deployment_status: 'deployed',
    })
    .eq('id', siteId)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase updateDeployment error:', error);
  }
};

/**
 * Get all sites for a user from Supabase.
 */
export const getSitesByUser = async (userId: string): Promise<SiteInstance[]> => {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Supabase getSitesByUser error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    data: row.site_data as GeneratedSiteData,
    lastSaved: new Date(row.updated_at).getTime(),
    formInputs: {
      companyName: row.company_name || '',
      industry: row.industry || '',
      location: row.service_area || '',
      phone: row.phone || '',
      brandColor: row.brand_colour || '#2563eb',
    },
  }));
};
