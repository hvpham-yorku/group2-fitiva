import Image from 'next/image';

interface LogoProps {
  variant?: 'text' | 'circular' | 'full';
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ variant = 'text', size = 'md' }: LogoProps) {
  const sizes = {
    sm: { width: 100, height: 30 },
    md: { width: 140, height: 40 },
    lg: { width: 180, height: 50 },
  };

  const logos = {
    text: '/resources/fitiva_text.png',
    circular: '/resources/fitiva_circular.png',
    full: '/resources/fitiva_straight.png',
  };

  return (
    <Image
      src={logos[variant]}
      alt="Fitiva"
      width={sizes[size].width}
      height={sizes[size].height}
      priority
    />
  );
}
