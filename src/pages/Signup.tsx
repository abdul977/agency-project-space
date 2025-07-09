import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Phone, Lock, User, Building2, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signUp, validatePhoneNumber, validatePassword } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [step, setStep] = useState(1); // 1: Basic info, 2: Profile completion
  const [formData, setFormData] = useState({
    phone_number: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    company_name: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (error) setError("");
    if (passwordErrors.length > 0) setPasswordErrors([]);
  };

  const validateStep1 = (): boolean => {
    // Validate phone number
    if (!formData.phone_number.trim()) {
      setError("Phone number is required");
      return false;
    }
    
    if (!validatePhoneNumber(formData.phone_number)) {
      setError("Please enter a valid Nigerian phone number");
      return false;
    }

    // Validate password
    if (!formData.password.trim()) {
      setError("Password is required");
      return false;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setPasswordErrors(passwordValidation.errors);
      return false;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validate profile information
      if (!formData.full_name.trim()) {
        setError("Full name is required");
        return;
      }

      if (!formData.company_name.trim()) {
        setError("Company name is required");
        return;
      }

      // Attempt signup
      const response = await signUp({
        phone_number: formData.phone_number,
        password: formData.password,
        full_name: formData.full_name,
        company_name: formData.company_name,
      });

      if (response.success && response.user) {
        // Login to context
        await login(response.user);
        
        toast({
          title: "Account created successfully!",
          description: "Welcome to Muahib Solution. Your account is ready.",
        });

        // Redirect to client dashboard
        navigate("/dashboard");
      } else {
        setError(response.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back to Home */}
        <div className="flex items-center justify-center">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              {step > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm font-medium">Account</span>
          </div>
          <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-muted-foreground'}`}></div>
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
              2
            </div>
            <span className="text-sm font-medium">Profile</span>
          </div>
        </div>

        {/* Signup Card */}
        <Card className="border-border-light shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              {step === 1 ? "Create Account" : "Complete Profile"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1 
                ? "Join Muahib Solution client management system" 
                : "Tell us more about yourself and your company"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Password Errors */}
                {passwordErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {passwordErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Phone Number Field */}
                <div className="space-y-2">
                  <Label htmlFor="phone_number" className="text-sm font-medium text-foreground">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      placeholder="+234 801 234 5678"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will be your username for login
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      required
                    />
                  </div>
                </div>

                {/* Continue Button */}
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  Continue
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Full Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-medium text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      name="full_name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Company Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-sm font-medium text-foreground">
                    Company Name
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company_name"
                      name="company_name"
                      type="text"
                      placeholder="Enter your company name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className="pl-10 border-input-border focus:border-ring"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="font-medium text-primary hover:text-primary-hover transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            © 2024 Muahib Solution. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
