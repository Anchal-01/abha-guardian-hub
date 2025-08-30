import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Phone, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

const MobileVerification = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get data from previous step
  const { aadharNumber, txnId, xToken } = location.state || {};

  // Validate required data
  useEffect(() => {
    if (!aadharNumber || !txnId || !xToken) {
      toast({
        title: "Missing Data",
        description: "Aadhaar or transaction ID missing. Please restart.",
        variant: "destructive",
      });
      navigate("/create-abha");
    }
  }, [aadharNumber, txnId, xToken, navigate, toast]);

  // Retrieve session token
  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const data = JSON.parse(session);
        return data.token || null;
      } catch (e) {
        console.error("Failed to parse session", e);
        return null;
      }
    }
    return null;
  };

  // Format mobile input
  const formatMobileNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.substring(0, 10);
  };

  // Handle Send OTP
  const handleSendOtp = async () => {
    if (mobileNumber.length !== 10) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    const token = getSessionToken();
    if (!token) {
      toast({
        title: "Session Expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/enrollment/request-otp/mobile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txnId,
            mobile: mobileNumber,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "OTP Sent",
          description: `OTP has been sent to ${mobileNumber}`,
        });

        // Navigate to address selection
        navigate("/create-abha/mobile/otp", {
          state: {
            aadharNumber,
            mobileNumber,
            txnId,
            xToken,
          },
        });
      } else {
        throw new Error(data.message || `Failed to send OTP (${response.status})`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send OTP";

      toast({
        title: "Request Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setResendCooldown(30);
    }
  };

  // Resend cooldown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Mobile Verification</h1>
            <p className="text-muted-foreground">
              Enter mobile number for ABHA communication
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-success text-success-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium">Verified</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="ml-2 text-sm font-medium">Mobile</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-muted text-muted-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">
                  5
                </div>
                <span className="ml-2 text-sm text-muted-foreground">Address</span>
              </div>
            </div>
          </div>

          {/* Mobile Input Card */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 rounded-full p-4">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Link Mobile Number</CardTitle>
              <CardDescription>
                This number will be used for ABHA-related communications and login
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(formatMobileNumber(e.target.value))
                    }
                    className="text-center text-lg"
                    required
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Can be same as Aadhaar-linked number
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={
                    isLoading ||
                    mobileNumber.length !== 10 ||
                    resendCooldown > 0
                  }
                >
                  {resendCooldown > 0 ? (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Resend in {resendCooldown}s</span>
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending OTP...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Send OTP</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border">
            <div className="text-sm space-y-2">
              <p><span className="font-medium">Aadhar:</span> {aadharNumber?.replace(/(\d{4})(\d{4})(\d{4})/, "****-****-$3")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MobileVerification;