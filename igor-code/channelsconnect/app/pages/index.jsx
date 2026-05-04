import Layout from "./Layout.jsx";
import CertDashboard from "./CertDashboard.jsx";

import Home from "./Home";

import Pricing from "./Pricing";

import Features from "./Features";

import Integrations from "./Integrations";

import Resources from "./Resources";

import Team from "./Team";

import ConnectionSuccess from "./ConnectionSuccess";

import Connect from "./Connect";

import PmsIntegrations from "./PmsIntegrations";

import PaymentGatewayIntegrations from "./PaymentGatewayIntegrations";

import RevenueManagementIntegrations from "./RevenueManagementIntegrations";

import GuestMessagingIntegrations from "./GuestMessagingIntegrations";

import BusinessIntelligenceIntegrations from "./BusinessIntelligenceIntegrations";

import RequestIntegration from "./RequestIntegration";

import MultiChannelDistributionChecklist from "./MultiChannelDistributionChecklist";

import HotelChannelManagementGuide2024 from "./HotelChannelManagementGuide2024";

import StateOfHotelTech2024 from "./StateOfHotelTech2024";

import Dashboard from "./Dashboard";

import ImportListings from "./ImportListings";
import PropertyIngestionHub from "./PropertyIngestionHub";

import PricingManagementSystem from "./PricingManagementSystem";

import DynamicPricingDesignSpec from "./DynamicPricingDesignSpec";

import ImageManager from "./ImageManager";

import Listings from "./Listings";

import Compare from "./Compare";

import MultiCalendarSync from "./MultiCalendarSync";

import DynamicPricingTool from "./DynamicPricingTool";

import IcalImportExport from "./IcalImportExport";

import PmsIntegration from "./PmsIntegration";

import CompareGuesty from "./CompareGuesty";

import CompareRentalsUnited from "./CompareRentalsUnited";

import CompareSiteminder from "./CompareSiteminder";

import ListingDetail from "./ListingDetail";

import SelectPMSListings from "./SelectPMSListings";

import ExternalAuth from "./ExternalAuth";

import VerifyEmail from "./VerifyEmail";

import AuthCallback from "./AuthCallback";

import PrivacyPolicy from "./PrivacyPolicy";

import TermsOfService from "./TermsOfService";

import CookiePolicy from "./CookiePolicy";

import AcceptableUsePolicy from "./AcceptableUsePolicy";

import DataProcessingAgreement from "./DataProcessingAgreement";

import RefundPolicy from "./RefundPolicy";

import Agent from "./Agent";

import ChannelsDashboard from "./ChannelsDashboard";

import Login from "./Login";

import ForgotPassword from "./ForgotPassword";

import ResetPassword from "./ResetPassword";

import Settings from "./Settings";

import FinancialReports from "./FinancialReports";

import AdminDashboard from "./AdminDashboard";
import PropertyList from "./PropertyList";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../lib/authContext';

const PAGES = {
    
    Home: Home,
    
    Pricing: Pricing,
    
    Features: Features,
    
    Integrations: Integrations,
    
    Resources: Resources,
    
    Team: Team,
    
    ConnectionSuccess: ConnectionSuccess,
    
    Connect: Connect,
    
    PmsIntegrations: PmsIntegrations,
    
    PaymentGatewayIntegrations: PaymentGatewayIntegrations,
    
    RevenueManagementIntegrations: RevenueManagementIntegrations,
    
    GuestMessagingIntegrations: GuestMessagingIntegrations,
    
    BusinessIntelligenceIntegrations: BusinessIntelligenceIntegrations,
    
    RequestIntegration: RequestIntegration,
    
    MultiChannelDistributionChecklist: MultiChannelDistributionChecklist,
    
    HotelChannelManagementGuide2024: HotelChannelManagementGuide2024,
    
    StateOfHotelTech2024: StateOfHotelTech2024,
    
    Dashboard: Dashboard,
    
    ImportListings: ImportListings,
    PropertyIngestionHub: PropertyIngestionHub,
    
    PricingManagementSystem: PricingManagementSystem,
    
    DynamicPricingDesignSpec: DynamicPricingDesignSpec,
    
    ImageManager: ImageManager,
    
    Listings: Listings,
    
    Compare: Compare,
    
    MultiCalendarSync: MultiCalendarSync,
    
    DynamicPricingTool: DynamicPricingTool,
    
    IcalImportExport: IcalImportExport,
    
    PmsIntegration: PmsIntegration,
    
    CompareGuesty: CompareGuesty,
    
    CompareRentalsUnited: CompareRentalsUnited,
    
    CompareSiteminder: CompareSiteminder,
    
    ListingDetail: ListingDetail,
    
    SelectPMSListings: SelectPMSListings,
    
    ExternalAuth: ExternalAuth,
    
    VerifyEmail: VerifyEmail,
    
    AuthCallback: AuthCallback,
    
    PrivacyPolicy: PrivacyPolicy,
    
    TermsOfService: TermsOfService,
    
    CookiePolicy: CookiePolicy,
    
    AcceptableUsePolicy: AcceptableUsePolicy,
    
    DataProcessingAgreement: DataProcessingAgreement,
    
    RefundPolicy: RefundPolicy,
    
    Agent: Agent,
    
    ChannelsDashboard: ChannelsDashboard,
    
    Login: Login,
    
    ForgotPassword: ForgotPassword,
    
    ResetPassword: ResetPassword,
    
    Settings: Settings,
    
    FinancialReports: FinancialReports,
    AdminDashboard: AdminDashboard,
    PropertyList: PropertyList,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Home />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Pricing" element={<Pricing />} />
                
                <Route path="/Features" element={<Features />} />
                
                <Route path="/Integrations" element={<Integrations />} />
                
                <Route path="/Resources" element={<Resources />} />
                
                <Route path="/Team" element={<Team />} />
                
                <Route path="/ConnectionSuccess" element={<ConnectionSuccess />} />
                
                <Route path="/Connect" element={<Connect />} />
                
                <Route path="/PmsIntegrations" element={<PmsIntegrations />} />
                
                <Route path="/PaymentGatewayIntegrations" element={<PaymentGatewayIntegrations />} />
                
                <Route path="/RevenueManagementIntegrations" element={<RevenueManagementIntegrations />} />
                
                <Route path="/GuestMessagingIntegrations" element={<GuestMessagingIntegrations />} />
                
                <Route path="/BusinessIntelligenceIntegrations" element={<BusinessIntelligenceIntegrations />} />
                
                <Route path="/RequestIntegration" element={<RequestIntegration />} />
                
                <Route path="/MultiChannelDistributionChecklist" element={<MultiChannelDistributionChecklist />} />
                
                <Route path="/HotelChannelManagementGuide2024" element={<HotelChannelManagementGuide2024 />} />
                
                <Route path="/StateOfHotelTech2024" element={<StateOfHotelTech2024 />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/ImportListings" element={<ImportListings />} />
                <Route path="/PropertyIngestionHub" element={<PropertyIngestionHub />} />
                
                <Route path="/PricingManagementSystem" element={<PricingManagementSystem />} />
                
                <Route path="/DynamicPricingDesignSpec" element={<DynamicPricingDesignSpec />} />
                
                <Route path="/ImageManager" element={<ImageManager />} />
                
                <Route path="/Listings" element={<Listings />} />
                
                <Route path="/Compare" element={<Compare />} />
                
                <Route path="/MultiCalendarSync" element={<MultiCalendarSync />} />
                
                <Route path="/DynamicPricingTool" element={<DynamicPricingTool />} />
                
                <Route path="/IcalImportExport" element={<IcalImportExport />} />
                
                <Route path="/PmsIntegration" element={<PmsIntegration />} />
                
                <Route path="/CompareGuesty" element={<CompareGuesty />} />
                
                <Route path="/CompareRentalsUnited" element={<CompareRentalsUnited />} />
                
                <Route path="/CompareSiteminder" element={<CompareSiteminder />} />
                
                <Route path="/ListingDetail" element={<ListingDetail />} />
                
                <Route path="/SelectPMSListings" element={<SelectPMSListings />} />
                
                <Route path="/ExternalAuth" element={<ExternalAuth />} />
                
                <Route path="/VerifyEmail" element={<VerifyEmail />} />
                
                <Route path="/AuthCallback" element={<AuthCallback />} />
                
                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
                
                <Route path="/TermsOfService" element={<TermsOfService />} />
                
                <Route path="/CookiePolicy" element={<CookiePolicy />} />
                
                <Route path="/AcceptableUsePolicy" element={<AcceptableUsePolicy />} />
                
                <Route path="/DataProcessingAgreement" element={<DataProcessingAgreement />} />
                
                <Route path="/RefundPolicy" element={<RefundPolicy />} />
                
                <Route path="/Agent" element={<Agent />} />
                
                <Route path="/ChannelsDashboard" element={<ChannelsDashboard />} />
                
                <Route path="/Login" element={<Login />} />
                
                <Route path="/ForgotPassword" element={<ForgotPassword />} />
                
                <Route path="/ResetPassword" element={<ResetPassword />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/FinancialReports" element={<FinancialReports />} />

                <Route path="/AdminDashboard" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/PropertyList" element={<ProtectedRoute><PropertyList /></ProtectedRoute>} />
                <Route path="/property-list" element={<ProtectedRoute><PropertyList /></ProtectedRoute>} />
                {/* Legacy redirect so any old /tape-chart links still work */}
                <Route path="/TapeChart" element={<ProtectedRoute><PropertyList /></ProtectedRoute>} />
                <Route path="/tape-chart" element={<ProtectedRoute><PropertyList /></ProtectedRoute>} />

                {/* Channex PMS Certification — hidden route, no auth required */}
                <Route path="/cert-test" element={<CertDashboard />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}