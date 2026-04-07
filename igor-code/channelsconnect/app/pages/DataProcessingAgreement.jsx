import React, { useEffect } from 'react';
import MarketingHeader from '../components/marketing/MarketingHeader';
import MarketingFooter from '../components/marketing/MarketingFooter';

export default function DataProcessingAgreement() {
  useEffect(() => {
    document.title = "Data Processing Agreement | Channels Connect";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement('meta');
    metaDesc.name = 'description';
    metaDesc.content = 'GDPR-compliant Data Processing Agreement for Channels Connect users. Learn about our data processing practices and your rights.';
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
        <h1 className="text-4xl font-bold text-slate-800 mb-8">Data Processing Agreement</h1>
        <p className="text-slate-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-blue-800"><strong>GDPR Compliance:</strong> This Data Processing Agreement (DPA) is required for GDPR compliance when Channels Connect processes personal data on behalf of our customers.</p>
        </div>
        
        <div className="prose prose-lg max-w-none text-slate-700 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Definitions and Interpretation</h2>
            <div className="space-y-4">
              <p><strong>"Controller"</strong> means the entity that determines the purposes and means of processing personal data (typically, our customer/user).</p>
              <p><strong>"Processor"</strong> means Channels Connect, which processes personal data on behalf of the Controller.</p>
              <p><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person.</p>
              <p><strong>"Processing"</strong> means any operation performed on personal data, including collection, storage, use, and disclosure.</p>
              <p><strong>"Data Subject"</strong> means the individual to whom personal data relates (e.g., property guests, employees).</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Scope and Application</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">When This DPA Applies</h3>
              <p>This DPA applies when:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You are subject to GDPR (EU users or processing EU residents' data)</li>
                <li>Channels Connect processes personal data on your behalf</li>
                <li>The processing involves guest data, employee data, or other personal information</li>
                <li>You act as the data controller and we act as the data processor</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Processing Activities Covered</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Storage and synchronization of guest booking information</li>
                <li>Processing of property listing data containing personal information</li>
                <li>Communication facilitation between property owners and guests</li>
                <li>Calendar and availability management systems</li>
                <li>Analytics and reporting on booking patterns</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Controller and Processor Responsibilities</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Your Responsibilities as Controller</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Ensure lawful basis for processing personal data</li>
                  <li>Provide necessary privacy notices to data subjects</li>
                  <li>Obtain required consent where applicable</li>
                  <li>Respond to data subject rights requests</li>
                  <li>Conduct Data Protection Impact Assessments when required</li>
                  <li>Ensure data accuracy and completeness</li>
                  <li>Notify us of any restrictions on processing</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-medium text-slate-800 mb-2">Our Responsibilities as Processor</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Process data only on your documented instructions</li>
                  <li>Implement appropriate technical and organizational measures</li>
                  <li>Maintain confidentiality of personal data</li>
                  <li>Assist with data subject rights requests</li>
                  <li>Notify you of data breaches without undue delay</li>
                  <li>Conduct regular security assessments</li>
                  <li>Return or delete data upon termination</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Categories of Data and Processing</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Categories of Personal Data</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Guest Data:</strong> Names, contact information, booking details, preferences</li>
                <li><strong>Property Owner Data:</strong> Contact details, financial information, property details</li>
                <li><strong>Communication Data:</strong> Messages, reviews, support interactions</li>
                <li><strong>Usage Data:</strong> Platform activity, feature usage, performance metrics</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Categories of Data Subjects</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Property guests and potential guests</li>
                <li>Property owners and managers</li>
                <li>Customer support contacts</li>
                <li>Website visitors and platform users</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Processing Purposes</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Facilitating vacation rental bookings and management</li>
                <li>Synchronizing data across booking platforms</li>
                <li>Providing customer support and communication tools</li>
                <li>Generating analytics and performance reports</li>
                <li>Ensuring platform security and fraud prevention</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Security Measures</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Technical Safeguards</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and multi-factor authentication</li>
                <li>Network security and firewall protection</li>
                <li>Regular security updates and patch management</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Organizational Measures</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Staff training on data protection practices</li>
                <li>Background checks for personnel with data access</li>
                <li>Incident response and breach notification procedures</li>
                <li>Regular review and updates of security policies</li>
                <li>Vendor management and due diligence processes</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">6. Sub-Processors</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Approved Sub-Processors</h3>
              <p>We may engage the following categories of sub-processors:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Cloud Infrastructure Providers:</strong> For hosting and data storage</li>
                <li><strong>Analytics Services:</strong> For performance monitoring and optimization</li>
                <li><strong>Communication Tools:</strong> For customer support and messaging</li>
                <li><strong>Security Services:</strong> For fraud prevention and threat detection</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Sub-Processor Requirements</h3>
              <p>All sub-processors must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide adequate data protection guarantees</li>
                <li>Enter into written agreements with equivalent obligations</li>
                <li>Implement appropriate technical and organizational measures</li>
                <li>Submit to regular audits and assessments</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Change Notification</h3>
              <p>We will notify you of any changes to our sub-processors with at least 30 days notice, allowing you to object to such changes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">7. International Data Transfers</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Transfer Mechanisms</h3>
              <p>When transferring personal data outside the EEA, we use:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Standard Contractual Clauses:</strong> EU Commission approved clauses</li>
                <li><strong>Adequacy Decisions:</strong> For countries with adequate protection</li>
                <li><strong>Certification Programs:</strong> Where applicable and available</li>
                <li><strong>Additional Safeguards:</strong> As required by law</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Transfer Locations</h3>
              <p>Data may be transferred to and processed in:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>United States (with appropriate safeguards)</li>
                <li>Countries with EU adequacy decisions</li>
                <li>Other locations as necessary for service provision</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">8. Data Subject Rights Support</h2>
            
            <p>We will assist you in responding to data subject rights requests, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Access Rights:</strong> Providing copies of personal data</li>
              <li><strong>Rectification:</strong> Correcting inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Deleting personal data when required</li>
              <li><strong>Restriction:</strong> Limiting processing in certain circumstances</li>
              <li><strong>Portability:</strong> Providing data in structured, machine-readable format</li>
              <li><strong>Objection:</strong> Stopping processing where legally required</li>
            </ul>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-yellow-800"><strong>Response Time:</strong> We will respond to your requests for assistance within 72 hours and provide necessary technical and organizational support.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">9. Data Breach Notification</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Notification Timeline</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We will notify you of any personal data breach without undue delay</li>
                <li>Initial notification within 72 hours of becoming aware</li>
                <li>Detailed incident report within 7 days</li>
                <li>Regular updates until resolution</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Breach Information</h3>
              <p>Our notifications will include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nature and scope of the breach</li>
                <li>Categories and approximate numbers of affected data subjects</li>
                <li>Likely consequences of the breach</li>
                <li>Measures taken or proposed to address the breach</li>
                <li>Contact information for further inquiries</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">10. Audit and Compliance</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Audit Rights</h3>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Conduct audits of our data processing activities</li>
                <li>Request evidence of compliance with this DPA</li>
                <li>Engage qualified third-party auditors</li>
                <li>Receive copies of relevant certifications and reports</li>
              </ul>

              <h3 className="text-xl font-medium text-slate-800">Compliance Documentation</h3>
              <p>We maintain and provide:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Records of processing activities</li>
                <li>Security certifications and assessments</li>
                <li>Staff training documentation</li>
                <li>Incident response logs and reports</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">11. Term and Termination</h2>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-slate-800">Agreement Duration</h3>
              <p>This DPA remains in effect for the duration of our service agreement and continues until all personal data is returned or deleted.</p>

              <h3 className="text-xl font-medium text-slate-800">Data Return and Deletion</h3>
              <p>Upon termination:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>We will return or delete all personal data as instructed</li>
                <li>Data export will be provided in standard formats</li>
                <li>Deletion will be completed within 90 days</li>
                <li>Certification of deletion will be provided upon request</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">12. Contact Information</h2>
            <p>For DPA-related inquiries and data protection matters:</p>
            <div className="bg-slate-50 p-4 rounded-lg mt-4">
              <p><strong>Data Protection Officer:</strong> dpo@channelsconnect.com</p>
              <p><strong>Legal Department:</strong> legal@channelsconnect.com</p>
              <p><strong>Security Team:</strong> security@channelsconnect.com</p>
              <p><strong>Emergency Contact:</strong> Available 24/7 through our support portal</p>
            </div>
          </section>
        </div>
      </div>
      
      <MarketingFooter />
    </div>
  );
}