
import React, { useEffect } from 'react';
import MarketingHeader from '../components/marketing/MarketingHeader';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function TermsOfService() {
  useEffect(() => {
    document.title = "Terms of Service | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Terms of Service for Channels Connect vacation rental channel management platform. Read our platform usage terms and conditions.';
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
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Terms of Service</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-lg max-w-none text-slate-700 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using Channels Connect ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Description of Service</h2>
            <p>Channels Connect is a vacation rental channel management platform that enables property owners and managers to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Connect and synchronize listings across multiple booking platforms</li>
              <li>Manage calendar availability and pricing</li>
              <li>Automate booking management processes</li>
              <li>Access analytics and reporting tools</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. User Accounts and Registration</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Account Requirements</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must be at least 18 years old to use our service</li>
                <li>You must provide accurate and complete registration information</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must notify us immediately of any unauthorized use</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800">Account Responsibilities</h3>
              <p>You are responsible for all activities that occur under your account, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Accuracy of property information and listings</li>
                <li>Compliance with local vacation rental regulations</li>
                <li>Honoring bookings made through connected channels</li>
                <li>Maintaining appropriate insurance coverage</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Channel Integration and Data Synchronization</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Third-Party Platform Integration</h3>
              <p>Our service integrates with various booking platforms including Airbnb, Booking.com, and Vrbo. You acknowledge that:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You must comply with each platform's terms of service</li>
                <li>We are not responsible for changes to third-party platform policies</li>
                <li>Integration availability may vary based on platform API access</li>
                <li>You authorize us to access your data on connected platforms</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800">Data Accuracy and Synchronization</h3>
              <p>While we strive to maintain accurate data synchronization:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You are ultimately responsible for booking accuracy</li>
                <li>Technical issues may cause temporary synchronization delays</li>
                <li>You should regularly verify booking and calendar data</li>
                <li>Report any discrepancies immediately to our support team</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibent text-slate-800 mb-4">5. Payment Terms and Billing</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Service Fees</h3>
              <p>Our current pricing structure includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>No monthly subscription fees</li>
                <li>No setup or onboarding costs</li>
                <li>Revenue-based commission structure</li>
                <li>Additional fees may apply for premium features</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800">Payment Processing</h3>
              <p>All payments are processed securely through our payment partners. You agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate billing information</li>
                <li>Authorize automatic payment collection</li>
                <li>Pay all applicable taxes</li>
                <li>Notify us of billing disputes within 30 days</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>We provide the service "as is" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the fees paid by you in the preceding 12 months</li>
              <li>We are not responsible for third-party platform outages or changes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Channels Connect from any claims, damages, or expenses arising from:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Your use of the service</li>
              <li>Your property listings or rental activities</li>
              <li>Your violation of these terms</li>
              <li>Your violation of applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Termination</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Termination by You</h3>
              <p>You may terminate your account at any time by contacting our support team. Upon termination:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your access to the service will be discontinued</li>
                <li>Connected platform integrations will be removed</li>
                <li>Data export may be available for a limited time</li>
              </ul>
              
              <h3 className="text-xl font-medium text-slate-800">Termination by Us</h3>
              <p>We may terminate accounts for violations of these terms or for any reason with 30 days notice.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. We will notify users of material changes via email or platform notification. Continued use of the service constitutes acceptance of modified terms.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Governing Law and Disputes</h2>
            <p>These terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">11. Contact Information</h2>
            <p>For questions about these terms, please contact us:</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> info@channelsconnect.com</p>
              <p><strong>Phone:</strong> (786) 646-2233</p>
              <p><strong>Support Portal:</strong> Available through your account dashboard</p>
              <p><strong>Address:</strong> Channels Connect Legal Department</p>
            </div>
          </section>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}
