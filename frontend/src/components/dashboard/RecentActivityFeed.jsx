import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowRight, User, MapPin, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

export default function RecentActivityFeed({ recentPetitions = [] }) {
  if (!recentPetitions || recentPetitions.length === 0) return null;

  return (
    <div className="bg-[#FFFDF7] border border-rule/60 rounded-xl p-5 shadow-soft flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-rule/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brass" />
            <h4 className="text-[15px] font-serif font-bold text-ink-text">
              Recent Case Docket & Petitions Registered
            </h4>
          </div>
          <Link 
            to="/register" 
            className="text-xs font-semibold text-brass hover:text-maroon flex items-center gap-1 transition-colors"
          >
            <span>View All Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p className="text-[12px] text-ink-text-soft mb-3">
          Latest official complaints and vigilance inquiries entered into the state register.
        </p>

        <div className="divide-y divide-rule/20">
          {recentPetitions.map((p) => {
            const isFir = p.peStatus?.toLowerCase().includes('fir');
            const isAccepted = p.proposalStatus?.toLowerCase() === 'accept';
            const formattedDate = p.createdAt
              ? new Date(p.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
              : 'Recent';

            return (
              <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/60 -mx-2 px-2 rounded-lg transition-colors">
                <div className="min-w-0 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isFir ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-parchment-2 text-ink-text border border-rule/40'
                  }`}>
                    {isFir ? <Shield className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-ink-text text-xs bg-parchment-2/80 px-1.5 py-0.2 rounded border border-rule/30">
                        {p.petitionNo}
                      </span>
                      <span className="text-xs font-semibold text-ink-text truncate">
                        {p.petitionerName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-text-soft bg-white px-2 py-0.5 rounded border border-rule/40">
                        <MapPin className="w-2.5 h-2.5 text-brass" />
                        {p.district}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-text-soft flex-wrap">
                      <span>{p.respondentCount} {p.respondentCount === 1 ? 'Accused Public Servant' : 'Accused Public Servants'}</span>
                      <span>•</span>
                      <span>Filed: {formattedDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {/* Proposal status pill */}
                  <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full border ${
                    isAccepted ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    Prop: {p.proposalStatus}
                  </span>

                  {/* PE status pill */}
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${
                    isFir 
                      ? 'bg-rose-50 text-rose-800 border-rose-200' 
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {p.peStatus}
                  </span>

                  <Link
                    to={`/register?search=${encodeURIComponent(p.petitionNo)}`}
                    className="p-1 rounded text-ink-text-soft hover:text-brass hover:bg-parchment-2 transition-colors ml-1"
                    title="Inspect file"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-rule/30 flex items-center justify-between text-[11px] text-ink-text-faint">
        <span>Verified by Lokayukta Registry Officer</span>
        <Link to="/register/new" className="font-semibold text-brass hover:text-maroon">
          + Enter New Petition
        </Link>
      </div>
    </div>
  );
}
