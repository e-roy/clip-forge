import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecover: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({
  open,
  onOpenChange,
  onRecover,
  onDiscard,
}: RecoveryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recover Project?</AlertDialogTitle>
          <AlertDialogDescription>
            The application did not close properly last time. Would you like to
            recover your work from the last session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Discard</AlertDialogCancel>
          <AlertDialogAction onClick={onRecover}>Recover</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
