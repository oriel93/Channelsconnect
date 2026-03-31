import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function GuestMessagingIntegrations() {
  useEffect(() => {
    document.title = "Guest Messaging Integrations | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Automate and personalize guest communication from pre-arrival to post-stay reviews. Connect your messaging tools with Channels Connect to enhance the guest experience.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Integrations', path: createPageUrl('Integrations') },
    { name: 'Guest Messaging', path: '#' },
  ];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Guest Messaging Integrations
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Engage your guests at every step of their journey. Integrate guest messaging platforms to automate communication, provide instant support, and gather valuable feedback.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Enhance the Guest Experience</h2>
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              Exceptional hospitality goes beyond a comfortable room. Timely and personalized communication is key to a memorable stay. By integrating your guest messaging tools with Channels Connect, you can trigger automated messages based on reservation data from any channel. From pre-arrival welcome emails to post-stay review requests, you can create a seamless communication flow that delights guests and boosts your reputation.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MessageSquare className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Automated Communication:</strong> Send booking confirmations, check-in instructions, and mid-stay check-ups automatically, triggered by reservation status.</span>
              </li>
              <li className="flex items-start">
                <MessageSquare className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Personalized Engagement:</strong> Use guest data from your PMS and booking channels to tailor messages, offer relevant upsells, and make every guest feel valued.</span>
              </li>
              <li className="flex items-start">
                <MessageSquare className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Reputation Management:</strong> Automate review requests after check-out to increase the volume of positive reviews on platforms like TripAdvisor and Google.</span>
              </li>
            </ul>
             <p className="text-slate-700 leading-relaxed text-lg">
              Connect with powerful messaging platforms like Twilio and Kipsu to unify your guest communications and ensure no guest inquiry is ever missed.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Start Communicating Smarter
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Connect your messaging platform today to build better guest relationships and improve your online ratings.
          </p>
          <Link to={createPageUrl('Connect')}>
            <Button size="lg" className="text-lg bg-slate-900 hover:bg-slate-800">
              Set Up Guest Messaging <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}