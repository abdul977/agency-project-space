import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FolderPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notifyAdminOfClientUpdate } from "@/lib/notifications";
import { useValidation } from "@/hooks/useValidation";
import { Validator } from "@/lib/validation";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { validateForm, getFirstFieldError, hasFieldError, clearAllErrors } = useValidation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    const validation = validateForm({
      name: {
        value: formData.name,
        rules: Validator.rules.projectName()
      }
    });

    if (!validation.isValid) {
      return;
    }

    setIsLoading(true);

    try {

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          status: 'starting'
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        toast({
          title: "Error",
          description: "Failed to create project. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create default folder
      if (project) {
        const { error: folderError } = await supabase
          .from('folders')
          .insert({
            project_id: project.id,
            name: 'Requirements'
          });

        if (folderError) {
          console.error('Error creating default folder:', folderError);
          // Don't fail the whole operation for this
        }
      }

      toast({
        title: "Project created!",
        description: `${formData.name} has been created successfully.`,
      });

      // Notify admin of new project
      if (user) {
        await notifyAdminOfClientUpdate(
          user.full_name || 'Client',
          formData.name,
          'project_created'
        );
      }

      // Reset form and close modal
      setFormData({ name: "", description: "" });
      clearAllErrors();
      onProjectCreated();
      onClose();

    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: "", description: "" });
      clearAllErrors();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            <span>Create New Project</span>
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize your requirements and collaborate with the Muahib Solution team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Project Name *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Company Website Redesign"
              value={formData.name}
              onChange={handleInputChange}
              className={`border-input-border focus:border-ring ${
                hasFieldError('name') ? 'border-red-500' : ''
              }`}
              disabled={isLoading}
              required
            />
            {hasFieldError('name') && (
              <p className="text-xs text-red-600">
                {getFirstFieldError('name')}
              </p>
            )}
            {!hasFieldError('name') && (
              <p className="text-xs text-muted-foreground">
                Choose a descriptive name for your project
              </p>
            )}
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of your project goals and requirements..."
              value={formData.description}
              onChange={handleInputChange}
              className="border-input-border focus:border-ring min-h-[80px]"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;
