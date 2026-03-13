import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";
import { Globe, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

// SVG flag components for crisp rendering
const FlagBR = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="h-4 w-5 rounded-sm shrink-0">
        <g strokeWidth="1pt">
            <path fill="#229e45" d="M0 0h640v480H0z" />
            <path fill="#f8e509" d="m321.4 36.2 301.6 203.6-301.7 204L18 240z" />
            <circle fill="#2b49a3" cx="321.4" cy="240" r="115.3" />
            <path fill="#fff" d="M195.6 272c-12.3-21.4-19-46-19-72 0-78.3 63.5-141.8 141.8-141.8 44.7 0 84.6 20.7 110.5 53.1-21-19.7-49.2-31.8-80-31.8-65 0-117.7 52.7-117.7 117.7 0 30 11.2 57.3 29.7 78.1z" />
        </g>
    </svg>
);

const FlagUS = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="h-4 w-5 rounded-sm shrink-0">
        <g fillRule="evenodd">
            <g strokeWidth="1pt">
                <path fill="#bd3d44" d="M0 0h640v37H0zm0 73.9h640v37H0zm0 73.8h640v37H0zm0 73.8h640v37H0zm0 74h640v36.8H0zm0 73.7h640v37H0zm0 73.9h640v37H0z" />
                <path fill="#fff" d="M0 37h640v36.9H0zm0 73.8h640v36.9H0zm0 73.8h640v37H0zm0 73.9h640v37H0zm0 73.8h640v37H0zm0 73.8h640v37H0z" />
            </g>
            <path fill="#192f5d" d="M0 0h364.8v258.5H0z" />
        </g>
    </svg>
);

const FlagES = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="h-4 w-5 rounded-sm shrink-0">
        <path fill="#AA151B" d="M0 0h640v480H0z" />
        <path fill="#F1BF00" d="M0 120h640v240H0z" />
    </svg>
);

const FLAG_COMPONENTS: Record<string, React.FC> = {
    "pt-BR": FlagBR,
    en: FlagUS,
    es: FlagES,
};

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];
    const CurrentFlag = FLAG_COMPONENTS[currentLang.code] || FlagBR;

    const handleChangeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        localStorage.setItem("lexa-lang", code);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={currentLang.label}>
                    <CurrentFlag />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
                {LANGUAGES.map((lang) => {
                    const Flag = FLAG_COMPONENTS[lang.code];
                    const isActive = i18n.language === lang.code;
                    return (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleChangeLanguage(lang.code)}
                            className={`gap-2.5 text-sm py-2 cursor-pointer ${isActive ? "bg-primary/5" : ""}`}
                        >
                            {Flag && <Flag />}
                            <span className={isActive ? "font-semibold" : ""}>{lang.label}</span>
                            {isActive && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
