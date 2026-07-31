import { motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({ value, duration = 1.5, suffix = '', prefix = '', className = '' }: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <CounterInner value={value} duration={duration} prefix={prefix} suffix={suffix} />
      </motion.span>
    </motion.span>
  );
}

function CounterInner({ value, duration, prefix, suffix }: { value: number; duration: number; prefix: string; suffix: string }) {
  return (
    <motion.span
      initial={{ scale: 0.8 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <CountUp value={value} duration={duration} prefix={prefix} suffix={suffix} />
    </motion.span>
  );
}

import { useEffect, useState } from 'react';

function CountUp({ value, duration, prefix, suffix }: { value: number; duration: number; prefix: string; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const end = value;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(update);
      else setCount(end);
    };

    requestAnimationFrame(update);
  }, [value, duration]);

  return (
    <span>
      {prefix}{count.toLocaleString('en-IN')}{suffix}
    </span>
  );
}
