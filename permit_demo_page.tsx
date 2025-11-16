import React, { useState } from 'react';
import { Building2, MapPin, FileText, AlertCircle, CheckCircle, Clock, DollarSign, Lock, Sparkles, Moon, Sun } from 'lucide-react';

const PermitProDemo = () => {
  const [step, setStep] = useState('intro');
  const [projectType, setProjectType] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Demo data with obviously fake information
  const demoProjects = [
    { id: 'deck', label: '🏡 Build a Deck', description: '12x16 wooden deck' },
    { id: 'bathroom', label: '🚿 Bathroom Remodel', description: 'Full renovation' },
    { id: 'fence', label: '🏗️ Install Fence', description: '6ft privacy fence' },
    { id: 'solar', label: '☀️ Solar Panels', description: 'Rooftop installation' }
  ];

  const demoResults = {
    deck: {
      permits: [
        { 
          name: 'Building Permit - Deck Construction',
          fee: '$125.00',
          time: '3-5 business days',
          required: true,
          forms: ['Application Form A-101', 'Site Plan Worksheet']
        },
        {
          name: 'Zoning Compliance Review',
          fee: '$50.00',
          time: '2-3 business days',
          required: true,
          forms: ['Zoning Checklist Z-200']
        }
      ],
      totalCost: '$175.00',
      totalTime: '5-8 business days',
      inspections: ['Foundation', 'Framing', 'Final']
    },
    bathroom: {
      permits: [
        { 
          name: 'Building Permit - Interior Alteration',
          fee: '$200.00',
          time: '5-7 business days',
          required: true,
          forms: ['Application Form A-102']
        },
        {
          name: 'Plumbing Permit',
          fee: '$85.00',
          time: '3-4 business days',
          required: true,
          forms: ['Plumbing Application P-300']
        },
        {
          name: 'Electrical Permit',
          fee: '$65.00',
          time: '3-4 business days',
          required: true,
          forms: ['Electrical Application E-400']
        }
      ],
      totalCost: '$350.00',
      totalTime: '7-10 business days',
      inspections: ['Rough Plumbing', 'Rough Electrical', 'Final']
    },
    fence: {
      permits: [
        { 
          name: 'Zoning Permit - Fence Installation',
          fee: '$75.00',
          time: '2-3 business days',
          required: true,
          forms: ['Fence Permit Application F-500']
        }
      ],
      totalCost: '$75.00',
      totalTime: '2-3 business days',
      inspections: ['Final']
    },
    solar: {
      permits: [
        { 
          name: 'Building Permit - Solar Installation',
          fee: '$250.00',
          time: '7-10 business days',
          required: true,
          forms: ['Solar Application S-600']
        },
        {
          name: 'Electrical Permit - Solar PV System',
          fee: '$150.00',
          time: '5-7 business days',
          required: true,
          forms: ['Solar Electrical Form SE-601']
        },
        {
          name: 'Structural Review',
          fee: '$100.00',
          time: '5-7 business days',
          required: true,
          forms: ['Structural Assessment SR-602']
        }
      ],
      totalCost: '$500.00',
      totalTime: '10-14 business days',
      inspections: ['Structural', 'Electrical Rough-in', 'Final Electrical', 'Final Building']
    }
  };

  const getRelatedCodes = (projectType) => {
    const codesByProject = {
      deck: [
        {
          title: 'Deck Construction Standards',
          code: 'IBC Section R507',
          description: 'Covers structural requirements for exterior decks including joist spacing, beam sizing, and connection methods.'
        },
        {
          title: 'Guardrail and Handrail Requirements',
          code: 'IBC Section R312',
          description: 'Specifies minimum guardrail heights (36") and maximum opening sizes (4") for elevated decks.'
        },
        {
          title: 'Footing and Foundation Requirements',
          code: 'IBC Section R403',
          description: 'Details frost depth requirements and footing specifications for deck support posts.'
        },
        {
          title: 'Ledger Board Attachment',
          code: 'IBC Section R507.2.3',
          description: 'Specifies proper methods for attaching deck ledgers to house structures including fastener spacing.'
        }
      ],
      bathroom: [
        {
          title: 'Plumbing Fixture Clearances',
          code: 'IPC Section 405',
          description: 'Minimum clearances required around toilets, sinks, and showers for accessibility and functionality.'
        },
        {
          title: 'Ventilation Requirements',
          code: 'IRC Section M1507',
          description: 'Exhaust fan requirements for bathrooms including minimum CFM ratings and duct specifications.'
        },
        {
          title: 'GFCI Protection',
          code: 'NEC Section 210.8',
          description: 'All bathroom receptacles must be GFCI protected within 6 feet of water sources.'
        },
        {
          title: 'Water-Resistant Materials',
          code: 'IBC Section R702.4',
          description: 'Requirements for water-resistant drywall and backing materials in wet areas.'
        },
        {
          title: 'Drain and Trap Requirements',
          code: 'IPC Section 1002',
          description: 'Proper P-trap installation and drain sizing for bathroom fixtures.'
        }
      ],
      fence: [
        {
          title: 'Fence Height Limitations',
          code: 'Zoning Code 15.24.040',
          description: 'Maximum fence heights: 6 feet for rear/side yards, 4 feet for front yards in residential zones.'
        },
        {
          title: 'Setback Requirements',
          code: 'Zoning Code 15.24.045',
          description: 'Fences must be set back minimum 2 feet from property lines unless on boundary with neighbor agreement.'
        },
        {
          title: 'Corner Lot Visibility',
          code: 'Zoning Code 15.24.050',
          description: 'Height restrictions near intersections to maintain sight distance triangles for traffic safety.'
        },
        {
          title: 'Pool Enclosure Standards',
          code: 'IBC Section AG105',
          description: 'If enclosing a pool, fences must be minimum 4 feet high with self-closing, self-latching gates.'
        }
      ],
      solar: [
        {
          title: 'Roof Load Capacity',
          code: 'IBC Section 1607',
          description: 'Structural analysis required to ensure roof can support additional dead load of solar panel system.'
        },
        {
          title: 'Fire Setback Requirements',
          code: 'IFC Section 605.11',
          description: 'Solar panels must maintain 36" pathways for firefighter access on residential roofs.'
        },
        {
          title: 'Electrical Disconnects',
          code: 'NEC Article 690',
          description: 'Required disconnect switches, grounding, and overcurrent protection for PV systems.'
        },
        {
          title: 'Rapid Shutdown Systems',
          code: 'NEC Section 690.12',
          description: 'Solar systems must have rapid shutdown capability to de-energize conductors during emergencies.'
        },
        {
          title: 'Wind and Seismic Loads',
          code: 'IBC Section 1609',
          description: 'Panel mounting systems must be engineered for local wind speeds and seismic activity.'
        }
      ]
    };

    return codesByProject[projectType] || [];
  };

  const handleProjectSelect = (type) => {
    setProjectType(type);
    setStep('processing');
    
    // Simulate AI processing
    setTimeout(() => {
      setShowResults(true);
      setStep('results');
    }, 2000);
  };

  const handleFormPreview = (formName) => {
    setSelectedForm(formName);
  };

  const results = projectType ? demoResults[projectType] : null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}>
      {/* Dark Mode Toggle Button */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-20 right-6 z-50 p-3 rounded-full shadow-lg transition-all hover:scale-110 ${
          darkMode 
            ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Header with Demo Warning */}
      <div className={`${darkMode ? 'bg-gradient-to-r from-indigo-900 to-purple-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white py-4 px-6 shadow-lg`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">PermitPro</h1>
              <p className="text-sm text-indigo-100">AI-Powered Permit Discovery</p>
            </div>
          </div>
          <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            DEMO MODE
          </div>
        </div>
      </div>

      {/* Demo Notice Banner */}
      <div className={`${darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border-y py-3 px-6`}>
        <div className="max-w-6xl mx-auto flex items-start gap-3">
          <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mt-0.5 flex-shrink-0`} />
          <div className={`text-sm ${darkMode ? 'text-yellow-100' : 'text-yellow-800'}`}>
            <strong>Demo Version:</strong> This is a demonstration using fictional data from "Demo City, ST". 
            Results are for illustrative purposes only and cannot be used for actual permit applications. 
            <span className="font-semibold"> Upgrade to access real permit data for your jurisdiction.</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-12 px-6">
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <h2 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Get Your Permits in Minutes, Not Days
              </h2>
              <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                Our AI analyzes your project and automatically discovers required permits, 
                fills out forms, and guides you through the approval process.
              </p>
            </div>

            {/* Demo Location */}
            <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-lg p-6 max-w-md mx-auto border-2 border-dashed`}>
              <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                <MapPin className="w-5 h-5" />
                <span className="text-sm font-medium">Demo Location</span>
              </div>
              <p className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                123 Demo Street, Demo City, ST 12345
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                (Fictional address for demonstration purposes)
              </p>
            </div>

            {/* Project Selection */}
            <div className="space-y-4">
              <h3 className={`text-2xl font-semibold text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Choose a Demo Project
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {demoProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project.id)}
                    className={`${darkMode ? 'bg-gray-800 border-gray-700 hover:border-indigo-400' : 'bg-white hover:border-indigo-500'} rounded-xl p-6 shadow-md hover:shadow-xl transition-all border-2 border-transparent text-left group`}
                  >
                    <div className="text-4xl mb-3">{project.label.split(' ')[0]}</div>
                    <h4 className={`text-xl font-semibold ${darkMode ? 'text-gray-100 group-hover:text-indigo-400' : 'text-gray-800 group-hover:text-indigo-600'} transition-colors`}>
                      {project.label.substring(2)}
                    </h4>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{project.description}</p>
                    <div className={`mt-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'} font-medium flex items-center gap-2`}>
                      Try Demo →
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Features Preview */}
            <div className={`mt-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-8`}>
              <h3 className={`text-2xl font-bold text-center mb-8 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                What You'll See in Full Version
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Smart Discovery</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>AI identifies all required permits for your exact location</p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Auto-Fill Forms</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Automatically populate permit applications with your project details</p>
                </div>
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Track Status</h4>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Real-time updates on your permit application progress</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
            <div className="relative">
              <div className={`w-24 h-24 border-8 ${darkMode ? 'border-indigo-800 border-t-indigo-400' : 'border-indigo-200 border-t-indigo-600'} rounded-full animate-spin`}></div>
              <Sparkles className={`w-12 h-12 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
            </div>
            <h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Analyzing Your Project...</h3>
            <div className={`text-center space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <p className="animate-pulse">🔍 Determining jurisdiction requirements</p>
              <p className="animate-pulse delay-100">📋 Identifying required permits</p>
              <p className="animate-pulse delay-200">📄 Fetching current forms</p>
            </div>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && results && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-600">Required Permits</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{results.permits.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Total Fees</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{results.totalCost}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Est. Timeline</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{results.totalTime}</p>
              </div>
            </div>

            {/* Permits List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Required Permits</h3>
              <div className="space-y-4">
                {results.permits.map((permit, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-800">{permit.name}</h4>
                        <div className="flex gap-6 mt-2 text-sm text-gray-600">
                          <span>💰 Fee: {permit.fee}</span>
                          <span>⏱️ Processing: {permit.time}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {permit.forms.map((form, formIdx) => (
                            <button
                              key={formIdx}
                              onClick={() => handleFormPreview(form)}
                              className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                            >
                              📄 {form}
                            </button>
                          ))}
                        </div>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspection Schedule */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Inspection Schedule</h3>
              <div className="flex flex-wrap gap-3">
                {results.inspections.map((inspection, idx) => (
                  <div key={idx} className={`${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900 border-indigo-700' : 'bg-gradient-to-r from-purple-50 to-indigo-50 border-indigo-200'} px-4 py-2 rounded-lg border`}>
                    <span className={`text-sm font-medium ${darkMode ? 'text-indigo-200' : 'text-indigo-900'}`}>
                      {idx + 1}. {inspection}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Building Codes */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Related Building Codes to Review</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                We've identified relevant building codes for your project. Review these before starting construction.
              </p>
              <div className="space-y-3">
                {getRelatedCodes(projectType).map((code, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-4 ${darkMode ? 'bg-gray-700 hover:bg-gray-650 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} rounded-lg transition-colors border`}>
                    <div className={`w-8 h-8 ${darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <FileText className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-1`}>{code.title}</h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>{code.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${darkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'} px-2 py-1 rounded`}>
                          {code.code}
                        </span>
                        <button className={`text-xs ${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'} font-medium flex items-center gap-1`}>
                          View Code Details →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-4 p-4 ${darkMode ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded-lg flex items-start gap-3`}>
                <AlertCircle className={`w-5 h-5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} flex-shrink-0 mt-0.5`} />
                <div className={`text-sm ${darkMode ? 'text-yellow-100' : 'text-yellow-800'}`}>
                  <strong>Demo Note:</strong> Code references are simplified for demonstration. 
                  The full version provides complete code sections, interpretations, and jurisdiction-specific requirements.
                </div>
              </div>
            </div>

            {/* Locked Form Preview */}
            {selectedForm && (
              <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-lg p-6 border-2 border-dashed`}>
                <div className="flex items-start gap-4">
                  <Lock className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0`} />
                  <div className="flex-1">
                    <h4 className={`text-xl font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'} mb-2`}>{selectedForm}</h4>
                    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg p-6 space-y-3`}>
                      <div className="space-y-2">
                        <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/4`}></div>
                        <div className={`h-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded blur-sm`}></div>
                      </div>
                      <div className="space-y-2">
                        <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/3`}></div>
                        <div className={`h-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded blur-sm`}></div>
                      </div>
                      <div className="space-y-2">
                        <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/2`}></div>
                        <div className={`h-8 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded blur-sm`}></div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                        <strong>Form preview locked in demo mode.</strong><br/>
                        Upgrade to access real forms with AI auto-fill capabilities.
                      </p>
                      <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                        Unlock Full Access →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-xl p-8 text-white text-center">
              <h3 className="text-3xl font-bold mb-4">Ready for Real Permits?</h3>
              <p className="text-lg text-indigo-100 mb-6 max-w-2xl mx-auto">
                This demo shows just a glimpse. Get access to real permit data for your jurisdiction, 
                AI-powered form filling, and automatic submission capabilities.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
                  Start Free Trial
                </button>
                <button className="bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-800 transition-all">
                  View Pricing
                </button>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-indigo-100">
                <span>✓ Real jurisdiction data</span>
                <span>✓ Auto-fill forms</span>
                <span>✓ Direct submission</span>
                <span>✓ Status tracking</span>
              </div>
            </div>

            {/* Try Another */}
            <div className="text-center">
              <button
                onClick={() => {
                  setStep('intro');
                  setProjectType('');
                  setShowResults(false);
                  setSelectedForm(null);
                }}
                className={`${darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'} font-medium`}
              >
                ← Try Another Demo Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermitProDemo;