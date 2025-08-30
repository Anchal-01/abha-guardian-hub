import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Copy } from "lucide-react";
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

// UUID Validator
const isValidUUID = (uuid: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

// Get session token
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

const GetProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const { abhaNumber, xToken: xTokenFromState } = location.state || {};

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied` });
  };

  useEffect(() => {
    // ✅ All logic inside useEffect
    if (!xTokenFromState) {
      toast({
        title: "Missing Token",
        description: "Authentication failed. Please retry.",
        variant: "destructive",
      });
      navigate("/verify-abha");
      return;
    }

    const fetchProfile = async () => {
       const { xToken, requestId } = location.state;
      setIsLoading(true);
      try {
        const requestId = generateUUID();

        if (!isValidUUID(requestId)) {
          toast({
            title: "Invalid Request ID",
            description: "Failed to generate valid request ID.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const url = new URL(`${API_BASE}/curiomed/v1/abdm/profile`);
        url.searchParams.append("xToken", `Bearer${xTokenFromState}`);
        url.searchParams.append("requestId", requestId);

        // const url = `${API_BASE}/curiomed/v1/abdm/profile?xToken=Bearer${encodeURIComponent(xToken)}&requestId=${encodeURIComponent(requestId)}`;

        const token = getSessionToken();
        if (!token) {
          throw new Error("Session expired");
        }

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setProfile(data);
          toast({
            title: "Profile Loaded",
            description: `Welcome, ${data.name || "User"}`,
          });
        } else {
          setProfile({});
          toast({
            title: "Profile Unavailable",
            description: data.message || "Could not fetch full profile.",
            variant: "default",
          });
        }
      } catch (err) {
        console.error("Profile fetch failed:", err);
        setProfile({});
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load profile",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [xTokenFromState, abhaNumber, toast, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">ABHA Verified</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <div className="bg-success rounded-full p-3 w-16 h-16 mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-success">Verified!</h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ABHA Number</label>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>
                    {abhaNumber?.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, "$1-$2-$3-$4") || "Not Available"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopy(abhaNumber, "ABHA Number")}
                    disabled={!abhaNumber}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {profile && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <div className="p-3 bg-muted/50 rounded-lg">{profile.name || "Not Available"}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">preferredAbhaAddress</label>
                    <div className="p-3 bg-muted/50 rounded-lg">{profile.preferredAbhaAddress || "Not Available"}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">status</label>
                    <div className="p-3 bg-muted/50 rounded-lg">{profile.status || "Not Available"}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">mobile</label>
                    <div className="p-3 bg-muted/50 rounded-lg">{profile.mobile || "Not Available"}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <div className="p-3 bg-muted/50 rounded-lg">{profile.gender || "Not Available"}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">DOB</label>
                    <div className="p-3 bg-muted/50 rounded-lg">{profile.dob || "Not Available"}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default GetProfile;