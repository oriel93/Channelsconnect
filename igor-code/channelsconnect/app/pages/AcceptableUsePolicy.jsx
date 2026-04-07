import React, { useEffect } from 'react';
import MarketingHeader from '../components/marketing/MarketingHeader';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function AcceptableUsePolicy() {
  useEffect(() => {
    document.title = "Acceptable Use Policy | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Acceptable Use Policy for Channels Connect. Learn about platform usage guidelines and prohibited activities.';
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
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Acceptable Use Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-lg max-w-none text-slate-700 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Purpose and Scope</h2>
            <p>This Acceptable Use Policy governs your use of Channels Connect's vacation rental channel management platform. It is designed to protect our users, platform integrity, and compliance with applicable laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Permitted Uses</h2>
            <p>You may use our platform for legitimate vacation rental business purposes, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Managing short-term rental properties</li>
              <li>Synchronizing listings across booking platforms</li>
              <li>Coordinating calendar availability and pricing</li>
              <li>Processing legitimate vacation rental bookings</li>
              <li>Communicating with guests through integrated messaging</li>
              <li>Analyzing property performance and revenue data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Prohibited Activities</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Illegal Activities</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Operating properties without required licenses or permits</li>
                  <li>Facilitating illegal activities at rental properties</li>
                  <li>Tax evasion or failure to comply with local tax obligations</li>
                  <li>Violating local zoning or vacation rental regulations</li>
                  <li>Money laundering or other financial crimes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Platform Misuse</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Creating fake or misleading property listings</li>
                  <li>Manipulating reviews or ratings on connected platforms</li>
                  <li>Using the platform for long-term residential rentals</li>
                  <li>Attempting to circumvent platform fees or commissions</li>
                  <li>Reverse engineering or attempting to access source code</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Data and Security Violations</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Unauthorized access to other users' accounts or data</li>
                  <li>Sharing login credentials with unauthorized parties</li>
                  <li>Attempting to breach platform security measures</li>
                  <li>Harvesting or scraping user data</li>
                  <li>Introducing malware, viruses, or malicious code</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Discrimination and Harassment</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Discriminating against guests based on protected characteristics</li>
                  <li>Harassment, threats, or abusive behavior toward other users</li>
                  <li>Posting offensive or inappropriate content</li>
                  <li>Violating anti-discrimination laws in your jurisdiction</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Content Standards</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Property Listings</h3>
              <p>All property information must be:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Accurate and truthful</li>
                <li>Regularly updated to reflect current conditions</li>
                <li>Compliant with local advertising regulations</li>
                <li>Free from misleading or false claims</li>
                <li>Respectful and professional in tone</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Photos and Media</h3>
              <p>Uploaded images and media must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Accurately represent the property</li>
                <li>Not infringe on copyrights or trademarks</li>
                <li>Be appropriate for all audiences</li>
                <li>Meet quality standards for professional listings</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Compliance Requirements</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Legal Compliance</h3>
              <p>Users must comply with all applicable laws and regulations, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Local vacation rental licensing requirements</li>
                <li>Zoning and land use regulations</li>
                <li>Tax collection and remittance obligations</li>
                <li>Safety and building code requirements</li>
                <li>Anti-discrimination laws</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Platform Partner Compliance</h3>
              <p>When using integrated booking platforms, you must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Comply with each platform's terms of service</li>
                <li>Maintain consistent pricing and availability</li>
                <li>Respond promptly to guest inquiries</li>
                <li>Honor confirmed bookings</li>
                <li>Maintain high service standards</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Monitoring and Enforcement</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Platform Monitoring</h3>
              <p>We may monitor platform usage to ensure compliance with this policy through:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Automated systems for detecting policy violations</li>
                <li>User reports and complaints</li>
                <li>Regular audits of high-risk accounts</li>
                <li>Integration with third-party compliance tools</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Enforcement Actions</h3>
              <p>Violations may result in:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Warning notices and corrective action requirements</li>
                <li>Temporary suspension of platform access</li>
                <li>Permanent account termination</li>
                <li>Reporting to relevant authorities</li>
                <li>Legal action for damages</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Reporting Violations</h2>
            <p>If you become aware of potential policy violations, please report them through:</p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p><strong>Email:</strong> compliance@channelsconnect.com</p>
              <p><strong>Subject Line:</strong> Policy Violation Report</p>
              <p><strong>Support Portal:</strong> Available through your account dashboard</p>
              <p className="text-sm text-orange-700 mt-2">Include detailed information and supporting evidence when possible</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Appeal Process</h2>
            <p>If you believe enforcement action was taken in error, you may:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Submit an appeal within 30 days of the action</li>
              <li>Provide evidence supporting your position</li>
              <li>Request a review by our compliance team</li>
              <li>Escalate to management if necessary</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Policy Updates</h2>
            <p>We may update this policy from time to time to reflect:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Changes in applicable laws and regulations</li>
              <li>New platform features and capabilities</li>
              <li>Evolving industry best practices</li>
              <li>User feedback and experience improvements</li>
            </ul>
            <p>Users will be notified of material changes via email or platform notification.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Contact Information</h2>
            <p>For questions about this Acceptable Use Policy:</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <p><strong>Compliance Team:</strong> compliance@channelsconnect.com</p>
              <p><strong>Legal Department:</strong> legal@channelsconnect.com</p>
              <p><strong>General Support:</strong> Available through your account dashboard</p>
            </div>
          </section>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}