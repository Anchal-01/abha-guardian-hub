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
import { ArrowLeft, Fingerprint, MessageSquare, IdCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { timeStamp } from "console";

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

const VerifyByABHANumber = () => {
  const [abhaNumber, setAbhaNumber] = useState("");
  const [showMethods, setShowMethods] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"aadhaar" | "abha" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txnId, setTxnId] = useState(""); // Store txnId from send OTP
  const [requestId, setRequestId] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
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

  // Format ABHA input: 12-3456-7890-1234
  const formatABHANumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 14);
    let formatted = cleaned;

    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + "-" + cleaned.substring(2);
    }
    if (cleaned.length > 6) {
      formatted = formatted.substring(0, 7) + "-" + cleaned.substring(6);
    }
    if (cleaned.length > 10) {
      formatted = formatted.substring(0, 12) + "-" + cleaned.substring(10);
    }

    return formatted;
  };

  const isValidABHA = (value: string) => {
    return /^\d{14}$/.test(value.replace(/-/g, ""));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^0-9]/g, "");
    const formatted = formatABHANumber(cleaned);
    setAbhaNumber(formatted);
  };

  useEffect(() => {
    if (isValidABHA(abhaNumber)) {
      setShowMethods(true);
      toast({
        title: "ABHA Number Valid",
        description: "Choose a verification method to proceed",
      });
    } else {
      setShowMethods(false);
    }
  }, [abhaNumber, toast]);

  // Handle method selection → Send OTP
  const handleMethodSelect = async (method: "aadhaar" | "abha") => {
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

    const requestId = generateUUID();
    const timestamp = generateTimestamp();
    // const abhaWithoutDashes = abhaNumber.replace(/-/g, "");

    try {
      const endpoint =
        method === "aadhaar"
          ? `${API_BASE}/curiomed/v1/abdm/verify/abha/aadhaar/request-otp`
          : `${API_BASE}/curiomed/v1/abdm/verify/abha/abdm/request-otp`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "REQUEST-ID": requestId,
          "TIMESTAMP": timestamp,
        },
        body: JSON.stringify({
          abhaNumber: abhaNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTxnId(data.txnId); // Save txnId for verify step
        setOtpPurpose(method);
        setOtp("");
        setIsModalOpen(true);
        toast({
          title: "OTP Sent",
          description: `OTP sent to ${method === "aadhaar" ? "Aadhaar-linked" : "ABHA-registered"} mobile`,
        });
      } else {
        throw new Error(data.message || `Failed to send OTP via ${method}`);
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

  // Handle OTP Verify
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
      const endpoint =
      otpPurpose === "aadhaar"
      ? `${API_BASE}/curiomed/v1/abdm/verify/abha/aadhaar/verify-otp`
      : `${API_BASE}/curiomed/v1/abdm/verify/abha/abdm/verify-otp`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          txnId,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      const xToken = data.token;
      if (!xToken) {
        throw new Error("No xToken received after verification");
      }

      // ✅ Navigate to GetProfile with xToken and txnId
      navigate("/verify-abha/get-profile", {
        state: {
          abhaNumber: abhaNumber.replace(/-/g, ""),
          xToken,
          txnId,
          requestId,
        //   timeStamp,
          verificationMethod: otpPurpose,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Verification failed";
      toast({
        title: "Verification Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOtp("");
    setOtpPurpose(null);
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
            <h1 className="text-2xl font-bold">Verify via ABHA Number</h1>
            <p className="text-muted-foreground">Enter your 14-digit ABHA number for account verification</p>
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

          {/* ABHA Number Input */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter ABHA Number</CardTitle>
              <CardDescription>Your ABHA number is a 14-digit unique health ID</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="abha-number">ABHA Number</Label>
                  <Input
                    id="abha-number"
                    type="text"
                    placeholder="12-3456-7890-1234"
                    value={abhaNumber}
                    onChange={handleInputChange}
                    maxLength={17}
                    className="text-center text-lg tracking-wider font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Format: 12-3456-7890-1234
                  </p>
                </div>

                {!isValidABHA(abhaNumber) && abhaNumber && (
                  <p className="text-sm text-destructive">
                    Please enter a valid 14-digit ABHA number
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Verification Methods */}
          {showMethods && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-center">Choose Verification Method</h2>

              <div className="grid gap-4">
                {/* Aadhaar OTP */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
                  onClick={() => handleMethodSelect("aadhaar")}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 rounded-full p-3 group-hover:bg-primary/20 transition-colors">
                        <MessageSquare className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Using Aadhaar OTP</CardTitle>
                        <CardDescription>Send OTP to Aadhaar-linked mobile</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" className="w-full">Select Method</Button>
                  </CardContent>
                </Card>

                {/* ABHA OTP */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
                  onClick={() => handleMethodSelect("abha")}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-success/10 rounded-full p-3 group-hover:bg-success/20 transition-colors">
                        <MessageSquare className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Using ABHA OTP</CardTitle>
                        <CardDescription>Send OTP to ABHA-registered mobile</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" className="w-full">Select Method</Button>
                  </CardContent>
                </Card>

                {/* Biometric */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-card/50 backdrop-blur-sm group"
                  onClick={() => {
                    toast({
                      title: "Biometric Not Supported",
                      description: "This method will be available soon.",
                    });
                  }}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-warning/10 rounded-full p-3 group-hover:bg-warning/20 transition-colors">
                        <Fingerprint className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Biometric Verification</CardTitle>
                        <CardDescription>Use fingerprint or iris scan</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button variant="outline" className="w-full">Coming Soon</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border text-sm text-muted-foreground">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p>• Your ABHA number is usually in the format <strong>12-3456-7890-1234</strong></p>
            <p className="mt-1">• It may be linked to your Aadhaar, mobile, or ABHA address</p>
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
              <CardDescription>
                We've sent a 6-digit OTP to your {otpPurpose === "aadhaar" ? "Aadhaar-linked" : "ABHA-registered"} mobile
              </CardDescription>
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
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => {
                    otpPurpose === "aadhaar"
                      ? handleMethodSelect("aadhaar")
                      : handleMethodSelect("abha");
                  }}
                >
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

export default VerifyByABHANumber;