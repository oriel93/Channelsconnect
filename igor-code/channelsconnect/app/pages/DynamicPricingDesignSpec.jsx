
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Settings, RefreshCw, TrendingUp, Database, Code, Layout } from 'lucide-react';

export default function DynamicPricingDesignSpec() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Dynamic Pricing System</h1>
          <p className="text-xl text-slate-600">Complete Design Specifications for Base44 Development Team</p>
          <Badge className="mt-4 bg-emerald-100 text-emerald-800">Ready for Implementation</Badge>
        </div>

        {/* Pricing Calculation Logic */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              1. Pricing Calculation Logic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Core Algorithm (Pseudocode)</h3>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap">{`For each date in the next 365 days:

1️⃣ Start with Base Rate
   e.g., $150

2️⃣ Apply Seasonal Adjustment
   - If date is in any seasonal period:
       Base Rate *= seasonal_multiplier

3️⃣ Apply Day-of-Week Adjustment
   - If date is Fri/Sat:
       Base Rate *= weekend_multiplier

4️⃣ Apply Last-Minute Discount
   - If date is within N days from today:
       Base Rate *= (1 - last_minute_discount%)

5️⃣ Clamp Between Min and Max
   - If rate < min: rate = min
   - If rate > max: rate = max

6️⃣ Return Final Rate`}</pre>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3">Core Inputs</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Base Rate (e.g., $150)</li>
                  <li>• Minimum Rate (e.g., $100)</li>
                  <li>• Maximum Rate (e.g., $300)</li>
                  <li>• Last-Minute Discount (%)</li>
                  <li>• Length of Stay Discount (%)</li>
                  <li>• Seasonal Adjustments (JSON)</li>
                  <li>• Day-of-Week Adjustments</li>
                </ul>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3">Example Calculation</h4>
                <div className="text-sm space-y-1">
                  <div>Base Rate: $150</div>
                  <div>Seasonal Multiplier: 1.2 = $180</div>
                  <div>Weekend Multiplier: 1.1 = $198</div>
                  <div>Last-Minute Discount: 0.85 = $168.3</div>
                  <div className="font-bold text-emerald-700">Final: $168.30</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UI Mockups */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Layout className="w-6 h-6 text-purple-600" />
              2. User Interface Design
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Pricing Calendar View
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Monthly calendar grid</li>
                  <li>• Color-coded cells by rate type</li>
                  <li>• Click to override manually</li>
                  <li>• Hover tooltips with breakdown</li>
                  <li>• Export/import capabilities</li>
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Pricing Rules Panel
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Base/Min/Max rate inputs</li>
                  <li>• Last-minute discount toggle</li>
                  <li>• Weekend multiplier settings</li>
                  <li>• Seasonal adjustments table</li>
                  <li>• Length of stay discounts</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync Status Panel
                </h4>
                <ul className="text-sm space-y-1">
                  <li>• Last sync timestamp</li>
                  <li>• Manual sync trigger</li>
                  <li>• Activity log (last 10 actions)</li>
                  <li>• Channel connection status</li>
                  <li>• Error notifications</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-100 p-6 rounded-lg">
              <h4 className="font-bold text-slate-800 mb-3">Color Coding System</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400 rounded"></div>
                  <span>Regular Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded"></div>
                  <span>Seasonal Adjusted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-400 rounded"></div>
                  <span>Weekend Premium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-400 rounded"></div>
                  <span>Last-Minute Discount</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Specifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Code className="w-6 h-6 text-green-600" />
              3. API Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3">GET /pricing</h4>
                <p className="text-sm text-slate-600 mb-3">Retrieve calculated pricing data</p>
                <pre className="text-xs bg-white p-2 rounded border">{`GET /pricing?listingId=abc123

Response:
{
  "listingId": "abc123",
  "rates": [
    {
      "date": "2025-09-01",
      "calculatedRate": 168.3,
      "components": {
        "base": 150,
        "seasonal": 1.2,
        "weekend": 1.1,
        "lastMinute": 0.85
      }
    }
  ]
}`}</pre>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3">PUT /pricing/override</h4>
                <p className="text-sm text-slate-600 mb-3">Save manual rate override</p>
                <pre className="text-xs bg-white p-2 rounded border">{`PUT /pricing/override

Body:
{
  "listingId": "abc123",
  "date": "2025-09-01",
  "overrideRate": 200
}

Response:
{ "status": "ok" }`}</pre>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-bold text-slate-800 mb-3">POST /pricing/sync</h4>
                <p className="text-sm text-slate-600 mb-3">Push rates to channels</p>
                <pre className="text-xs bg-white p-2 rounded border">{`POST /pricing/sync

Body:
{
  "listingId": "abc123",
  "dates": ["2025-09-01", ...]
}

Response:
{ "status": "sync_started" }`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Schema */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Database className="w-6 h-6 text-indigo-600" />
              4. Database Schema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-indigo-50 p-6 rounded-lg">
              <h4 className="font-bold text-slate-800 mb-4">PricingRule Table</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Field</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    <tr className="border-b">
                      <td className="p-2 font-mono">listing_id</td>
                      <td className="p-2">string</td>
                      <td className="p-2">Reference to listing</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">base_rate</td>
                      <td className="p-2">decimal</td>
                      <td className="p-2">Base nightly rate</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">min_rate</td>
                      <td className="p-2">decimal</td>
                      <td className="p-2">Minimum allowed rate</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">max_rate</td>
                      <td className="p-2">decimal</td>
                      <td className="p-2">Maximum allowed rate</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">last_minute_discount</td>
                      <td className="p-2">decimal</td>
                      <td className="p-2">Discount percentage (0-1)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-mono">weekend_multiplier</td>
                      <td className="p-2">decimal</td>
                      <td className="p-2">Weekend rate multiplier</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono">seasonal_adjustments</td>
                      <td className="p-2">JSON</td>
                      <td className="p-2">Date ranges and multipliers</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-yellow-600" />
              5. Implementation Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800">Phase 1: Core Pricing Engine</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Create PricingRule entity</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Build calculation algorithm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Implement GET /pricing API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Create pricing rules UI</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800">Phase 2: Calendar & Sync</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Build pricing calendar component</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Implement override functionality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Create sync engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Add background job runner</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-bold text-slate-800 mb-2">⚠️ Critical Requirements</h4>
              <ul className="text-sm space-y-1">
                <li>• Ensure sync does not overwrite manual overrides</li>
                <li>• Implement proper error handling and retry logic</li>
                <li>• Log all pricing changes for audit trail</li>
                <li>• Test thoroughly with real channel APIs</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
