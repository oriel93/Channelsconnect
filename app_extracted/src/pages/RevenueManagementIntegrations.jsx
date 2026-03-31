import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { TrendingUp, ArrowRight } from 'lucide-react';

export default function RevenueManagementIntegrations() {
  useEffect(() => {
    document.title = "Revenue Management System (RMS) Integrations | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Maximize your RevPAR by connecting your Revenue Management System (RMS) to Channels Connect. Automate your pricing strategies with data-driven insights.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Integrations', path: createPageUrl('Integrations') },
    { name: 'Revenue Management', path: '#' },
  ];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Revenue Management Integrations
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Take the guesswork out of pricing. Connect your favorite Revenue Management System (RMS) to automatically push optimal rates to all your channels.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Automate Your Pricing Strategy</h2>
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              In today's dynamic market, a static pricing strategy is a recipe for leaving money on the table. By integrating your RMS with Channels Connect, you can leverage sophisticated algorithms and market data to automate your pricing. Our platform acts as the bridge, taking the recommended rates from your RMS and distributing them instantly and accurately across every single one of your channels.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <TrendingUp className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Maximize RevPAR:</strong> Use data-driven pricing recommendations based on market demand, competitor rates, and historical data to optimize your revenue per available room.</span>
              </li>
              <li className="flex items-start">
                <TrendingUp className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Stay Competitive:</strong> React instantly to market changes. Your RMS can adjust rates automatically, and Channels Connect ensures those rates are live everywhere in seconds.</span>
              </li>
              <li className="flex items-start">
                <TrendingUp className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Save Time & Effort:</strong> Eliminate the need for manual rate adjustments. Let your RMS do the analytical heavy lifting and trust Channels Connect to handle the distribution.</span>
              </li>
            </ul>
             <p className="text-slate-700 leading-relaxed text-lg">
              Connect with leading RMS providers like IDeaS, Duetto, and Pace to turn powerful market insights into profitable, automated actions.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Unlock Your Revenue Potential
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Stop guessing and start earning. Connect your RMS today to implement a smarter, automated pricing strategy.
          </p>
          <Link to={createPageUrl('Connect')}>
            <Button size="lg" className="text-lg bg-slate-900 hover:bg-slate-800">
              Integrate My RMS <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}