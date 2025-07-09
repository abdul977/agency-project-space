import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Trash2,
  ExternalLink,
  Download
} from 'lucide-react';
import { findBrokenDeliverables, fixBrokenDeliverable, createTestDeliverable } from '@/utils/deliverableUtils';

interface BrokenDeliverable {
  id: string;
  title: string;
  file_path: string;
  project_id: string;
  validationError: string;
}

const DeliverableDebugger: React.FC = () => {
  const [brokenDeliverables, setBrokenDeliverables] = useState<BrokenDeliverable[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isFixing, setIsFixing] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<any>(null);
  const { toast } = useToast();

  const scanForBrokenDeliverables = async () => {
    setIsScanning(true);
    try {
      const results = await findBrokenDeliverables();
      
      if (results.success) {
        setBrokenDeliverables(results.brokenDeliverables || []);
        setScanResults(results);
        toast({
          title: "Scan Complete",
          description: `Found ${results.broken} broken deliverables out of ${results.total} total`,
          variant: results.broken > 0 ? "destructive" : "default"
        });
      } else {
        toast({
          title: "Scan Failed",
          description: `Error: ${results.error}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: `Unexpected error: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const fixDeliverable = async (deliverableId: string) => {
    setIsFixing(deliverableId);
    try {
      const result = await fixBrokenDeliverable(deliverableId);
      
      if (result.success) {
        toast({
          title: "Fix Applied",
          description: `Deliverable fixed: ${result.action}`,
        });
        // Remove from broken list
        setBrokenDeliverables(prev => prev.filter(d => d.id !== deliverableId));
      } else {
        toast({
          title: "Fix Failed",
          description: `Error: ${result.error}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Fix Error",
        description: `Unexpected error: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsFixing(null);
    }
  };

  const createTestFile = async () => {
    try {
      const projectId = '545ca16d-3d92-4bd4-bd6e-1099abdb8b22'; // Use existing project
      const result = await createTestDeliverable(projectId);
      
      if (result.success) {
        toast({
          title: "Test Created",
          description: "Test deliverable created successfully",
        });
      } else {
        toast({
          title: "Test Failed",
          description: `Error: ${result.error}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: `Unexpected error: ${error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Deliverable Debugger</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Button 
              onClick={scanForBrokenDeliverables}
              disabled={isScanning}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan for Issues'}</span>
            </Button>
            
            <Button 
              onClick={createTestFile}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Create Test File</span>
            </Button>
          </div>

          {scanResults && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Total: {scanResults.total}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Broken: {scanResults.broken}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {brokenDeliverables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Broken Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {brokenDeliverables.map((deliverable) => (
                <div key={deliverable.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{deliverable.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        File: {deliverable.file_path}
                      </p>
                      <p className="text-sm text-red-600">
                        Error: {deliverable.validationError}
                      </p>
                      <Badge variant="destructive">Broken</Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => fixDeliverable(deliverable.id)}
                        disabled={isFixing === deliverable.id}
                        className="flex items-center space-x-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${isFixing === deliverable.id ? 'animate-spin' : ''}`} />
                        <span>Fix</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliverableDebugger;
