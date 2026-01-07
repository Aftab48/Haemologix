"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    useEffect(() => {
        window.addEventListener("scroll", toggleVisibility);
        return () => {
            window.removeEventListener("scroll", toggleVisibility);
        };
    }, []);

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <Button
                onClick={scrollToTop}
                size="icon"
                className="rounded-full shadow-lg animate-in fade-in zoom-in duration-300"
                aria-label="Scroll to top"
            >
                <ArrowUp className="h-5 w-5" />
            </Button>
        </div>
    );
}
