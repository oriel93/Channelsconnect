import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { PlusCircle, ArrowRight } from 'lucide-react';

export default function RequestIntegration() {
  useEffect(() => {
    document.title = "Request an Integration | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Don\'t see your favorite tool on our list? Request a new integration. We are always expanding our ecosystem and offer a robust API for custom connections.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Integrations', path: createPageUrl('Integrations') },
    { name: 'Request an Integration', path: '#' },
  ];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Request a New Integration
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Our ecosystem is constantly growing, but if you don't see the tool you need, let us know. We prioritize new integrations based on customer feedback.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <PlusCircle className="w-16 h-16 text-blue-500 mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-slate-800 mb-6">Don't See Your Tool? Let's Connect It.</h2>
          <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
            <p>
              We are committed to making Channels Connect the most open and extensible platform in the industry. Our development team is always working to add new partners to our integration library.
            </p>
            <p>
              If there's a specific PMS, payment gateway, or other hospitality software you rely on, we want to hear about it. Alternatively, your development team can leverage our robust, well-documented API to build a custom integration tailored to your exact needs.
            </p>
          </div>
          <div className="mt-12">
             <Link to={createPageUrl('Connect')}>
              <Button size="lg" className="text-lg bg-slate-900 hover:bg-slate-800">
                Contact Us About a New Integration <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}