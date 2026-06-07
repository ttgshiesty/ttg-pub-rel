import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-[#01abf4] focus:ring-offset-2 font-display',
  {
    variants: {
      variant: {
        default:
          'border-[#f1aa1c]/40 bg-[#f1aa1c]/10 text-[#f1aa1c] hover:bg-[#f1aa1c]/15',
        secondary:
          'border-[#01abf4]/40 bg-[#01abf4]/10 text-[#01abf4] hover:bg-[#01abf4]/15',
        destructive:
          'border-[#e83a3a]/40 bg-[#e83a3a]/10 text-[#e83a3a] hover:bg-[#e83a3a]/15',
        outline: 'border-[#2d1f38] text-[#d7cdbb]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeVariants({ variant, className })} {...props} />;
}

export { Badge, badgeVariants };
