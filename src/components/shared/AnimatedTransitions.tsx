import { motion, HTMLMotionProps } from "framer-motion";

interface AnimatedPageProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    in: {
        opacity: 1,
        y: 0,
    },
    out: {
        opacity: 0,
        y: -10,
    },
};

const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4,
};

export const AnimatedPage = ({ children, className, ...rest }: AnimatedPageProps) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className={className}
            {...rest}
        >
            {children}
        </motion.div>
    );
};

export const StaggerContainer = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string, delay?: number }) => {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                hidden: {},
                show: {
                    transition: {
                        staggerChildren: 0.08,
                        delayChildren: delay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const StaggerItem = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 15 },
                show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const HoverElevate = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={className}
        >
            {children}
        </motion.div>
    );
};
