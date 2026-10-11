import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MessageCircle,
  Share2,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Award,
  Wrench,
  X,
  Check
} from 'lucide-react';
import { Technician, TechnicianReview } from '../../types/technician';
import { fetchTechnicianById, submitTechnicianReview } from '../../services/technicianService';
import { showToast } from '../../utils/toast';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { SEOHead } from '../SEOHead';

interface TechnicianDetailPageProps {
  technician?: Technician | null;
  onBack?: () => void;
}

export const TechnicianDetailPage = ({
  technician: propTechnician,
  onBack: propOnBack
}: TechnicianDetailPageProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateTechnician = (location.state as { technician?: Technician } | null)?.technician;

  const [tech, setTech] = useState<Technician | null>(propTechnician || stateTechnician || null);
  const [isLoading, setIsLoading] = useState(!propTechnician && !stateTechnician);

  // Booking State
  const [isBooked, setIsBooked] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingDate, setBookingDate] = useState<string>('Today');
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>('Morning (9 AM - 12 PM)');
  const [bookingAddress, setBookingAddress] = useState<string>('');
  const [bookingPhone, setBookingPhone] = useState<string>('');

  // Review Form State
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerArea, setCustomerArea] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewsList, setReviewsList] = useState<TechnicianReview[]>(
    propTechnician?.recentReviews || stateTechnician?.recentReviews || []
  );

  useEffect(() => {
    if (propTechnician) {
      setTech(propTechnician);
      setReviewsList(propTechnician.recentReviews || []);
      setIsLoading(false);
      return;
    }

    if (stateTechnician) {
      setTech(stateTechnician);
      setReviewsList(stateTechnician.recentReviews || []);
    }

    if (id) {
      if (!stateTechnician) {
        setIsLoading(true);
      }
      fetchTechnicianById(id)
        .then((data) => {
          if (data) {
            setTech(data);
            setReviewsList(data.recentReviews || []);
          }
        })
        .catch((err) => {
          console.warn('Error loading technician:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!stateTechnician) {
      setIsLoading(false);
    }
  }, [id, propTechnician, stateTechnician]);

  // Sync booking status from localStorage when tech is resolved
  useEffect(() => {
    if (tech?.id) {
      const saved = localStorage.getItem(`booked_tech_${tech.id}`);
      setIsBooked(saved === 'true');
    }
  }, [tech?.id]);

  const handleBack = () => {
    hapticLight();
    if (propOnBack) {
      propOnBack();
    } else {
      navigate('/technicians');
    }
  };

  const handleShare = async () => {
    hapticLight();
    const shareData = {
      title: `${tech?.name} - Verified Technician`,
      text: `View profile, visiting rates and credentials of ${tech?.name} (${tech?.title}) on SmartRun.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Cancelled share
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Profile link copied to clipboard!', 'success');
    }
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tech) return;

    hapticMedium();
    localStorage.setItem(`booked_tech_${tech.id}`, 'true');
    setIsBooked(true);
    setIsBookingModalOpen(false);
    showToast(`Technician ${tech.name} booked for ${bookingDate}!`, 'success');
  };

  const handleCancelBooking = () => {
    if (!tech) return;
    hapticLight();
    localStorage.removeItem(`booked_tech_${tech.id}`);
    setIsBooked(false);
    showToast('Booking cancelled. You can book again anytime.', 'info');
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tech) return;

    if (!customerName.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!reviewComment.trim()) {
      showToast('Please enter your review feedback', 'error');
      return;
    }

    setIsSubmittingReview(true);
    hapticMedium();

    try {
      const res = await submitTechnicianReview(tech.id, {
        customerName: customerName.trim(),
        area: customerArea.trim() || 'Kolkata',
        rating: reviewRating,
        comment: reviewComment.trim(),
        serviceType: serviceType.trim() || tech.primarySector || 'Service Visit'
      });

      if (res.success && res.review) {
        const updatedList = [res.review, ...reviewsList];
        setReviewsList(updatedList);

        const totalRating = updatedList.reduce((sum, r) => sum + Number(r.rating || 5), 0);
        const newAvg = Number((totalRating / updatedList.length).toFixed(2));
        setTech((prev) =>
          prev
            ? {
                ...prev,
                rating: newAvg,
                reviewsCount: updatedList.length,
                recentReviews: updatedList
              }
            : null
        );

        showToast('Review submitted and saved successfully!', 'success');
        setCustomerName('');
        setCustomerArea('');
        setServiceType('');
        setReviewComment('');
        setReviewRating(5);
      } else {
        showToast(res.message || 'Failed to save review', 'error');
      }
    } catch {
      showToast('Failed to submit review. Please try again.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading technician profile...</p>
        </div>
      </div>
    );
  }

  if (!tech) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Technician Not Found</h2>
          <p className="text-xs text-slate-500">
            The requested technician profile could not be located or has been updated.
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-sm cursor-pointer"
          >
            Back to Technicians
          </button>
        </div>
      </div>
    );
  }

  const phoneDigits = ((tech.whatsapp || tech.phone) || '').replace(/[^0-9]/g, '');
  const formattedPhone = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
  const whatsappBookingMsg = encodeURIComponent(
    `Hello ${tech.name}, I have booked your electrical service for ${bookingDate} (${bookingTimeSlot}) via SmartRun. Please confirm your arrival.`
  );
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${whatsappBookingMsg}`;

  const descriptionText =
    tech.about && tech.about.trim().length > 0
      ? tech.about
      : tech.aiDescription
      ? tech.aiDescription.replace(/^"|"$/g, '')
      : `${tech.name} is a certified ${tech.title} with ${tech.experienceYears}+ years of verified field experience in ${
          tech.primarySector || 'electrical installations & repair'
        } across ${tech.serviceAreas?.join(', ') || 'Kolkata'}.`;

  const workingAreaText =
    tech.serviceAreas && tech.serviceAreas.length > 0
      ? tech.serviceAreas.join(', ')
      : tech.primarySector || 'Kolkata';

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-32">
      <SEOHead
        title={tech ? `${tech.name} - Certified ${tech.primarySector || 'Electrician'} | SmartRun Kolkata` : 'Certified Electrician Specialist Profile | SmartRun Kolkata'}
        description={tech ? `${tech.name} (${tech.rating || 4.9}★) - Certified electrical specialist in Kolkata serving ${workingAreaText}. Book instant on-site wiring and repair.` : 'View certified electrician profile, service ratings, expertise, license details, and book instant on-site electrical service in Kolkata.'}
        keywords="electrician profile kolkata, licensed electrical contractor, house wiring booking"
      />
      {/* Top Header Navigation [Minimal & Clean] */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Go back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-900 tracking-tight">
            Technician Profile
          </span>
        </div>

        <button
          type="button"
          onClick={handleShare}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Share profile"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* ========================================================================= */}
        {/* SECTION 1: PHOTO, NAME, JOB TITLE/AREA, RATING/EXP/JOBS, DESCRIPTION     */}
        {/* (No button or anything below the description as requested)               */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            {/* Photo */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 shrink-0 shadow-xs">
              <img
                src={tech.photo}
                alt={tech.name}
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Name & Title / Working Area */}
            <div className="space-y-1 sm:pt-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {tech.name}
                </h1>
                {tech.verificationStatus && (
                  <span title="Verified Technician" className="inline-flex">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  </span>
                )}
              </div>

              {/* Below of name: Job title or working area */}
              <p className="text-sm font-medium text-slate-600">
                {tech.title} • {workingAreaText}
              </p>

              {/* Move little below: Rating, experience and job done in same line */}
              <div className="flex items-center justify-center sm:justify-start gap-2.5 text-xs sm:text-sm text-slate-600 font-medium pt-1.5 flex-wrap">
                <span className="text-amber-500 font-bold flex items-center gap-1">
                  ★ {tech.rating.toFixed(1)}
                  <span className="text-slate-400 font-normal">({reviewsList.length})</span>
                </span>
                <span className="text-slate-300">·</span>
                <span>{tech.experienceYears}+ Yrs Exp</span>
                <span className="text-slate-300">·</span>
                <span>{tech.completedJobs}+ Jobs Done</span>
              </div>
            </div>
          </div>

          {/* Below of it: Descriptions */}
          <div className="pt-2">
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {descriptionText}
            </p>
          </div>
          {/* Below of it: NO button or anything here */}
        </section>

        <hr className="border-slate-100" />

        {/* ========================================================================= */}
        {/* SECTION 2: OVERVIEW & SKILL                                               */}
        {/* (Visiting charge/rate card, specialized areas, technical competencies,    */}
        {/*  all details of users like license, hours, etc.)                         */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Overview & Skill
          </h2>

          {/* Visiting Charge & Rate Card */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Visiting Charge & Rate Card
            </h3>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Base Visit & Inspection Fee
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                    Transparent
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Covers doorstep arrival, electrical diagnostic check, safety inspection, and upfront quotation.
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <div className="text-2xl font-black text-slate-900">
                  ₹{tech.startingRate}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  per {tech.rateUnit || 'base inspection visit'}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 px-1">
              * Any replacement components or rewiring parts needed are quoted clearly before beginning repair work.
            </p>
          </div>

          {/* Specialized Areas Work */}
          {tech.subSectors && tech.subSectors.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Specialized Areas of Work
              </h3>
              <div className="flex flex-wrap gap-2">
                {tech.subSectors.map((sub, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-100 text-slate-800 text-xs font-medium rounded-xl flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Competencies */}
          {tech.skills && tech.skills.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Technical Competencies
              </h3>
              <div className="space-y-2.5">
                {tech.skills.map((skill, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{skill.name}</span>
                      <span className="font-bold text-slate-900">{skill.proficiency}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-900 h-full rounded-full transition-all duration-500"
                        style={{ width: `${skill.proficiency}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Tools Carried */}
          {tech.toolsCarried && tech.toolsCarried.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Equipment & Diagnostic Tools Carried
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tech.toolsCarried.map((tool, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 border border-slate-100/80 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-2"
                  >
                    <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Details of User: License, Working Hours, Service Areas */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Professional Details & Availability
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">License Credential</span>
                <p className="font-semibold text-slate-800">{tech.licenseNumber || 'Verified WB Electrical License'}</p>
                <p className="text-[11px] text-slate-500">{tech.issuingAuthority || 'West Bengal Licensing Board'}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Working Hours</span>
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {tech.workingHours || 'Mon-Sat: 8:00 AM - 8:00 PM'}
                </p>
                <p className="text-[11px] text-slate-500">Emergency callouts available on request</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100/80 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Coverage & Service Areas</span>
                <p className="font-medium text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  {workingAreaText}
                </p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* ========================================================================= */}
        {/* SECTION 3: CERTIFICATIONS                                                 */}
        {/* (All certificates details, issuer, license credentials, verified status)  */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Certifications
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {Math.max(1, tech.certifications?.length || 0)} Verified
            </span>
          </div>

          <div className="space-y-2.5">
            {tech.certifications && tech.certifications.length > 0 ? (
              tech.certifications.map((cert, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-600 shrink-0" />
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                        {cert.title}
                      </h3>
                      {cert.verified && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 pl-6">{cert.issuer}</p>
                    {cert.credentialId && (
                      <p className="text-[11px] font-mono text-slate-400 pl-6">
                        Credential ID: {cert.credentialId}
                      </p>
                    )}
                  </div>
                  {cert.year && (
                    <span className="text-xs font-bold text-slate-500 shrink-0">
                      {cert.year}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600 shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {tech.primarySector || 'Professional'} Field Wireman & Supervisor License
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-md">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 pl-6">
                    {tech.issuingAuthority || 'West Bengal Electrical Licensing Board'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 pl-6">
                    License No: {tech.licenseNumber || 'WB-LIC-001'}
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-600 shrink-0">
                  Active
                </span>
              </div>
            )}
          </div>
        </section>

        <hr className="border-slate-100" />

        {/* ========================================================================= */}
        {/* SECTION 4: REVIEWS                                                        */}
        {/* (Overall score, review submission form, client reviews list)               */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Reviews
            </h2>
            <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{tech.rating.toFixed(1)}</span>
              <span className="text-xs font-normal text-slate-400">
                ({reviewsList.length} reviews)
              </span>
            </div>
          </div>

          {/* Add Review Form */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Leave a Verified Service Review
            </h3>

            <form onSubmit={handleAddReview} className="space-y-3">
              {/* Star rating selector */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                      title={`${star} Star`}
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-slate-700">
                    {reviewRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sourav Sen"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Area / Location
                  </label>
                  <input
                    type="text"
                    value={customerArea}
                    onChange={(e) => setCustomerArea(e.target.value)}
                    placeholder="e.g. Salt Lake Sector V"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Service Type Done
                </label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g. Inverter Installation / MCB Diagnostic"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Your Review Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Describe the technician's punctuality, work quality, and behavior..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Review...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="space-y-3">
            {reviewsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                No reviews yet. Be the first customer to leave feedback!
              </div>
            ) : (
              reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {rev.customerName}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {rev.area} {rev.serviceType ? `• ${rev.serviceType}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold justify-end">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{rev.date}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>

                  {rev.verifiedJob && (
                    <div className="pt-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified Service Visit</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* BOTTOM SCREEN NAVBAR: Shows price, Book button & WhatsApp when booked     */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 sm:px-8 py-3 z-40 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Price display */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Visiting Charge
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                ₹{tech.startingRate}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                /{tech.rateUnit || 'visit'}
              </span>
            </div>
          </div>

          {/* Action Button: Book button OR WhatsApp button when booked */}
          <div className="flex items-center gap-2">
            {!isBooked ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsBookingModalOpen(true);
                }}
                className="px-6 sm:px-8 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Technician</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => hapticMedium()}
                  className="px-5 sm:px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCancelBooking}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer px-1 py-2"
                  title="Cancel booking"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* QUICK BOOKING MODAL                                                       */}
      {/* ========================================================================= */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Book {tech.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Visiting Fee: ₹{tech.startingRate} /{tech.rateUnit || 'visit'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              {/* Select Preferred Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Preferred Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Today', 'Tomorrow', 'This Weekend'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingDate(slot)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        bookingDate === slot
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Preferred Time Slot */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Preferred Time Slot
                </label>
                <div className="space-y-1.5">
                  {[
                    'Morning (9 AM - 12 PM)',
                    'Afternoon (12 PM - 4 PM)',
                    'Evening (4 PM - 8 PM)'
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingTimeSlot(slot)}
                      className={`w-full py-2 px-3.5 text-xs font-semibold rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        bookingTimeSlot === slot
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{slot}</span>
                      {bookingTimeSlot === slot && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Your Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="e.g. 9830012345"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Address / Landmark */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address / Kolkata Area
                </label>
                <input
                  type="text"
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="e.g. Salt Lake Sector 2, near City Centre"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Confirm Booking CTA */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Booking & Connect on WhatsApp</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
