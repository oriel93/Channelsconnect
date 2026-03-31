
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PriceLabsIntegration as Integration } from '@/api/entities';
import { PropertyPricing } from '@/api/entities';
import { Listing } from '@/api/entities';
import { priceLabsConnect } from '@/api/functions';
import { priceLabsGetPricing } from '@/api/functions';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Target,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Shield,
  Link,
  Unlink,
  Settings,
  Loader2,
  Plus,
  Eye
} from 'lucide-react';

export default function PriceLabsIntegration() {
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    loading: false,
    error: '',
    accountInfo: null
  });

  const [apiKey, setApiKey] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
    fetchListings();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const integrations = await Integration.list();
      if (integrations.length > 0 && integrations[0].connected) {
        setConnectionState({
          isConnected: true,
          loading: false,
          error: '',
          accountInfo: integrations[0].account_info
        });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const fetchListings = async () => {
    try {
      const userListings = await Listing.list();
      setListings(userListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setConnectionState(prev => ({ ...prev, error: 'Please enter your API key' }));
      return;
    }

    setConnectionState(prev => ({ ...prev, loading: true, error: '' }));

    try {
      const { data } = await priceLabsConnect({ apiKey });
      
      if (data.success) {
        setConnectionState({
          isConnected: true,
          loading: false,
          error: '',
          accountInfo: data.accountInfo
        });
        setApiKey('');
        toast.success('Successfully connected to PriceLabs!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to connect to PriceLabs'
      }));
      toast.error(error.message || 'Failed to connect to PriceLabs');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect PriceLabs? This will disable dynamic pricing for all properties.')) {
      return;
    }

    try {
      const integrations = await Integration.list();
      if (integrations.length > 0) {
        await Integration.update(integrations[0].id, { connected: false });
        setConnectionState({
          isConnected: false,
          loading: false,
          error: '',
          accountInfo: null
        });
        toast.success('Disconnected from PriceLabs');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const createPropertyMapping = async (listingId) => {
    try {
      // Create a basic property pricing record
      const mockPriceLabsId = `pl_${listingId.slice(-8)}`;
      
      await PropertyPricing.create({
        listing_id: listingId,
        pricelabs_property_id: mockPriceLabsId,
        current_rate: 0,
        recommended_rate: 0,
        guaranteed_rate: 0,
        confidence_score: 0,
        market_factors: [],
        pricing_enabled: true
      });
      
      toast.success('Property mapped to PriceLabs!');
      fetchListings(); // Refresh to show updated status
    } catch (error) {
      toast.error('Failed to map property');
    }
  };

  const fetchPricingRecommendations = async (listingId) => {
    setIsLoadingPricing(true);
    setSelectedListing(listingId);
    
    try {
      const { data } = await priceLabsGetPricing({ listingId });
      
      if (data.success) {
        setPricingData(data.data);
        toast.success('Pricing recommendations loaded!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch pricing recommendations');
      setPricingData(null);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const applyPricingRecommendations = async () => {
    if (!selectedListing || !pricingData) return;

    try {
      const listing = listings.find(l => l.id === selectedListing);
      if (!listing) return;

      await Listing.update(selectedListing, {
        default_net_rate: pricingData.analytics.averageRecommendedRate
      });

      toast.success(`Pricing updated! ${pricingData.analytics.improvement}% improvement expected`);
      fetchPricingRecommendations(selectedListing); // Refresh data
    } catch (error) {
      toast.error('Failed to apply pricing recommendations');
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span>PriceLabs Dynamic Pricing</span>
            </CardTitle>
            <Badge variant={connectionState.isConnected ? "default" : "secondary"}>
              {connectionState.isConnected ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                'Not Connected'
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!connectionState.isConnected ? (
            <div className="space-y-4">
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Why Connect PriceLabs?</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• AI-powered dynamic pricing optimization</li>
                    <li>• Increase revenue by 10-30% on average</li>
                    <li>• Real-time market analysis and competitor data</li>
                    <li>• Automated rate updates across all channels</li>
                    <li>• Maintain guaranteed rate protection</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PriceLabs API Key
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Find your API key in your PriceLabs dashboard under Account Settings → API Access
                  </p>
                  <div className="flex space-x-3">
                    <Input
                      type="password"
                      placeholder="Enter your PriceLabs API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                      disabled={connectionState.loading}
                    />
                    <Button 
                      onClick={handleConnect} 
                      disabled={connectionState.loading || !apiKey.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {connectionState.loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4 mr-2" />
                      )}
                      Connect PriceLabs
                    </Button>
                  </div>
                </div>

                {connectionState.error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{connectionState.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>Successfully Connected!</strong>
                      <p className="text-sm text-gray-600 mt-1">
                        Account: {connectionState.accountInfo?.email} • Plan: {connectionState.accountInfo?.plan}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDisconnect}>
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property Management */}
      {connectionState.isConnected && (
        <Tabs defaultValue="properties" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="properties">Property Management</TabsTrigger>
            <TabsTrigger value="pricing">Smart Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle>Manage Your Properties</CardTitle>
                <p className="text-sm text-gray-600">
                  Enable dynamic pricing for your ChannelsConnect properties
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listings.map(listing => (
                    <div key={listing.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{listing.name}</h4>
                        <p className="text-sm text-gray-600">{listing.address || 'No address provided'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">${listing.default_net_rate || 0}/night</Badge>
                          {listing.external_source && (
                            <Badge variant="secondary">{listing.external_source}</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => createPropertyMapping(listing.id)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Enable Pricing
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => fetchPricingRecommendations(listing.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Pricing
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {listings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No properties found. Import your first listing to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            {isLoadingPricing ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading pricing recommendations...</span>
                </CardContent>
              </Card>
            ) : pricingData ? (
              <div className="space-y-6">
                {/* Pricing Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Current Rate</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${pricingData.property.currentRate}
                          </p>
                          <p className="text-sm text-gray-500">Per night</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Recommended</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${pricingData.analytics.averageRecommendedRate}
                          </p>
                          <p className="text-sm text-green-600">
                            {pricingData.analytics.improvement}% change
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Guaranteed Rate</p>
                          <p className="text-2xl font-bold text-orange-600">
                            ${pricingData.analytics.suggestedGuaranteedRate}
                          </p>
                          <p className="text-sm text-orange-600">Protected minimum</p>
                        </div>
                        <Shield className="w-8 h-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Confidence</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {pricingData.analytics.confidence}%
                          </p>
                          <p className="text-sm text-purple-600">AI confidence</p>
                        </div>
                        <Target className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing Recommendations */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Pricing Recommendations</CardTitle>
                      <Button 
                        onClick={applyPricingRecommendations}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Apply Recommendations
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Next 14 days pricing calendar */}
                      <div>
                        <h4 className="font-medium mb-3">Next 14 Days Pricing</h4>
                        <div className="grid grid-cols-7 gap-2">
                          {pricingData.recommendations.slice(0, 14).map((day, index) => (
                            <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-xs text-gray-500 mb-1">
                                {new Date(day.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className="font-semibold text-sm text-green-600">
                                ${day.price}
                              </div>
                              <div className="text-xs text-gray-500">
                                {day.min_stay}n min
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Market Factors */}
                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          <h4 className="font-medium mb-2">Market Factors Influencing Pricing:</h4>
                          <div className="flex flex-wrap gap-2">
                            {pricingData.analytics.marketFactors.map((factor, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </AlertDescription>
                      </Alert>

                      {/* Insights */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2">Price Optimization Tips</h4>
                          <ul className="text-sm text-green-800 space-y-1">
                            {pricingData.insights.priceOptimization.map((tip, index) => (
                              <li key={index}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Market Trends</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            {pricingData.insights.marketTrends.map((trend, index) => (
                              <li key={index}>• {trend}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Property Selected</h3>
                  <p className="text-gray-600">
                    Select a property from the Property Management tab to view pricing recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
