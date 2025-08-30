import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, MessageSquare, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

// UUID & Timestamp Helpers
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const generateTimestamp = () => new Date().toISOString();

const VerifyByMobile = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isAbhaModalOpen, setIsAbhaModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [txnId, setTxnId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [linkedAbhas, setLinkedAbhas] = useState<string[]>([]);
  const [selectedAbha, setSelectedAbha] = useState("");
  const navigate = useNavigate();
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

  // Format mobile: 98765 43210
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  };

  // Validate 10-digit mobile
  const isValidMobile = (value: string) => {
    return /^\d{10}$/.test(value.replace(/\s/g, ""));
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^0-9]/g, "");
    const formatted = formatMobile(cleaned);
    setMobileNumber(formatted);
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (!isValidMobile(mobileNumber)) {
      toast({
        title: "Invalid Mobile",
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

    const newRequestId = generateUUID();
    const newTimestamp = generateTimestamp();

    try {
      const response = await fetch(
        `${API_BASE}/curiomed/v1/abdm/verify/abha/mobile/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "REQUEST-ID": newRequestId,
            "TIMESTAMP": newTimestamp,
          },
          body: JSON.stringify({
            mobile: mobileNumber.replace(/\s/g, ""),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTxnId(data.txnId);
        setRequestId(newRequestId);
        setTimestamp(newTimestamp);
        setOtp("");
        setIsOtpModalOpen(true);
        toast({
          title: "OTP Sent",
          description: "OTP has been sent to your mobile number",
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
        `${API_BASE}/curiomed/v1/abdm/verify/abha/abdm/verify-otp`,
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

      // Extract linked ABHA numbers
      const abhas = data.accounts?.map(acc => acc.ABHANumber) || [];
      if (abhas.length === 0) {
        throw new Error("No ABHA accounts linked to this mobile");
      }

      setLinkedAbhas(abhas);
      setIsOtpModalOpen(false);
      setIsAbhaModalOpen(true);
      setOtp(""); // reset
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

  // Select ABHA Number
  const handleSelectAbha = async () => {
    if (!selectedAbha) {
      toast({
        title: "No Selection",
        description: "Please select an ABHA number",
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
        `${API_BASE}/curiomed/v1/abdm/verify/abha/user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // "T-token": `Bearer ${getSessionToken()}`, // or use xToken if backend expects it
            "REQUEST-ID": requestId,
            "TIMESTAMP": timestamp,
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            abhaNumber: selectedAbha,
            txnId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to verify ABHA user");
      }

      const finalXToken = data.token || data.xToken;
      if (!finalXToken) {
        throw new Error("No xToken received after user verification");
      }

      // Navigate to GetProfile
      navigate("/verify-abha/get-profile", {
        state: {
          xToken: finalXToken,
          txnId,
          requestId,
          timestamp,
          mobileNumber: mobileNumber.replace(/\s/g, ""),
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Selection failed";
      toast({
        title: "Selection Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Close Modals
  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
    setOtp("");
  };

  const closeAbhaModal = () => {
    setIsAbhaModalOpen(false);
    setSelectedAbha("");
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
            <h1 className="text-2xl font-bold">Verify via Mobile Number</h1>
            <p className="text-muted-foreground">Enter your registered mobile number to verify ABHA</p>
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

          {/* Mobile Input */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Enter Mobile Number</CardTitle>
              <CardDescription>Your 10-digit mobile number linked to ABHA accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="text"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={mobileNumber}
                    onChange={handleInputChange}
                    maxLength={12}
                    className="text-center text-lg tracking-wider font-mono"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">Format: 98765 43210</p>
                </div>

                {mobileNumber && !isValidMobile(mobileNumber) && (
                  <p className="text-sm text-destructive">Please enter a valid 10-digit mobile number</p>
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
            <p>• OTP will be sent to your mobile number</p>
            <p className="mt-1">• Multiple ABHA accounts may be linked to one mobile</p>
          </div>
        </div>
      </main>

      {/* OTP Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeOtpModal}></div>
          <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-card/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Enter OTP</CardTitle>
              <CardDescription>We've sent a 6-digit OTP to your mobile number</CardDescription>
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

      {/* ABHA Selection Modal */}
      {isAbhaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeAbhaModal}></div>
          <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-card/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <CardHeader>
              <CardTitle>Select ABHA Account</CardTitle>
              <CardDescription>Choose one of the ABHA numbers linked to this mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {linkedAbhas.map((abha) => (
                  <div
                    key={abha}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer border-2 ${
                      selectedAbha === abha
                        ? "border-primary bg-primary/10"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedAbha(abha)}
                  >
                    <div className="bg-primary/10 rounded-full p-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-mono">{abha}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full mt-6"
                onClick={handleSelectAbha}
                disabled={isLoading || !selectedAbha}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VerifyByMobile;