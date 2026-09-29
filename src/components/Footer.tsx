import React from 'react';

interface FooterProps {
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenInstallApp?: () => void;
}

export const Footer = ({
  onOpenPrivacy,
  onOpenTerms,
  onOpenInstallApp
}: FooterProps = {}) => {
  return (
    <footer className="bg-white text-slate-500 text-xs mt-8 font-sans border-t border-slate-100" id="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6 text-center">
        <p className="text-slate-500 text-xs font-medium tracking-wide">
          © {new Date().getFullYear()} SmartRun. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
