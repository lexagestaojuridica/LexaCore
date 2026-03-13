import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { useTranslation } from "react-i18next";
import type { Employee, EmployeeFormState } from "../types";
import { emptyEmployee } from "../types";

interface EmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    units: Array<{ id: string; name: string }>;
    orgId: string;
    onSubmit: (payload: Record<string, unknown>, isEdit: boolean, editId?: string) => void;
    isPending: boolean;
}

export function EmployeeDialog({ open, onOpenChange, employee, units, orgId, onSubmit, isPending }: EmployeeDialogProps) {
    const { t } = useTranslation();
    const [form, setForm] = useState<EmployeeFormState>(emptyEmployee);
    const isEdit = !!employee;

    // Reset form when dialog opens/closes or employee changes
    const handleOpenChange = (v: boolean) => {
        if (v && employee) {
            setForm({
                full_name: employee.full_name, email: employee.email || "", phone: employee.phone || "",
                oab_number: employee.oab_number || "", department: employee.department || "",
                position: employee.position || "", hire_date: employee.hire_date || "",
                hourly_rate: employee.hourly_rate?.toString() || "", unit_id: employee.unit_id || "none",
                notes: employee.notes || "",
            });
        } else if (v) {
            setForm(emptyEmployee);
        }
        onOpenChange(v);
    };

    const handleSubmit = () => {
        const payload = {
            organization_id: orgId,
            full_name: form.full_name,
            email: form.email || null,
            phone: form.phone || null,
            oab_number: form.oab_number || null,
            department: form.department || null,
            position: form.position || null,
            hire_date: form.hire_date || null,
            hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
            unit_id: form.unit_id === "none" ? null : form.unit_id,
            notes: form.notes || null,
        };
        onSubmit(payload, isEdit, employee?.id);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEdit ? t("settings.editEmployee") : t("settings.newEmployee")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>{t("settings.fullName")} *</Label>
                            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("common.email")}</Label>
                            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("common.phone")}</Label>
                            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("settings.oabNumber")}</Label>
                            <Input value={form.oab_number} onChange={(e) => setForm((f) => ({ ...f, oab_number: e.target.value }))} placeholder="123456/SP" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("settings.position")}</Label>
                            <Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("settings.department")}</Label>
                            <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("settings.hireDate")}</Label>
                            <Input type="date" value={form.hire_date} onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("settings.hourlyRate")}</Label>
                            <Input type="number" value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t("settings.unit")}</Label>
                            <Select value={form.unit_id} onValueChange={(v) => setForm((f) => ({ ...f, unit_id: v }))}>
                                <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t("common.none")}</SelectItem>
                                    {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>{t("settings.notes")}</Label>
                        <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="resize-none" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={!form.full_name || isPending}>
                        {isEdit ? t("common.save") : t("common.create")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
