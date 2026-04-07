import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { BarChart, ArrowRight } from 'lucide-react';

export default function BusinessIntelligenceIntegrations() {
  useEffect(() => {
    document.title = "Business Intelligence (BI) Integrations | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Unlock deeper market insights by feeding real-time booking data into your Business Intelligence (BI) platforms. Connect Tableau, Power BI, and more with Channels Connect.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Integrations', path: createPageUrl('Integrations') },
    { name: 'Business Intelligence', path: '#' },
  ];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Business Intelligence (BI) Integrations
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Turn your data into your most valuable asset. Connect BI tools to aggregate performance data and uncover trends that drive strategic decisions.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Make Data-Driven Decisions</h2>
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              Your booking data holds the key to understanding your business performance, guest behavior, and market position. By integrating Channels Connect with your Business Intelligence (BI) tools like Tableau or Power BI, you can feed a continuous stream of clean, structured data directly into your analytics environment. Move beyond basic reports and build comprehensive dashboards that visualize your success.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <BarChart className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Unified Reporting:</strong> Aggregate performance data from all your channels into a single BI dashboard for a complete view of your business.</span>
              </li>
              <li className="flex items-start">
                <BarChart className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Deep Performance Analysis:</strong> Analyze booking windows, length of stay, ADR, and RevPAR by channel, region, or time of year to identify your most profitable segments.</span>
              </li>
              <li className="flex items-start">
                <BarChart className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Strategic Forecasting:</strong> Use rich historical data to build more accurate demand forecasts and inform your long-term revenue and marketing strategies.</span>
              </li>
            </ul>
             <p className="text-slate-700 leading-relaxed text-lg">
              Our API-first approach ensures you can easily extract and load your data into any modern BI platform, giving your analytics team the power to uncover actionable insights.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Unlock the Power of Your Data
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Connect your BI tool and start building the reports and dashboards that will guide your business to new heights.
          </p>
          <Link to={createPageUrl('Connect')}>
            <Button size="lg" className="text-lg bg-slate-900 hover:bg-slate-800">
              Integrate My BI Platform <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}