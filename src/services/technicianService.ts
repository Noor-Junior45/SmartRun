import { supabase } from '../lib/supabaseClient';
import { Technician, TechnicianReview } from '../types/technician';
import { DEMO_TECHNICIANS } from '../data/demoTechnicians';
import { apiUrl } from '../lib/apiBase';

export function deriveTechnicianId(row: any, index: number = 1): string {
  if (row.id && typeof row.id === 'string' && row.id.trim().length > 0) {
    return row.id.trim();
  }
  const cleanName = (row.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const cleanPhone = (row.phone || '').trim().replace(/[^0-9]/g, '');
  if (cleanName && cleanPhone) {
    return `tech-${cleanName}-${cleanPhone.slice(-4)}`;
  }
  if (cleanName) {
    return `tech-${cleanName}`;
  }
  if (cleanPhone) {
    return `tech-${cleanPhone}`;
  }
  return `tech-${index + 1}`;
}

export async function fetchTechnicians(): Promise<Technician[]> {
  let baseTechnicians: Technician[] = [];

  try {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .order('featured', { ascending: false });

    if (!error && data && data.length > 0) {
      baseTechnicians = data.map((row: any, index: number) => {
        const id = deriveTechnicianId(row, index);
        const name = (row.name || '').trim() || 'Technician';
        const phone = (row.phone || '').trim();
        const whatsapp = (row.whatsapp || phone || '').trim();
        const primarySector = row.primary_sector || row.primarySector || 'Electrician';

        // Smart fallbacks for empty bio/skills if technician was created without them
        const defaultAbout =
          row.about && row.about.trim().length > 0
            ? row.about.trim()
            : row.ai_description || row.aiDescription
            ? (row.ai_description || row.aiDescription).replace(/^"|"$/g, '')
            : `${name} is a verified ${primarySector} specialist with ${row.experience_years || 1}+ years of field expertise across Kolkata.`;

        const subSectors =
          Array.isArray(row.sub_sectors) && row.sub_sectors.length > 0
            ? row.sub_sectors
            : Array.isArray(row.subSectors) && row.subSectors.length > 0
            ? row.subSectors
            : [
                'Concealed Conduit & Surface Wiring',
                'MCB, DB & Distribution Panel Commissioning',
                'Inverter, UPS & Battery Setup',
                'Short Circuit & Leakage Diagnostics',
                'Appliance & Switchboard Mounting'
              ];

        const skills =
          Array.isArray(row.skills) && row.skills.length > 0
            ? row.skills
            : [
                { name: 'Residential & Commercial Wiring', proficiency: 96, experienceYears: Number(row.experience_years || 1) },
                { name: 'Short Circuit & Fault Isolation', proficiency: 94, experienceYears: Number(row.experience_years || 1) },
                { name: 'Distribution Panel & MCB Setup', proficiency: 92, experienceYears: Number(row.experience_years || 1) },
                { name: 'Earth Testing & Electrical Safety', proficiency: 90, experienceYears: Number(row.experience_years || 1) }
              ];

        const certifications =
          Array.isArray(row.certifications) && row.certifications.length > 0
            ? row.certifications
            : [
                {
                  title: `${primarySector} Supervisor & Wireman Certification`,
                  issuer: row.issuing_authority || row.issuingAuthority || 'West Bengal Electrical Licensing Board',
                  year: 'Verified',
                  verified: true,
                  credentialId: row.license_number || row.licenseNumber || 'WB-LIC-001'
                }
              ];

        const toolsCarried =
          Array.isArray(row.tools_carried) && row.tools_carried.length > 0
            ? row.tools_carried
            : Array.isArray(row.toolsCarried) && row.toolsCarried.length > 0
            ? row.toolsCarried
            : [
                'True-RMS Digital Multimeter',
                '1000V VDE Insulated Screwdriver & Pliers Set',
                'Heavy Wire Stripper & Ratchet Crimper',
                'Digital Phase & Continuity Tester'
              ];

        return {
          id,
          name,
          title: (row.title || '').trim() || primarySector,
          badgeId: row.badge_id || row.badgeId || `BN-${id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)}`,
          experienceYears: Number(row.experience_years ?? row.experienceYears ?? 1),
          primarySector,
          subSectors,
          photo: row.photo || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
          rating: Number(row.rating ?? 5.0),
          reviewsCount: Number(row.reviews_count ?? row.reviewsCount ?? 0),
          completedJobs: Number(row.completed_jobs ?? row.completedJobs ?? 0),
          verificationStatus: row.verification_status || row.verificationStatus || 'verified',
          licenseNumber: row.license_number || row.licenseNumber || 'WB-LIC-001',
          issuingAuthority: row.issuing_authority || row.issuingAuthority || 'West Bengal Electrical Licensing Board',
          status: row.status || 'available',
          statusText: row.status_text || row.statusText || 'Available for booking',
          phone,
          email: row.email,
          whatsapp,
          emergencySupport: Boolean(row.emergency_support ?? row.emergencySupport),
          serviceAreas: row.service_areas || row.serviceAreas || ['Salt Lake', 'New Town', 'Kolkata'],
          workingHours: row.working_hours || row.workingHours || '10:00 AM - 06:00 PM',
          startingRate: Number(row.starting_rate ?? row.startingRate ?? 399),
          rateUnit: row.rate_unit || row.rateUnit || 'base inspection visit',
          about: defaultAbout,
          aiDescription: (row.ai_description || row.aiDescription || '').replace(/^"|"$/g, ''),
          certifications,
          skills,
          toolsCarried,
          recentReviews: Array.isArray(row.recent_reviews) ? row.recent_reviews : [],
          featured: Boolean(row.featured),
          joinedDate: row.joined_date || row.joinedDate
        };
      });
    } else if (error) {
      console.warn('[technicianService] Supabase query notice:', error.message);
    }
  } catch (err) {
    console.warn('[technicianService] Could not fetch from Supabase:', err);
    baseTechnicians = [];
  }

  // Enhance each technician with any server-persisted reviews
  try {
    const updated = await Promise.all(
      baseTechnicians.map(async (tech) => {
        try {
          const res = await fetch(`/api/technicians/${tech.id}/reviews`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.reviews) && data.reviews.length > 0) {
              const mergedReviews = [...data.reviews, ...tech.recentReviews];
              // De-duplicate by id
              const uniqueReviews = Array.from(
                new Map(mergedReviews.map((r) => [r.id, r])).values()
              );
              const totalRating = uniqueReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0);
              const avgRating = uniqueReviews.length > 0 ? totalRating / uniqueReviews.length : tech.rating;

              return {
                ...tech,
                recentReviews: uniqueReviews,
                reviewsCount: uniqueReviews.length,
                rating: Number(avgRating.toFixed(2))
              };
            }
          }
        } catch {
          // Keep base
        }
        return tech;
      })
    );
    return updated;
  } catch {
    return baseTechnicians;
  }
}

export async function fetchTechnicianById(id: string): Promise<Technician | null> {
  if (!id) return null;
  const decodedId = decodeURIComponent(id).trim().toLowerCase();
  const all = await fetchTechnicians();
  if (all.length === 0) return null;

  // 1. Direct ID match
  const directMatch = all.find((t) => t.id === id || t.id.toLowerCase() === decodedId);
  if (directMatch) return directMatch;

  // 2. Normalize id matching without 'tech-' prefix
  const altIdMatch = all.find((t) => {
    const tClean = t.id.toLowerCase().replace(/^tech-/, '');
    const reqClean = decodedId.replace(/^tech-/, '');
    return tClean === reqClean;
  });
  if (altIdMatch) return altIdMatch;

  // 3. Match by phone or badgeId
  const phoneMatch = all.find((t) => {
    if (t.phone && t.phone.replace(/[^0-9]/g, '') === decodedId.replace(/[^0-9]/g, '')) return true;
    if (t.badgeId && t.badgeId.toLowerCase() === decodedId) return true;
    return false;
  });
  if (phoneMatch) return phoneMatch;

  // 4. Match by slugified name
  const nameMatch = all.find((t) => {
    const nameSlug = (t.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return nameSlug && (decodedId.includes(nameSlug) || nameSlug.includes(decodedId));
  });
  if (nameMatch) return nameMatch;

  // 5. Fallback: if only 1 technician exists in total and user accessed the route
  if (all.length === 1) {
    return all[0];
  }

  return null;
}

export async function fetchTechnicianReviews(technicianId: string): Promise<TechnicianReview[]> {
  try {
    const res = await fetch(`/api/technicians/${technicianId}/reviews`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        return data.reviews;
      }
    }
  } catch (err) {
    console.warn('Error fetching server reviews for technician:', err);
  }
  return [];
}

export async function submitTechnicianReview(
  technicianId: string,
  reviewData: {
    customerName: string;
    area?: string;
    rating: number;
    comment: string;
    serviceType?: string;
  }
): Promise<{ success: boolean; message?: string; review?: TechnicianReview; reviews?: TechnicianReview[] }> {
  try {
    const res = await fetch(`/api/technicians/${technicianId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reviewData)
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Error submitting technician review:', err);
    return {
      success: false,
      message: err.message || 'Network error while submitting review'
    };
  }
}

export async function generateTechnicianDescription(tech: Partial<Technician>): Promise<string> {
  try {
    const res = await fetch(apiUrl('/api/technicians/generate-description'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tech)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.description) {
        return data.description;
      }
    }
  } catch (err) {
    console.warn('AI description generator error:', err);
  }

  return `${tech.experienceYears || 5}+ years experienced ${tech.title || 'Specialist'} with verified expertise in ${
    tech.primarySector || 'electrical power systems'
  }.`;
}
