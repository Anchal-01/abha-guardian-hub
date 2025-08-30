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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Download,
  Share2,
  Heart,
  CheckCircle,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

// 🔧 Helper: Generate UUID v4
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// UUID Validator
const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

const ABHADetails = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // 📦 Get all data from previous flow
  const {
    aadharNumber,
    mobileNumber: mobileFromState,
    abhaAddress: abhaAddressFromState,
    abhaNumber: abhaNumberFromState,
    xToken: xTokenFromState,
  } = location.state || {};

  // Retrieve session token
  const getSessionToken = () => {
    const session = localStorage.getItem("session");
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        return sessionData.token || null;
      } catch (e) {
        console.error("Failed to parse session", e);
        return null;
      }
    }
    return null;
  };

  // 🔐 Validate xToken early
  useEffect(() => {
    if (!xTokenFromState) {
      toast({
        title: "Session Expired",
        description: "Authentication token missing. Please restart.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      const token = getSessionToken(); // ← This is your login token (from localStorage)

      if (!token) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (!xTokenFromState || typeof xTokenFromState !== 'string' || !xTokenFromState.trim()) {
        toast({
          title: "Invalid xToken",
          description: "Authentication token missing.",
          variant: "destructive",
        });
        navigate("/create-abha");
        return;
      }

      const requestId = generateUUID();
      if (!isValidUUID(requestId)) {
        toast({
          title: "Invalid Request ID",
          description: "Failed to generate valid request ID.",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      try {
        // ✅ Build URL with query params
        const url = new URL(`${API_BASE}/curiomed/v1/abdm/profile`);
        url.searchParams.append("xToken", `Bearer ${xTokenFromState.trim()}`);   // ✅ Query param
        url.searchParams.append("requestId", requestId);              // ✅ Query param

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, 
          },
        });

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error("JSON Parse Error:", jsonError);
          throw new Error("Invalid JSON response");
        }

        if (response.ok) {
          setProfile({
            name: data.name || "User",
            gender: data.gender || "Not Specified",
            dob: data.dob || "Not Available",
            abha: data.abha || abhaNumberFromState || "12-3456-7890-1234",
            abhaAddress: data.abhaAddress || abhaAddressFromState,
            mobile: data.mobile || mobileFromState,
          });

          toast({
            title: "Profile Loaded",
            description: `Welcome, ${data.name || "User"}`,
          });
        } else {
          throw new Error(data.message || `Failed: ${response.status}`);
        }
      } catch (err) {
        console.error("Profile fetch failed:", err);
        toast({
          title: "Using Saved Info",
          description: "Could not fetch latest profile. Showing saved data.",
          variant: "default",
        });

        setProfile({
          name: "User",
          gender: "Not Specified",
          dob: "Not Available",
          abha: abhaNumberFromState || "12-3456-7890-1234",
          abhaAddress: abhaAddressFromState || "user123@abha",
          mobile: mobileFromState,
        });
      } finally {
        setIsLoading(false);
      }
    };



    fetchProfile();
  }, [
    xTokenFromState,
    abhaNumberFromState,
    abhaAddressFromState,
    mobileFromState,
    toast,
    navigate,
  ]);

  // 🔧 Copy to clipboard
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const [isDownloading, setIsDownloading] = useState(false);

  // 📥 Simulate download
  const handleDownload = async () => {
    const token = getSessionToken(); // Login token
    if (!token) {
      toast({
        title: "Session Expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!xTokenFromState) {
      toast({
        title: "Missing Token",
        description: "Authentication failed. Cannot download card.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    try {
      const requestId = generateUUID();
      const timestamp = new Date().toISOString();

      // ✅ Build URL with query params
      const url = new URL(`${API_BASE}/curiomed/v1/abdm/profile/abha-card`);
      url.searchParams.append("xToken", `Bearer ${xTokenFromState}`); 
      url.searchParams.append("requestId", requestId);
      // url.searchParams.append("timestamp", timestamp);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "REQUEST-ID": requestId,     // ✅ Add to headers
          // "TIMESTAMP": timestamp,      // ✅ Add to headers
        },
      });

      // ✅ Check content type
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        let errorMsg = `Failed to download: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          const text = await response.text();
          errorMsg = text.slice(0, 100); // Show raw error
        }
        throw new Error(errorMsg);
      }

      // ✅ Handle PDF vs JSON
      if (contentType && contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const pdfUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `ABHA-Card-${profile.abha.replace(/-/g, "")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);

        toast({
          title: "Downloaded",
          description: "Your ABHA card has been downloaded successfully.",
        });
      } else {
        // Likely JSON error returned as PDF
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Unknown error from server");
        } catch (e) {
          throw new Error("Invalid response from server: Not a PDF");
        }
      }
    } catch (err) {
      console.error("Download failed:", err);
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Could not download ABHA card",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false); // ✅ Reset button
    }
  };

  // 📤 Simulate share
  const handleShare = () => {
    toast({
      title: "Share Options",
      description: "You can share your ABHA via SMS, email, or WhatsApp",
    });
  };

  // 🕐 Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-lg text-muted-foreground">Fetching your health profile...</p>
        </div>
      </div>
    );
  }

  // 🛑 No Profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load ABHA details. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center space-x-3">
            <div className="bg-success rounded-full p-2">
              <CheckCircle className="h-6 w-6 text-success-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ABHA Created Successfully</h1>
              <p className="text-muted-foreground">Your health account is now active</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Message */}
          <div className="text-center space-y-4">
            <div className="bg-success/10 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center">
              <Heart className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-success">Congratulations!</h2>
            <p className="text-muted-foreground">
              Your ABHA account has been created successfully
            </p>
          </div>

          {/* ABHA Details Card */}
          <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>ABHA Account Details</span>
                <Badge
                  variant="outline"
                  className="bg-success/10 text-success border-success/20"
                >
                  Active
                </Badge>
              </CardTitle>
              <CardDescription>
                Your unique health identity details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ABHA Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ABHA Number</label>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-mono text-lg font-semibold">
                    {profile.abha}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(profile.abha, "ABHA Number")}
                    disabled={!profile.abha}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ABHA Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ABHA Address</label>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="font-mono">{profile.abhaAddress}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleCopy(profile.abhaAddress, "ABHA Address")
                    }
                    disabled={!profile.abhaAddress}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  {profile.name}
                </div>
              </div>

              {/* Gender & DOB */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gender</label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    {profile.gender}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    {profile.dob}
                  </div>
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mobile Number</label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  +91 {profile.mobile}
                </div>
              </div>

              {/* Aadhar Number */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Linked Aadhar</label>
                <div className="p-3 bg-muted/50 rounded-lg">
                  {aadharNumber?.replace(/(\d{4})(\d{4})(\d{4})/, "****-****-$3")}
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Status</label>
                <div className="flex items-center space-x-2 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-success font-medium">
                    Verified & Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center space-x-2"
            >
              {isDownloading ? (
                <>
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download ABHA Card</span>
                </>
              )}
            </Button>
          </div>

          {/* Important Info */}
          <div className="bg-card/30 backdrop-blur-sm rounded-lg p-6 border">
            <h3 className="text-lg font-semibold mb-3">Important Information</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Your ABHA number is your unique 14-digit health ID</p>
              <p>• Use your ABHA address to access health services digitally</p>
              <p>• Keep your ABHA details secure and do not share with unauthorized persons</p>
              <p>• You can link multiple healthcare providers using this ABHA account</p>
              <p>• Your health records will be accessible across all linked providers</p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
            <h3 className="text-lg font-semibold mb-3 text-primary">Next Steps</h3>
            <div className="space-y-2 text-sm">
              <p>1. Download and save your ABHA card for future reference</p>
              <p>2. Link your existing health records with healthcare providers</p>
              <p>3. Use your ABHA for seamless healthcare services across India</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// 🔧 Reusable Label (in case not globally available)
const Label = ({ children, className = "", ...props }) => (
  <label
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  >
    {children}
  </label>
);

export default ABHADetails;