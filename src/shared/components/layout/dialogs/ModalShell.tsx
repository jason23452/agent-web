import { ArrowLeftIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogPopup, DialogTitle } from "@/shared/components/ui/dialog";
import { cn } from "@/shared/utils/cn";

type ModalShellBackButton = {
  ariaLabel: string;
  onClick: () => void;
};

type ModalShellProps = {
  ariaLabel: string;
  bodyClassName?: string;
  children: ReactNode;
  closeAriaLabel?: string;
  description?: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  headerActions?: ReactNode;
  headerClassName?: string;
  maxWidth?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  panelClassName?: string;
  showCloseButton?: boolean;
  showHeader?: boolean;
  title?: ReactNode;
  backButton?: ModalShellBackButton;
};

export function ModalShell({
  ariaLabel,
  backButton,
  bodyClassName,
  children,
  closeAriaLabel = "Close",
  description,
  footer,
  footerClassName,
  headerActions,
  headerClassName,
  maxWidth = "max-w-[640px]",
  onOpenChange,
  open,
  panelClassName,
  showCloseButton = true,
  showHeader = true,
  title,
}: ModalShellProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup
        aria-label={ariaLabel}
        bottomStickOnMobile={false}
        className={cn(
          "max-h-[calc(100dvh-2rem)] overflow-hidden rounded-xl bg-background text-foreground shadow-[0_20px_60px_rgb(0_0_0_/_20%)]",
          maxWidth,
          panelClassName,
        )}
        showCloseButton={false}
      >
        {showHeader && (
          <div
            className={cn(
              "flex h-14 shrink-0 items-center justify-between gap-4 px-5",
              headerClassName,
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              {backButton && (
                <button
                  aria-label={backButton.ariaLabel}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={backButton.onClick}
                  type="button"
                >
                  <ArrowLeftIcon aria-hidden="true" className="size-4" />
                </button>
              )}
              {(title || description) && (
                <div className="min-w-0">
                  {title && (
                    <DialogTitle className="font-sans text-base leading-6">
                      {title}
                    </DialogTitle>
                  )}
                  {description && (
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      {description}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {headerActions}
              {showCloseButton ? (
                <button
                  aria-label={closeAriaLabel}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        )}

        <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center justify-between gap-3 border-border/70 border-t bg-background px-6 py-4",
              footerClassName,
            )}
          >
            {footer}
          </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}
