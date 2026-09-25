import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null;
}

function Avatar({ className, name, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground",
        className
      )}
      {...props}
    >
      {initials(name)}
    </div>
  );
}

export { Avatar };
