import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Breadcrumb from '../components/marketing/Breadcrumb';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function PaymentGatewayIntegrations() {
  useEffect(() => {
    document.title = "Payment Gateway Integrations | Channels Connect";
    const metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Securely process payments from guests worldwide with direct payment gateway integrations. Connect Stripe, PayPal, and more with Channels Connect for reliable payment processing.';
    document.head.appendChild(metaDesc);
    return () => {
      document.head.removeChild(metaDesc);
    };
  }, []);

  const crumbs = [
    { name: 'Integrations', path: createPageUrl('Integrations') },
    { name: 'Payment Gateways', path: '#' },
  ];

  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-12">
        <div className="container mx-auto px-6">
          <Breadcrumb crumbs={crumbs} />
          <div className="text-center pt-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Payment Gateway Integrations
            </h1>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Offer a frictionless and secure payment experience for your guests. Connect with leading payment gateways to automate transactions and protect sensitive data.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">Secure & Seamless Transactions</h2>
          <div className="space-y-8">
            <p className="text-slate-700 leading-relaxed text-lg">
              Integrating a reliable payment gateway is critical for building trust and improving conversion rates. Channels Connect integrates with top-tier payment processors, allowing you to securely accept payments from anywhere in the world. Our integrations help you automate payment collection, manage refunds, and ensure PCI compliance, all from a single platform.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>PCI-Compliant Security:</strong> Protect your guests and your business with tokenization and other advanced security features from trusted providers like Stripe and PayPal.</span>
              </li>
              <li className="flex items-start">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Global Payment Acceptance:</strong> Easily accept credit cards and alternative payment methods from international guests, increasing your direct booking potential.</span>
              </li>
              <li className="flex items-start">
                <ShieldCheck className="w-6 h-6 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                <span className="text-slate-700"><strong>Automated Workflows:</strong> Automatically process deposits, schedule final payments, and handle refunds, reducing administrative tasks and minimizing lost revenue.</span>
              </li>
            </ul>
             <p className="text-slate-700 leading-relaxed text-lg">
              By connecting your payment gateway through Channels Connect, you centralize your financial reporting and simplify reconciliation across all booking sources.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Start Accepting Secure Payments
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Integrate your preferred payment gateway in minutes and provide your guests with the secure, professional booking experience they expect.
          </p>
          <Link to={createPageUrl('Connect')}>
            <Button size="lg" className="text-lg bg-slate-900 hover:bg-slate-800">
              Set Up My Payment Gateway <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}