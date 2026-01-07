import Link from "next/link";
import { Heart } from "lucide-react";

const Footer = () => {
    return (
        <footer
            className="text-text-dark py-12 my-0 px-4 mx-0 bg-text-dark/95 backdrop-blur-md relative z-10"
        >
            <div className="container mx-auto">
                <div className="grid md:grid-cols-4 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Heart className="w-6 h-6 text-primary" />
                            <span className="text-xl font-outfit font-bold text-background">
                                Haemologix
                            </span>
                        </div>
                        <p className="text-background/80 font-dm-sans">
                            Connecting lives through technology and compassion.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-outfit font-semibold mb-4 text-background">Platform</h4>
                        <ul className="space-y-2 text-background/80 font-dm-sans">
                            <li>
                                <Link href="/donor" className="hover:text-accent transition-colors">
                                    Donor Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link href="/hospital" className="hover:text-accent transition-colors">
                                    Hospital Portal
                                </Link>
                            </li>
                            <li>
                                <Link href="/admin" className="hover:text-accent transition-colors">
                                    Admin Panel
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-outfit font-semibold mb-4 text-background">Support</h4>
                        <ul className="space-y-2 text-background/80 font-dm-sans">
                            <li>
                                <Link href="#" className="hover:text-accent transition-colors">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-accent transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-accent transition-colors">
                                    Emergency
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-outfit font-semibold mb-4 text-background">Legal</h4>
                        <ul className="space-y-2 text-background/80 font-dm-sans">
                            <li>
                                <Link href="/privacy-policy" className="hover:text-accent transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms-and-conditions" className="hover:text-accent transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="hover:text-accent transition-colors">
                                    HIPAA Compliance
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-background/30 mt-8 pt-8 text-center text-background/70 font-dm-sans">
                    <p>
                        &copy; {new Date().getFullYear()} Haemologix Pvt. Ltd. All rights reserved. Built for saving
                        lives.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
