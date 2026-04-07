import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function PmsIntegrations() {
  useEffect(() => {
    document.title = "Property Management System (PMS) Integrations | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Seamlessly sync reservations, availability, and guest data with leading Property Management Systems. Connect your PMS with Channels Connect for streamlined hotel operations.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Integrations', path: createPageUrl('Integrations') },
    { name: 'Property Management Systems', path: '#' },
  ];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Property Management System (PMS) Integrations
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Connect your PMS to the heart of your operations. Sync reservations, rates, and availability in real-time to eliminate manual entry and reduce errors.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Streamline Your Hotel Operations</h2>
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              A robust Property Management System (PMS) is the backbone of any successful hotel. By integrating your PMS with Channels Connect, you create a powerful, centralized system that automates workflows and provides a single source of truth for your property data. Our two-way integrations ensure that any update in your PMS is instantly reflected across all your connected booking channels, and vice-versa.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Automated Synchronization:</strong> Eliminate double bookings with real-time updates of calendars, rates, and inventory between your PMS and all OTAs.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Centralized Guest Data:</strong> Consolidate guest profiles and reservation details directly into your PMS, creating richer guest histories for personalized service.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Operational Efficiency:</strong> Reduce hours of manual work for your front-desk and reservations team, allowing them to focus on delivering an exceptional guest experience.</span>
              </li>
            </ul>
             <p className="text-slate-700 leading-relaxed text-lg">
              We support connections with a wide array of leading PMS providers. If you don't see your system on our list, our team can work with you to build a custom connection.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Ready to Connect Your PMS?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Let us handle the technical details. Connect your property today and experience truly seamless hotel management.
          </p>
          <Link to={createPageUrl('Connect')}>
            <Button size="lg" className="text-lg bg-slate-900 hover:bg-slate-800">
              Connect My Property <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}