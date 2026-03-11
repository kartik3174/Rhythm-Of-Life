'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Clock,
    User,
    Calendar as CalendarIcon,
    Plus,
    ChevronRight,
    MoreVertical,
    Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';
import { Appointment } from '@/lib/types';

export default function AppointmentsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | any | null>(null);

    // New appointment state
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [selectedTime, setSelectedTime] = useState('09:00 AM');

    // Fetch appointments
    const appointmentsQuery = useMemo(() =>
        query(collection(db, 'appointments'), orderBy('date', 'desc')),
        [db]);
    const { data: appointments, loading: appointmentsLoading } = useCollection<any>(appointmentsQuery);

    // Fetch users for dropdowns
    const usersQuery = useMemo(() => collection(db, 'users'), [db]);
    const { data: allUsers } = useCollection<any>(usersQuery);

    const patients = useMemo(() => allUsers.filter(u => u.role === 'Patient'), [allUsers]);
    const doctors = useMemo(() => allUsers.filter(u => u.role === 'Doctor'), [allUsers]);

    const handleSchedule = async () => {
        if (!selectedPatientId || !selectedDoctorId || !date) {
            toast({ variant: 'destructive', title: 'Missing information', description: 'Please fill in all fields.' });
            return;
        }

        setScheduling(true);
        try {
            const patient = patients.find(p => p.id === selectedPatientId);
            const doctor = doctors.find(d => d.id === selectedDoctorId);

            const newAppointment = {
                patientId: selectedPatientId,
                patientName: patient?.name || 'Unknown Patient',
                doctorId: selectedDoctorId,
                doctorName: doctor?.name || 'Unknown Doctor',
                date: format(date, 'yyyy-MM-dd'),
                time: selectedTime,
                status: 'Scheduled'
            };

            await addDoc(collection(db, 'appointments'), newAppointment);
            await writeAuditLog(db, user?.uid || 'unknown', user?.displayName || 'User', 'Schedule Appointment', `Scheduled appointment for ${patient?.name} with ${doctor?.name}`, 'low');

            toast({ title: 'Appointment scheduled', description: 'The appointment has been successfully created.' });
            setIsDialogOpen(false);
            // Reset form
            setSelectedPatientId('');
            setSelectedDoctorId('');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to schedule', description: error.message });
        } finally {
            setScheduling(false);
        }
    };

    const handleDeleteAppointment = async (id: string, patientName: string) => {
        try {
            await deleteDoc(doc(db, 'appointments', id));
            await writeAuditLog(db, user?.uid || 'unknown', user?.displayName || 'User', 'Cancel Appointment', `Cancelled appointment for ${patientName}`, 'medium');
            toast({ title: 'Appointment cancelled', description: 'The appointment has been removed.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to cancel', description: error.message });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
                    <p className="text-muted-foreground">Manage and schedule patient consultations.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={18} />
                            Schedule Appointment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Schedule New Appointment</DialogTitle>
                            <DialogDescription>
                                Enter appointment details below. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="patient">Patient</Label>
                                <Select onValueChange={setSelectedPatientId} value={selectedPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select patient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="doctor">Doctor</Label>
                                <Select onValueChange={setSelectedDoctorId} value={selectedDoctorId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select doctor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {doctors.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="time">Time</Label>
                                <Select onValueChange={setSelectedTime} value={selectedTime}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'].map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" onClick={handleSchedule} disabled={scheduling}>
                                {scheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Appointment
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Calendar</CardTitle>
                        <CardDescription>Select a date to view appointments.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border shadow-sm"
                        />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>
                                    Upcoming for {date ? format(date, 'MMMM do, yyyy') : 'Selected Date'}
                                </CardTitle>
                                <CardDescription>
                                    {appointments.length} total appointments scheduled.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                    {appointments.filter(a => a.status === 'Scheduled').length} Scheduled
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {appointmentsLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : appointments.map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-all group cursor-pointer"
                                    onClick={() => {
                                        setSelectedAppointment(appointment);
                                        setDetailsOpen(true);
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg leading-none mb-1 group-hover:text-primary transition-colors">
                                                {appointment.patientName}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {appointment.time}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon size={14} />
                                                    {appointment.doctorName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className={
                                            appointment.status === 'Scheduled'
                                                ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                                : "bg-green-100 text-green-700 hover:bg-green-100"
                                        }>
                                            {appointment.status}
                                        </Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                    <MoreVertical size={16} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast({ title: "Reschedule", description: "Rescheduling is coming soon." }) }}>
                                                    Reschedule
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appointment.id, appointment.patientName) }} className="text-red-500 focus:bg-red-500/10 focus:text-red-500">
                                                    Cancel Appointment
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors hover:bg-primary/10" onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAppointment(appointment);
                                            setDetailsOpen(true);
                                        }}>
                                            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {!appointmentsLoading && appointments.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                    <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground">No appointments scheduled for this date.</p>
                                    <Button variant="link" className="mt-2" onClick={() => setIsDialogOpen(true)}>Schedule one now</Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Appointment Details</DialogTitle>
                        <DialogDescription>
                            Review the appointment details below.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAppointment && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-medium">Patient</Label>
                                <div className="col-span-3 text-sm">{selectedAppointment.patientName}</div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-medium">Doctor</Label>
                                <div className="col-span-3 text-sm">{selectedAppointment.doctorName}</div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-medium">Date</Label>
                                <div className="col-span-3 text-sm">{selectedAppointment.date}</div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-medium">Time</Label>
                                <div className="col-span-3 text-sm">{selectedAppointment.time}</div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right font-medium">Status</Label>
                                <div className="col-span-3">
                                    <Badge className={
                                        selectedAppointment.status === 'Scheduled'
                                            ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                            : "bg-green-100 text-green-700 hover:bg-green-100"
                                    }>
                                        {selectedAppointment.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
