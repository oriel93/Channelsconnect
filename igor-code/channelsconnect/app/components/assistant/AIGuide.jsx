import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  User, 
  Calendar, 
  Upload, 
  Link2, 
  Database,
  CheckCircle,
  ArrowRight,
  X,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const allGuideSteps = [
  {
    id: 'login',
    title: 'User Login & Account Creation',
    icon: User,
    prompts: [
      "Welcome! Please create an account to access all site features.",
      "Already have an account? Sign in with your email or Google.",
      "Choose your login method: Sign in with Email or Continue with Google.",
      "Enter your email address and password to create your account.",
      "Verify your email to complete registration."
    ]
  },
  {
    id: 'calendar',
    title: 'Calendar Connections (iCal)',
    icon: Calendar,
    prompts: [
      "Connect your iCal calendar to keep your availability updated.",
      "Paste your iCal URL here or upload an iCal (.ics) file.",
      "Would you like to connect multiple calendars?",
    ]
  },
  {
    id: 'photos',
    title: 'Upload Photos or Website Links',
    icon: Upload,
    prompts: [
      "Upload photos of your property. Drag and drop or click to browse files.",
      "Enter your property website link to import details.",
    ]
  },
  {
    id: 'listings',
    title: 'View and Manage Listings',
    icon: Database,
    prompts: [
      "Upload your property listings to get started.",
      "View connection status for each listing.",
      "You currently have {X} listings connected."
    ]
  },
  {
    id: 'beds24',
    title: 'Beds24 Integration (Admin Only)',
    icon: Settings,
    prompts: [
      "Connect Beds24 backend via API key.",
      "Map uploaded units to Beds24 room IDs.",
      "Run API sync to update availability and rates.",
    ]
  }
];

export default function AIGuide({ isOpen, onClose, user, currentStep = 'login' }) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState([]);

  const guideSteps = user?.role === 'admin' 
    ? allGuideSteps 
    : allGuideSteps.filter(step => step.id !== 'beds24');

  useEffect(() => {
    // If the current active step is admin-only and the user is not an admin,
    // move to the first available step.
    if (user?.role !== 'admin' && activeStep === 'beds24') {
      setActiveStep(guideSteps[0]?.id || 'login');
    }
  }, [user, activeStep, guideSteps]);

  const handleStepComplete = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    
    const currentIndex = guideSteps.findIndex(step => step.id === stepId);
    if (currentIndex < guideSteps.length - 1) {
      setActiveStep(guideSteps[currentIndex + 1].id);
    } else {
      onClose(); // Close the guide after the last step
    }
  };

  const currentStepData = guideSteps.find(step => step.id === activeStep);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Setup Assistant</h2>
              <p className="text-sm text-slate-500">Let's get your property platform ready</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Setup Progress</span>
              <span className="text-sm text-slate-500">
                {completedSteps.length}/{guideSteps.length} steps completed
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedSteps.length / guideSteps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
            {guideSteps.map((step) => {
              const StepIcon = step.icon;
              const isActive = step.id === activeStep;
              const isCompleted = completedSteps.includes(step.id);
              
              return (
                <Button
                  key={step.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`h-auto p-3 flex flex-col gap-1 text-center ${
                    isCompleted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : ''
                  }`}
                  onClick={() => setActiveStep(step.id)}
                >
                  <StepIcon className="w-4 h-4 mx-auto" />
                  <span className="text-xs font-medium leading-tight">{step.title}</span>
                  {isCompleted && <CheckCircle className="w-3 h-3 text-emerald-600 absolute top-1 right-1" />}
                </Button>
              );
            })}
          </div>

          {/* Current Step Content */}
          <AnimatePresence mode="wait">
            {currentStepData && (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <currentStepData.icon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-slate-800">{currentStepData.title}</h3>
                </div>

                <div className="space-y-3">
                  {currentStepData.prompts.map((prompt, index) => (
                    <Card key={index} className="bg-slate-50 border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{prompt}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const currentIndex = guideSteps.findIndex(step => step.id === activeStep);
                      if (currentIndex > 0) {
                        setActiveStep(guideSteps[currentIndex - 1].id);
                      }
                    }}
                    disabled={guideSteps.findIndex(step => step.id === activeStep) === 0}
                  >
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => handleStepComplete(activeStep)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {completedSteps.includes(activeStep) ? 'Next Step' : 'Mark Complete'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}