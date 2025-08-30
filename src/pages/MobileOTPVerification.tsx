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
import { ArrowLeft, MessageSquare, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

const MobileOTPVerification = () => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Get data from previous screen
  const { aadharNumber, mobileNumber, txnId, xToken } = location.state || {};

  // Validate required state
  useEffect(() => {
    if (!aadharNumber || !mobileNumber || !txnId || !xToken) {
      toast({
        title: "Missing Data",
        description: "Required information missing. Please restart.",
        variant: "destructive",
      });
      navigate("/create-abha");
      return;
    }
  }, [aadharNumber, mobileNumber, txnId, xToken, navigate, toast]);

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

  // Resend OTP
  const handleResendOtp = async () => {
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
          title: "OTP Resent",
          description: `A new OTP has been sent to ${mobileNumber}`,
        });
        setResendCooldown(30);
      } else {
        throw new Error(data.message || "Failed to resend OTP");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resend OTP";

      toast({
        title: "Resend Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle OTP Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
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
        `${API_BASE}/curiomed/v1/abdm/enrollment/verify-otp/mobile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            txnId,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Mobile Verified",
          description: "Your mobile number has been successfully verified.",
        });

        // ✅ Navigate to Address Selection
        navigate("/create-abha/address-selection", {
          state: {
            aadharNumber,
            mobileNumber,
            txnId,
            xToken,
          },
        });
      } else {
        throw new Error(data.message || `Verification failed (${response.status})`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to verify OTP";

      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Format OTP input
  const formatOtp = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.substring(0, 6);
  };

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
            <h1 className="text-2xl font-bold">Verify Mobile OTP</h1>
            <p className="text-muted-foreground">
              Enter the OTP sent to {mobileNumber}
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
                <div className="bg-success text-success-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium">Mobile</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <span className="ml-2 text-sm font-medium">OTP</span>
              </div>
            </div>
          </div>

          {/* OTP Verification Card */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 rounded-full p-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle>Enter OTP</CardTitle>
              <CardDescription>
                We've sent a 6-digit OTP to <strong>{mobileNumber}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(formatOtp(e.target.value))}
                    className="text-center text-lg tracking-wider font-mono"
                    required
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Enter the 6-digit code</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="p-0 h-auto"
                    >
                      {resendCooldown > 0 ? (
                        <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <RefreshCw className="h-3 w-3" />
                          <span>Resend OTP</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify & Continue"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Aadhar: {aadharNumber?.replace(/(\d{4})(\d{4})(\d{4})/, "****-****-$3")}</p>
            <p className="mt-1">Mobile: {mobileNumber.replace(/(\d{5})(\d{5})/, "$1-$2")}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MobileOTPVerification;