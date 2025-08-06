import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  FolderOpen,
  MessageSquare,
  Shield,
  Smartphone,
  Monitor,
  ArrowRight,
  CheckCircle,
  Star,
  Building2,
  Settings,
  Bell,
  BarChart3,
  Zap,
  Globe,
  Clock,
  Phone,
  Mail
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features = [
    {
      icon: Users,
      title: "Client Management",
      description: "Comprehensive client registration, authentication, and profile management system"
    },
    {
      icon: FolderOpen,
      title: "Project Organization",
      description: "Dynamic project folders with customizable input fields for all client requirements"
    },
    {
      icon: MessageSquare,
      title: "Real-time Communication",
      description: "Dedicated messaging interface between admin and clients with instant notifications"
    },
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "Phone-based authentication system with secure password management"
    },
    {
      icon: BarChart3,
      title: "Project Tracking",
      description: "Complete project lifecycle management from start to completion"
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Real-time alerts when clients update information or add new content"
    }
  ];

  const services = [
    { icon: Globe, title: "Websites", description: "Custom web development solutions" },
    { icon: Smartphone, title: "Mobile Apps", description: "iOS and Android applications" },
    { icon: Monitor, title: "Web Applications", description: "Complex web-based systems" },
    { icon: Zap, title: "AI Automation", description: "Intelligent business automation" }
  ];

  const benefits = [
    "Streamlined client onboarding process",
    "Real-time project collaboration",
    "Secure data management",
    "Mobile-responsive design",
    "Professional client portal",
    "Automated workflow management"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border-light bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">Muahib Solution</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Services</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className={`h-0.5 bg-foreground transition-all ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`h-0.5 bg-foreground transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`h-0.5 bg-foreground transition-all ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 py-4 border-t border-border-light">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Services</a>
                <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
                <div className="flex flex-col space-y-2 pt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button variant="hero" size="sm" asChild>
                    <Link to="/signup">Get Started</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                  Professional
                  <span className="block text-primary">Client Management</span>
                  <span className="block">Made Simple</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl">
                  Streamline your client relationships with our comprehensive management system. 
                  From registration to project delivery, manage everything in one beautiful, intuitive platform.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="hero" size="xl" className="group" asChild>
                  <Link to="/signup">
                    Get Started Today
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button variant="outline" size="xl" asChild>
                  <Link to="/login">
                    Client Login
                  </Link>
                </Button>
              </div>

              <div className="flex items-center space-x-8 pt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-muted-foreground">Happy Clients</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">24/7</div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in">
              <div className="absolute inset-0 bg-gradient-subtle rounded-2xl blur-3xl opacity-30 animate-float"></div>
              <img 
                src={heroImage} 
                alt="Muahib Solution Dashboard" 
                className="relative w-full rounded-2xl shadow-xl border border-border-light"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-surface">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
              Everything You Need to Manage Clients
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our comprehensive platform provides all the tools necessary for seamless client management, 
              from initial contact to project completion.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border-light hover:shadow-md transition-all duration-base group">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-primary/5 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
              Our Development Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We specialize in creating cutting-edge digital solutions for businesses of all sizes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="border-border-light hover:shadow-lg transition-all duration-base group hover:scale-105">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/5 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
                  Why Choose Muahib Solution?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Experience the difference with our professional client management platform 
                  designed specifically for agencies and service providers.
                </p>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button variant="hero" size="lg" className="group">
                Get Started Today
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="space-y-6">
              <Card className="border-border-light p-6">
                <div className="flex items-start space-x-4">
                  <Star className="h-6 w-6 text-warning flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Outstanding Support</h4>
                    <p className="text-muted-foreground text-sm">
                      "Muahib Solution transformed how we manage our clients. The platform is intuitive 
                      and the support team is incredibly responsive."
                    </p>
                    <div className="mt-3">
                      <div className="font-medium text-foreground">Sarah Johnson</div>
                      <div className="text-sm text-muted-foreground">CEO, TechFlow Agency</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-border-light p-6">
                <div className="flex items-start space-x-4">
                  <Clock className="h-6 w-6 text-info flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Time-Saving Solution</h4>
                    <p className="text-muted-foreground text-sm">
                      "We've reduced client onboarding time by 60% since implementing this system. 
                      It's a game-changer for our workflow."
                    </p>
                    <div className="mt-3">
                      <div className="font-medium text-foreground">Mike Chen</div>
                      <div className="text-sm text-muted-foreground">Operations Director, WebCraft</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground">
              Ready to Transform Your Client Management?
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Join hundreds of agencies and service providers who trust Muahib Solution 
              to manage their client relationships professionally and efficiently.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="floating" size="xl" className="group" asChild>
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border-light">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold text-foreground">Muahib Solution</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Professional client management platform for modern agencies and service providers.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href="tel:09025794407" className="hover:text-foreground transition-colors">
                    09025794407
                  </a>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:abdulmuminibrahim74@gmail.com" className="hover:text-foreground transition-colors">
                    abdulmuminibrahim74@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Product</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Features</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Integrations</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">API</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Company</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">About</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Blog</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Careers</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Support</h4>
              <div className="space-y-2 text-sm">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Help Center</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Community</a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors">Status</a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border-light">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-muted-foreground">
                © 2024 Muahib Solution. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;