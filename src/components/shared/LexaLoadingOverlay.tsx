import { motion, AnimatePresence } from "framer-motion";
import lexaIcon from "@/assets/icon-lexa.png";
import { useEffect, useState } from "react";

interface LexaLoadingOverlayProps {
  visible: boolean;
  message?: string;
  minDuration?: number;
}

export default function LexaLoadingOverlay({ visible, message = "Processando...", minDuration = 1200 }: LexaLoadingOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (visible) {
      setShow(true);
    } else if (show) {
      // Keep showing for at least minDuration
      timer = setTimeout(() => setShow(false), minDuration);
    }
    return () => clearTimeout(timer);
  }, [visible, show, minDuration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Pulsing ring + spinning orbit */}
            <div className="relative flex h-28 w-28 items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "hsl(var(--champagne))",
                  borderRightColor: "hsl(var(--champagne-light))",
                }}
              />
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-2 rounded-full border border-accent/30"
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/10 to-accent/10"
              />
              <motion.img
                src={lexaIcon}
                alt="LEXA"
                className="relative z-10 h-14 w-14 object-contain drop-shadow-lg"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="relative -mt-4 h-2 w-20">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute top-0 h-2 w-2 rounded-full bg-accent"
                  animate={{ x: [0, 36, 72, 36, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-medium text-muted-foreground"
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
