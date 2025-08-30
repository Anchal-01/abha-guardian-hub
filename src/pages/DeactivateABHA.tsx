import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const DeactivateABHA = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="bg-card/50 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Deactivate ABHA</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          <Card
            className="cursor-pointer hover:shadow-lg transition-all"
            onClick={() => navigate("/abha/action/verify", { state: { action: "deactivate" } })}
          >
            <CardHeader>
              <CardTitle>Verify Your ABHA Account</CardTitle>
              <CardDescription>Enter Aadhaar number to begin deactivation</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Continue</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DeactivateABHA;