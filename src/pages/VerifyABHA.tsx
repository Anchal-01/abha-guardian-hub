import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, CreditCard, Phone, IdCard, AtSign } from "lucide-react";

const VerifyABHA = () => {
  const navigate = useNavigate();

  const verificationOptions = [
    {
      id: "abha-number",
      title: "Via ABHA Number",
      description: "Enter your 14-digit ABHA number for verification",
      icon: CreditCard,
      route: "/verify-abha/abha-number",
      color: "primary",
    },
    {
      id: "mobile",
      title: "Via Mobile Number",
      description: "Use your registered mobile number to verify ABHA",
      icon: Phone,
      route: "/verify-abha/mobile",
      color: "success",
    },
    {
      id: "aadhaar",
      title: "Via Aadhaar Number",
      description: "Verify using your 12-digit Aadhaar number",
      icon: IdCard,
      route: "/verify-abha/aadhaar",
      color: "warning",
    },
    {
      id: "abha-address",
      title: "Via ABHA Address",
      description: "Use your ABHA address (e.g. abc@abha) to verify",
      icon: AtSign,
      route: "/verify-abha/address",
      color: "secondary",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Verify ABHA Account</h1>
            <p className="text-muted-foreground">Choose your preferred verification method</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium">choose Method</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-muted text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  2
                </div>
                <span className="ml-2 text-sm text-muted-foreground">Verify</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-muted text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  3
                </div>
                <span className="ml-2 text-sm text-muted-foreground">Complete</span>
              </div>
            </div>
          </div>

          {/* Verification Options */}
          <div className="grid md:grid-cols-2 gap-6">
            {verificationOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card
                  key={option.id}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
                  onClick={() => navigate(option.route)}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <div
                        className={`bg-${option.color}/10 rounded-full p-4 group-hover:bg-${option.color}/20 transition-colors`}
                      >
                        <IconComponent className={`h-8 w-8 text-${option.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription className="text-center">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button className="w-full" variant="outline">
                      Select Method
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Information Section */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-3">Important Information</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• You must have access to the registered mobile number</p>
              <p>• For Aadhaar verification, ensure KYC is completed</p>
              <p>• ABHA Address is case-sensitive (e.g. user123@abha)</p>
              <p>• OTP will be sent to your registered mobile for confirmation</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyABHA;