import React, { useEffect } from 'react';
import MarketingHeader from '../components/marketing/MarketingHeader';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function CookiePolicy() {
  useEffect(() => {
    document.title = "Cookie Policy | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Learn about how Channels Connect uses cookies and similar technologies to improve your experience on our platform.';
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
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Cookie Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-lg max-w-none text-slate-700 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. What Are Cookies</h2>
            <p>Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and improving our service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Essential Cookies</h3>
                <p>These cookies are necessary for the website to function properly and cannot be disabled:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Authentication:</strong> Keep you logged in to your account</li>
                  <li><strong>Security:</strong> Protect against fraud and security threats</li>
                  <li><strong>Session Management:</strong> Maintain your session across pages</li>
                  <li><strong>Load Balancing:</strong> Distribute traffic for optimal performance</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Performance and Analytics Cookies</h3>
                <p>These cookies help us understand how visitors use our website:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Google Analytics:</strong> Track website usage and performance</li>
                  <li><strong>Error Tracking:</strong> Identify and fix technical issues</li>
                  <li><strong>Performance Monitoring:</strong> Measure page load times and optimization</li>
                  <li><strong>User Behavior:</strong> Understand feature usage and preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Functional Cookies</h3>
                <p>These cookies enhance your experience on our platform:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Language Preferences:</strong> Remember your chosen language</li>
                  <li><strong>Dashboard Settings:</strong> Save your customized view preferences</li>
                  <li><strong>Theme Selection:</strong> Remember your preferred interface theme</li>
                  <li><strong>Recent Activity:</strong> Show your recently viewed properties</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Third-Party Integration Cookies</h3>
                <p>These cookies enable integration with booking platforms:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Airbnb API:</strong> Maintain connection to your Airbnb account</li>
                  <li><strong>Booking.com Integration:</strong> Sync property data and availability</li>
                  <li><strong>Vrbo Connection:</strong> Manage listings and calendar updates</li>
                  <li><strong>PMS Integrations:</strong> Connect with property management systems</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Cookie Management</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Browser Settings</h3>
              <p>You can control cookies through your browser settings:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Chrome:</strong> Settings &gt; Privacy and Security &gt; Cookies</li>
                <li><strong>Firefox:</strong> Options &gt; Privacy &amp; Security &gt; Cookies</li>
                <li><strong>Safari:</strong> Preferences &gt; Privacy &gt; Cookies</li>
                <li><strong>Edge:</strong> Settings &gt; Privacy &gt; Cookies</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800 mt-6">Our Cookie Preference Center</h3>
              <p>You can manage your cookie preferences using our built-in tools:</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800"><strong>Cookie Settings:</strong> Available in your account dashboard under "Privacy Preferences"</p>
                <p className="text-blue-700 text-sm mt-2">Note: Disabling certain cookies may limit platform functionality</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Third-Party Cookies</h2>
            <p>Our platform may include cookies from trusted third-party services:</p>
            
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800">Google Services</h4>
                <p className="text-sm text-slate-600">Analytics, Maps, and Authentication</p>
                <p className="text-xs text-slate-500 mt-1">Privacy Policy: <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></p>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800">Booking Platform APIs</h4>
                <p className="text-sm text-slate-600">Airbnb, Booking.com, Vrbo integration cookies</p>
                <p className="text-xs text-slate-500 mt-1">Governed by respective platform privacy policies</p>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800">Payment Processors</h4>
                <p className="text-sm text-slate-600">Secure payment processing and fraud prevention</p>
                <p className="text-xs text-slate-500 mt-1">PCI DSS compliant payment partners</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Cookie Retention</h2>
            <p>Different types of cookies are stored for different periods:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
              <li><strong>Authentication Cookies:</strong> 30 days or until logout</li>
              <li><strong>Preference Cookies:</strong> 1 year or until changed</li>
              <li><strong>Analytics Cookies:</strong> 2 years (Google Analytics standard)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. International Users</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">GDPR Compliance (EU Users)</h3>
              <p>For users in the European Union, we provide:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Clear consent mechanisms for non-essential cookies</li>
                <li>Granular control over cookie categories</li>
                <li>Right to withdraw consent at any time</li>
                <li>Data protection officer contact information</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Other Jurisdictions</h3>
              <p>We comply with applicable cookie laws in all jurisdictions where we operate, including notice and consent requirements.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Updates to This Policy</h2>
            <p>We may update this cookie policy from time to time to reflect changes in our practices or applicable laws. We will notify you of significant changes through our platform or via email.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Contact Us</h2>
            <p>If you have questions about our use of cookies, please contact us:</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> privacy@channelsconnect.com</p>
              <p><strong>Subject Line:</strong> Cookie Policy Inquiry</p>
              <p><strong>Cookie Settings:</strong> Available in your account dashboard</p>
            </div>
          </section>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}