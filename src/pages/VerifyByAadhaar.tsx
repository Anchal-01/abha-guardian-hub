import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

// UUID Generator
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ISO Timestamp
const generateTimestamp = () => new Date().toISOString();

const VerifyByAadhaar = () => {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"aadhaar" | "abha" | null>(null);
  const [txnId, setTxnId] = useState("");
  const [requestId, setRequestId] = useState("");
  // const [timestamp, setTimestamp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  // const location = useLocation();
  const { toast } = useToast();

  // Retrieve session token from login
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

  // Format Aadhaar input: 1234-5678-9012
  const formatAadhaar = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 12);
    let formatted = cleaned;

    if (cleaned.length > 4) {
      formatted = cleaned.substring(0, 4) + "-" + cleaned.substring(4);
    }
    if (cleaned.length > 8) {
      formatted = formatted.substring(0, 9) + "-" + cleaned.substring(8);
    }

    return formatted;
  };

  // Validate 12-digit Aadhaar
  const isValidAadhaar = (value: string) => {
    return /^\d{12}$/.test(value.replace(/-/g, ""));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^0-9]/g, "");
    const formatted = formatAadhaar(cleaned);
    setAadhaarNumber(formatted);
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (!isValidAadhaar(aadhaarNumber)) {
      toast({
        title: "Invalid Aadhaar",
        description: "Please enter a valid 12-digit Aadhaar number",
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

    const newRequestId = generateUUID();
    const newTimestamp = generateTimestamp();

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/verify/abha/aadhaarNo/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": newRequestId,
            "TIMESTAMP": newTimestamp,
          },
          body: JSON.stringify({
            aadhaar: aadhaarNumber.replace(/-/g, ""),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTxnId(data.txnId);
        setRequestId(newRequestId);
        // setTimestamp(newTimestamp);
        setOtp("");
        setIsModalOpen(true);
        toast({
          title: "OTP Sent",
          description: "OTP has been sent to your Aadhaar-linked mobile",
        });
      } else {
        throw new Error(data.message || "Failed to send OTP");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      toast({
        title: "Send Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
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
        `${API_BASE}/curiomed/v1/abdm/verify/abha/aadhaarNo/verify-otp`,
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

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      const xToken = data.token;
      if (!xToken) {
        throw new Error("No token received after verification");
      }

      // ✅ Navigate to GetProfile (use correct route)
      navigate("/verify-abha/get-profile", {
        state: {
          xToken,
          txnId,
          requestId,
          // timestamp,
          aadhaarNumber: aadhaarNumber.replace(/-/g, ""),
          verificationMethod: "aadhaar",
        },
      });

      // ✅ Close modal after success
      setIsModalOpen(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Verification failed";
      console.error("OTP Verification Error:", err);
      toast({
        title: "Verification Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setOtp("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Verify via Aadhaar Number</h1>
            <p className="text-muted-foreground">Enter your 12-digit Aadhaar number to verify ABHA</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="bg-success text-success-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="ml-2 text-sm font-medium">Method</span>
              </div>
              <div className="w-16 h-px bg-border"></div>
              <div className="flex items-center">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Verify</span>
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

          {/* Aadhaar Input */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter Aadhaar Number</CardTitle>
              <CardDescription>Your 12-digit Aadhaar number linked to your ABHA account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhaar">Aadhaar Number</Label>
                  <Input
                    id="aadhaar"
                    type="text"
                    inputMode="numeric"
                    placeholder="1234-5678-9012"
                    value={aadhaarNumber}
                    onChange={handleInputChange}
                    maxLength={14}
                    className="text-center text-lg tracking-wider font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">Format: 1234-5678-9012</p>
                </div>

                {aadhaarNumber && !isValidAadhaar(aadhaarNumber) && (
                  <p className="text-sm text-destructive">Please enter a valid 12-digit Aadhaar number</p>
                )}

                <Button className="w-full" onClick={handleSendOtp}>
                  Send OTP
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border text-sm text-muted-foreground">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p>• OTP will be sent to the mobile number linked to your Aadhaar</p>
            <p className="mt-1">• Ensure your mobile number is active and registered with UIDAI</p>
          </div>
        </div>
      </main>

      {/* OTP Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal}></div>
          <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-card/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Enter OTP</CardTitle>
              <CardDescription>We've sent a 6-digit OTP to your Aadhaar-linked mobile number</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    className="text-center text-lg font-mono tracking-wider"
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify OTP"
                  )}
                </Button>
                <Button variant="link" className="w-full" onClick={handleSendOtp}>
                  Resend OTP
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerifyByAadhaar;