export function OnboardingProgress({ 
  currentStep, 
  totalSteps = 7 
}: {
  currentStep: number
  totalSteps?: number
}) {
  const steps = [
    'Welcome',
    'Team',
    'Packages',
    'Commissions',
    'Billing',
    'Demo',
    'Complete'
  ]

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <div className="flex items-center justify-center">
        {[...Array(totalSteps)].map((_, i) => (
          <div key={i} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
              transition-all duration-300
              ${i < currentStep - 1 ? 'bg-success text-white' : 
                i === currentStep - 1 ? 'bg-primary text-white ring-4 ring-primary-100' : 
                'bg-gray-200 text-gray-500'}
            `}>
              {i < currentStep - 1 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-12 md:w-20 h-1 transition-all duration-300 ${
                i < currentStep - 1 ? 'bg-success' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
      
      {/* Step Labels - Hidden on mobile */}
      <div className="hidden md:flex items-center justify-between mt-3 px-5">
        {steps.map((step, i) => (
          <span 
            key={step}
            className={`text-xs ${
              i === currentStep - 1 ? 'text-primary font-medium' : 
              i < currentStep - 1 ? 'text-success' : 'text-gray-400'
            }`}
          >
            {step}
          </span>
        ))}
      </div>
    </div>
  )
}