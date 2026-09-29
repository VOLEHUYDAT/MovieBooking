import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import { getButtonClassName, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  isLoading?: boolean;
}

export function Button({
  variant,
  size,
  fullWidth,
  isLoading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={getButtonClassName(variant, size, fullWidth ? `w-full ${className ?? ''}` : className)}
      {...props}
    >
      {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

type ButtonLinkProps = LinkProps & ButtonStyleProps;

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return (
    <Link className={getButtonClassName(variant, size, fullWidth ? `w-full ${className ?? ''}` : className)} {...props} />
  );
}
