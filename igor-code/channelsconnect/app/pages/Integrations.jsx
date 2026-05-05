import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Database, Banknote, BrainCircuit, MessageSquare, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const integrationCategories = [
  {
    icon: Database,
    title: "Property Management Systems (PMS)",
    description: "Sync reservations, availability, and guest data seamlessly with leading PMS providers.",
    path: createPageUrl('PmsIntegrations'),
    anchorText: "Property Management System Integrations"
  },
  {
    icon: Banknote,
    title: "Payment Gateways",
    description: "Securely process payments from around the globe with our direct payment gateway integrations.",
    path: createPageUrl('PaymentGatewayIntegrations'),
    anchorText: "Payment Gateway Integrations"
  },
  {
    icon: BrainCircuit,
    title: "Revenue Management",
    description: "Connect your favorite RMS tools to automate pricing strategies and maximize your RevPAR.",
    path: createPageUrl('RevenueManagementIntegrations'),
    anchorText: "Revenue Management Integrations"
  },
  {
    icon: MessageSquare,
    title: "Guest Messaging",
    description: "Automate and personalize guest communication from pre-arrival to post-stay reviews.",
    path: createPageUrl('GuestMessagingIntegrations'),
    anchorText: "Guest Messaging Integrations"
  },
  {
    icon: Briefcase,
    title: "Business Intelligence",
    description: "Feed real-time booking data into your BI platforms to unlock deeper market insights.",
    path: createPageUrl('BusinessIntelligenceIntegrations'),
    anchorText: "Business Intelligence Integrations"
  }
];

export default function Integrations() {
  useEffect(() => {
    document.title = 'Integrations | Channels Connect';
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Connect your PMS, OTAs, payment gateways, and revenue tools through Channels Connect.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
    return () => {
      if (document.head.contains(metaDesc)) document.head.removeChild(metaDesc);
    };
  }, []);
  return (
    <div className="bg-white">
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
            Connect Your Entire Hotel Tech Stack
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Channels Connect is built to be the central hub of your hotel's operations, integrating with the tools you already use and love.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {integrationCategories.map((category) => (
              <Card key={category.title} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col">
                <CardContent className="p-8 flex-grow">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                    <category.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{category.title}</h3>
                  <p className="text-slate-600 mb-6">{category.description}</p>
                </CardContent>
                <div className="p-8 pt-0">
                  <Link to={category.path}>
                    <Button variant="outline" className="w-full">
                      Learn More <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
             <Card className="border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col justify-center items-center text-center p-8 hover:bg-slate-100 hover:border-slate-400 transition-all">
                <h3 className="text-xl font-bold text-slate-700 mb-2">Don't see your tool?</h3>
                <p className="text-slate-500 mb-4">We're always adding new integrations. Request a new connection or use our robust API.</p>
                <Link to={createPageUrl('RequestIntegration')}>
                    <Button className="bg-slate-800 hover:bg-slate-700">Request an Integration</Button>
                </Link>
              </Card>
          </div>
        </div>
      </section>
    </div>
  );
}