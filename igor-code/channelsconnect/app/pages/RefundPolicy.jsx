import React, { useEffect } from 'react';
import MarketingHeader from '../components/marketing/MarketingHeader';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function RefundPolicy() {
  useEffect(() => {
    document.title = "Refund and Cancellation Policy | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'Refund and cancellation policy for Channels Connect services. Learn about our refund procedures and cancellation terms.';
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
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Refund and Cancellation Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="prose prose-lg max-w-none text-slate-700 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Service Model and Fees</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800"><strong>No Monthly Fees:</strong> Channels Connect operates on a commission-based model with no monthly subscription fees or setup costs.</p>
            </div>
            <p>Our current fee structure includes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Commission-based fees on successful bookings</li>
              <li>No setup or onboarding charges</li>
              <li>No monthly minimums or subscription fees</li>
              <li>Optional premium features with separate pricing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Refund Eligibility</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Commission Refunds</h3>
                <p>Refunds for commission fees may be available in the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Booking Cancellations:</strong> If a booking is cancelled within the channel partner's cancellation window</li>
                  <li><strong>Technical Errors:</strong> When platform errors result in incorrect fee calculations</li>
                  <li><strong>Service Disruptions:</strong> For extended outages that prevent service delivery</li>
                  <li><strong>Billing Errors:</strong> When incorrect charges are applied to your account</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Premium Feature Refunds</h3>
                <p>For paid premium features or add-on services:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>14-Day Trial:</strong> Full refund available within 14 days of purchase</li>
                  <li><strong>Service Issues:</strong> Refunds for features that don't function as described</li>
                  <li><strong>Downgrade Requests:</strong> Pro-rated refunds when downgrading services</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Non-Refundable Situations</h2>
            
            <p>Refunds are generally not available for:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Successful Bookings:</strong> Commission fees for completed, paid bookings</li>
              <li><strong>User Error:</strong> Mistakes in pricing, availability, or property information</li>
              <li><strong>Policy Violations:</strong> Account suspensions due to terms of service violations</li>
              <li><strong>Market Changes:</strong> Reduced bookings due to market conditions</li>
              <li><strong>Third-Party Issues:</strong> Problems originating from booking platform partners</li>
              <li><strong>Change of Mind:</strong> General dissatisfaction without service defects</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Account Cancellation</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">How to Cancel</h3>
              <p>You can cancel your Channels Connect account at any time:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Through your account dashboard settings</li>
                <li>By contacting our support team</li>
                <li>Via email to support@channelsconnect.com</li>
                <li>No cancellation fees or penalties apply</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">What Happens When You Cancel</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Immediate Effect:</strong> New booking commissions cease immediately</li>
                <li><strong>Existing Bookings:</strong> We continue to manage confirmed bookings through completion</li>
                <li><strong>Data Export:</strong> 30-day window to export your data</li>
                <li><strong>Platform Disconnection:</strong> Channel integrations are safely disconnected</li>
                <li><strong>Final Settlement:</strong> Any outstanding commissions are processed according to normal schedule</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Refund Request Process</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">How to Request a Refund</h3>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Contact our support team within 60 days of the charge</li>
                <li>Provide booking details and reason for refund request</li>
                <li>Include supporting documentation if applicable</li>
                <li>Allow 5-10 business days for review and response</li>
              </ol>

              <h3 className="text-xl font-medium text-slate-800">Required Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account email address and property details</li>
                <li>Booking confirmation numbers and dates</li>
                <li>Specific charges you're disputing</li>
                <li>Detailed explanation of the issue</li>
                <li>Screenshots or documentation supporting your claim</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Processing Timeline</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Review Process</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Initial Review:</strong> 3-5 business days</li>
                <li><strong>Investigation:</strong> Up to 10 business days for complex cases</li>
                <li><strong>Decision Notification:</strong> Email confirmation of decision</li>
                <li><strong>Appeal Process:</strong> 30 days to appeal decisions</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Refund Processing</h3>
              <p>Approved refunds are processed as follows:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Credit Card:</strong> 5-10 business days</li>
                <li><strong>Bank Transfer:</strong> 3-7 business days</li>
                <li><strong>PayPal:</strong> 1-3 business days</li>
                <li><strong>Account Credit:</strong> Immediately available</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. Booking-Related Cancellations</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Guest Cancellations</h3>
              <p>When guests cancel bookings through connected platforms:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Refunds follow the original booking platform's cancellation policy</li>
                <li>Commission fees are automatically adjusted based on final payout</li>
                <li>No additional charges apply for processing cancellations</li>
                <li>You receive updated settlement statements reflecting changes</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Host Cancellations</h3>
              <p>If you need to cancel a confirmed booking:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Follow the cancellation procedures of the booking platform</li>
                <li>Be aware of potential penalties from the booking platform</li>
                <li>Commission adjustments are made based on final settlement</li>
                <li>Contact support if you need assistance with the process</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Force Majeure and Emergency Situations</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Covered Situations</h3>
              <p>Special refund considerations may apply during:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Natural disasters affecting property availability</li>
                <li>Government-mandated travel restrictions</li>
                <li>Public health emergencies (e.g., COVID-19)</li>
                <li>Major infrastructure failures</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Emergency Refund Process</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Contact our emergency support line immediately</li>
                <li>Provide documentation of the emergency situation</li>
                <li>We'll work with booking platforms to process appropriate refunds</li>
                <li>Special consideration given to affected properties</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Dispute Resolution</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Internal Resolution</h3>
              <p>We strive to resolve all refund disputes internally through:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Direct communication with our support team</li>
                <li>Escalation to management when necessary</li>
                <li>Mediation services for complex disputes</li>
                <li>Good faith negotiation to reach fair solutions</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">External Dispute Resolution</h3>
              <p>If internal resolution is unsuccessful:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Binding arbitration through the American Arbitration Association</li>
                <li>Small claims court for disputes under jurisdictional limits</li>
                <li>Credit card chargeback rights may apply</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Policy Updates</h2>
            <p>This refund policy may be updated from time to time. Material changes will be communicated via:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email notification to all active users</li>
              <li>Dashboard notification upon login</li>
              <li>30-day advance notice for significant changes</li>
              <li>Right to cancel service if you disagree with changes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">11. Contact Information</h2>
            <p>For refund requests and billing inquiries:</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <p><strong>Billing Support:</strong> billing@channelsconnect.com</p>
              <p><strong>General Support:</strong> support@channelsconnect.com</p>
              <p><strong>Phone Support:</strong> Available through your account dashboard</p>
              <p><strong>Mailing Address:</strong> Channels Connect Billing Department</p>
              <p className="text-sm text-slate-600 mt-2">Response time: Within 24 hours for refund inquiries</p>
            </div>
          </section>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}