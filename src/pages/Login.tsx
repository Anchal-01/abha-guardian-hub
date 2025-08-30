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
import { Shield, Heart, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // 🔥 Your backend login endpoint
  const API_BASE_URL = `${API_BASE}/curiomed/v1/auth/login`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError("Please enter both Client ID and Client Secret");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add any other required headers (e.g., auth, origin) if needed
        },
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password.trim(),
        }),
      });

      const data = await response.json();
      console.log("Login API Response:", data); // 🔍 DEBUG: See what you're getting

      if (response.ok) {
        // ✅ Login successful
        const token = data.accessToken;

        if (!token) {
          throw new Error("No access token received");
        }

        // Store token in localStorage (you can expand this to include expiry, etc.)
        localStorage.setItem(
          "session",
          JSON.stringify({ token })
        );

        toast({
          title: "Login Successful",
          description: "You have been successfully logged in.",
        });

        navigate("/dashboard");
      } else {
        // ❌ Login failed
        const errorMessage = data.message || "Authentication failed";
        throw new Error(errorMessage);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Network error or server unreachable";

      setError(errorMessage);

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="min-h-screen items-center justify-center flex">
      <div className="flex items-center justify-center relative">
      <div className="w-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary rounded-full p-3">
              <Heart className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ABHA Portal</h1>
          <p className="text-muted-foreground">
            Ayushman Bharat Health Account Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your ABDM client credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Client ID */}
              <div className="space-y-2">
                <Label htmlFor="username">username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your Username"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                      username: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* Client Secret */}
              <div className="space-y-2">
                <Label htmlFor="password">password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your Password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({
                      ...credentials,
                     password: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Sign In</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <div className="flex items-center justify-center text-muted-foreground text-sm">
            <Shield className="h-4 w-4 mr-2" />
            <span>Secured by Government of India</span>
          </div>
        </div>
      </div>
    </div>
    </section>
    
  );
};

export default Login;