
import React, { useEffect } from 'react';
import MarketingHeader from '../components/marketing/MarketingHeader';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Our privacy policy explains how Channels Connect collects, uses, and protects your personal information and property data.';
    if (!document.querySelector('meta[name="description"]')) {
      document.head.appendChild(metaDesc);
    }
    return () => {
      if (document.querySelector('meta[name="description"]') === metaDesc) {
        document.head.removeChild(metaDesc);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-lg max-w-none text-slate-700 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Personal Information</h3>
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Name, email address, and contact information</li>
                <li>Account credentials and authentication data</li>
                <li>Property details and listing information</li>
                <li>Payment and billing information</li>
                <li>Communications with our support team</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800 mt-6">Property and Booking Data</h3>
              <p>Through our platform integrations, we may access:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Property listings from Airbnb, Booking.com, Vrbo, and other platforms</li>
                <li>Calendar availability and booking information</li>
                <li>Pricing and rate data</li>
                <li>Guest information (as permitted by channel partners)</li>
                <li>Property photos and descriptions</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800 mt-6">Technical Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>IP address, browser type, and device information</li>
                <li>Usage patterns and feature interactions</li>
                <li>Log files and performance data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and maintain our channel management services</li>
              <li>Synchronize your property data across booking platforms</li>
              <li>Process payments and manage your account</li>
              <li>Send you service-related communications</li>
              <li>Improve our platform and develop new features</li>
              <li>Ensure security and prevent fraudulent activity</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Information Sharing and Disclosure</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Channel Partners</h3>
              <p>We share property and booking data with integrated platforms (Airbnb, Booking.com, Vrbo, etc.) as necessary to provide our services and in accordance with their respective terms of service.</p>
              
              <h3 className="text-xl font-medium text-slate-800">Service Providers</h3>
              <p>We may share information with trusted third-party service providers who assist us in operating our platform, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Cloud hosting and infrastructure providers</li>
                <li>Payment processors</li>
                <li>Customer support tools</li>
                <li>Analytics and monitoring services</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800">Legal Requirements</h3>
              <p>We may disclose information when required by law or to protect the rights, property, or safety of our users and the public.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your information, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication requirements</li>
              <li>Employee training on data protection practices</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Your Rights and Choices</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">GDPR Rights (EU Users)</h3>
              <p>If you are located in the European Union, you have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access your personal data</li>
                <li>Rectify inaccurate information</li>
                <li>Erase your personal data</li>
                <li>Restrict processing of your data</li>
                <li>Data portability</li>
                <li>Object to processing</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800">CCPA Rights (California Users)</h3>
              <p>California residents have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Know what personal information is collected</li>
                <li>Delete personal information</li>
                <li>Opt-out of the sale of personal information</li>
                <li>Non-discrimination for exercising privacy rights</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. International Data Transfers</h2>
            <p>Your information may be transferred to and processed in countries other than your own. We ensure adequate protection through:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Adequacy decisions for certain countries</li>
              <li>Other appropriate safeguards as required by applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Data Retention</h2>
            <p>We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. We may retain certain information longer if required by law or for legitimate business purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Children's Privacy</h2>
            <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Changes to This Privacy Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last updated" date.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Contact Us</h2>
            <p>If you have any questions about this privacy policy or our data practices, please contact us:</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> info@channelsconnect.com</p>
              <p><strong>Phone:</strong> (786) 646-2233</p>
              <p><strong>Address:</strong> Channels Connect, Privacy Department</p>
            </div>
          </section>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}
