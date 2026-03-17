import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Loader2, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/shared/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/ui/popover";

interface AsyncProcessComboboxProps {
    organizationId: string | undefined;
    value: string | null;
    onChange: (value: string | null) => void;
}

export function AsyncProcessCombobox({ organizationId, value, onChange }: AsyncProcessComboboxProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 400);

    const { data: processos = [], isLoading } = useQuery({
        queryKey: ["processos_search", organizationId, debouncedSearchTerm],
        queryFn: async () => {
            if (!organizationId) return [];

            let query = supabase
                .from("processos_juridicos")
                .select("id, title, number")
                .eq("organization_id", organizationId)
                .order("title")
                .limit(20);

            if (debouncedSearchTerm) {
                query = query.ilike("title", `%${debouncedSearchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as { id: string; title: string; number: string | null }[];
        },
        enabled: !!organizationId,
    });

    // Query just to fetch the selected item's title if there's a value but no searchTerm
    const { data: selectedProcess } = useQuery({
        queryKey: ["processo_single", value],
        queryFn: async () => {
            if (!value) return null;
            const { data } = await supabase
                .from("processos_juridicos")
                .select("id, title, number")
                .eq("id", value)
                .single();
            return data as { id: string; title: string; number: string | null } | null;
        },
        enabled: !!value,
    });

    const selectedDisplay = (processos as { id: string; title: string; number: string | null }[]).find((p) => p.id === value) || selectedProcess;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal text-left h-9 overflow-hidden"
                >
                    {selectedDisplay ? (
                        <span className="flex items-center gap-1.5 truncate">
                            <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">{selectedDisplay.title}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            Nenhum processo vinculado
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Pesquisar por título ou número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        {isLoading && (
                            <div className="py-6 text-center text-sm flex items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                            </div>
                        )}
                        {!isLoading && processos.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Nenhum processo encontrado.
                            </div>
                        )}
                        <CommandGroup>
                            {value && (
                                <CommandItem
                                    onSelect={() => {
                                        onChange(null);
                                        setOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className="text-muted-foreground italic mb-1 justify-center cursor-pointer"
                                >
                                    Remover Vínculo Atual
                                </CommandItem>
                            )}
                            {processos.map((proc) => (
                                <CommandItem
                                    key={proc.id}
                                    value={proc.id}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? null : currentValue);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === proc.id ? "opacity-100 text-primary" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="truncate font-medium">{proc.title}</span>
                                        {proc.number && (
                                            <span className="text-xs text-muted-foreground truncate">{proc.number}</span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
